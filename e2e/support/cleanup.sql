-- Removes only browser-suite records, in foreign-key dependency order.
--
-- Matches on the E2E- marker that e2e/support/marker.ts writes into every
-- name and label. Seeded demo records carry no marker, so they are out of
-- reach of every statement here. Runs as postgres, which bypasses RLS ---
-- there are no DELETE policies by design.

begin;

create temporary table _e2e_person on commit drop as
  select id from person where family_name like 'E2E-%';

create temporary table _e2e_household on commit drop as
  select distinct hm.household_id as id
  from household_member hm join _e2e_person p on p.id = hm.person_id
  union
  select id from household where label like 'E2E-%';

create temporary table _e2e_farm on commit drop as
  select distinct f.id
  from farm f
  where f.label like 'E2E-%'
     or f.household_id in (select id from _e2e_household)
     or f.id in (select fm.farm_id from farm_manager fm
                 join _e2e_person p on p.id = fm.person_id);

create temporary table _e2e_plot on commit drop as
  select id from plot where farm_id in (select id from _e2e_farm);

create temporary table _e2e_cycle on commit drop as
  select id from crop_cycle where plot_id in (select id from _e2e_plot);

-- leaves first
delete from opportunity_supply where crop_cycle_id in (select id from _e2e_cycle);
delete from harvest_report where crop_cycle_id in (select id from _e2e_cycle);
delete from energy_estimate where pue_request_id in (
  select id from pue_request where person_id in (select id from _e2e_person)
);
delete from pue_request where person_id in (select id from _e2e_person);
delete from crop_cycle where id in (select id from _e2e_cycle);
delete from plot where id in (select id from _e2e_plot);
delete from farm_manager where farm_id in (select id from _e2e_farm);
delete from farm where id in (select id from _e2e_farm);
delete from household_member where household_id in (select id from _e2e_household);
delete from household where id in (select id from _e2e_household);
delete from person where id in (select id from _e2e_person);

-- idempotency receipts whose registration no longer exists
delete from registration_receipt
 where result->>'person_id' is not null
   and not exists (select 1 from person p where p.id = (result->>'person_id')::uuid);

commit;
