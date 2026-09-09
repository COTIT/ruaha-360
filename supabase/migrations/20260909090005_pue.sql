-- Ruaha 360 · productive-use equipment and requests
-- Catalogue is CONFIG (ops-maintained) -> no provenance block.
-- pue_request is OBSERVED (a person applied) -> full provenance block.
-- MVP stops at the decision. Delivery, terms and repayment are S16.

create type pue_status as enum (
  'draft','submitted','under_review','approved','rejected','withdrawn'
);

create or replace function app_projects() returns setof uuid
language sql stable security definer set search_path = public as $$
  select distinct project_id from membership
  where user_id = auth.uid() and revoked_at is null
$$;

grant execute on function app_projects to authenticated;

create table equipment_category (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name_en    text not null,
  name_sw    text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Power and price are INDICATIVE. They drive the estimate and set
-- expectations; they are not a quotation and not a financial record.
-- Research item C: lending classification is unresolved.
create table equipment (
  id                     uuid primary key default gen_random_uuid(),
  project_id             uuid not null references project(id) on delete restrict,
  category_id            uuid not null references equipment_category(id) on delete restrict,
  code                   text not null,
  name_en                text not null,
  name_sw                text not null,
  rated_power_kw         numeric(8,3) check (rated_power_kw >= 0),
  typical_hours_per_day  numeric(4,2) check (typical_hours_per_day between 0 and 24),
  typical_days_per_week  numeric(3,1) check (typical_days_per_week between 0 and 7),
  indicative_price       numeric(14,2) check (indicative_price >= 0),
  currency               char(3) not null default 'TZS',
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (project_id, code)
);

create index equipment_project_idx  on equipment (project_id) where is_active;
create index equipment_category_idx on equipment (category_id);

create table pue_request (
  id             uuid primary key default gen_random_uuid(),
  village_id     uuid not null references village(id) on delete restrict,
  person_id      uuid not null references person(id) on delete restrict,
  farm_id        uuid,
  equipment_id   uuid not null references equipment(id) on delete restrict,
  quantity       integer not null default 1 check (quantity > 0),

  hours_per_day  numeric(4,2) check (hours_per_day between 0 and 24),
  days_per_week  numeric(3,1) check (days_per_week between 0 and 7),
  purpose        text,

  status         pue_status not null default 'draft',
  submitted_at   timestamptz,
  decided_at     timestamptz,
  decided_by     uuid references app_user(id),
  decision_note  text,

  source         source_type         not null default 'farmer_reported',
  captured_at    timestamptz         not null default now(),
  captured_by    uuid references app_user(id),
  verification   verification_status not null default 'unverified',
  verified_by    uuid references app_user(id),
  verified_at    timestamptz,
  confidence     confidence_level,
  evidence_ref   text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,

  constraint pue_farm_village_fk foreign key (farm_id, village_id)
    references farm (id, village_id)
);

create index pue_village_idx on pue_request (village_id) where deleted_at is null;
create index pue_person_idx  on pue_request (person_id)  where deleted_at is null;
create index pue_status_idx  on pue_request (status, village_id) where deleted_at is null;

-- RLS is row-level, not column-level: without this, a farmer with UPDATE on
-- their own draft could set status='approved'. This is the column-level
-- control RLS cannot express. It also stamps the decision fields server-side
-- so the client never asserts who decided.
create or replace function pue_request_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  is_reviewer boolean := app_has_role('ops') or app_has_role('admin');
begin
  if tg_op = 'INSERT' then
    if new.status not in ('draft','submitted') then
      raise exception 'a request may only be created as draft or submitted';
    end if;
    if new.status = 'submitted' then new.submitted_at := now(); end if;
    new.decided_at := null; new.decided_by := null;
    return new;
  end if;

  if new.status is distinct from old.status then
    if not (
         (old.status = 'draft'        and new.status in ('submitted','withdrawn'))
      or (old.status = 'submitted'    and new.status in ('under_review','withdrawn'))
      or (old.status = 'under_review' and new.status in ('approved','rejected'))
    ) then
      raise exception 'illegal transition % -> %', old.status, new.status;
    end if;

    if new.status in ('under_review','approved','rejected') and not is_reviewer then
      raise exception 'only ops or admin may review a request';
    end if;

    if new.status = 'submitted' then
      new.submitted_at := coalesce(old.submitted_at, now());
    end if;

    if new.status in ('approved','rejected') then
      new.decided_at := now();
      new.decided_by := auth.uid();
    end if;
  else
    new.submitted_at := old.submitted_at;
    new.decided_at   := old.decided_at;
    new.decided_by   := old.decided_by;
  end if;

  if old.status <> 'draft' and not is_reviewer then
    if (new.equipment_id, new.quantity, new.hours_per_day, new.days_per_week, new.purpose)
       is distinct from
       (old.equipment_id, old.quantity, old.hours_per_day, old.days_per_week, old.purpose)
    then
      raise exception 'a submitted request cannot be edited';
    end if;
  end if;

  return new;
end $$;

create trigger pue_request_guard_trg
  before insert or update on pue_request
  for each row execute function pue_request_guard();

create trigger equipment_category_updated_at before update on equipment_category for each row execute function set_updated_at();
create trigger equipment_updated_at          before update on equipment          for each row execute function set_updated_at();
create trigger pue_request_updated_at        before update on pue_request        for each row execute function set_updated_at();

create trigger equipment_category_audit after insert or update or delete on equipment_category for each row execute function write_audit();
create trigger equipment_audit          after insert or update or delete on equipment          for each row execute function write_audit();
create trigger pue_request_audit        after insert or update or delete on pue_request        for each row execute function write_audit();

alter table equipment_category enable row level security;
alter table equipment          enable row level security;
alter table pue_request        enable row level security;

create policy eqcat_read on equipment_category for select to authenticated using (true);
create policy eqcat_write on equipment_category for insert to authenticated
  with check (app_has_role('ops') or app_has_role('admin'));
create policy eqcat_update on equipment_category for update to authenticated
  using (app_has_role('ops') or app_has_role('admin'))
  with check (app_has_role('ops') or app_has_role('admin'));

create policy equipment_read on equipment for select to authenticated
  using (project_id in (select app_projects()));
create policy equipment_write on equipment for insert to authenticated
  with check (app_manages_project(project_id));
create policy equipment_update on equipment for update to authenticated
  using (app_manages_project(project_id))
  with check (app_manages_project(project_id));

create policy pue_read_own on pue_request for select to authenticated
  using (person_id = app_person_id());
create policy pue_read_staff on pue_request for select to authenticated
  using (app_is_staff() and village_id in (select app_villages()));

create policy pue_insert_own on pue_request for insert to authenticated
  with check (person_id = app_person_id());
create policy pue_insert_staff on pue_request for insert to authenticated
  with check (app_is_staff() and village_id in (select app_villages()));

create policy pue_update_own on pue_request for update to authenticated
  using (person_id = app_person_id())
  with check (person_id = app_person_id());
create policy pue_update_staff on pue_request for update to authenticated
  using (app_is_staff() and village_id in (select app_villages()))
  with check (app_is_staff() and village_id in (select app_villages()));
