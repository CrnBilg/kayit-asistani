// Yaşar Üniversitesi ders kaydı kuralları.
// Değerler yayımlanmış kaynaklardan alınmıştır; kural değişirse yalnızca bu dosya güncellenir.

export const SOURCES = {
  oim: 'https://oim.yasar.edu.tr/ders-kayitlari/',
  regulation:
    'https://mevzuat.gov.tr/File/GeneratePdf?mevzuatNo=22754&mevzuatTertip=5&mevzuatTur=UniversiteYonetmeligi',
} as const

export const RULES = {
  /** Başarılı statüdeki öğrencinin dönemlik azami yükü (staj hariç) */
  maxEctsSuccessful: 40,
  /** Sınamalı statüdeki öğrencinin dönemlik azami yükü (staj hariç) */
  maxEctsProbation: 32,
  /** Dönemlik asgari yük */
  minEcts: 20,
  /** Bu değer ve altındaki GANO sınamalı sayılır */
  probationGpa: 1.99,
  /** Statüler yeni öğrenci için bu kadar dönem tamamlandıktan sonra uygulanır */
  statusStartsAfterTerms: 2,
  /** Tekrar zorunluluğu doğuran notlar */
  failingGrades: ['F', 'W', 'U', 'NA'] as string[],
  /** Kontenjan bu orana ulaşınca "yedek ekle" uyarısı verilir */
  nearlyFullRatio: 0.9,
}

export interface RuleDoc {
  id: string
  title: string
  description: string
  source: string
}

export const RULE_DOCS: RuleDoc[] = [
  {
    id: 'ECTS_MAX',
    title: 'Dönemlik azami AKTS',
    description: `Başarılı öğrenci en fazla ${RULES.maxEctsSuccessful} AKTS, sınamalı öğrenci en fazla ${RULES.maxEctsProbation} AKTS ders alabilir (staj hariç).`,
    source: SOURCES.oim,
  },
  {
    id: 'ECTS_MIN',
    title: 'Dönemlik asgari AKTS',
    description: `Bir dönemde en az ${RULES.minEcts} AKTS ders alınmalıdır.`,
    source: SOURCES.oim,
  },
  {
    id: 'STATUS',
    title: 'Sınamalı statü',
    description: `Dönem sonu GANO'su ${RULES.probationGpa.toFixed(2).replace('.', ',')} veya altında olan öğrenci sınamalı sayılır. Yeni öğrencilerde statü ${RULES.statusStartsAfterTerms}. dönem sonundan itibaren uygulanır.`,
    source: SOURCES.oim,
  },
  {
    id: 'PROBATION_PRIORITY',
    title: 'Sınamalı öğrencide alttan ders önceliği',
    description:
      'Sınamalı öğrenci öncelikle F, W, U veya NA aldığı zorunlu dersleri tekrar etmekle yükümlüdür; yeterli ders yoksa sınıra kadar yeni ders alabilir.',
    source: SOURCES.regulation,
  },
  {
    id: 'PREREQ',
    title: 'Ön koşul',
    description:
      'Ön koşullu bir dersi alabilmek için müfredatta belirtilen önceki ders(ler)den başarılı olmak gerekir.',
    source: SOURCES.regulation,
  },
]
