-- Ruaha 360 · foundations
-- Cross-cutting types, audit, and the provenance convention every
-- observed-data table below must follow.

create extension if not exists pgcrypto;

-- ── roles ────────────────────────────────────────────────
-- 'admin' is operational (seed, support), not a product surface.
create type app_role as enum ('farmer','field_officer','ops','admin');

-- ── provenance (Plan S13 — five source categories) ────────
create type source_type as enum (
  'farmer_reported',
  'field_verified',
  'transaction_derived',
  'sensor_derived',
  'model_estimated'
);

create type verification_status as enum ('unverified','pending','verified','disputed');

-- OPEN (S22): scale not agreed. Officers will not produce 0.72.
create type confidence_level as enum ('low','medium','high');

-- ── units ────────────────────────────────────────────────
-- Storage is ALWAYS hectares. area_unit is a display preference only.
create domain hectares as numeric(10,4) check (value >= 0);
create type area_unit as enum ('hectare','acre');

-- ── updated_at ───────────────────────────────────────────
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── audit ────────────────────────────────────────────────
create table audit_log (
  id          bigserial   primary key,
  table_name  text        not null,
  record_id   uuid        not null,
  action      text        not null check (action in ('insert','update','delete')),
  actor       uuid,
  before      jsonb,
  after       jsonb,
  occurred_at timestamptz not null default now()
);

create index audit_log_record_idx
  on audit_log (table_name, record_id, occurred_at desc);

-- RLS on, zero policies -> unreachable via PostgREST. Service role only.
alter table audit_log enable row level security;

create or replace function write_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (table_name, record_id, action, actor, before, after)
  values (
    tg_table_name,
    coalesce(new.id, old.id),
    lower(tg_op),
    auth.uid(),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

-- ── PROVENANCE CONVENTION ────────────────────────────────
-- Copy verbatim into every OBSERVED-DATA table.
-- Do NOT add to CONFIG tables (country, project, village, crop,
-- equipment_category, equipment, buyer, village_capacity).
--
--   source        source_type         not null,
--   captured_at   timestamptz         not null default now(),
--   captured_by   uuid references app_user(id),
--   verification  verification_status not null default 'unverified',
--   verified_by   uuid references app_user(id),
--   verified_at   timestamptz,
--   confidence    confidence_level,
--   evidence_ref  text,
--   created_at    timestamptz not null default now(),
--   updated_at    timestamptz not null default now(),
--   deleted_at    timestamptz
