-- Ruaha 360 · Control Tower
-- Every view is security_invoker -> RLS still governs. A view is not a
-- back door around the policies.
-- Every view exposes the ids needed to drill to rows. No headline without a
-- path back to the records under it.

-- Not staff-gated: a farmer legitimately reads their own line here.
-- Only CURRENT EXPECTED reports; harvest_one_current guarantees one per cycle.
create view v_harvest_available with (security_invoker = true) as
select
  hr.id              as harvest_report_id,
  hr.crop_cycle_id,
  hr.village_id,
  cc.crop_id,
  cc.plot_id,
  cc.harvest_start,
  cc.harvest_end,
  hr.quantity_kg,
  hr.confidence,
  hr.verification,
  coalesce(c.committed_kg, 0)                  as committed_kg,
  hr.quantity_kg - coalesce(c.committed_kg, 0) as available_kg
from harvest_report hr
join crop_cycle cc
  on cc.id = hr.crop_cycle_id and cc.deleted_at is null
left join lateral (
  select sum(os.contributed_kg) as committed_kg
  from opportunity_supply os
  join opportunity o on o.id = os.opportunity_id
  where os.harvest_report_id = hr.id
    and o.deleted_at is null
    and o.status in ('proposed','shared','accepted')
) c on true
where hr.deleted_at is null
  and hr.is_current
  and hr.kind = 'expected';

-- cycle_area_ha is the SUM OF CYCLE AREAS, not land area. Intercropping means
-- several cycles share one plot, so this can exceed the village's actual
-- hectares. Named to stop anyone reading it as land.
create view v_village_production with (security_invoker = true) as
select
  cc.village_id,
  cc.crop_id,
  date_trunc('month', cc.harvest_start)::date          as window_month,
  count(*)                                             as cycle_count,
  count(distinct cc.plot_id)                           as plot_count,
  sum(cc.area_ha)                                      as cycle_area_ha,
  sum(cc.tree_count)                                   as tree_count,
  sum(exp.quantity_kg)                                 as expected_kg,
  sum(act.quantity_kg)                                 as actual_kg,
  count(*) filter (where cc.verification = 'verified') as verified_cycles
from crop_cycle cc
left join harvest_report exp
  on exp.crop_cycle_id = cc.id and exp.kind = 'expected'
 and exp.is_current and exp.deleted_at is null
left join harvest_report act
  on act.crop_cycle_id = cc.id and act.kind = 'actual'
 and act.is_current and act.deleted_at is null
where cc.deleted_at is null
  and app_is_staff()
group by cc.village_id, cc.crop_id, date_trunc('month', cc.harvest_start);

-- Three distinctions the plan insists on and the UI must keep:
--   prospective = submitted / under_review -> an APPLICATION, not a load
--   approved    = decided yes              -> still not measured consumption
--   capacity    = PLANNED, per capacity_basis. Never measured.
-- Simultaneity is applied (S10). Summing rated power is wrong.
create view v_village_energy with (security_invoker = true) as
select
  v.id as village_id,
  vc.capacity_kw,
  vc.basis                                as capacity_basis,
  vc.simultaneity_factor,

  coalesce(sum(ee.est_power_kw)
    filter (where pr.status in ('submitted','under_review')), 0) as prospective_kw_raw,
  coalesce(sum(ee.est_power_kw)
    filter (where pr.status = 'approved'), 0)                    as approved_kw_raw,

  round(coalesce(sum(ee.est_power_kw)
    filter (where pr.status in ('submitted','under_review')), 0)
    * vc.simultaneity_factor, 3)                                 as prospective_peak_kw,
  round(coalesce(sum(ee.est_power_kw)
    filter (where pr.status = 'approved'), 0)
    * vc.simultaneity_factor, 3)                                 as approved_peak_kw,

  round(vc.capacity_kw - coalesce(sum(ee.est_power_kw)
    filter (where pr.status = 'approved'), 0)
    * vc.simultaneity_factor, 3)                                 as headroom_kw,

  coalesce(sum(ee.est_kwh_per_week)
    filter (where pr.status = 'approved'), 0)                    as approved_kwh_per_week,

  count(ee.id) filter (where pr.status = 'approved')             as approved_assets
