import type { Fix, Issue } from '../types'

const ICON = { error: '⛔', warning: '⚠️', info: 'ℹ️' }

export function IssuesPanel({ issues, onFix }: { issues: Issue[]; onFix: (fix: Fix) => void }) {
  const errors = issues.filter((i) => i.level === 'error').length
  const warnings = issues.filter((i) => i.level === 'warning').length

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Kural Kontrolü</h2>
        <span className="counts">
          <span className="count count-error">{errors} hata</span>
          <span className="count count-warn">{warnings} uyarı</span>
        </span>
      </header>
      {issues.length === 0 ? (
        <p className="all-good">✅ Tüm kurallar sağlanıyor.</p>
      ) : (
        <ul className="issues">
          {issues.map((issue, idx) => (
            <li key={`${issue.ruleId}-${issue.courseCode ?? ''}-${idx}`} className={`issue issue-${issue.level}`}>
              <span className="issue-icon" aria-hidden>
                {ICON[issue.level]}
              </span>
              <span className="issue-text">{issue.message}</span>
              {issue.fix && (
                <button type="button" className="btn btn-small" onClick={() => onFix(issue.fix!)}>
                  {issue.fixLabel ?? 'Çöz'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
