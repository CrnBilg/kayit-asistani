import type { Course, Issue, Student } from '../types'
import type { CartApi } from '../state/cart'
import { findConflicts, findSection, formatSlots } from '../rules/conflicts'
import { maxEcts, totalEcts } from '../rules/engine'
import { RULES } from '../rules/yasarRules'
import { QuotaBar } from './QuotaBar'

interface Props {
  catalog: Course[]
  student: Student
  cartApi: CartApi
  issues: Issue[]
}

export function CartPanel({ catalog, student, cartApi, issues }: Props) {
  const { cart, setSection, remove, clear } = cartApi
  const total = totalEcts(cart.items, catalog)
  const limit = maxEcts(student)
  const pct = Math.min(100, (total / limit) * 100)
  const clashing = new Set(findConflicts(cart.items, catalog).flatMap((c) => [c.a.code, c.b.code]))
  const meterLevel = total > limit ? 'full' : total < RULES.minEcts ? 'near' : 'ok'

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Seçilen Dersler (Sepet)</h2>
        {cart.items.length > 0 && (
          <button type="button" className="link" onClick={clear}>
            Temizle
          </button>
        )}
      </header>

      <div className={`ects-meter ects-${meterLevel}`}>
        <div className="ects-label">
          <span>Toplam AKTS</span>
          <strong>
            {total} / {limit}
          </strong>
        </div>
        <div className="ects-track">
          <div className="ects-min" style={{ left: `${(RULES.minEcts / limit) * 100}%` }} title={`Asgari ${RULES.minEcts} AKTS`} />
          <div className="ects-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="muted small">
          Asgari {RULES.minEcts} · azami {limit} AKTS (staj hariç)
        </div>
      </div>

      {cart.items.length === 0 ? (
        <p className="empty">Henüz ders seçmedin. Soldaki katalogdan bir şubeye tıkla.</p>
      ) : (
        <div className="table-wrap">
          <table className="obs-table compact">
            <thead>
              <tr>
                <th>Şb.</th>
                <th>Ders</th>
                <th>Z/S</th>
                <th>AKTS</th>
                <th>Kontenjan</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cart.items.map((item) => {
                const found = findSection(catalog, item)
                if (!found) return null
                const { course, section } = found
                const hasError =
                  clashing.has(course.code) ||
                  issues.some((i) => i.level === 'error' && i.courseCode === course.code)
                return (
                  <tr key={course.code} className={hasError ? 'row-error' : undefined}>
                    <td>
                      <select
                        value={section.no}
                        onChange={(e) => setSection(course.code, Number(e.target.value))}
                        aria-label={`${course.code} şube`}
                        disabled={course.sections.length < 2}
                      >
                        {course.sections.map((s) => (
                          <option key={s.no} value={s.no}>
                            {s.no}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="code">{course.code}</div>
                      <div className="small">{course.name}</div>
                      <div className="small muted">{formatSlots(section.slots)}</div>
                    </td>
                    <td className={course.type === 'Z' ? 'z' : 's'}>{course.type}</td>
                    <td>{course.internship ? <span title="Staj AKTS sınırına sayılmaz">{course.ects}*</span> : course.ects}</td>
                    <td>
                      <QuotaBar section={section} />
                    </td>
                    <td>
                      <button type="button" className="icon-btn" onClick={() => remove(course.code)} aria-label={`${course.code} çıkar`}>
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
