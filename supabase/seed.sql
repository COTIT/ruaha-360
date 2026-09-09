-- ============================================================
-- Ruaha 360 · DEMO SEED
-- Synthetic data. Plan S20: realistic and conspicuously labelled.
-- Every figure here is invented. Nothing is a measured Ruaha result.
--
-- The UI banner is driven by VITE_DATA_MODE=demo, NOT by a column.
-- There is no is_demo flag by design: the demo instance and the live
-- instance are different databases.
-- ============================================================

-- ── safety rail ──────────────────────────────────────────
do $$
begin
  if exists (select 1 from project where code not like '%-DEMO') then
    raise exception
      'refusing to seed: this database holds a non-demo project. Seed is for demo instances only.';
  end if;
end $$;

-- ── user helper (dropped at the end) ─────────────────────
-- NOTE: the auth.users / auth.identities shape is GoTrue-version sensitive.
-- If this breaks after a Supabase upgrade, create the six users with the
-- CLI/Admin API using these exact UUIDs, then re-run from `-- app_user` down.
create or replace function seed_user(
  p_id uuid, p_email text, p_password text,
  p_name text, p_locale text, p_person uuid
) returns void language plpgsql as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
    p_email, crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    '', '', '', ''
  ) on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), p_id,
    jsonb_build_object('sub', p_id::text, 'email', p_email),
    'email', p_id::text, now(), now(), now()
  ) on conflict do nothing;

  insert into app_user (id, person_id, display_name, locale)
  values (p_id, p_person, p_name, p_locale)
  on conflict (id) do update
    set person_id = excluded.person_id, display_name = excluded.display_name;
end $$;

-- ── geography ────────────────────────────────────────────
insert into country (id, iso2, name, default_area_unit) values
  ('10000000-0000-4000-8000-000000000001', 'TZ', 'Tanzania', 'hectare')
on conflict (id) do nothing;

insert into project (id, country_id, code, name, operator, status, started_on) values
  ('20000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001',
   'ILUNDO-DEMO', 'Ruaha Ilundo Programme — DEMO', 'Ruaha Energy', 'active', date '2026-01-15')
on conflict (id) do nothing;

insert into village (id, project_id, code, name, latitude, longitude, primary_language) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   'ILUNDO', 'Ilundo', -8.128900, 35.187400, 'sw'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001',
   'MGAMA',  'Mgama',  -8.062100, 35.310500, 'sw')
on conflict (id) do nothing;

-- EVERY village needs a current capacity row or it vanishes from the Tower
-- (v_village_energy inner-joins village_capacity on is_current).
insert into village_capacity
  (id, village_id, capacity_kw, basis, simultaneity_factor, source_note, effective_from) values
  ('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   500.00, 'planned', 0.600,
   'DEMO. Two hydro generators plus backup solar, approx 0.5 MW planned (Plan v2 S03). No battery confirmed.',
   date '2026-01-15'),
  ('31000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002',
   150.00, 'planned', 0.650,
   'DEMO. Indicative comparison village. Not a Ruaha figure.',
   date '2026-01-15')
on conflict (id) do nothing;

-- ── crops ────────────────────────────────────────────────
insert into crop (id, code, name_en, name_sw, measured_by) values
  ('40000000-0000-4000-8000-000000000001', 'MAIZE',   'Maize',   'Mahindi',  'area'),
  ('40000000-0000-4000-8000-000000000002', 'AVOCADO', 'Avocado', 'Parachichi','tree_count'),
  ('40000000-0000-4000-8000-000000000003', 'COFFEE',  'Coffee',  'Kahawa',   'tree_count'),
  ('40000000-0000-4000-8000-000000000004', 'BANANA',  'Banana',  'Ndizi',    'tree_count'),
  ('40000000-0000-4000-8000-000000000005', 'HONEY',   'Honey',   'Asali',    'unit_count')
on conflict (id) do nothing;

