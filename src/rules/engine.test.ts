import { describe, expect, it } from 'vitest'
import { COURSES, STUDENTS } from '../data'
import type { Cart, CartItem } from '../types'
import { findConflicts, slotsOverlap } from './conflicts'
import { eligibility, getStatus, maxEcts, suggestBackups, validateCart } from './engine'
import { applyEnrollment, applyPlanB, enrollmentKey, simulateRegistrationDay } from './simulate'

const ayse = STUDENTS.find((s) => s.id === 'ayse')!
const mert = STUDENTS.find((s) => s.id === 'mert')!
const cart = (items: CartItem[], backups: Cart['backups'] = {}): Cart => ({ items, backups })
const ruleIds = (c: Cart, student = ayse) => validateCart(c, student, COURSES).map((i) => i.ruleId)

describe('statü ve AKTS sınırı', () => {
  it('GANO 1,99 altı sınamalı ve 32 AKTS sınırlı', () => {
    expect(getStatus(mert)).toBe('sınamalı')
    expect(maxEcts(mert)).toBe(32)
    expect(getStatus(ayse)).toBe('başarılı')
    expect(maxEcts(ayse)).toBe(40)
  })

  it('ilk iki dönem statü uygulanmaz', () => {
    expect(getStatus({ ...mert, completedTerms: 1 })).toBe('yeni')
  })

  it('40 AKTS aşılınca hata, staj sayılmaz', () => {
    const items: CartItem[] = [
      { code: 'ENGR 4411', section: 1 }, // 3
      { code: 'ENGR 4451', section: 2 }, // 6
      { code: 'SE 4458', section: 2 }, // 6
      { code: 'SE 4498', section: 1 }, // 8
      { code: 'SE 4460', section: 1 }, // 6
      { code: 'SE 4470', section: 1 }, // 6
      { code: 'SE 4300', section: 1 }, // staj
    ]
    expect(ruleIds(cart(items))).not.toContain('ECTS_MAX') // 35
    const over = [...items, { code: 'SE 4454', section: 2 }] // 41
    expect(ruleIds(cart(over))).toContain('ECTS_MAX')
  })

  it('20 AKTS altında uyarı', () => {
    expect(ruleIds(cart([{ code: 'SE 4460', section: 1 }]))).toContain('ECTS_MIN')
  })
})

describe('ön koşul', () => {
  it('ön koşulu geçilmemiş ders hata verir', () => {
    // Mert MATH 2280'den F aldı → SE 4466 alamaz
    const issues = validateCart(cart([{ code: 'SE 4466', section: 1 }]), mert, COURSES)
    expect(issues.find((i) => i.ruleId === 'PREREQ')?.courseCode).toBe('SE 4466')
    expect(eligibility(mert, COURSES.find((c) => c.code === 'SE 4466')!)).toBe('prereq')
  })

  it('geçilmiş ders uyarı verir', () => {
    expect(ruleIds(cart([{ code: 'SE 3318', section: 1 }]))).toContain('ALREADY_PASSED')
  })
})

describe('sınamalı öğrenci alttan ders önceliği', () => {
  it('alttan dersler eklenmeden yeni ders alınırsa hata', () => {
    const issues = validateCart(cart([{ code: 'ENGR 4411', section: 1 }]), mert, COURSES)
    const missing = issues.filter((i) => i.ruleId === 'PROBATION_PRIORITY')
    expect(missing.map((i) => i.courseCode).sort()).toEqual(['MATH 2280', 'SE 2228', 'SE 3308', 'SE 3355'])
    expect(missing.every((i) => i.level === 'error' && i.fix?.type === 'add')).toBe(true)
  })

  it('tüm alttan dersler eklenince kural sağlanır', () => {
    const items: CartItem[] = [
      { code: 'SE 2228', section: 2 },
      { code: 'MATH 2280', section: 1 },
      { code: 'SE 3355', section: 1 },
      { code: 'SE 3308', section: 1 },
      { code: 'ENGR 4411', section: 1 },
    ]
    expect(ruleIds(cart(items), mert)).not.toContain('PROBATION_PRIORITY')
  })
})

describe('çakışma', () => {
  it('aynı gün örtüşen saatler çakışır, uç uca dersler çakışmaz', () => {
    expect(slotsOverlap({ day: 'Sal', start: '13:00', end: '16:00' }, { day: 'Sal', start: '14:00', end: '17:00' })).toBe(true)
    expect(slotsOverlap({ day: 'Sal', start: '09:00', end: '12:00' }, { day: 'Sal', start: '12:00', end: '13:00' })).toBe(false)
    expect(slotsOverlap({ day: 'Sal', start: '13:00', end: '16:00' }, { day: 'Çar', start: '13:00', end: '16:00' })).toBe(false)
  })

  it('çakışmada alternatif şube önerilir', () => {
    const items = [
      { code: 'ENGR 4451', section: 1 },
      { code: 'SE 4458', section: 1 },
    ]
    expect(findConflicts(items, COURSES)).toHaveLength(1)
    const issue = validateCart(cart(items), ayse, COURSES).find((i) => i.ruleId === 'CONFLICT')
    expect(issue?.fix).toEqual({ type: 'switchSection', code: 'SE 4458', section: 2 })
  })
})

describe('kontenjan ve Plan B', () => {
  it('dolu şube hata verir ve boş şube önerir', () => {
    const issue = validateCart(cart([{ code: 'SE 4454', section: 1 }]), ayse, COURSES).find(
      (i) => i.ruleId === 'QUOTA_FULL',
    )
    expect(issue?.fix).toEqual({ type: 'switchSection', code: 'SE 4454', section: 2 })
  })

  it('neredeyse dolu şube Plan B yoksa uyarı verir', () => {
    expect(ruleIds(cart([{ code: 'ENGR 4451', section: 1 }]))).toContain('QUOTA_NEAR')
    const withBackup = cart([{ code: 'ENGR 4451', section: 1 }], { 'ENGR 4451': [{ code: 'ENGR 4451', section: 2 }] })
    expect(ruleIds(withBackup)).not.toContain('QUOTA_NEAR')
  })

  it('Plan B önerileri çakışmaz ve dolu değildir', () => {
    const c = cart([
      { code: 'SE 4462', section: 1 },
      { code: 'SE 4460', section: 1 },
    ])
    const suggestions = suggestBackups('SE 4462', c, ayse, COURSES)
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions.some((s) => s.code === 'SE 4460')).toBe(false)
    expect(suggestions.some((s) => s.code === 'SE 4454' && s.section === 1)).toBe(false)
  })

  it('kayıt günü dolan derste Plan B devreye girer', () => {
    const enrollment = simulateRegistrationDay(COURSES, () => 0)
    expect(enrollment[enrollmentKey('ENGR 4451', 1)]).toBe(40)
    const after = applyEnrollment(COURSES, enrollment)
    const c = cart(
      [{ code: 'SE 4462', section: 1 }, { code: 'ENGR 4451', section: 1 }],
      { 'SE 4462': [{ code: 'SE 4470', section: 1 }] },
    )
    const { cart: next, log } = applyPlanB(c, after)
    expect(next.items).toEqual([
      { code: 'SE 4470', section: 1 },
      { code: 'ENGR 4451', section: 2 },
    ])
    expect(log).toHaveLength(2)
  })
})
