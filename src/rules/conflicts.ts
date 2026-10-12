import type { CartItem, Course, Section, Slot } from '../types'

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function slotsOverlap(a: Slot, b: Slot): boolean {
  return (
    a.day === b.day &&
    toMinutes(a.start) < toMinutes(b.end) &&
    toMinutes(b.start) < toMinutes(a.end)
  )
}

export function findSection(
  catalog: Course[],
  item: CartItem,
): { course: Course; section: Section } | undefined {
  const course = catalog.find((c) => c.code === item.code)
  const section = course?.sections.find((s) => s.no === item.section)
  return course && section ? { course, section } : undefined
}

export function sectionsConflict(a: Section, b: Section): Slot[] {
  const hits: Slot[] = []
  for (const sa of a.slots) for (const sb of b.slots) if (slotsOverlap(sa, sb)) hits.push(sa)
  return hits
}

export interface Conflict {
  a: CartItem
  b: CartItem
  slots: Slot[]
}

export function findConflicts(items: CartItem[], catalog: Course[]): Conflict[] {
  const conflicts: Conflict[] = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const x = findSection(catalog, items[i])
      const y = findSection(catalog, items[j])
      if (!x || !y) continue
      const slots = sectionsConflict(x.section, y.section)
      if (slots.length) conflicts.push({ a: items[i], b: items[j], slots })
    }
  }
  return conflicts
}

export function isFull(section: Section): boolean {
  return section.enrolled >= section.capacity
}

/** Sepetteki diğer derslerle çakışmayan ve dolu olmayan şubeler */
export function findAlternativeSections(
  code: string,
  items: CartItem[],
  catalog: Course[],
): Section[] {
  const course = catalog.find((c) => c.code === code)
  if (!course) return []
  const others = items
    .filter((i) => i.code !== code)
    .map((i) => findSection(catalog, i))
    .filter((x) => x !== undefined)
  return course.sections.filter(
    (s) => !isFull(s) && others.every((o) => sectionsConflict(s, o.section).length === 0),
  )
}

export function formatSlots(slots: Slot[]): string {
  if (!slots.length) return 'Çevrimiçi'
  return slots.map((s) => `${s.day} ${s.start}–${s.end}`).join(', ')
}
