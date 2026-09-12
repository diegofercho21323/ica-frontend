export type UnitBadgeProps = {
  /** Authoritative ERP unit — exact and UNTRANSLATED (e.g. "KG", "UN", "LT"). */
  unit: string
  /** Optional translated caption (caller passes `t()` output); the unit itself never translates. */
  label?: string
}

/**
 * Read-only ERP unit identifier (F3 capture primitives). Renders the exact
 * unit string verbatim — it is a contract value, never localized — with an
 * optional translated caption alongside it. No interactive behavior; styling
 * resolves entirely through inherited AntD `ConfigProvider` tokens (no
 * literals in this file).
 */
export function UnitBadge({ unit, label }: UnitBadgeProps) {
  return (
    <span>
      {label ? <span>{label} </span> : null}
      <strong>{unit}</strong>
    </span>
  )
}
