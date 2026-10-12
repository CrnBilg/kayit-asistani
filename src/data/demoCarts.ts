import type { Cart } from '../types'

/** Sunumda tek tıkla yüklenen, sorunlu örnek sepetler */
export const DEMO_CARTS: Record<string, Cart> = {
  // Başarılı öğrenci: çakışma, dolu şube ve neredeyse dolu şube
  ayse: {
    items: [
      { code: 'ENGR 4411', section: 1 },
      { code: 'ENGR 4451', section: 1 },
      { code: 'SE 4458', section: 1 },
      { code: 'SE 4498', section: 1 },
      { code: 'SE 4454', section: 1 },
      { code: 'SE 4462', section: 1 },
    ],
    backups: {},
  },
  // Sınamalı öğrenci: alttan dersleri almadan seçmeli seçmiş, ön koşulu yok
  mert: {
    items: [
      { code: 'ENGR 4411', section: 1 },
      { code: 'SE 4466', section: 1 },
      { code: 'ENGR 4451', section: 2 },
      { code: 'SE 2228', section: 1 },
    ],
    backups: {},
  },
}
