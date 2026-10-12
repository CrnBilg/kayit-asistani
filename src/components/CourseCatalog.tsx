import { useState } from 'react'
import type { Cart, Course, Student } from '../types'
import { findSection, formatSlots, isFull, sectionsConflict } from '../rules/conflicts'
import { eligibility, latestGrade, missingPrerequisites, type Eligibility } from '../rules/engine'
import { QuotaBar } from './QuotaBar'

interface Props {
  catalog: Course[]
  student: Student
  cart: Cart
  onSelect: (code: string, section: number) => void
}

function StatusBadge({ student, course }: { student: Student; course: Course }) {
  const e: Eligibility = eligibility(student, course)
  const grade = latestGrade(student, course.code)?.grade
  if (e === 'passed') return <span className="badge badge-muted">Geçildi ({grade})</span>
  if (e === 'retake') return <span className="badge badge-warn">Alttan ({grade})</span>
  if (e === 'prereq')
    return (
      <span className="badge badge-error" title="Ön koşul dersinden başarılı olmalısın">
        Ön koşul: {missingPrerequisites(student, course).join(', ')}
      </span>
    )
  return <span className="badge badge-ok">Alınabilir</span>
}

export function CourseCatalog({ catalog, student, cart, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [year, setYear] = useState(0)
  const [type, setType] = useState<'' | 'Z' | 'S'>('')
  const [onlyEligible, setOnlyEligible] = useState(true)

  const q = query.trim().toLocaleLowerCase('tr')
  const courses = catalog.filter((c) => {
    if (q && !`${c.code} ${c.name}`.toLocaleLowerCase('tr').includes(q)) return false
    if (year && c.year !== year) return false
    if (type && c.type !== type) return false
    if (onlyEligible && ['passed', 'prereq'].includes(eligibility(student, c))) return false
    return true
  })

  const conflictWith = (course: Course, sectionNo: number) => {
    const section = course.sections.find((s) => s.no === sectionNo)!
    return cart.items
      .filter((i) => i.code !== course.code)
      .filter((i) => {
        const other = findSection(catalog, i)
        return other && sectionsConflict(section, other.section).length > 0
      })
      .map((i) => i.code)
  }

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Açılan Dersler</h2>
        <span className="muted">{courses.length} ders</span>
      </header>
      <div className="filters">
        <input
          type="search"
          placeholder="Ders kodu veya adı ara…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Sınıf">
          <option value={0}>Tüm sınıflar</option>
          {[1, 2, 3, 4].map((y) => (
            <option key={y} value={y}>
              {y}. sınıf
            </option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value as '' | 'Z' | 'S')} aria-label="Z/S">
          <option value="">Zorunlu + Seçmeli</option>
          <option value="Z">Zorunlu</option>
          <option value="S">Seçmeli</option>
        </select>
        <label className="check">
          <input type="checkbox" checked={onlyEligible} onChange={(e) => setOnlyEligible(e.target.checked)} />
          Sadece alabileceklerim
        </label>
      </div>

      <div className="table-wrap">
        <table className="obs-table">
          <thead>
            <tr>
              <th>Ders Kodu</th>
              <th>Ders Adı</th>
              <th title="Zorunlu / Seçmeli">Z/S</th>
              <th>T+U</th>
              <th>Krd</th>
              <th>AKTS</th>
              <th>Snf</th>
              <th>Durum</th>
              <th>Şubeler (tıkla → sepete ekle)</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => {
              const inCart = cart.items.find((i) => i.code === c.code)
              return (
                <tr key={c.code} className={inCart ? 'row-selected' : undefined}>
                  <td className="nowrap code">{c.code}</td>
                  <td>
                    {c.name}
                    {c.online && <span className="tag">Çevrimiçi</span>}
                    {c.internship && <span className="tag">Staj</span>}
                  </td>
                  <td className={c.type === 'Z' ? 'z' : 's'}>{c.type}</td>
                  <td>{c.theory + c.practice}</td>
                  <td>{c.credit}</td>
                  <td>{c.ects}</td>
                  <td>{c.year}</td>
                  <td>
                    <StatusBadge student={student} course={c} />
                  </td>
                  <td>
                    <div className="section-chips">
                      {c.sections.map((s) => {
                        const selected = inCart?.section === s.no
                        const clashes = conflictWith(c, s.no)
                        const full = isFull(s)
                        return (
                          <button
                            key={s.no}
                            type="button"
                            className={`chip${selected ? ' chip-selected' : ''}${clashes.length ? ' chip-clash' : ''}`}
                            onClick={() => onSelect(c.code, s.no)}
                            disabled={selected}
                            title={`${s.instructor}${full ? ' — kontenjan dolu' : ''}`}
                          >
                            <span className="chip-line">
                              <strong>Şb.{s.no}</strong> {formatSlots(s.slots)}
                            </span>
                            <QuotaBar section={s} />
                            {clashes.length > 0 && <span className="chip-warn">Çakışır: {clashes.join(', ')}</span>}
                            {selected && <span className="chip-ok">Sepette</span>}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
