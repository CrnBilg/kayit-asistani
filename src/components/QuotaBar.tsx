import type { Section } from '../types'
import { RULES } from '../rules/yasarRules'

export function quotaLevel(section: Section): 'ok' | 'near' | 'full' {
  if (section.enrolled >= section.capacity) return 'full'
  return section.enrolled / section.capacity >= RULES.nearlyFullRatio ? 'near' : 'ok'
}

export function QuotaBar({ section }: { section: Section }) {
  const pct = Math.min(100, Math.round((section.enrolled / section.capacity) * 100))
  const level = quotaLevel(section)
  return (
    <span className={`quota quota-${level}`} title={`Kontenjan: ${section.enrolled}/${section.capacity}`}>
      <span className="quota-track">
        <span className="quota-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="quota-text">
        {section.enrolled}/{section.capacity}
      </span>
    </span>
  )
}
