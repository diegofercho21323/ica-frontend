import { Input, Typography } from 'antd'
import { useId } from 'react'

export type NumericInputProps = {
  id?: string
  label: string
  /** Exact-decimal contract string. Never coerced to number. */
  value: string
  onChange: (value: string) => void
  /** Translated inline error (caller passes `t()` output). */
  error?: string
  required?: boolean
  disabled?: boolean
}

/**
 * Exact-string quantity input. Emits keystrokes verbatim so unsafe-precision
 * values (`9007199254740993.000001`) survive end to end; validation lives in
 * the feature slice, display here is the raw string only.
 */
export function NumericInput({
  id,
  label,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
}: NumericInputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = `${inputId}-error`
  return (
    <div>
      <Typography.Text>
        <label htmlFor={inputId}>{label}</label>
      </Typography.Text>
      <Input
        id={inputId}
        value={value}
        inputMode="decimal"
        autoComplete="off"
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <Typography.Text id={errorId} role="alert" type="danger">
          {error}
        </Typography.Text>
      ) : null}
    </div>
  )
}
