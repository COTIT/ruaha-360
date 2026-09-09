-- Ruaha 360 · market access (Plan S12)
-- Supply -> aggregation -> buyer demand -> opportunity.
-- MVP records an OPPORTUNITY. Never a sale, delivery, payment or contract.

create type buyer_channel      as enum ('direct','afm','other');
create type demand_status      as enum ('open','matched','closed','cancelled');
create type opportunity_status as enum ('proposed','shared','accepted','declined','lapsed');

-- 'afm' is a channel LABEL only. No API, no partnership assumed
-- (Plan S12: do not rebuild AFM wholesale).
create table buyer (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references project(id) on delete restrict,
  name          text not null,
  channel       buyer_channel not null default 'direct',
  contact_note  text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (project_id, name)
);

-- NO source_type column, on purpose. The five S13 categories classify how we
-- learned a fact about the PRODUCTIVE ECONOMY. A buyer's stated requirement
-- is a counterparty input recorded by ops. A sixth enum value would corrupt
-- S13's model, so this table carries captured_by / verification instead.
create table buyer_demand (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid not null references project(id) on delete restrict,
  buyer_id                uuid not null references buyer(id)   on delete restrict,
  crop_id                 uuid not null references crop(id)    on delete restrict,

  quantity_kg             numeric(12,2) not null check (quantity_kg > 0),
  quality_note            text,
  window_start            date not null,
  window_end              date not null,
  delivery_point          text,
  indicative_price_per_kg numeric(12,2) check (indicative_price_per_kg >= 0),
  currency                char(3) not null default 'TZS',
  status                  demand_status not null default 'open',

  captured_at             timestamptz not null default now(),
  captured_by             uuid references app_user(id),
  verification            verification_status not null default 'unverified',
  confidence              confidence_level,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz,

  constraint demand_window_sane check (window_end >= window_start)
);

create index demand_project_idx on buyer_demand (project_id, status) where deleted_at is null;
create index demand_crop_idx    on buyer_demand (crop_id, window_start) where deleted_at is null;

