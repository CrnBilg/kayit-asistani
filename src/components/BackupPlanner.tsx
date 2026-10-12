import type { Course, Student } from '../types'
import type { CartApi } from '../state/cart'
import { findSection, formatSlots } from '../rules/conflicts'
import { suggestBackups } from '../rules/engine'
import { QuotaBar, quotaLevel } from './QuotaBar'

interface Props {
  catalog: Course[]
  student: Student
  cartApi: CartApi
  simulated: boolean
  log: string[]
  onSimulate: () => void
  onReset: () => void
}

export function BackupPlanner({ catalog, student, cartApi, simulated, log, onSimulate, onReset }: Props) {
  const { cart, addBackup, removeBackup } = cartApi
  const withSlots = cart.items.filter((i) => !findSection(catalog, i)?.course.internship)

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Plan B (Yedek Dersler)</h2>
        <div className="row-gap">
          {simulated ? (
            <button type="button" className="btn btn-ghost" onClick={onReset}>
              Kontenjanları sıfırla
            </button>
          ) : (
            <button type="button" className="btn btn-accent" onClick={onSimulate} disabled={cart.items.length === 0}>
              ▶ Kayıt günü simülasyonu
            </button>
          )}
        </div>
      </header>
      <p className="muted small">
        Kayıt günü bir şube dolarsa sıradaki yedek otomatik devreye girer. Simülasyon, neredeyse dolu şubeleri
        doldurup diğerlerine rastgele kayıt ekler.
      </p>

      {log.length > 0 && (
        <ul className="sim-log">
          {log.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
      {simulated && log.length === 0 && <p className="all-good">✅ Sepetindeki şubelerin hiçbiri dolmadı.</p>}

      {withSlots.length === 0 ? (
        <p className="empty">Yedek planlamak için önce sepete ders ekle.</p>
      ) : (
        <div className="backup-list">
          {withSlots.map((item) => {
            const found = findSection(catalog, item)!
            const backups = cart.backups[item.code] ?? []
            const suggestions = suggestBackups(item.code, cart, student, catalog).filter(
              (s) => !backups.some((b) => b.code === s.code && b.section === s.section),
            )
            const level = quotaLevel(found.section)
            return (
              <div key={item.code} className={`backup-card backup-${level}`}>
                <div className="backup-head">
                  <div>
                    <strong>{item.code}</strong> Şb.{item.section}
                    <span className="muted small"> · {formatSlots(found.section.slots)}</span>
                  </div>
                  <QuotaBar section={found.section} />
                </div>
                {backups.length > 0 && (
                  <ol className="backup-ol">
                    {backups.map((b, idx) => {
                      const bf = findSection(catalog, b)
                      return (
                        <li key={`${b.code}-${b.section}`}>
                          <span>
                            {b.code} Şb.{b.section}
                            {bf && <span className="muted small"> · {formatSlots(bf.section.slots)}</span>}
                          </span>
                          <button type="button" className="icon-btn" onClick={() => removeBackup(item.code, idx)} aria-label="Yedeği kaldır">
                            ✕
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                )}
                {suggestions.length > 0 ? (
                  <div className="suggestions">
                    {suggestions.map((s) => {
                      const sf = findSection(catalog, s)
                      return (
                        <button
                          key={`${s.code}-${s.section}`}
                          type="button"
                          className="chip chip-suggest"
                          onClick={() => addBackup(item.code, s)}
                          title={sf ? `${sf.course.name} — ${formatSlots(sf.section.slots)}` : undefined}
                        >
                          + {s.code === item.code ? `Şb.${s.section}` : `${s.code} Şb.${s.section}`}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  backups.length === 0 && <p className="muted small">Çakışmayan boş yedek bulunamadı.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