-- ── equipment ────────────────────────────────────────────
insert into equipment_category (id, code, name_en, name_sw) values
  ('50000000-0000-4000-8000-000000000001', 'MILLING',    'Milling',           'Kusaga'),
  ('50000000-0000-4000-8000-000000000002', 'IRRIGATION', 'Irrigation',        'Umwagiliaji'),
  ('50000000-0000-4000-8000-000000000003', 'PROCESSING', 'Processing',        'Usindikaji'),
  ('50000000-0000-4000-8000-000000000004', 'COOLING',    'Cooling and drying','Kupoeza na kukausha')
on conflict (id) do nothing;

insert into equipment (id, project_id, category_id, code, name_en, name_sw,
                       rated_power_kw, typical_hours_per_day, typical_days_per_week,
                       indicative_price, currency) values
  ('51000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   '50000000-0000-4000-8000-000000000001', 'MILL-500',
   'Maize mill 500 kg/hr', 'Mashine ya kusaga mahindi 500 kg/saa',
   15.000, 6.00, 5.0, 22000000.00, 'TZS'),
  ('51000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001',
   '50000000-0000-4000-8000-000000000002', 'PUMP-2HP',
   'Solar water pump 2 HP', 'Pampu ya maji ya jua 2 HP',
   1.500, 5.00, 6.0, 8300000.00, 'TZS'),
  ('51000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001',
   '50000000-0000-4000-8000-000000000003', 'PRESS-200',
   'Oil press 200 kg/day', 'Mashine ya kukamua mafuta 200 kg/siku',
   7.500, 4.00, 5.0, 15000000.00, 'TZS'),
  ('51000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001',
   '50000000-0000-4000-8000-000000000004', 'DRYER-1T',
   'Grain dryer 1000 kg/batch', 'Mashine ya kukausha nafaka 1000 kg',
   12.000, 8.00, 4.0, 32000000.00, 'TZS'),
  ('51000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001',
   '50000000-0000-4000-8000-000000000004', 'COLD-5',
   'Cold room 5 kW', 'Chumba cha baridi 5 kW',
   5.000, 24.00, 7.0, 41000000.00, 'TZS')
on conflict (id) do nothing;

-- ── people (captured_by set later: app_user does not exist yet) ──
insert into person (id, village_id, given_name, family_name, phone, source, verification, confidence) values
  ('60000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Neema','Mwakalinga','+255700000101','field_verified','verified','high'),
  ('60000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','Joseph','Kimaro','+255700000102','field_verified','verified','high'),
  ('60000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','Amina','Sanga',null,'farmer_reported','unverified','medium'),
  ('60000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','Baraka','Mgeni','+255700000104','field_verified','verified','medium'),
  ('60000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000001','Rehema','Mwakalinga',null,'farmer_reported','pending','low'),
  ('60000000-0000-4000-8000-000000000006','30000000-0000-4000-8000-000000000001','Daudi','Mbwana',null,'farmer_reported','unverified','low'),
  ('60000000-0000-4000-8000-000000000007','30000000-0000-4000-8000-000000000002','Zawadi','Ngowi','+255700000107','field_verified','verified','high'),
  ('60000000-0000-4000-8000-000000000008','30000000-0000-4000-8000-000000000002','Elias','Mlaki',null,'farmer_reported','unverified','medium')
on conflict (id) do nothing;

insert into household (id, village_id, label, source, verification) values
  ('70000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Mwakalinga household','field_verified','verified'),
  ('70000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','Kimaro household','field_verified','verified'),
  ('70000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','Sanga household','farmer_reported','unverified'),
  ('70000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000002','Ngowi household','field_verified','verified')
on conflict (id) do nothing;

insert into household_member (household_id, person_id, is_head) values
  ('70000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001', true),
  ('70000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000005', false),
  ('70000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000002', true),
  ('70000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000006', false),
  ('70000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000003', true),
  ('70000000-0000-4000-8000-000000000004','60000000-0000-4000-8000-000000000007', true)
on conflict do nothing;

