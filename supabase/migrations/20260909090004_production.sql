-- Ruaha 360 · production
-- farm -> plot -> crop_cycle -> harvest_report
-- village_id is denormalised down the chain and held true by composite FKs,
-- so every RLS policy is one indexed comparison instead of a 3-table join.

create type crop_measure      as enum ('area','tree_count','unit_count');
create type crop_cycle_status as enum ('planned','growing','harvested','abandoned');
create type harvest_kind      as enum ('expected','actual');

-- CONFIG. Reference data needs both languages IN the database: JSON files in
-- the repo cannot translate a row the ops user created at runtime.
create table crop (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name_en      text not null,
  name_sw      text not null,
  measured_by  crop_measure not null default 'area',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table farm (
  id            uuid primary key default gen_random_uuid(),
  village_id    uuid not null references village(id) on delete restrict,
  household_id  uuid references household(id) on delete set null,
  label         text not null,
  latitude      numeric(9,6) check (latitude between -90 and 90),
  longitude     numeric(9,6) check (longitude between -180 and 180),

  source        source_type         not null,
  captured_at   timestamptz         not null default now(),
  captured_by   uuid references app_user(id),
  verification  verification_status not null default 'unverified',
  verified_by   uuid references app_user(id),
  verified_at   timestamptz,
  confidence    confidence_level,
  evidence_ref  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  constraint farm_id_village_uq unique (id, village_id)
);

create index farm_village_idx   on farm (village_id)   where deleted_at is null;
create index farm_household_idx on farm (household_id) where deleted_at is null;

-- S06: a farm may have several people, households and managers.
create table farm_manager (
  farm_id     uuid not null references farm(id)   on delete cascade,
  person_id   uuid not null references person(id) on delete cascade,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  primary key (farm_id, person_id)
);

create unique index farm_one_primary on farm_manager (farm_id) where is_primary;

create table plot (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid not null references farm(id) on delete restrict,
  village_id    uuid not null,
  label         text not null,
  area_ha       hectares,
  latitude      numeric(9,6) check (latitude between -90 and 90),
  longitude     numeric(9,6) check (longitude between -180 and 180),

  source        source_type         not null,
  captured_at   timestamptz         not null default now(),
  captured_by   uuid references app_user(id),
  verification  verification_status not null default 'unverified',
  verified_by   uuid references app_user(id),
  verified_at   timestamptz,
  confidence    confidence_level,
  evidence_ref  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  constraint plot_farm_village_fk foreign key (farm_id, village_id)
    references farm (id, village_id),
  constraint plot_id_village_uq unique (id, village_id)
);

create index plot_farm_idx    on plot (farm_id)    where deleted_at is null;
create index plot_village_idx on plot (village_id) where deleted_at is null;

-- Intercropping: a plot carries several concurrent cycles. The sum of cycle
-- areas MAY exceed plot area. Deliberately unconstrained - but aggregation
-- must never naively sum area (research item I, double counting).
create table crop_cycle (
  id              uuid primary key default gen_random_uuid(),
  plot_id         uuid not null references plot(id) on delete restrict,
  village_id      uuid not null,
  crop_id         uuid not null references crop(id) on delete restrict,
  season_label    text,
  area_ha         hectares,
  tree_count      integer check (tree_count >= 0),
  unit_count      integer check (unit_count >= 0),
  planted_on      date,
  harvest_start   date,
  harvest_end     date,
  status          crop_cycle_status not null default 'planned',

  source          source_type         not null,
  captured_at     timestamptz         not null default now(),
  captured_by     uuid references app_user(id),
  verification    verification_status not null default 'unverified',
  verified_by     uuid references app_user(id),
  verified_at     timestamptz,
  confidence      confidence_level,
  evidence_ref    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,

  constraint cycle_plot_village_fk foreign key (plot_id, village_id)
    references plot (id, village_id),
  constraint cycle_window_sane check (harvest_end is null or harvest_start is null
                                      or harvest_end >= harvest_start),
  constraint cycle_id_village_uq unique (id, village_id)
);

create index cycle_plot_idx    on crop_cycle (plot_id)    where deleted_at is null;
create index cycle_village_idx on crop_cycle (village_id) where deleted_at is null;
create index cycle_window_idx  on crop_cycle (crop_id, harvest_start) where deleted_at is null;

-- A SERIES, not two columns on crop_cycle: expected is farmer_reported,
-- actual is usually field_verified - different source, different confidence,
-- different verifier. Estimates are also revised through a season and the
-- old figures must stay auditable.
create table harvest_report (
  id             uuid primary key default gen_random_uuid(),
  crop_cycle_id  uuid not null references crop_cycle(id) on delete restrict,
  village_id     uuid not null,
  kind           harvest_kind not null,
  quantity_kg    numeric(12,2) not null check (quantity_kg >= 0),
  reported_for   date,
  is_current     boolean not null default true,

  source         source_type         not null,
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

  constraint harvest_cycle_village_fk foreign key (crop_cycle_id, village_id)
    references crop_cycle (id, village_id)
);

-- exactly one live figure per cycle per kind -> aggregation cannot double count
create unique index harvest_one_current
  on harvest_report (crop_cycle_id, kind)
  where is_current and deleted_at is null;

create index harvest_village_idx on harvest_report (village_id) where deleted_at is null;

-- SECURITY DEFINER: reads farm_manager / household_member, which have
-- policies of their own. Keeps the farm policy from recursing.
create or replace function app_farms() returns setof uuid
language sql stable security definer set search_path = public as $$
  select f.id
  from farm f
  where f.deleted_at is null
    and (
      exists (select 1 from farm_manager fm
              where fm.farm_id = f.id and fm.person_id = app_person_id())
      or exists (select 1 from household_member hm
                 where hm.household_id = f.household_id
                   and hm.person_id = app_person_id())
    )
$$;

grant execute on function app_farms to authenticated;

create trigger crop_updated_at           before update on crop           for each row execute function set_updated_at();
create trigger farm_updated_at           before update on farm           for each row execute function set_updated_at();
create trigger plot_updated_at           before update on plot           for each row execute function set_updated_at();
create trigger crop_cycle_updated_at     before update on crop_cycle     for each row execute function set_updated_at();
create trigger harvest_report_updated_at before update on harvest_report for each row execute function set_updated_at();

create trigger crop_audit           after insert or update or delete on crop           for each row execute function write_audit();
create trigger farm_audit           after insert or update or delete on farm           for each row execute function write_audit();
create trigger farm_manager_audit   after insert or update or delete on farm_manager   for each row execute function write_audit();
create trigger plot_audit           after insert or update or delete on plot           for each row execute function write_audit();
create trigger crop_cycle_audit     after insert or update or delete on crop_cycle     for each row execute function write_audit();
create trigger harvest_report_audit after insert or update or delete on harvest_report for each row execute function write_audit();

alter table crop           enable row level security;
alter table farm           enable row level security;
alter table farm_manager   enable row level security;
alter table plot           enable row level security;
alter table crop_cycle     enable row level security;
alter table harvest_report enable row level security;

create policy crop_read   on crop for select to authenticated using (true);
create policy crop_write  on crop for insert to authenticated
  with check (app_has_role('ops') or app_has_role('admin'));
create policy crop_update on crop for update to authenticated
  using (app_has_role('ops') or app_has_role('admin'))
  with check (app_has_role('ops') or app_has_role('admin'));

create policy farm_read_own on farm for select to authenticated
  using (id in (select app_farms()));
create policy farm_read_staff on farm for select to authenticated
  using (app_is_staff() and village_id in (select app_villages()));
create policy farm_write_staff on farm for insert to authenticated
  with check (app_is_staff() and village_id in (select app_villages()));
create policy farm_update_staff on farm for update to authenticated
  using (app_is_staff() and village_id in (select app_villages()))
  with check (app_is_staff() and village_id in (select app_villages()));

create policy fm_read on farm_manager for select to authenticated
  using (farm_id in (select app_farms()) or app_is_staff());
create policy fm_write on farm_manager for insert to authenticated
  with check (app_is_staff());
create policy fm_update on farm_manager for update to authenticated
  using (app_is_staff()) with check (app_is_staff());

create policy plot_read_own on plot for select to authenticated
  using (farm_id in (select app_farms()));
create policy plot_read_staff on plot for select to authenticated
  using (app_is_staff() and village_id in (select app_villages()));
create policy plot_write_staff on plot for insert to authenticated
  with check (app_is_staff() and village_id in (select app_villages()));
create policy plot_update_staff on plot for update to authenticated
  using (app_is_staff() and village_id in (select app_villages()))
  with check (app_is_staff() and village_id in (select app_villages()));

create policy cycle_read_own on crop_cycle for select to authenticated
  using (plot_id in (select id from plot where farm_id in (select app_farms())));
create policy cycle_read_staff on crop_cycle for select to authenticated
  using (app_is_staff() and village_id in (select app_villages()));
create policy cycle_write_staff on crop_cycle for insert to authenticated
  with check (app_is_staff() and village_id in (select app_villages()));
create policy cycle_update_staff on crop_cycle for update to authenticated
  using (app_is_staff() and village_id in (select app_villages()))
  with check (app_is_staff() and village_id in (select app_villages()));

create policy harvest_read_own on harvest_report for select to authenticated
  using (crop_cycle_id in (
    select c.id from crop_cycle c
    join plot p on p.id = c.plot_id
    where p.farm_id in (select app_farms())
  ));
create policy harvest_read_staff on harvest_report for select to authenticated
  using (app_is_staff() and village_id in (select app_villages()));
create policy harvest_write_staff on harvest_report for insert to authenticated
  with check (app_is_staff() and village_id in (select app_villages()));
create policy harvest_update_staff on harvest_report for update to authenticated
  using (app_is_staff() and village_id in (select app_villages()))
  with check (app_is_staff() and village_id in (select app_villages()));
