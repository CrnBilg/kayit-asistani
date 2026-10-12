import type { Cart, CartItem, Course, Issue, Student, TranscriptEntry } from '../types'
import { RULES } from './yasarRules'
import {
  findAlternativeSections,
  findConflicts,
  findSection,
  formatSlots,
  isFull,
  sectionsConflict,
} from './conflicts'

export type Status = 'yeni' | 'başarılı' | 'sınamalı'

export function getStatus(student: Student): Status {
  if (student.completedTerms < RULES.statusStartsAfterTerms) return 'yeni'
  return student.gpa <= RULES.probationGpa ? 'sınamalı' : 'başarılı'
}

export function maxEcts(student: Student): number {
  return getStatus(student) === 'sınamalı' ? RULES.maxEctsProbation : RULES.maxEctsSuccessful
}

export function latestGrade(student: Student, code: string): TranscriptEntry | undefined {
  return student.transcript
    .filter((t) => t.code === code)
    .sort((a, b) => b.term - a.term)[0]
}

export function hasPassed(student: Student, code: string): boolean {
  const last = latestGrade(student, code)
  return !!last && !RULES.failingGrades.includes(last.grade)
}

/** F/W/U/NA ile kalınmış ve bu dönem açılan zorunlu dersler */
export function mustRetake(student: Student, catalog: Course[]): Course[] {
  return catalog.filter((c) => {
    const last = latestGrade(student, c.code)
    return c.type === 'Z' && !!last && RULES.failingGrades.includes(last.grade)
  })
}

export function missingPrerequisites(student: Student, course: Course): string[] {
  return course.prerequisites.filter((p) => !hasPassed(student, p))
}

export type Eligibility = 'passed' | 'retake' | 'prereq' | 'new'

export function eligibility(student: Student, course: Course): Eligibility {
  if (hasPassed(student, course.code)) return 'passed'
  if (latestGrade(student, course.code)) return 'retake'
  if (missingPrerequisites(student, course).length) return 'prereq'
  return 'new'
}

export function totalEcts(items: CartItem[], catalog: Course[]): number {
  return items.reduce((sum, i) => {
    const c = catalog.find((x) => x.code === i.code)
    return c && !c.internship ? sum + c.ects : sum
  }, 0)
}

function firstUsableSection(code: string, items: CartItem[], catalog: Course[]): number | undefined {
  const alt = findAlternativeSections(code, items, catalog)[0]
  if (alt) return alt.no
  return catalog.find((c) => c.code === code)?.sections.find((s) => !isFull(s))?.no
}

