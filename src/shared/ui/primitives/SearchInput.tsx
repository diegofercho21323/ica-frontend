import { Input, type InputRef } from 'antd'
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Button } from './Button'

export type SearchResult = {
  id: string
  /** Identity only — callers must never put quantities or stock here. */
  title: string
  subtitle: string
}

export type SearchInputProps = {
  /** Translated caption (caller passes `t()` output). */
  label: string
  placeholder: string
  inputValue: string
  onInputChange: (value: string) => void
  /** Caller-filtered results; the list renders exactly what it receives. */
  results: SearchResult[]
  open: boolean
  onOpen: () => void
  onClose: () => void
  onSelect: (id: string) => void
  resultsLabel: (count: number) => string
  emptyLabel: string
  closeLabel: string
}

/**
 * Keyboard-first search box (F3 guided/manual capture). `Ctrl+K` focuses the
 * input from anywhere without stealing typed text; arrows move the active
 * option, `Enter` selects, `Esc` closes (a visible close button is the
 * pointer equivalent). The count announces through `role=status`.
 */
export function SearchInput({
  label,
  placeholder,
  inputValue,
  onInputChange,
  results,
  open,
  onOpen,
  onClose,
  onSelect,
  resultsLabel,
  emptyLabel,
  closeLabel,
}: SearchInputProps) {
  const inputId = useId()
  const listId = useId()
  const inputRef = useRef<InputRef>(null)
  // -1 means "no active option yet": the first ArrowDown lands on option 0.
  const [activeIndex, setActiveIndex] = useState(-1)
  const active =
    results.length === 0 ? -1 : Math.min(Math.max(activeIndex, -1), results.length - 1)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    setActiveIndex(-1)
  }, [open])

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
    } else if (event.key === 'Enter') {
      const picked = results[active] ?? results[0]
      if (picked) {
        event.preventDefault()
        onSelect(picked.id)
      }
    } else if (event.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div>
      <label htmlFor={inputId}>{label}</label>
      <Input
        ref={inputRef}
        id={inputId}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${results[active].id}` : undefined}
        value={inputValue}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => onInputChange(event.target.value)}
        onFocus={() => onOpen()}
        onKeyDown={onInputKeyDown}
      />
      <p role="status" className="m-0 text-sm">
        {resultsLabel(results.length)}
      </p>
      {open ? (
        <div>
          {results.length === 0 ? (
            <p className="m-0 text-sm">{emptyLabel}</p>
          ) : (
            <ul id={listId} role="listbox" aria-label={label} className="m-0 list-none p-0">
              {results.map((result, index) => (
                <li
                  key={result.id}
                  id={`${listId}-${result.id}`}
                  role="option"
                  aria-selected={index === active}
                  onClick={() => onSelect(result.id)}
                  className="cursor-pointer py-1"
                >
                  {result.title} <span>{result.subtitle}</span>
                </li>
              ))}
            </ul>
          )}
          <Button size="small" onClick={() => onClose()}>
            {closeLabel}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
