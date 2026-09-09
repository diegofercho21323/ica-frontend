import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NumericInput } from './NumericInput'

describe('NumericInput primitive (F3-PR1)', () => {
  it('labels the input and keeps the exact string verbatim (no float coercion)', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <NumericInput
        id="qty"
        label="Cantidad"
        value=""
        onChange={onChange}
      />,
    )
    const input = screen.getByLabelText('Cantidad')
    expect(input).toHaveAttribute('inputmode', 'decimal')
    await user.type(input, '9007199254740993.000001')
    const emitted = onChange.mock.calls.map(([arg]) => arg as string).join('')
    expect(emitted).toBe('9007199254740993.000001')
    expect(input).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('exposes inline errors via t() strings with aria-describedby', () => {
    render(
      <NumericInput
        id="qty"
        label="Cantidad"
        value="abc"
        onChange={() => {}}
        error="Cantidad inválida. Use hasta 6 decimales."
      />,
    )
    const input = screen.getByLabelText('Cantidad')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const error = screen.getByRole('alert')
    expect(error).toHaveTextContent('Cantidad inválida. Use hasta 6 decimales.')
    expect(input).toHaveAttribute('aria-describedby', error.id)
  })

  it('marks required fields without blocking keyboard entry', () => {
    render(
      <NumericInput id="qty" label="Cantidad" value="" onChange={() => {}} required />,
    )
    expect(screen.getByLabelText(/cantidad/i)).toHaveAttribute('required')
  })
})
