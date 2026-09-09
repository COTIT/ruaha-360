-- Ruaha 360 · geography
-- Country -> Project -> Village (Plan S06).
-- CONFIG tables: no provenance columns. A village is not observed.

create type project_status as enum ('setup','active','paused','closed');

create table country (
  id                 uuid primary key default gen_random_uuid(),
  iso2               char(2)     not null unique,
  name               text        not null,
  default_area_unit  area_unit   not null default 'hectare',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table project (
  id          uuid primary key default gen_random_uuid(),
  country_id  uuid not null references country(id) on delete restrict,
  code        text not null,
  name        text not null,
  operator    text,
  status      project_status not null default 'setup',
  started_on  date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (country_id, code)
);

create index project_country_idx on project (country_id);

-- GPS point only. Plan S06: "GPS point first; verified polygons later."
-- Deliberately NOT PostGIS - two numerics keep the DB portable and
-- self-host trivial. Add PostGIS when polygons are actually required.
create table village (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references project(id) on delete restrict,
  code              text not null,
  name              text not null,
  latitude          numeric(9,6) check (latitude between -90 and 90),
  longitude         numeric(9,6) check (longitude between -180 and 180),
  primary_language  text not null default 'sw',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (project_id, code),
  -- required by composite FKs in later migrations (membership, farm, plot)
  constraint village_id_project_uq unique (id, project_id)
);

create index village_project_idx on village (project_id);

create trigger country_updated_at before update on country
  for each row execute function set_updated_at();
create trigger project_updated_at before update on project
  for each row execute function set_updated_at();
create trigger village_updated_at before update on village
  for each row execute function set_updated_at();

create trigger country_audit after insert or update or delete on country
  for each row execute function write_audit();
create trigger project_audit after insert or update or delete on project
  for each row execute function write_audit();
create trigger village_audit after insert or update or delete on village
  for each row execute function write_audit();

-- READ: any signed-in user. Village names are not personal data and every
-- surface needs them to render.
-- WRITE: no policy here -> PostgREST refuses. Ops write policies land in
-- 003, once membership + helpers exist.
alter table country enable row level security;
alter table project enable row level security;
alter table village enable row level security;

create policy country_read on country for select to authenticated using (true);
create policy project_read on project for select to authenticated using (true);
create policy village_read on village for select to authenticated using (true);
