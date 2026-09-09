-- ============================================================
-- Ruaha 360 · RLS assertions
-- Run against a freshly migrated + seeded LOCAL database:
--   supabase db reset && psql "$DB_URL" -f supabase/tests/rls_test.sql
-- Every policy in the schema is a hypothesis. This is where they get tested.
-- Each block runs as `authenticated` inside a transaction that is rolled back.
-- ============================================================

\set ON_ERROR_STOP on

\set OPS       '''80000000-0000-4000-8000-000000000002'''
\set OFF_ILU   '''80000000-0000-4000-8000-000000000003'''
\set OFF_MGA   '''80000000-0000-4000-8000-000000000004'''
\set FARM_NEE  '''80000000-0000-4000-8000-000000000005'''
\set FARM_JOS  '''80000000-0000-4000-8000-000000000006'''

create or replace function assert_eq(actual bigint, expected bigint, label text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL % : expected %, got %', label, expected, actual;
  end if;
  raise notice 'pass  %', label;
end $$;

create or replace function assert_raises(stmt text, label text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice 'pass  % (blocked: %)', label, sqlerrm;
    return;
  end;
  raise exception 'FAIL % : statement was ALLOWED and should not have been', label;
end $$;

-- ── 1. farmer sees own farm only ─────────────────────────
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :FARM_NEE)::text, true);
  set local role authenticated;
  select assert_eq((select count(*) from farm), 1, 'farmer Neema sees exactly her own farm');
  select assert_eq((select count(*) from farm
                    where id = '90000000-0000-4000-8000-000000000002'), 0,
                   'farmer Neema cannot see the Kimaro farm');
  select assert_eq((select count(*) from person), 3,
                   'farmer Neema sees herself plus her household only');
rollback;

-- ── 2. officer scoping is per village ────────────────────
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :OFF_ILU)::text, true);
  set local role authenticated;
  select assert_eq((select count(*) from person
                    where village_id = '30000000-0000-4000-8000-000000000001'), 6,
                   'Ilundo officer sees all six Ilundo persons');
  select assert_eq((select count(*) from person
                    where village_id = '30000000-0000-4000-8000-000000000002'), 0,
                   'Ilundo officer sees no Mgama persons');
rollback;

begin;
  select set_config('request.jwt.claims', json_build_object('sub', :OFF_MGA)::text, true);
  set local role authenticated;
  select assert_eq((select count(*) from person
                    where village_id = '30000000-0000-4000-8000-000000000002'), 2,
                   'Mgama officer sees both Mgama persons');
  select assert_eq((select count(*) from farm), 1,
                   'Mgama officer sees only the Mgama farm');
rollback;

-- ── 3. a farmer cannot approve their own request ─────────
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :FARM_NEE)::text, true);
  set local role authenticated;
  select assert_raises(
    $q$ update pue_request set status = 'approved'
        where id = 'd0000000-0000-4000-8000-000000000005' $q$,
    'farmer cannot approve their own request');
  select assert_raises(
    $q$ update pue_request set status = 'under_review'
        where id = 'd0000000-0000-4000-8000-000000000005' $q$,
    'farmer cannot move their own request to review');
rollback;

-- ── 4. ops cannot escalate to admin ──────────────────────
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :OPS)::text, true);
  set local role authenticated;
  select assert_raises(
    $q$ insert into membership (user_id, role, project_id, village_id)
        values ('80000000-0000-4000-8000-000000000005','admin',
                '20000000-0000-4000-8000-000000000001', null) $q$,
    'ops cannot mint an admin membership');
  select assert_raises(
    $q$ insert into membership (user_id, role, project_id, village_id)
        values ('80000000-0000-4000-8000-000000000002','admin',
                '20000000-0000-4000-8000-000000000001', null) $q$,
    'ops cannot self-elevate');
  select assert_raises(
    $q$ update membership set role = 'admin'
        where id = '81000000-0000-4000-8000-000000000005' $q$,
    'ops cannot flip a farmer membership to admin');
rollback;

-- ── 5. the order book is an ops surface ──────────────────
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :FARM_NEE)::text, true);
  set local role authenticated;
  select assert_eq((select count(*) from buyer_demand), 0, 'farmer sees no buyer demand');
  select assert_eq((select count(*) from buyer), 0, 'farmer sees no buyers');
  select assert_eq((select count(*) from v_village_energy), 0,
                   'Tower energy view is empty for a farmer');
  select assert_eq((select count(*) from v_village_production), 0,
                   'Tower production view is empty for a farmer');
  select assert_eq((select count(*) from opportunity), 1,
                   'farmer DOES see the opportunity her own supply is inside');
rollback;

-- ── 6. estimates are trigger-only ────────────────────────
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :OPS)::text, true);
  set local role authenticated;
  select assert_raises(
    $q$ insert into energy_estimate
        (pue_request_id, village_id, rated_power_kw, quantity, hours_per_day, days_per_week)
        values ('d0000000-0000-4000-8000-000000000005',
                '30000000-0000-4000-8000-000000000001', 99, 1, 1, 1) $q$,
    'nobody can hand-write an energy estimate');
rollback;

-- ── 7. supply cannot be double committed ─────────────────
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :OPS)::text, true);
  set local role authenticated;
  insert into opportunity (id, buyer_demand_id, village_id, crop_id, status)
  values ('e2000000-0000-4000-8000-0000000000ff',
          'e1000000-0000-4000-8000-000000000001',
          '30000000-0000-4000-8000-000000000002',
          '40000000-0000-4000-8000-000000000001', 'proposed');
  select assert_raises(
    $q$ insert into opportunity_supply
        (opportunity_id, harvest_report_id, crop_cycle_id, contributed_kg)
        values ('e2000000-0000-4000-8000-0000000000ff',
                'c0000000-0000-4000-8000-000000000002',
                'b0000000-0000-4000-8000-000000000001', 100) $q$,
    'already-committed harvest cannot be promised to a second live opportunity');
rollback;

-- ── 8. the Tower arithmetic ──────────────────────────────
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :OPS)::text, true);
  set local role authenticated;
  select assert_eq((select count(*) from v_village_energy), 2,
                   'both villages appear in the Tower (each has a current capacity row)');
  select assert_eq(
    (select (approved_peak_kw * 1000)::bigint from v_village_energy
      where village_id = '30000000-0000-4000-8000-000000000001'),
    10800, 'Ilundo approved peak = (15.0 + 2 x 1.5) x 0.600 = 10.800 kW');
  select assert_eq(
    (select expected_kg::bigint from v_village_supply
      where village_id = '30000000-0000-4000-8000-000000000001'
        and crop_id = '40000000-0000-4000-8000-000000000001'),
    12000, 'Ilundo September maize expected = 12000 kg (superseded estimate excluded)');
  select assert_eq(
    (select available_kg::bigint from v_village_supply
      where village_id = '30000000-0000-4000-8000-000000000001'
        and crop_id = '40000000-0000-4000-8000-000000000001'),
    5600, 'available = 12000 - 6400 already committed');
rollback;

-- ── 9. superseded harvest figures stay out of aggregates ──
begin;
  select set_config('request.jwt.claims', json_build_object('sub', :OFF_ILU)::text, true);
  set local role authenticated;
  select assert_eq((select count(*) from v_harvest_available
                    where crop_cycle_id = 'b0000000-0000-4000-8000-000000000001'), 1,
                   'exactly one current expected figure survives per cycle');
rollback;

drop function assert_eq(bigint, bigint, text);
drop function assert_raises(text, text);

\echo '--- all RLS assertions passed ---'
