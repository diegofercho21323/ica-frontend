import { useState } from 'react'
import { Button } from '../../shared/ui/primitives/Button'
import { LiveRegion } from '../../shared/ui/primitives/LiveRegion'
import { useRecount } from './useRecount'

/** Blind recount identity: code + name + unit only, never quantities. */
export type RecountLineIdentity = {
  code: string
  name: string
  unit: string
}

/**
 * Every user-facing string arrives via props (the caller passes `t()`
 * output), so the screen never touches `es.json`.
 */
export type RecountScreenStrings = {
  titleLabel: string
  forbiddenLabel: string
  selectHintLabel: string
  lineLabel: (line: RecountLineIdentity) => string
  assigneeLabel: string
  createLabel: string
  creatingLabel: string
  createdLabel: (attemptId: string) => string
  failedLabel: string
  emptySelectionLabel: string
}

/**
 * Leader recount authoring (F4-PR2). Selects a blind subset of lines and an
 * assignee, then mints the child attempt via the port. The list renders
 * identities only — no quantity, stock, or variance ever reaches the DOM.
 * When `canRecount` is false the caller composes `RequireRole` above this
 * screen: an inline 403 mirror shows and no mutation can fire.
 */
export function RecountScreen({
  attemptId,
  lines,
  canRecount,
  strings,
}: {
  attemptId: string
  lines: readonly RecountLineIdentity[]
  canRecount: boolean
  strings: RecountScreenStrings
}) {
  const { requestRecount, isRecounting } = useRecount()
  const [selected, setSelected] = useState<readonly string[]>([])
  const [assignee, setAssignee] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [assertive, setAssertive] = useState(false)

  if (!canRecount) {
    return (
      <section className="flex w-full flex-col gap-4">
        <h2 className="m-0 text-base font-semibold">{strings.titleLabel}</h2>
        <p className="m-0 text-sm">{strings.forbiddenLabel}</p>
      </section>
    )
  }

  const toggle = (code: string) =>
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    )

  const handleCreate = async () => {
    if (selected.length === 0 || isRecounting) return
    try {
      const child = await requestRecount({
        attemptId,
        lineCodes: [...selected],
        assignee,
      })
      setAnnouncement(strings.createdLabel(child.id))
      setAssertive(false)
    } catch {
      setAnnouncement(strings.failedLabel)
      setAssertive(true)
    }
  }

  return (
    <section aria-busy={isRecounting} className="flex w-full flex-col gap-4">
      <h2 className="m-0 text-base font-semibold">{strings.titleLabel}</h2>
      <p className="m-0 text-sm">{strings.selectHintLabel}</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {lines.map((line) => (
          <li key={line.code} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`recount-line-${line.code}`}
              checked={selected.includes(line.code)}
              onChange={() => toggle(line.code)}
            />
            <label htmlFor={`recount-line-${line.code}`} className="text-sm">
              {strings.lineLabel(line)}
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1">
        <label htmlFor="recount-assignee" className="text-sm">
          {strings.assigneeLabel}
        </label>
        <input
          type="text"
          id="recount-assignee"
          value={assignee}
          onChange={(event) => setAssignee(event.target.value)}
        />
      </div>
      {selected.length === 0 ? (
        <p className="m-0 text-sm">{strings.emptySelectionLabel}</p>
      ) : null}
      <Button
        type="primary"
        disabled={selected.length === 0 || isRecounting}
        loading={isRecounting}
        loadingLabel={strings.creatingLabel}
        onClick={() => void handleCreate()}
      >
        {isRecounting ? strings.creatingLabel : strings.createLabel}
      </Button>
      <LiveRegion message={announcement} assertive={assertive} />
    </section>
  )
}