-- ── users ────────────────────────────────────────────────
-- Password for every demo account: demo1234
-- Persons 3, 5, 6, 8 deliberately have NO login. Officer-assisted access is
-- the real path; nothing may assume person -> auth.users exists.
select seed_user('80000000-0000-4000-8000-000000000001','admin@demo.ruaha360.test','demo1234','Demo Admin','en', null);
select seed_user('80000000-0000-4000-8000-000000000002','ops@demo.ruaha360.test','demo1234','Asha Ops','en', null);
select seed_user('80000000-0000-4000-8000-000000000003','officer.ilundo@demo.ruaha360.test','demo1234','Salima Officer','sw', null);
select seed_user('80000000-0000-4000-8000-000000000004','officer.mgama@demo.ruaha360.test','demo1234','Peter Officer','sw', null);
select seed_user('80000000-0000-4000-8000-000000000005','neema@demo.ruaha360.test','demo1234','Neema Mwakalinga','sw','60000000-0000-4000-8000-000000000001');
select seed_user('80000000-0000-4000-8000-000000000006','joseph@demo.ruaha360.test','demo1234','Joseph Kimaro','sw','60000000-0000-4000-8000-000000000002');

insert into membership (id, user_id, role, project_id, village_id) values
  ('81000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000001','admin','20000000-0000-4000-8000-000000000001', null),
  ('81000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000002','ops','20000000-0000-4000-8000-000000000001', null),
  ('81000000-0000-4000-8000-000000000003','80000000-0000-4000-8000-000000000003','field_officer','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001'),
  ('81000000-0000-4000-8000-000000000004','80000000-0000-4000-8000-000000000004','field_officer','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002'),
  ('81000000-0000-4000-8000-000000000005','80000000-0000-4000-8000-000000000005','farmer','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001'),
  ('81000000-0000-4000-8000-000000000006','80000000-0000-4000-8000-000000000006','farmer','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

-- now the provenance back-references resolve
update person set captured_by = '80000000-0000-4000-8000-000000000003',
                  verified_by = case when verification = 'verified'
                                then '80000000-0000-4000-8000-000000000003' end,
                  verified_at = case when verification = 'verified' then now() end
 where village_id = '30000000-0000-4000-8000-000000000001';

update person set captured_by = '80000000-0000-4000-8000-000000000004',
                  verified_by = case when verification = 'verified'
                                then '80000000-0000-4000-8000-000000000004' end,
                  verified_at = case when verification = 'verified' then now() end
 where village_id = '30000000-0000-4000-8000-000000000002';

update household set captured_by = '80000000-0000-4000-8000-000000000003'
 where village_id = '30000000-0000-4000-8000-000000000001';
update household set captured_by = '80000000-0000-4000-8000-000000000004'
 where village_id = '30000000-0000-4000-8000-000000000002';

-- ── farms and plots ──────────────────────────────────────
insert into farm (id, village_id, household_id, label, latitude, longitude,
                  source, captured_by, verification, verified_by, verified_at, confidence) values
  ('90000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','Shamba la Neema',-8.130100,35.189200,'field_verified','80000000-0000-4000-8000-000000000003','verified','80000000-0000-4000-8000-000000000003',now(),'high'),
  ('90000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002','Shamba la Kimaro',-8.126400,35.185800,'field_verified','80000000-0000-4000-8000-000000000003','verified','80000000-0000-4000-8000-000000000003',now(),'high'),
  ('90000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000003','Shamba la Sanga',null,null,'farmer_reported','80000000-0000-4000-8000-000000000003','unverified',null,null,'low'),
  ('90000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001',null,'Shamba la Mgeni',-8.131900,35.192700,'field_verified','80000000-0000-4000-8000-000000000003','pending',null,null,'medium'),
  ('90000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000004','Shamba la Ngowi',-8.061400,35.311900,'field_verified','80000000-0000-4000-8000-000000000004','verified','80000000-0000-4000-8000-000000000004',now(),'high')
on conflict (id) do nothing;

insert into farm_manager (farm_id, person_id, is_primary) values
  ('90000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001', true),
  ('90000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000002', true),
  ('90000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000003', true),
  ('90000000-0000-4000-8000-000000000004','60000000-0000-4000-8000-000000000004', true),
  ('90000000-0000-4000-8000-000000000005','60000000-0000-4000-8000-000000000007', true)
on conflict do nothing;

insert into plot (id, farm_id, village_id, label, area_ha, latitude, longitude,
                  source, captured_by, verification, confidence) values
  ('a0000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Kipande cha juu',1.8000,-8.130300,35.189500,'field_verified','80000000-0000-4000-8000-000000000003','verified','high'),
  ('a0000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Kipande cha chini',0.9000,-8.130800,35.190100,'field_verified','80000000-0000-4000-8000-000000000003','verified','high'),
  ('a0000000-0000-4000-8000-000000000003','90000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','Kipande cha mto',2.4000,-8.126900,35.186300,'field_verified','80000000-0000-4000-8000-000000000003','verified','medium'),
  ('a0000000-0000-4000-8000-000000000004','90000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','Kipande cha barabara',1.1000,null,null,'farmer_reported','80000000-0000-4000-8000-000000000003','unverified','low'),
  ('a0000000-0000-4000-8000-000000000005','90000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','Kipande kimoja',0.6000,null,null,'farmer_reported','80000000-0000-4000-8000-000000000003','unverified','low'),
  ('a0000000-0000-4000-8000-000000000006','90000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','Kipande cha mlima',3.2000,-8.132400,35.193100,'field_verified','80000000-0000-4000-8000-000000000003','pending','medium'),
  ('a0000000-0000-4000-8000-000000000007','90000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000002','Kipande cha Ngowi',1.5000,-8.061700,35.312200,'field_verified','80000000-0000-4000-8000-000000000004','verified','high')
on conflict (id) do nothing;

-- ── crop cycles ──────────────────────────────────────────
-- Plot a...001 carries BOTH maize and banana at once: intercropping is real,
-- and cycle areas may exceed plot area. v_village_production names the column
-- cycle_area_ha for exactly this reason.
insert into crop_cycle (id, plot_id, village_id, crop_id, season_label, area_ha, tree_count, unit_count,
                        planted_on, harvest_start, harvest_end, status,
                        source, captured_by, verification, confidence) values
  ('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Msimu 2026 A',1.6000,null,null,date '2026-03-05',date '2026-09-01',date '2026-09-30','growing','field_verified','80000000-0000-4000-8000-000000000003','verified','high'),
  ('b0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000004','Msimu 2026 A',0.4000,120,null,date '2025-11-10',date '2026-09-10',date '2026-10-20','growing','field_verified','80000000-0000-4000-8000-000000000003','verified','medium'),
  ('b0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Msimu 2026 A',0.9000,null,null,date '2026-03-08',date '2026-09-05',date '2026-09-28','growing','field_verified','80000000-0000-4000-8000-000000000003','verified','high'),
  ('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Msimu 2026 A',2.4000,null,null,date '2026-03-02',date '2026-09-02',date '2026-09-25','growing','field_verified','80000000-0000-4000-8000-000000000003','verified','medium'),
  ('b0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000003',null,null,340,null,date '2023-04-01',date '2026-06-01',date '2026-07-31','harvested','farmer_reported','80000000-0000-4000-8000-000000000003','unverified','low'),
  ('b0000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002',null,null,85,null,date '2022-02-01',date '2026-04-01',date '2026-05-31','harvested','farmer_reported','80000000-0000-4000-8000-000000000003','unverified','low'),
  ('b0000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000006','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000005',null,null,null,24,null,date '2026-08-01',date '2026-11-30','growing','farmer_reported','80000000-0000-4000-8000-000000000003','pending','low'),
  ('b0000000-0000-4000-8000-000000000008','a0000000-0000-4000-8000-000000000007','30000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001','Msimu 2026 A',1.5000,null,null,date '2026-03-12',date '2026-09-08',date '2026-09-30','growing','field_verified','80000000-0000-4000-8000-000000000004','verified','high')
on conflict (id) do nothing;

-- ── harvest reports ──────────────────────────────────────
-- c...001 is SUPERSEDED (is_current = false): the estimate was revised.
-- Research item I wants fresh harvest updates without losing the old figure.
insert into harvest_report (id, crop_cycle_id, village_id, kind, quantity_kg, reported_for,
                            is_current, source, captured_by, verification, confidence) values
  ('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','expected',3200.00,date '2026-09-15', false,'farmer_reported','80000000-0000-4000-8000-000000000003','unverified','low'),
  ('c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','expected',4100.00,date '2026-09-15', true, 'field_verified','80000000-0000-4000-8000-000000000003','verified','high'),
  ('c0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','expected',2300.00,date '2026-09-15', true, 'field_verified','80000000-0000-4000-8000-000000000003','verified','high'),
  ('c0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','expected',5600.00,date '2026-09-12', true, 'field_verified','80000000-0000-4000-8000-000000000003','verified','medium'),
  ('c0000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','expected',1800.00,date '2026-09-20', true, 'farmer_reported','80000000-0000-4000-8000-000000000003','unverified','medium'),
  ('c0000000-0000-4000-8000-000000000006','b0000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000001','expected', 900.00,date '2026-06-15', true, 'farmer_reported','80000000-0000-4000-8000-000000000003','unverified','low'),
  ('c0000000-0000-4000-8000-000000000007','b0000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000001','actual',   820.00,date '2026-07-20', true, 'field_verified','80000000-0000-4000-8000-000000000003','verified','high'),
  ('c0000000-0000-4000-8000-000000000008','b0000000-0000-4000-8000-000000000006','30000000-0000-4000-8000-000000000001','actual',  1150.00,date '2026-05-18', true, 'field_verified','80000000-0000-4000-8000-000000000003','verified','medium'),
  ('c0000000-0000-4000-8000-000000000009','b0000000-0000-4000-8000-000000000008','30000000-0000-4000-8000-000000000002','expected',2700.00,date '2026-09-18', true, 'field_verified','80000000-0000-4000-8000-000000000004','verified','high')
on conflict (id) do nothing;

-- ── PUE requests ─────────────────────────────────────────
-- Inserted as draft/submitted (the guard forbids anything else on INSERT),
-- then walked through legal transitions while impersonating the ops user so
-- app_has_role('ops') is true inside pue_request_guard().
insert into pue_request (id, village_id, person_id, farm_id, equipment_id, quantity,
                         hours_per_day, days_per_week, purpose, status,
                         source, captured_by, confidence) values
  ('d0000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001',1,6.00,5.0,'Kusaga mahindi ya kijiji','submitted','farmer_reported','80000000-0000-4000-8000-000000000003','high'),
  ('d0000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000002','51000000-0000-4000-8000-000000000002',2,5.00,6.0,'Umwagiliaji wa kipande cha mto','submitted','farmer_reported','80000000-0000-4000-8000-000000000003','high'),
  ('d0000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000004','90000000-0000-4000-8000-000000000004','51000000-0000-4000-8000-000000000004',1,8.00,4.0,'Kukausha nafaka baada ya mavuno','submitted','farmer_reported','80000000-0000-4000-8000-000000000003','medium'),
  ('d0000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000003','90000000-0000-4000-8000-000000000003','51000000-0000-4000-8000-000000000003',1,4.00,5.0,'Kukamua mafuta ya alizeti','submitted','farmer_reported','80000000-0000-4000-8000-000000000003','low'),
  ('d0000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001',null,'51000000-0000-4000-8000-000000000005',1,24.00,7.0,'Chumba cha baridi kwa mboga','draft','farmer_reported','80000000-0000-4000-8000-000000000003','low'),
  ('d0000000-0000-4000-8000-000000000006','30000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000007','90000000-0000-4000-8000-000000000005','51000000-0000-4000-8000-000000000002',1,5.00,6.0,'Umwagiliaji Mgama','submitted','farmer_reported','80000000-0000-4000-8000-000000000004','medium')
on conflict (id) do nothing;

do $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub','80000000-0000-4000-8000-000000000002')::text, true);

  -- approved
  update pue_request set status = 'under_review' where id = 'd0000000-0000-4000-8000-000000000001';
  update pue_request set status = 'approved', decision_note = 'DEMO approval. Capacity headroom confirmed.'
   where id = 'd0000000-0000-4000-8000-000000000001';

  update pue_request set status = 'under_review' where id = 'd0000000-0000-4000-8000-000000000002';
  update pue_request set status = 'approved', decision_note = 'DEMO approval.'
   where id = 'd0000000-0000-4000-8000-000000000002';

  -- under review, left open
  update pue_request set status = 'under_review' where id = 'd0000000-0000-4000-8000-000000000003';

  -- rejected
  update pue_request set status = 'under_review' where id = 'd0000000-0000-4000-8000-000000000004';
  update pue_request set status = 'rejected', decision_note = 'DEMO rejection. Crop mix does not support the asset.'
   where id = 'd0000000-0000-4000-8000-000000000004';

  -- withdrawn
  update pue_request set status = 'withdrawn' where id = 'd0000000-0000-4000-8000-000000000006';

  perform set_config('request.jwt.claims', '', true);
end $$;

-- ── market ───────────────────────────────────────────────
insert into buyer (id, project_id, name, channel, contact_note) values
  ('e0000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Iringa Grain Traders — DEMO','direct','DEMO buyer. Not a real counterparty.'),
  ('e0000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Highland Coffee Exporters — DEMO','afm','DEMO buyer. AFM listed as a possible channel only; no API, no partnership.')
on conflict (id) do nothing;

-- D1 MATCHES: maize, September window, Ilundo has supply.
-- D2 DOES NOT: coffee in a window with no coffee cycle. The Tower must show
-- an honest zero rather than hiding the demand.
insert into buyer_demand (id, project_id, buyer_id, crop_id, quantity_kg, quality_note,
                          window_start, window_end, delivery_point,
                          indicative_price_per_kg, currency, status,
                          captured_by, verification, confidence) values
  ('e1000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',9000.00,'Dry, below 13.5% moisture. DEMO figure.',date '2026-09-01',date '2026-09-30','Ilundo collection shed',780.00,'TZS','open','80000000-0000-4000-8000-000000000002','unverified','medium'),
  ('e1000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000003',4000.00,'Washed arabica. DEMO figure.',date '2027-01-01',date '2027-02-28','Iringa warehouse',5200.00,'TZS','open','80000000-0000-4000-8000-000000000002','unverified','low')
on conflict (id) do nothing;

insert into opportunity (id, buyer_demand_id, village_id, crop_id, status, note, captured_by) values
  ('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','proposed','DEMO opportunity. An opportunity is not a sale, a delivery or a payment.','80000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

-- offered_quantity_kg is re-summed by trigger from these rows
insert into opportunity_supply (opportunity_id, harvest_report_id, crop_cycle_id, contributed_kg) values
  ('e2000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001',4100.00),
  ('e2000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000003',2300.00)
on conflict do nothing;

drop function seed_user(uuid, text, text, text, text, uuid);

-- ── what you should see ──────────────────────────────────
--  Ilundo maize, Sept window : 4100 + 2300 + 5600 = 12000 kg expected
--  committed to the demo opportunity           : 6400 kg
--  still available                             : 5600 kg
--  demand D1 9000 kg -> coverable 5600, coverage 62.2%
--  approved peak = (15.000 + 2 x 1.500) x 0.600 = 10.800 kW
--  headroom      = 500.00 - 10.800            = 489.200 kW
--  D2 coffee     : zero matching supply. Correct, and must be shown.