-- A village CAN supply a demand. Plan authority line: matched opportunity
-- != sale, != payment, != delivery. 'accepted' means both sides agreed to
-- talk further - nothing has moved.
create table opportunity (
  id                  uuid primary key default gen_random_uuid(),
  buyer_demand_id     uuid not null references buyer_demand(id) on delete restrict,
  village_id          uuid not null references village(id) on delete restrict,
  crop_id             uuid not null references crop(id) on delete restrict,
  offered_quantity_kg numeric(12,2) not null default 0 check (offered_quantity_kg >= 0),
  status              opportunity_status not null default 'proposed',
  note                text,

  captured_at         timestamptz not null default now(),
  captured_by         uuid references app_user(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,

  unique (buyer_demand_id, village_id)
);

create index opportunity_village_idx on opportunity (village_id, status) where deleted_at is null;
create index opportunity_demand_idx  on opportunity (buyer_demand_id) where deleted_at is null;

-- THE traceability edge. Strategy poster proof 05:
-- "One buyer opportunity links to its supply records."
create table opportunity_supply (
  id                 uuid primary key default gen_random_uuid(),
  opportunity_id     uuid not null references opportunity(id)    on delete cascade,
  harvest_report_id  uuid not null references harvest_report(id) on delete restrict,
  crop_cycle_id      uuid not null references crop_cycle(id)     on delete restrict,
  contributed_kg     numeric(12,2) not null check (contributed_kg > 0),
  created_at         timestamptz not null default now(),
  unique (opportunity_id, harvest_report_id)
);

create index opp_supply_harvest_idx on opportunity_supply (harvest_report_id);

-- Research item I: "avoid double counting" and "account for already-committed
-- supply." The same harvested kilos cannot be promised to two live buyers.
create or replace function opportunity_supply_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  available numeric(12,2);
  committed numeric(12,2);
begin
  select quantity_kg into available
  from harvest_report
  where id = new.harvest_report_id and deleted_at is null and is_current;

  if available is null then
    raise exception 'supply must reference a current, undeleted harvest report';
  end if;

  select coalesce(sum(os.contributed_kg), 0) into committed
  from opportunity_supply os
  join opportunity o on o.id = os.opportunity_id
  where os.harvest_report_id = new.harvest_report_id
    and os.opportunity_id <> new.opportunity_id
    and o.deleted_at is null
    and o.status in ('proposed','shared','accepted');

  if committed + new.contributed_kg > available then
    raise exception
      'over-commitment: % kg available, % kg already committed, % kg requested',
      available, committed, new.contributed_kg;
  end if;

  return new;
end $$;

create trigger opportunity_supply_guard_trg
  before insert or update on opportunity_supply
  for each row execute function opportunity_supply_guard();

-- keep the headline equal to the sum of its parts
create or replace function opportunity_resum() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  -- Same unassigned-tuple rule as write_audit(): OLD does not exist on INSERT
  -- and NEW does not exist on DELETE, so neither may be read unconditionally.
  -- These are assigned in guarded statements rather than in a CASE
  -- initialiser, because a CASE would still resolve the record reference.
  v_new uuid;
  v_old uuid;
begin
  if tg_op <> 'DELETE' then
    v_new := new.opportunity_id;
  end if;
  if tg_op <> 'INSERT' then
    v_old := old.opportunity_id;
  end if;

  if v_new is not null then
    update opportunity
       set offered_quantity_kg = (
             select coalesce(sum(contributed_kg), 0)
             from opportunity_supply where opportunity_id = v_new
           ),
           updated_at = now()
     where id = v_new;
  end if;

  -- An UPDATE that moves a supply line to a different opportunity leaves the
  -- one it came from overstated, so re-sum that too.
  if v_old is not null and v_old is distinct from v_new then
    update opportunity
       set offered_quantity_kg = (
             select coalesce(sum(contributed_kg), 0)
             from opportunity_supply where opportunity_id = v_old
           ),
           updated_at = now()
     where id = v_old;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

create trigger opportunity_resum_trg
  after insert or update or delete on opportunity_supply
  for each row execute function opportunity_resum();

-- ── opportunity visibility, as SECURITY DEFINER ──────────
-- Same recursion shape as household / household_member in 003:
-- opportunity_read_contributor read opportunity_supply, whose policy read
-- opportunity, whose policy read opportunity_supply. Resolve it with RLS off
-- instead. app_farms() is itself SECURITY DEFINER and defined in 004.
--
-- The staff guard is INSIDE app_staff_opportunities(): app_villages() returns
-- villages for every role holding a membership row, farmers included.

create or replace function app_supplied_opportunities() returns setof uuid
language sql stable security definer set search_path = public as $$
  select distinct os.opportunity_id
  from opportunity_supply os
  join crop_cycle c on c.id = os.crop_cycle_id
  join plot p       on p.id = c.plot_id
  where p.farm_id in (select app_farms())
$$;

create or replace function app_staff_opportunities() returns setof uuid
language sql stable security definer set search_path = public as $$
  select o.id
  from opportunity o
  where app_is_staff()
    and o.village_id in (select app_villages())
$$;

grant execute on function app_supplied_opportunities, app_staff_opportunities
to authenticated;

create trigger buyer_updated_at        before update on buyer        for each row execute function set_updated_at();
create trigger buyer_demand_updated_at before update on buyer_demand for each row execute function set_updated_at();
create trigger opportunity_updated_at  before update on opportunity  for each row execute function set_updated_at();

create trigger buyer_audit        after insert or update or delete on buyer        for each row execute function write_audit();
create trigger buyer_demand_audit after insert or update or delete on buyer_demand for each row execute function write_audit();
create trigger opportunity_audit  after insert or update or delete on opportunity  for each row execute function write_audit();
-- Audited deliberately: this table IS the traceability claim. Who committed
-- whose harvest to which buyer, and when, is exactly the record research
-- item I is about.
create trigger opportunity_supply_audit after insert or update or delete on opportunity_supply for each row execute function write_audit();

alter table buyer              enable row level security;
alter table buyer_demand       enable row level security;
alter table opportunity        enable row level security;
alter table opportunity_supply enable row level security;

-- buyers and demand are an OPS surface. Farmers do not browse the order book.
create policy buyer_read on buyer for select to authenticated
  using (app_is_staff() and project_id in (select app_projects()));
create policy buyer_write on buyer for insert to authenticated
  with check (app_manages_project(project_id));
create policy buyer_update on buyer for update to authenticated
  using (app_manages_project(project_id))
  with check (app_manages_project(project_id));

create policy demand_read on buyer_demand for select to authenticated
  using (app_is_staff() and project_id in (select app_projects()));
create policy demand_write on buyer_demand for insert to authenticated
  with check (app_manages_project(project_id));
create policy demand_update on buyer_demand for update to authenticated
  using (app_manages_project(project_id))
  with check (app_manages_project(project_id));

create policy opportunity_read_staff on opportunity for select to authenticated
  using (app_is_staff() and village_id in (select app_villages()));

-- a farmer sees an opportunity only when their own supply is inside it
create policy opportunity_read_contributor on opportunity for select to authenticated
  using (id in (select app_supplied_opportunities()));

create policy opportunity_write on opportunity for insert to authenticated
  with check (app_is_staff() and village_id in (select app_villages()));
create policy opportunity_update on opportunity for update to authenticated
  using (app_is_staff() and village_id in (select app_villages()))
  with check (app_is_staff() and village_id in (select app_villages()));

create policy opp_supply_read on opportunity_supply for select to authenticated
  using (
    opportunity_id in (select app_supplied_opportunities())
    or opportunity_id in (select app_staff_opportunities())
  );
create policy opp_supply_write on opportunity_supply for insert to authenticated
  with check (app_is_staff());
create policy opp_supply_update on opportunity_supply for update to authenticated
  using (app_is_staff()) with check (app_is_staff());