export function validateCart(cart: Cart, student: Student, catalog: Course[]): Issue[] {
  const issues: Issue[] = []
  const { items } = cart
  const status = getStatus(student)
  const limit = maxEcts(student)
  const total = totalEcts(items, catalog)

  // Azami / asgari AKTS
  if (total > limit) {
    issues.push({
      level: 'error',
      ruleId: 'ECTS_MAX',
      message: `Toplam ${total} AKTS, ${status} statüsü için sınır olan ${limit} AKTS'yi ${total - limit} AKTS aşıyor.`,
    })
  } else if (items.length === 0) {
    issues.push({ level: 'info', ruleId: 'ECTS_MIN', message: 'Sepetin boş. Katalogdan ders ekleyerek başla.' })
  } else if (total < RULES.minEcts) {
    issues.push({
      level: 'warning',
      ruleId: 'ECTS_MIN',
      message: `Toplam ${total} AKTS; dönemlik asgari yük ${RULES.minEcts} AKTS.`,
    })
  }

  // Sınamalı öğrencide alttan ders önceliği
  if (status === 'sınamalı') {
    const retakes = mustRetake(student, catalog)
    const retakeCodes = new Set(retakes.map((c) => c.code))
    const missing = retakes.filter((c) => !items.some((i) => i.code === c.code))
    const hasNewCourse = items.some((i) => !retakeCodes.has(i.code))
    for (const c of missing) {
      const section = firstUsableSection(c.code, items, catalog)
      issues.push({
        level: hasNewCourse ? 'error' : 'warning',
        ruleId: 'PROBATION_PRIORITY',
        courseCode: c.code,
        message: `Sınamalısın: ${latestGrade(student, c.code)?.grade} aldığın zorunlu ${c.code} ${c.name} dersini yeni derslerden önce almalısın.`,
        ...(section !== undefined && {
          fix: { type: 'add', code: c.code, section },
          fixLabel: `${c.code} Şb.${section} ekle`,
        }),
      })
    }
  }

  for (const item of items) {
    const found = findSection(catalog, item)
    if (!found) continue
    const { course, section } = found

    const missing = missingPrerequisites(student, course)
    if (missing.length) {
      issues.push({
        level: 'error',
        ruleId: 'PREREQ',
        courseCode: course.code,
        message: `${course.code} için ön koşul sağlanmıyor: ${missing.join(', ')} dersinden başarılı olmalısın.`,
        fix: { type: 'remove', code: course.code },
        fixLabel: 'Sepetten çıkar',
      })
    }

    const last = latestGrade(student, course.code)
    if (last && hasPassed(student, course.code)) {
      issues.push({
        level: 'warning',
        ruleId: 'ALREADY_PASSED',
        courseCode: course.code,
        message: `${course.code} dersini daha önce ${last.grade} notuyla geçtin. Not yükseltmek için alıyorsan danışmanına bildir.`,
        fix: { type: 'remove', code: course.code },
        fixLabel: 'Sepetten çıkar',
      })
    }

    if (isFull(section)) {
      const alt = findAlternativeSections(course.code, items, catalog)[0]
      issues.push({
        level: 'error',
        ruleId: 'QUOTA_FULL',
        courseCode: course.code,
        message: `${course.code} Şb.${section.no} kontenjanı dolu (${section.enrolled}/${section.capacity}).`,
        ...(alt && {
          fix: { type: 'switchSection', code: course.code, section: alt.no },
          fixLabel: `Şb.${alt.no}'e geç (${formatSlots(alt.slots)})`,
        }),
      })
    } else if (
      section.enrolled / section.capacity >= RULES.nearlyFullRatio &&
      !(cart.backups[course.code]?.length)
    ) {
      issues.push({
        level: 'warning',
        ruleId: 'QUOTA_NEAR',
        courseCode: course.code,
        message: `${course.code} Şb.${section.no} neredeyse dolu (${section.enrolled}/${section.capacity}). Kayıt günü için Plan B ekle.`,
      })
    }
  }

  for (const conflict of findConflicts(items, catalog)) {
    const altB = findAlternativeSections(conflict.b.code, items, catalog)[0]
    const altA = altB ? undefined : findAlternativeSections(conflict.a.code, items, catalog)[0]
    const target = altB ? conflict.b.code : conflict.a.code
    const alt = altB ?? altA
    issues.push({
      level: 'error',
      ruleId: 'CONFLICT',
      courseCode: conflict.b.code,
      message: `${conflict.a.code} ile ${conflict.b.code} çakışıyor (${formatSlots(conflict.slots)}).${alt ? '' : ' Çakışmayan şube yok; birini çıkarmalısın.'}`,
      ...(alt && {
        fix: { type: 'switchSection', code: target, section: alt.no },
        fixLabel: `${target} Şb.${alt.no}'e geç (${formatSlots(alt.slots)})`,
      }),
    })
  }

  const order = { error: 0, warning: 1, info: 2 }
  return issues.sort((a, b) => order[a.level] - order[b.level])
}

/** Bir ders için Plan B adayları: aynı dersin diğer şubeleri, seçmeliyse uygun diğer seçmeliler */
export function suggestBackups(
  code: string,
  cart: Cart,
  student: Student,
  catalog: Course[],
): CartItem[] {
  const course = catalog.find((c) => c.code === code)
  const current = cart.items.find((i) => i.code === code)
  if (!course || !current) return []
  const others = cart.items
    .filter((i) => i.code !== code)
    .map((i) => findSection(catalog, i))
    .filter((x) => x !== undefined)
  const fits = (sectionSlots: Course['sections'][number]) =>
    !isFull(sectionSlots) && others.every((o) => sectionsConflict(sectionSlots, o.section).length === 0)

  const sameCourse = course.sections
    .filter((s) => s.no !== current.section && fits(s))
    .map((s) => ({ code, section: s.no }))

  const electives =
    course.type === 'S'
      ? catalog
          .filter(
            (c) =>
              c.type === 'S' &&
              c.code !== code &&
              !cart.items.some((i) => i.code === c.code) &&
              eligibility(student, c) === 'new',
          )
          .flatMap((c) => {
            const s = c.sections.find(fits)
            return s ? [{ code: c.code, section: s.no }] : []
          })
      : []

  return [...sameCourse, ...electives].slice(0, 5)
}
