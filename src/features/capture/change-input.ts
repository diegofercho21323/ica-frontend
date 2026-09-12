import type { CaptureChange, OperatorLineView } from '../../shared/api/inventory/models'
import type { CaptureMethod } from './guided/useGuidedCapture'

/**
 * Raw form state for one blind-count line save. `quantity` is the operator's
 * exact-decimal string exactly as typed — this module never coerces it to a
 * numeric type, so unsafe-precision values (`9007199254740993.000001`)
 * survive verbatim through the initial send and any advisory confirm resend.
 */
export type ChangeInputForm = {
  quantity: string
  captureMethod: CaptureMethod
}

/**
 * Contract-exact `ChangeInput` builder (capture "Contract-exact ChangeInput").
 * `unit` always comes from the authoritative line, never the form, so a
 * caller cannot smuggle a mismatched unit into the batch; callers that need
 * unit-mismatch rejection validate before calling this builder.
 */
export function buildChangeInput(
  line: Pick<OperatorLineView, 'code' | 'unit'>,
  form: ChangeInputForm,
): CaptureChange {
  return {
    lineCode: line.code,
    quantity: form.quantity,
    state: 'COUNTED',
    unit: line.unit,
    captureMethod: form.captureMethod,
    confirmUnusualQuantity: false,
  }
}

/**
 * Advisory `422 UNUSUAL_QUANTITY` confirm retry: the identical exact-string
 * quantity with `confirm_unusual_quantity: true`. Never rounds, clamps, or
 * otherwise mutates the string — that guarantee is this function's whole
 * purpose.
 */
export function buildConfirmChange(
  line: Pick<OperatorLineView, 'code' | 'unit'>,
  quantity: string,
  captureMethod: CaptureMethod = 'keyboard',
): CaptureChange {
  return {
    lineCode: line.code,
    quantity,
    state: 'COUNTED',
    unit: line.unit,
    captureMethod,
    confirmUnusualQuantity: true,
  }
}
