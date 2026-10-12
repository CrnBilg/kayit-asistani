import { useMemo, useState } from 'react'
import { COURSES, STUDENTS } from './data'
import { DEMO_CARTS } from './data/demoCarts'
import type { Student } from './types'
import { useCart } from './state/cart'
import { getStatus, maxEcts, mustRetake, validateCart } from './rules/engine'
import { applyEnrollment, applyPlanB, simulateRegistrationDay, type Enrollment } from './rules/simulate'
import { RULE_DOCS } from './rules/yasarRules'
import { CourseCatalog } from './components/CourseCatalog'
import { CartPanel } from './components/CartPanel'
import { IssuesPanel } from './components/IssuesPanel'
import { WeeklySchedule } from './components/WeeklySchedule'
import { BackupPlanner } from './components/BackupPlanner'
import { ReadyChecklist } from './components/ReadyChecklist'

const STUDENT_KEY = 'kayit-asistani:student'

/** Demo linkleri: yerelde `?demo&student=mert`, yayınlanmış sayfada `#demo-mert` */
function linkDemo(): { studentId?: string; demo: boolean } {
  const query = new URLSearchParams(window.location.search)
  const hash = window.location.hash.match(/^#demo(?:-([a-z]+))?$/)
  return {
    studentId: query.get('student') ?? hash?.[1],
    demo: query.has('demo') || hash !== null,
  }
}

function initialStudentId(): string {
  const fromUrl = linkDemo().studentId
  if (fromUrl && STUDENTS.some((s) => s.id === fromUrl)) return fromUrl
  try {
    const saved = localStorage.getItem(STUDENT_KEY)
    if (saved && STUDENTS.some((s) => s.id === saved)) return saved
  } catch {
    // depolama kapalı
  }
  return STUDENTS[0].id
}

export default function App() {
  const [studentId, setStudentId] = useState(initialStudentId)
  const student = STUDENTS.find((s) => s.id === studentId)!

  const changeStudent = (id: string) => {
    setStudentId(id)
    try {
      localStorage.setItem(STUDENT_KEY, id)
    } catch {
      // depolama kapalı
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>
            YÜ
          </span>
          <div>
            <div className="brand-title">Kayıt Asistanı</div>
            <div className="brand-sub">Yaşar Üniversitesi ders kaydı ön hazırlık</div>
          </div>
        </div>
        <label className="student-pick">
          <span>Demo öğrenci</span>
          <select value={studentId} onChange={(e) => changeStudent(e.target.value)}>
            {STUDENTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </header>
      <Workspace key={student.id} student={student} />
    </>
  )
}

function Workspace({ student }: { student: Student }) {
  const cartApi = useCart(student.id, DEMO_CARTS[student.id], linkDemo().demo)
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [log, setLog] = useState<string[]>([])

  const catalog = useMemo(() => (enrollment ? applyEnrollment(COURSES, enrollment) : COURSES), [enrollment])
  const issues = useMemo(() => validateCart(cartApi.cart, student, catalog), [cartApi.cart, student, catalog])
  const status = getStatus(student)
  const retakes = mustRetake(student, catalog)

  const simulate = () => {
    const next = simulateRegistrationDay(COURSES)
    const result = applyPlanB(cartApi.cart, applyEnrollment(COURSES, next))
    setEnrollment(next)
    cartApi.replace(result.cart)
    setLog(result.log)
  }

  const reset = () => {
    setEnrollment(null)
    setLog([])
  }

  return (
    <main className="page">
      <section className="student-strip">
        <div>
          <div className="muted small">Öğrenci</div>
          <strong>{student.name}</strong>
          <div className="small">{student.department} · {student.completedTerms + 1}. dönem</div>
        </div>
        <div>
          <div className="muted small">GANO</div>
          <strong className="big">{student.gpa.toFixed(2).replace('.', ',')}</strong>
        </div>
        <div>
          <div className="muted small">Statü</div>
          <span className={`status status-${status === 'sınamalı' ? 'probation' : 'ok'}`}>{status}</span>
        </div>
        <div>
          <div className="muted small">Dönemlik sınır</div>
          <strong className="big">{maxEcts(student)} AKTS</strong>
        </div>
        <div>
          <div className="muted small">Alttan zorunlu ders</div>
          <strong className="big">{retakes.length}</strong>
          {retakes.length > 0 && <div className="small">{retakes.map((c) => c.code).join(', ')}</div>}
        </div>
        <div className="strip-actions">
          {enrollment && <span className="sim-pill">Simülasyon: kayıt günü kontenjanları</span>}
          {DEMO_CARTS[student.id] && (
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => {
                reset()
                cartApi.replace(DEMO_CARTS[student.id])
              }}
            >
              Örnek senaryo yükle
            </button>
          )}
        </div>
      </section>

      <div className="layout">
        <div className="col-main">
          <WeeklySchedule catalog={catalog} cart={cartApi.cart} issues={issues} onFix={cartApi.applyFix} />
          <CourseCatalog catalog={catalog} student={student} cart={cartApi.cart} onSelect={cartApi.setSection} />
        </div>
        <aside className="col-side">
          <IssuesPanel issues={issues} onFix={cartApi.applyFix} />
          <CartPanel catalog={catalog} student={student} cartApi={cartApi} issues={issues} />
        </aside>
      </div>

      <div className="layout-even">
        <BackupPlanner
          catalog={catalog}
          student={student}
          cartApi={cartApi}
          simulated={enrollment !== null}
          log={log}
          onSimulate={simulate}
          onReset={reset}
        />
        <ReadyChecklist catalog={catalog} student={student} cart={cartApi.cart} issues={issues} />
      </div>

      <section className="panel rules">
        <header className="panel-head">
          <h2>Uygulanan Kurallar</h2>
        </header>
        <ul>
          {RULE_DOCS.map((r) => (
            <li key={r.id}>
              <strong>{r.title}:</strong> {r.description}{' '}
              <a href={r.source} target="_blank" rel="noreferrer">
                Kaynak
              </a>
            </li>
          ))}
        </ul>
        <p className="muted small">
          Ders kataloğu ve öğrenciler demo verisidir; gerçek OBS'ye bağlanılmaz. Kesin bilgi için OİM ve danışmanınıza
          başvurun.
        </p>
      </section>
    </main>
  )
}
