-- Ruaha 360 · identity, membership, RLS foundation
-- person MAY exist with no auth.users row. Nothing may assume the link.

-- ── person ───────────────────────────────────────────────
-- Deliberately minimal PII. No national ID, no DOB, no demographics.
-- S22 has "appropriate farmer identifiers" open - until it closes,
-- store the least that makes the journey work.
create table person (
  id            uuid primary key default gen_random_uuid(),
  village_id    uuid not null references village(id) on delete restrict,
  given_name    text not null,
  family_name   text not null,
  phone         text,

  source        source_type         not null,
  captured_at   timestamptz         not null default now(),
  captured_by   uuid,
  verification  verification_status not null default 'unverified',
  verified_by   uuid,
  verified_at   timestamptz,
  confidence    confidence_level,
  evidence_ref  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index person_village_idx on person (village_id) where deleted_at is null;

create table household (
  id            uuid primary key default gen_random_uuid(),
  village_id    uuid not null references village(id) on delete restrict,
  label         text not null,

  source        source_type         not null,
  captured_at   timestamptz         not null default now(),
  captured_by   uuid,
  verification  verification_status not null default 'unverified',
  verified_by   uuid,
  verified_at   timestamptz,
  confidence    confidence_level,
  evidence_ref  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index household_village_idx on household (village_id) where deleted_at is null;

-- Surrogate uuid key, like every other table: write_audit() records
-- audit_log.record_id as a uuid, so a composite-keyed table cannot be
-- audited. The pair stays unique.
create table household_member (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references household(id) on delete cascade,
  person_id     uuid not null references person(id)    on delete cascade,
  is_head       boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (household_id, person_id)
);

create unique index household_one_head
  on household_member (household_id) where is_head;

-- ── app_user ─────────────────────────────────────────────
-- id IS auth.users.id, so auth.uid() is usable directly everywhere.
-- Holds NO contact data - email lives in auth.users. That is what makes it
-- safe to let any signed-in user read this table (needed to render
-- "verified by ..." without a join through a restricted table).
create table app_user (
  id           uuid primary key references auth.users(id) on delete cascade,
  person_id    uuid references person(id) on delete set null,
  display_name text not null,
  locale       text not null default 'en',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table person    add constraint person_captured_by_fk    foreign key (captured_by) references app_user(id);
alter table person    add constraint person_verified_by_fk    foreign key (verified_by) references app_user(id);
alter table household add constraint household_captured_by_fk foreign key (captured_by) references app_user(id);
alter table household add constraint household_verified_by_fk foreign key (verified_by) references app_user(id);

-- ── membership ───────────────────────────────────────────
-- village_id NULL -> whole-project scope (ops)
-- village_id SET  -> that village only (field officer, farmer)
-- Composite FK guarantees the village belongs to the project.
-- revoked_at, never DELETE: access ends, the audit trail does not.
create table membership (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references app_user(id) on delete cascade,
  role        app_role not null,
  project_id  uuid not null references project(id) on delete restrict,
  village_id  uuid,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  constraint membership_village_in_project
    foreign key (village_id, project_id) references village (id, project_id),
  constraint membership_unique
    unique nulls not distinct (user_id, role, project_id, village_id)
);

create index membership_user_idx on membership (user_id) where revoked_at is null;

-- ── RLS helpers ──────────────────────────────────────────
-- SECURITY DEFINER on purpose: these read `membership`, and a policy on
-- membership that called them would recurse. membership's own read policy is
-- kept trivial (user_id = auth.uid()) for exactly that reason.

create or replace function app_villages() returns setof uuid
language sql stable security definer set search_path = public as $$
  select v.id
  from membership m
  join village v
    on v.id = m.village_id
    or (m.village_id is null and v.project_id = m.project_id)
  where m.user_id = auth.uid() and m.revoked_at is null
$$;

create or replace function app_has_role(r app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from membership
    where user_id = auth.uid() and role = r and revoked_at is null
  )
$$;

create or replace function app_is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from membership
    where user_id = auth.uid()
      and role in ('field_officer','ops','admin')
      and revoked_at is null
  )
$$;

create or replace function app_person_id() returns uuid
language sql stable security definer set search_path = public as $$
  select person_id from app_user where id = auth.uid()
$$;

-- ── household visibility, as SECURITY DEFINER ────────────
-- These exist to break policy recursion, not to add convenience. A policy on
-- `person` that reads `household_member` invokes household_member's policy,
-- which reads `household`, whose policy reads `household_member` again:
-- Postgres aborts with `infinite recursion detected in policy for relation
-- "household_member"`. Resolving the membership question inside a
-- SECURITY DEFINER function reads those tables with RLS off, so there is no
-- cycle to detect.
--
-- NOTE the staff guard sits INSIDE app_staff_households(), not at the call
-- site. app_villages() returns villages for every role that holds a
-- membership row, farmers included, so a village-scoped helper without
-- app_is_staff() would hand a farmer every household in their village.

create or replace function app_households() returns setof uuid
language sql stable security definer set search_path = public as $$
  select hm.household_id
  from household_member hm
  where hm.person_id = app_person_id()
$$;

create or replace function app_household_persons() returns setof uuid
language sql stable security definer set search_path = public as $$
  select them.person_id
  from household_member me
  join household_member them on them.household_id = me.household_id
  where me.person_id = app_person_id()
$$;

create or replace function app_staff_households() returns setof uuid
language sql stable security definer set search_path = public as $$
  select h.id
  from household h
  where app_is_staff()
    and h.village_id in (select app_villages())
$$;

-- ops OR admin in that specific project
create or replace function app_manages_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from membership
    where user_id = auth.uid() and project_id = p
      and role in ('ops','admin') and revoked_at is null
  )
$$;

-- admin in that specific project
create or replace function app_admins_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from membership
    where user_id = auth.uid() and project_id = p
      and role = 'admin' and revoked_at is null
  )
