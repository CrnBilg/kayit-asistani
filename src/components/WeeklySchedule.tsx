import { DAYS, type Cart, type Course, type Fix, type Issue } from '../types'
import { findConflicts, findSection, toMinutes } from '../rules/conflicts'

const START = 8 * 60
const END = 18 * 60
const HOURS = Array.from({ length: (END - START) / 60 }, (_, i) => 8 + i)

interface Block {
  code: string
  name: string
  section: number
  start: string
  end: string
  conflict: boolean
  lane: number
}

interface Props {
  catalog: Course[]
  cart: Cart
  issues: Issue[]
  onFix: (fix: Fix) => void
}

export function WeeklySchedule({ catalog, cart, issues, onFix }: Props) {
  const conflicts = findConflicts(cart.items, catalog)
  const clashing = new Set(conflicts.flatMap((c) => [c.a.code, c.b.code]))
  const online = cart.items
    .map((i) => findSection(catalog, i))
    .filter((x) => x !== undefined && x.section.slots.length === 0)

  const byDay = DAYS.map((day) => {
    const blocks: Block[] = []
    for (const item of cart.items) {
      const found = findSection(catalog, item)
      if (!found) continue
      for (const slot of found.section.slots.filter((s) => s.day === day)) {
        blocks.push({
          code: found.course.code,
          name: found.course.name,
          section: item.section,
          start: slot.start,
          end: slot.end,
          conflict: clashing.has(found.course.code),
          lane: 0,
        })
      }
    }
    // Çakışan blokları yan yana koymak için şerit ata
    blocks.sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
    const laneEnds: number[] = []
    for (const b of blocks) {
      const lane = laneEnds.findIndex((end) => end <= toMinutes(b.start))
      b.lane = lane === -1 ? laneEnds.length : lane
      laneEnds[b.lane] = toMinutes(b.end)
    }
    return { day, blocks, lanes: Math.max(1, laneEnds.length) }
  })

  const conflictFixes = issues.filter((i) => i.ruleId === 'CONFLICT')

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Haftalık Program</h2>
        {conflicts.length > 0 ? (
          <span className="count count-error">{conflicts.length} çakışma</span>
        ) : (
          cart.items.length > 0 && <span className="count count-ok">Çakışma yok</span>
        )}
      </header>

      {conflictFixes.length > 0 && (
        <ul className="issues">
          {conflictFixes.map((i, idx) => (
            <li key={idx} className="issue issue-error">
              <span className="issue-text">{i.message}</span>
              {i.fix && (
                <button type="button" className="btn btn-small" onClick={() => onFix(i.fix!)}>
                  {i.fixLabel}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="schedule">
        <div className="schedule-times">
          <div className="schedule-dayhead" />
          {HOURS.map((h) => (
            <div key={h} className="schedule-hour">
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>
        {byDay.map(({ day, blocks, lanes }) => (
          <div key={day} className="schedule-col">
            <div className="schedule-dayhead">{day}</div>
            <div className="schedule-body">
              {HOURS.map((h) => (
                <div key={h} className="schedule-cell" />
              ))}
              {blocks.map((b) => {
                const top = ((toMinutes(b.start) - START) / (END - START)) * 100
                const height = ((toMinutes(b.end) - toMinutes(b.start)) / (END - START)) * 100
                return (
                  <div
                    key={`${b.code}-${b.start}`}
                    className={`block${b.conflict ? ' block-conflict' : ''}`}
                    style={{
                      top: `${top}%`,
                      height: `${height}%`,
                      left: `${(b.lane / lanes) * 100}%`,
                      width: `${100 / lanes}%`,
                    }}
                    title={`${b.code} ${b.name} — Şb.${b.section} ${b.start}–${b.end}`}
                  >
                    <strong>{b.code}</strong>
                    <span>Şb.{b.section}</span>
                    <span>
                      {b.start}–{b.end}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {online.length > 0 && (
        <p className="muted small">
          Saatsiz dersler (çevrimiçi/staj): {online.map((o) => o!.course.code).join(', ')}
        </p>
      )}
    </section>
  )
}
