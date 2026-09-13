import type { RegisterForm } from '@/features/officer/registerPayload'
import type { CropMeasure } from '@/features/officer/registerSchema'

/**
 * The six groups the one-page registration creates, in the order they are
 * created: person → household → farm → plot → crop cycle → expected harvest.
 */
export type RegisterGroup = 'person' | 'household' | 'farm' | 'plot' | 'cycle' | 'harvest'

export const REGISTER_GROUPS: readonly RegisterGroup[] = [
  'person',
  'household',
  'farm',
  'plot',
  'cycle',
  'harvest',
]

/**
 * Which groups have everything they need.
 *
 * This drives the completion rail, and it is the only thing on the screen that
 * says how far along the officer is. It is deliberately NOT validation: the
 * schema decides what may be submitted, and the database decides what is true.
 * A group here is "filled in", nothing stronger — a rail that claimed a section
 * was correct would be making a promise this code cannot keep.
 *
 * `measure` comes from the crop chosen, so the crop-cycle group asks for the
 * one measure field that crop allows and ignores the other two.
 */
export function isGroupComplete(
  group: RegisterGroup,
  form: RegisterForm,
  measure: CropMeasure | undefined,
): boolean {
  const filled = (value: string | undefined) => (value ?? '').trim().length > 0

  switch (group) {
    case 'person':
      return filled(form.given_name) && filled(form.family_name)
    case 'household':
      return filled(form.household_label)
    case 'farm':
      return filled(form.farm_label)
    case 'plot':
      return filled(form.plot_label) && filled(form.plot_area_ha)
    case 'cycle':
      return (
        filled(form.crop_id) &&
        filled(form.harvest_start) &&
        filled(form.harvest_end) &&
        measureFilled(form, measure)
      )
    case 'harvest':
      return filled(form.harvest_quantity_kg)
  }
}

/** A crop measured by area needs its hectares, and nothing else will do. */
function measureFilled(form: RegisterForm, measure: CropMeasure | undefined): boolean {
  const filled = (value: string | undefined) => (value ?? '').trim().length > 0

  switch (measure) {
    case 'area':
      return filled(form.cycle_area_ha)
    case 'tree_count':
      return filled(form.cycle_tree_count)
    case 'unit_count':
      return filled(form.cycle_unit_count)
    // No crop chosen yet: there is no measure to ask for.
    default:
      return false
  }
}

export function completedGroups(
  form: RegisterForm,
  measure: CropMeasure | undefined,
): RegisterGroup[] {
  return REGISTER_GROUPS.filter((group) => isGroupComplete(group, form, measure))
}
