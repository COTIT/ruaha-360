-- Ruaha 360 · energy - Level 1 only (Plan S10)
-- rated power x operating assumptions -> estimated kW / kWh.
-- No meter tables. Provider unselected (S22), and a table implies a decision.

-- 'measured' is deliberately ABSENT. Plan S03: do not report measured or
-- operational capacity. Add the value the day real meter data exists.
create type capacity_basis as enum ('planned','nameplate');

-- Programme infrastructure, not farmer-observed data -> no provenance block.
-- `basis` exists so nothing in the UI can quietly present a plan figure
-- as a measurement.
create table village_capacity (
  id                   uuid primary key default gen_random_uuid(),
  village_id           uuid not null references village(id) on delete restrict,
  capacity_kw          numeric(10,2) not null check (capacity_kw >= 0),
  basis                capacity_basis not null default 'planned',

  -- Plan S10: "Peak demand also needs simultaneity assumptions."
  -- Village peak is NOT the sum of rated power.
  simultaneity_factor  numeric(4,3) not null default 1.000
                         check (simultaneity_factor > 0 and simultaneity_factor <= 1),

  source_note          text,
  effective_from       date not null default current_date,
  is_current           boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create unique index village_capacity_one_current
  on village_capacity (village_id) where is_current;

create index village_capacity_village_idx on village_capacity (village_id);

-- One row per request. Inputs are SNAPSHOTTED at compute time so the number
-- stays explainable after the catalogue changes underneath it. Outputs are
-- GENERATED, so stored arithmetic can never drift from stored inputs.
create table energy_estimate (
  id              uuid primary key default gen_random_uuid(),
  pue_request_id  uuid not null unique references pue_request(id) on delete cascade,
  village_id      uuid not null references village(id) on delete restrict,

  rated_power_kw  numeric(8,3) not null check (rated_power_kw >= 0),
  quantity        integer      not null check (quantity > 0),
  hours_per_day   numeric(4,2) not null check (hours_per_day between 0 and 24),
  days_per_week   numeric(3,1) not null check (days_per_week between 0 and 7),

  est_power_kw     numeric(12,3) generated always as
                     (rated_power_kw * quantity) stored,
  est_kwh_per_day  numeric(12,3) generated always as
                     (rated_power_kw * quantity * hours_per_day) stored,
  est_kwh_per_week numeric(12,3) generated always as
                     (rated_power_kw * quantity * hours_per_day * days_per_week) stored,

  method          text        not null default 'level1_rated_x_hours',
  source          source_type not null default 'model_estimated',
  confidence      confidence_level,
  computed_at     timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index energy_estimate_village_idx on energy_estimate (village_id);

-- Fires on every request write. This is the strategy poster's proof -
-- "changed assumptions update the estimate" - enforced in the database
-- rather than hoped for in the client.
-- SECURITY DEFINER: clients have no write policy on energy_estimate at all.
create or replace function pue_recompute_estimate() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  eq equipment%rowtype;
  h  numeric(4,2);
  d  numeric(3,1);
begin
  select * into eq from equipment where id = new.equipment_id;

  if eq.rated_power_kw is null then
    delete from energy_estimate where pue_request_id = new.id;
    return new;
  end if;

  h := coalesce(new.hours_per_day, eq.typical_hours_per_day, 0);
  d := coalesce(new.days_per_week, eq.typical_days_per_week, 0);

  insert into energy_estimate (
    pue_request_id, village_id, rated_power_kw, quantity,
    hours_per_day, days_per_week, confidence, computed_at
  )
  values (new.id, new.village_id, eq.rated_power_kw, new.quantity, h, d, new.confidence, now())
  on conflict (pue_request_id) do update set
    village_id     = excluded.village_id,
    rated_power_kw = excluded.rated_power_kw,
    quantity       = excluded.quantity,
    hours_per_day  = excluded.hours_per_day,
    days_per_week  = excluded.days_per_week,
    confidence     = excluded.confidence,
    computed_at    = now(),
    updated_at     = now();

  return new;
end $$;

create trigger pue_recompute_estimate_trg
  after insert or update of equipment_id, quantity, hours_per_day, days_per_week,
                            village_id, confidence
  on pue_request
  for each row execute function pue_recompute_estimate();

create trigger village_capacity_updated_at before update on village_capacity for each row execute function set_updated_at();
create trigger energy_estimate_updated_at  before update on energy_estimate  for each row execute function set_updated_at();

create trigger village_capacity_audit after insert or update or delete on village_capacity for each row execute function write_audit();
create trigger energy_estimate_audit  after insert or update or delete on energy_estimate  for each row execute function write_audit();

alter table village_capacity enable row level security;
alter table energy_estimate  enable row level security;

create policy capacity_read on village_capacity for select to authenticated
  using (village_id in (select app_villages()));
create policy capacity_write on village_capacity for insert to authenticated
  with check (app_has_role('ops') or app_has_role('admin'));
create policy capacity_update on village_capacity for update to authenticated
  using (app_has_role('ops') or app_has_role('admin'))
  with check (app_has_role('ops') or app_has_role('admin'));

-- estimates: READ ONLY for every client. No insert, no update policy.
-- The trigger is the only writer. Nobody can fabricate an estimate.
create policy estimate_read_own on energy_estimate for select to authenticated
  using (pue_request_id in (
    select id from pue_request where person_id = app_person_id()
  ));
create policy estimate_read_staff on energy_estimate for select to authenticated
  using (app_is_staff() and village_id in (select app_villages()));