from village v
join village_capacity vc
  on vc.village_id = v.id and vc.is_current
left join energy_estimate ee on ee.village_id = v.id
left join pue_request pr
  on pr.id = ee.pue_request_id and pr.deleted_at is null
where app_is_staff()
group by v.id, vc.capacity_kw, vc.basis, vc.simultaneity_factor;

-- indicative_value is catalogue price x quantity. NOT financed value, NOT a
-- loan book. Research item C: lending classification is unresolved.
create view v_village_pue_pipeline with (security_invoker = true) as
select
  pr.village_id,
  pr.status,
  count(*)                               as request_count,
  sum(eq.indicative_price * pr.quantity) as indicative_value,
  eq.currency
from pue_request pr
join equipment eq on eq.id = pr.equipment_id
where pr.deleted_at is null
  and app_is_staff()
group by pr.village_id, pr.status, eq.currency;

create view v_village_supply with (security_invoker = true) as
select
  ha.village_id,
  ha.crop_id,
  date_trunc('month', ha.harvest_start)::date          as window_month,
  min(ha.harvest_start)                                as window_start,
  max(ha.harvest_end)                                  as window_end,
  sum(ha.quantity_kg)                                  as expected_kg,
  sum(ha.committed_kg)                                 as committed_kg,
  sum(ha.available_kg)                                 as available_kg,
  count(*)                                             as cycle_count,
  count(*) filter (where ha.verification = 'verified') as verified_cycles
from v_harvest_available ha
where app_is_staff()
group by ha.village_id, ha.crop_id, date_trunc('month', ha.harvest_start);

-- The comparison, not a match. Overlapping windows only. No allocation,
-- no ranking, no auto-assignment.
create view v_demand_match with (security_invoker = true) as
select
  bd.id          as buyer_demand_id,
  bd.buyer_id,
  bd.crop_id,
  bd.quantity_kg as demand_kg,
  bd.window_start,
  bd.window_end,
  vs.village_id,
  vs.available_kg,
  least(bd.quantity_kg, vs.available_kg) as coverable_kg,
  round(100 * least(bd.quantity_kg, vs.available_kg)
        / nullif(bd.quantity_kg, 0), 1)  as coverage_pct,
  o.id     as opportunity_id,
  o.status as opportunity_status
from buyer_demand bd
join v_village_supply vs
  on vs.crop_id = bd.crop_id
 and vs.window_start <= bd.window_end
 and vs.window_end   >= bd.window_start
left join opportunity o
  on o.buyer_demand_id = bd.id and o.village_id = vs.village_id
 and o.deleted_at is null
where bd.deleted_at is null
  and bd.status = 'open'
  and app_is_staff();

-- Plan S11 lists data quality as a Tower view in its own right.
create view v_village_data_quality with (security_invoker = true) as
select
  v.id as village_id,
  (select count(*) from person p
     where p.village_id = v.id and p.deleted_at is null)                 as persons,
  (select count(*) from person p
     where p.village_id = v.id and p.deleted_at is null
       and p.verification = 'verified')                                  as persons_verified,
  (select count(*) from farm f
     where f.village_id = v.id and f.deleted_at is null)                 as farms,
  (select count(*) from farm f
     where f.village_id = v.id and f.deleted_at is null
       and f.latitude is not null)                                       as farms_with_gps,
  (select count(*) from crop_cycle c
     where c.village_id = v.id and c.deleted_at is null)                 as cycles,
  (select count(*) from crop_cycle c
     join harvest_report h on h.crop_cycle_id = c.id
      and h.kind = 'expected' and h.is_current and h.deleted_at is null
     where c.village_id = v.id and c.deleted_at is null)                 as cycles_with_estimate
from village v
where app_is_staff();

grant select on
  v_harvest_available, v_village_production, v_village_energy,
  v_village_pue_pipeline, v_village_supply, v_demand_match,
  v_village_data_quality
to authenticated;
