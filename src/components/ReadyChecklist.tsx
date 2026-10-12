import { useRef, useState } from 'react'
import type { Cart, Course, Issue, Student } from '../types'
import { findSection } from '../rules/conflicts'
import { getStatus, totalEcts } from '../rules/engine'

interface Check {
  label: string
  rules: string[]
}

const CHECKS: Check[] = [
  { label: 'AKTS sınırları', rules: ['ECTS_MAX', 'ECTS_MIN'] },
  { label: 'Ön koşullar', rules: ['PREREQ'] },
  { label: 'Saat çakışması yok', rules: ['CONFLICT'] },
  { label: 'Kontenjan uygun', rules: ['QUOTA_FULL', 'QUOTA_NEAR'] },
  { label: 'Alttan ders önceliği', rules: ['PROBATION_PRIORITY'] },
  { label: 'Tekrar edilen geçilmiş ders yok', rules: ['ALREADY_PASSED'] },
]

export function ReadyChecklist({ catalog, student, cart, issues }: { catalog: Course[]; student: Student; cart: Cart; issues: Issue[] }) {
  const [copied, setCopied] = useState(false)
  const summaryRef = useRef<HTMLPreElement>(null)
  const errors = issues.filter((i) => i.level === 'error')
  const ready = cart.items.length > 0 && errors.length === 0

  const summary = [
    `${student.name} — ${student.department} (${getStatus(student)}, GANO ${student.gpa.toFixed(2)})`,
    ...cart.items.map((i) => {
      const f = findSection(catalog, i)
      const backups = (cart.backups[i.code] ?? []).map((b) => `${b.code} Şb.${b.section}`).join(' → ')
      return `• ${i.code} Şb.${i.section} ${f?.course.name ?? ''}${backups ? `  [Plan B: ${backups}]` : ''}`
    }),
    `Toplam: ${totalEcts(cart.items, catalog)} AKTS`,
  ].join('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Pano engelliyse metni seç, kullanıcı Ctrl+C ile kopyalasın
      if (summaryRef.current) window.getSelection()?.selectAllChildren(summaryRef.current)
    }
  }

  return (
    <section className={`panel ready ${ready ? 'ready-yes' : 'ready-no'}`}>
      <header className="panel-head">
        <h2>Kayda Hazır mısın?</h2>
        <span className={`count ${ready ? 'count-ok' : 'count-error'}`}>{ready ? 'Hazır' : 'Henüz değil'}</span>
      </header>
      <ul className="checklist">
        {CHECKS.map((c) => {
          const related = issues.filter((i) => c.rules.includes(i.ruleId) && i.level !== 'info')
          const state = cart.items.length === 0 ? 'idle' : related.some((i) => i.level === 'error') ? 'fail' : related.length ? 'warn' : 'pass'
          return (
            <li key={c.label} className={`check-${state}`}>
              <span aria-hidden>{{ idle: '○', fail: '✕', warn: '!', pass: '✓' }[state]}</span>
              {c.label}
            </li>
          )
        })}
      </ul>
      {ready && (
        <>
          <pre className="summary" ref={summaryRef}>{summary}</pre>
          <div className="row-gap">
            <button type="button" className="btn" onClick={copy}>
              {copied ? 'Kopyalandı ✓' : 'Listeyi kopyala'}
            </button>
          </div>
          <p className="muted small">Bu listeyi OBS'de kayıt yaparken ve danışman görüşmesinde kullanabilirsin.</p>
        </>
      )}
    </section>
  )
}