$$;

grant execute on function
  app_villages, app_has_role, app_is_staff, app_person_id,
  app_manages_project, app_admins_project,
  app_households, app_household_persons, app_staff_households
to authenticated;

create trigger person_updated_at    before update on person    for each row execute function set_updated_at();
create trigger household_updated_at before update on household for each row execute function set_updated_at();
create trigger app_user_updated_at  before update on app_user  for each row execute function set_updated_at();

create trigger person_audit     after insert or update or delete on person     for each row execute function write_audit();
create trigger household_audit  after insert or update or delete on household  for each row execute function write_audit();
create trigger household_member_audit after insert or update or delete on household_member for each row execute function write_audit();
create trigger membership_audit after insert or update or delete on membership for each row execute function write_audit();

-- ── RLS ──────────────────────────────────────────────────
alter table person           enable row level security;
alter table household        enable row level security;
alter table household_member enable row level security;
alter table app_user         enable row level security;
alter table membership       enable row level security;

-- NOTE: `(select app_villages())` not `app_villages()` - the subquery form
-- is evaluated once per statement instead of once per row.

create policy person_read_self on person for select to authenticated
  using (id = app_person_id());

create policy person_read_household on person for select to authenticated
  using (id in (select app_household_persons()));

create policy person_read_staff on person for select to authenticated
  using (app_is_staff() and village_id in (select app_villages()));

create policy person_write_staff on person for insert to authenticated
  with check (app_is_staff() and village_id in (select app_villages()));

create policy person_update_staff on person for update to authenticated
  using (app_is_staff() and village_id in (select app_villages()))
  with check (app_is_staff() and village_id in (select app_villages()));

create policy person_update_self on person for update to authenticated
  using (id = app_person_id()) with check (id = app_person_id());

create policy household_read on household for select to authenticated
  using (
    (app_is_staff() and village_id in (select app_villages()))
    or id in (select app_households())
  );

create policy household_write on household for insert to authenticated
  with check (app_is_staff() and village_id in (select app_villages()));

create policy household_update on household for update to authenticated
  using (app_is_staff() and village_id in (select app_villages()))
  with check (app_is_staff() and village_id in (select app_villages()));

create policy hm_read on household_member for select to authenticated
  using (
    household_id in (select app_households())
    or household_id in (select app_staff_households())
  );

create policy hm_write on household_member for insert to authenticated
  with check (app_is_staff());

create policy hm_update on household_member for update to authenticated
  using (app_is_staff()) with check (app_is_staff());

create policy app_user_read on app_user for select to authenticated using (true);
create policy app_user_update_self on app_user for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- membership reads: own rows, plus everything in a project you manage.
-- No recursion: app_manages_project is SECURITY DEFINER and bypasses this
-- very policy.
create policy membership_read_self on membership for select to authenticated
  using (user_id = auth.uid());

create policy membership_read_managers on membership for select to authenticated
  using (app_manages_project(project_id));

-- grant: ops may only mint farmer / field_officer. Admin may mint anything.
-- Nobody may touch their own membership rows.
create policy membership_insert on membership for insert to authenticated
  with check (
    user_id <> auth.uid()
    and (
      app_admins_project(project_id)
      or (app_manages_project(project_id) and role in ('farmer','field_officer'))
    )
  );

-- revoke / amend. USING gates the old row, WITH CHECK gates the new one -
-- both are required, or ops flips a farmer row to role='admin'.
create policy membership_update on membership for update to authenticated
  using (
    user_id <> auth.uid()
    and (
      app_admins_project(project_id)
      or (app_manages_project(project_id) and role in ('farmer','field_officer'))
    )
  )
  with check (
    user_id <> auth.uid()
    and (
      app_admins_project(project_id)
      or (app_manages_project(project_id) and role in ('farmer','field_officer'))
    )
  );

-- ── deferred geography writes (from 002) ─────────────────
create policy project_write  on project for insert to authenticated
  with check (app_has_role('ops') or app_has_role('admin'));
create policy project_update on project for update to authenticated
  using (app_has_role('ops') or app_has_role('admin'))
  with check (app_has_role('ops') or app_has_role('admin'));

create policy village_write  on village for insert to authenticated
  with check (app_has_role('ops') or app_has_role('admin'));
create policy village_update on village for update to authenticated
  using (app_has_role('ops') or app_has_role('admin'))
  with check (app_has_role('ops') or app_has_role('admin'));
