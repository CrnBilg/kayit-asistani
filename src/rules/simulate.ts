import type { Cart, CartItem, Course } from '../types'
import { findAlternativeSections, findSection, isFull, sectionsConflict } from './conflicts'
import { RULES } from './yasarRules'

export type Enrollment = Record<string, number> // "KOD#şube" -> kayıtlı sayısı

export const enrollmentKey = (code: string, section: number) => `${code}#${section}`

export function applyEnrollment(catalog: Course[], enrollment: Enrollment): Course[] {
  return catalog.map((c) => ({
    ...c,
    sections: c.sections.map((s) => ({
      ...s,
      enrolled: enrollment[enrollmentKey(c.code, s.no)] ?? s.enrolled,
    })),
  }))
}

/**
 * Kayıt günü yoğunluğunu taklit eder: neredeyse dolu şubeler tamamen dolar,
 * diğerlerine rastgele %0–35 arası yeni kayıt gelir.
 */
export function simulateRegistrationDay(
  catalog: Course[],
  random: () => number = Math.random,
): Enrollment {
  const result: Enrollment = {}
  for (const c of catalog) {
    for (const s of c.sections) {
      const ratio = s.enrolled / s.capacity
      const enrolled =
        ratio >= RULES.nearlyFullRatio - 0.05
          ? s.capacity
          : Math.min(s.capacity, s.enrolled + Math.round(s.capacity * 0.35 * random()))
      result[enrollmentKey(c.code, s.no)] = enrolled
    }
  }
  return result
}

/**
 * Dolu şubeye düşen her ders için sırayla Plan B seçeneklerini dener;
 * Plan B yoksa çakışmayan boş bir şubeye geçer.
 */
export function applyPlanB(cart: Cart, catalog: Course[]): { cart: Cart; log: string[] } {
  const log: string[] = []
  let items = [...cart.items]
  const backups = { ...cart.backups }

  const usable = (candidate: CartItem, replacing: string) => {
    const found = findSection(catalog, candidate)
    if (!found || isFull(found.section)) return false
    if (candidate.code !== replacing && items.some((i) => i.code === candidate.code)) return false
    return items
      .filter((i) => i.code !== replacing)
      .every((i) => {
        const other = findSection(catalog, i)
        return !other || sectionsConflict(found.section, other.section).length === 0
      })
  }

  for (const item of cart.items) {
    const found = findSection(catalog, item)
    if (!found || !isFull(found.section)) continue
    const label = `${item.code} Şb.${item.section}`
    const choice = (backups[item.code] ?? []).find((b) => usable(b, item.code))
    if (choice) {
      items = items.map((i) => (i.code === item.code ? choice : i))
      const rest = backups[item.code].filter((b) => b !== choice)
      delete backups[item.code]
      if (rest.length) backups[choice.code] = rest
      log.push(
        choice.code === item.code
          ? `${label} doldu → Plan B ile Şb.${choice.section}'e geçildi.`
          : `${label} doldu → Plan B ile ${choice.code} Şb.${choice.section} alındı.`,
      )
      continue
    }
    const alt = findAlternativeSections(item.code, items, catalog)[0]
    if (alt) {
      items = items.map((i) => (i.code === item.code ? { code: item.code, section: alt.no } : i))
      log.push(`${label} doldu → Plan B yoktu, boş olan Şb.${alt.no}'e otomatik geçildi.`)
    } else {
      log.push(`${label} doldu ve uygun yedek bulunamadı. Danışmanınla görüş.`)
    }
  }

  return { cart: { items, backups }, log }
}
