-- Ruaha 360 · registration RPC
-- The officer's Register screen writes person + household + farm + plot +
-- crop_cycle + expected harvest in ONE transaction. Five chained client
-- inserts on a phone that loses signal leave orphan rows across five tables.
--
-- SECURITY INVOKER on purpose: RLS still applies inside, so an officer can
-- only register into a village they are actually assigned to.

-- Idempotency. A retry after a timeout must not create a second farmer.
create table registration_receipt (
  client_ref  uuid primary key,
  created_by  uuid not null references app_user(id),
  result      jsonb not null,
  created_at  timestamptz not null default now()
);

alter table registration_receipt enable row level security;

create policy receipt_read on registration_receipt for select to authenticated
  using (created_by = auth.uid());
create policy receipt_write on registration_receipt for insert to authenticated
  with check (created_by = auth.uid());

create or replace function app_register_farmer(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ref       uuid := (payload->>'client_ref')::uuid;
  v_village   uuid := (payload->>'village_id')::uuid;
  v_actor     uuid := auth.uid();
  v_existing  jsonb;

  p           jsonb := payload->'person';
  hh          jsonb := payload->'household';
  fa          jsonb := payload->'farm';
  pl          jsonb := payload->'plot';
  cy          jsonb := payload->'cycle';
  hv          jsonb := payload->'harvest';

  v_person    uuid;
  v_household uuid;
  v_farm      uuid;
  v_plot      uuid;
  v_cycle     uuid;
  v_harvest   uuid;
  v_measure   crop_measure;
begin
  if v_ref is null then
    raise exception 'client_ref is required so a retry cannot create a duplicate farmer';
  end if;

  -- idempotent replay
  select result into v_existing from registration_receipt where client_ref = v_ref;
  if v_existing is not null then
    return v_existing || jsonb_build_object('replayed', true);
  end if;

  if not app_is_staff() then
    raise exception 'only field staff may register a farmer';
  end if;

  if v_village is null then
    raise exception 'village_id is required';
  end if;

  -- ---- person -------------------------------------------------
  insert into person (village_id, given_name, family_name, phone,
                      source, captured_at, captured_by, verification, confidence)
  values (v_village, p->>'given_name', p->>'family_name', nullif(p->>'phone',''),
          'field_verified', now(), v_actor, 'unverified',
          nullif(p->>'confidence','')::confidence_level)
  returning id into v_person;

  -- ---- household ----------------------------------------------
  if hh ? 'existing_household_id' then
    v_household := (hh->>'existing_household_id')::uuid;
  else
    insert into household (village_id, label, source, captured_at, captured_by, verification)
    values (v_village, coalesce(nullif(hh->>'label',''), p->>'family_name' || ' household'),
            'field_verified', now(), v_actor, 'unverified')
    returning id into v_household;
  end if;

  insert into household_member (household_id, person_id, is_head)
  values (v_household, v_person, coalesce((hh->>'is_head')::boolean, true))
  on conflict do nothing;

  -- ---- farm ---------------------------------------------------
  if fa ? 'existing_farm_id' then
    v_farm := (fa->>'existing_farm_id')::uuid;
  else
    insert into farm (village_id, household_id, label, latitude, longitude,
                      source, captured_at, captured_by, verification, confidence)
    values (v_village, v_household, fa->>'label',
            nullif(fa->>'latitude','')::numeric, nullif(fa->>'longitude','')::numeric,
            'field_verified', now(), v_actor, 'unverified',
            nullif(fa->>'confidence','')::confidence_level)
    returning id into v_farm;
  end if;

  insert into farm_manager (farm_id, person_id, is_primary)
  values (v_farm, v_person, not exists (select 1 from farm_manager where farm_id = v_farm and is_primary))
  on conflict do nothing;

  -- ---- plot ---------------------------------------------------
  insert into plot (farm_id, village_id, label, area_ha, latitude, longitude,
                    source, captured_at, captured_by, verification, confidence)
  values (v_farm, v_village, pl->>'label', nullif(pl->>'area_ha','')::hectares,
          nullif(pl->>'latitude','')::numeric, nullif(pl->>'longitude','')::numeric,
          'field_verified', now(), v_actor, 'unverified',
          nullif(pl->>'confidence','')::confidence_level)
  returning id into v_plot;

  -- ---- crop cycle ---------------------------------------------
  if cy is not null and cy ? 'crop_id' then
    select measured_by into v_measure from crop where id = (cy->>'crop_id')::uuid;
    if v_measure is null then
      raise exception 'unknown crop';
    end if;

    -- the measure must match how this crop is measured
    if v_measure = 'area'       and nullif(cy->>'area_ha','')    is null then
      raise exception 'this crop is measured by area: area_ha is required';
    elsif v_measure = 'tree_count'  and nullif(cy->>'tree_count','')  is null then
      raise exception 'this crop is measured by tree count: tree_count is required';
    elsif v_measure = 'unit_count'  and nullif(cy->>'unit_count','')  is null then
      raise exception 'this crop is measured by unit count: unit_count is required';
    end if;

    insert into crop_cycle (plot_id, village_id, crop_id, season_label,
                            area_ha, tree_count, unit_count,
                            planted_on, harvest_start, harvest_end, status,
                            source, captured_at, captured_by, verification, confidence)
    values (v_plot, v_village, (cy->>'crop_id')::uuid, nullif(cy->>'season_label',''),
            nullif(cy->>'area_ha','')::hectares,
            nullif(cy->>'tree_count','')::integer,
            nullif(cy->>'unit_count','')::integer,
            nullif(cy->>'planted_on','')::date,
            nullif(cy->>'harvest_start','')::date,
            nullif(cy->>'harvest_end','')::date,
            coalesce(nullif(cy->>'status','')::crop_cycle_status, 'growing'),
            'field_verified', now(), v_actor, 'unverified',
            nullif(cy->>'confidence','')::confidence_level)
    returning id into v_cycle;

    -- ---- expected harvest -------------------------------------
    if hv is not null and nullif(hv->>'quantity_kg','') is not null then
      insert into harvest_report (crop_cycle_id, village_id, kind, quantity_kg,
                                  reported_for, is_current,
                                  source, captured_at, captured_by, verification, confidence)
      values (v_cycle, v_village, 'expected', (hv->>'quantity_kg')::numeric,
              nullif(hv->>'reported_for','')::date, true,
              'farmer_reported', now(), v_actor, 'unverified',
              nullif(hv->>'confidence','')::confidence_level)
      returning id into v_harvest;
    end if;
  end if;

  v_existing := jsonb_build_object(
    'person_id', v_person, 'household_id', v_household, 'farm_id', v_farm,
    'plot_id', v_plot, 'crop_cycle_id', v_cycle, 'harvest_report_id', v_harvest,
    'replayed', false
  );

  insert into registration_receipt (client_ref, created_by, result)
  values (v_ref, v_actor, v_existing);

  return v_existing;
end $$;

grant execute on function app_register_farmer(jsonb) to authenticated;

-- ── supersede an expected harvest figure ─────────────────
-- Retires the current row and inserts the replacement in one transaction so
-- the partial unique index never sees two current rows.
create or replace function app_supersede_harvest(
  p_cycle uuid, p_kind harvest_kind, p_quantity_kg numeric,
  p_source source_type, p_confidence confidence_level default null,
  p_reported_for date default null
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_village uuid;
  v_new     uuid;
begin
  select village_id into v_village from crop_cycle where id = p_cycle and deleted_at is null;
  if v_village is null then
    raise exception 'unknown crop cycle';
  end if;

  update harvest_report
     set is_current = false, updated_at = now()
   where crop_cycle_id = p_cycle and kind = p_kind
     and is_current and deleted_at is null;

  insert into harvest_report (crop_cycle_id, village_id, kind, quantity_kg,
                              reported_for, is_current, source, captured_at,
                              captured_by, verification, confidence)
  values (p_cycle, v_village, p_kind, p_quantity_kg, p_reported_for, true,
          p_source, now(), auth.uid(), 'unverified', p_confidence)
  returning id into v_new;

  return v_new;
end $$;

grant execute on function app_supersede_harvest(uuid, harvest_kind, numeric, source_type, confidence_level, date) to authenticated;

-- ── verify a record ──────────────────────────────────────
-- One entry point so verification can never be set without a verifier.
create or replace function app_verify(p_table text, p_id uuid)
returns void
language plpgsql security invoker set search_path = public as $$
begin
  if p_table not in ('person','household','farm','plot','crop_cycle','harvest_report') then
    raise exception 'not a verifiable table: %', p_table;
  end if;
  if not app_is_staff() then
    raise exception 'only field staff may verify records';
  end if;

  execute format(
    'update %I set verification = %L, verified_by = %L, verified_at = now(), updated_at = now() where id = %L',
    p_table, 'verified', auth.uid(), p_id
  );
end $$;

grant execute on function app_verify(text, uuid) to authenticated;
