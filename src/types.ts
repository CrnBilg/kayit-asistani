export type Day = 'Pzt' | 'Sal' | 'Çar' | 'Per' | 'Cum'

export const DAYS: Day[] = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum']

export interface Slot {
  day: Day
  start: string // "09:00"
  end: string // "12:00"
}

export interface Section {
  no: number
  instructor: string
  slots: Slot[]
  capacity: number
  enrolled: number
}

export interface Course {
  code: string
  name: string
  type: 'Z' | 'S' // Zorunlu / Seçmeli
  theory: number
  practice: number
  credit: number
  ects: number
  year: number
  prerequisites: string[]
  online?: boolean
  internship?: boolean
  sections: Section[]
}

export type Grade =
  | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D'
  | 'F' | 'W' | 'U' | 'NA' | 'S'

export interface TranscriptEntry {
  code: string
  grade: Grade
  term: number
}

export interface Student {
  id: string
  name: string
  department: string
  completedTerms: number
  gpa: number
  transcript: TranscriptEntry[]
}

export interface CartItem {
  code: string
  section: number
}

export interface Cart {
  items: CartItem[]
  /** Ana dersin koduna göre sıralı yedek seçenekler (Plan B) */
  backups: Record<string, CartItem[]>
}

export type Fix =
  | { type: 'switchSection'; code: string; section: number }
  | { type: 'add'; code: string; section: number }
  | { type: 'remove'; code: string }

export interface Issue {
  level: 'error' | 'warning' | 'info'
  ruleId: string
  message: string
  courseCode?: string
  fix?: Fix
  fixLabel?: string
}
