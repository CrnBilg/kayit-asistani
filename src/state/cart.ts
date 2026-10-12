import { useEffect, useState } from 'react'
import type { Cart, CartItem, Fix } from '../types'

const EMPTY: Cart = { items: [], backups: {} }
const storageKey = (studentId: string) => `kayit-asistani:cart:${studentId}`

function load(studentId: string): Cart | undefined {
  try {
    const raw = localStorage.getItem(storageKey(studentId))
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : undefined
  } catch {
    return undefined
  }
}

function withItem(c: Cart, code: string, section: number): Cart {
  const item = { code, section }
  return {
    items: c.items.some((i) => i.code === code)
      ? c.items.map((i) => (i.code === code ? item : i))
      : [...c.items, item],
    // Asıl seçilen şube artık yedek listesinde durmasın
    backups: {
      ...c.backups,
      [code]: (c.backups[code] ?? []).filter((b) => !(b.code === code && b.section === section)),
    },
  }
}

function without(c: Cart, code: string): Cart {
  const backups = { ...c.backups }
  delete backups[code]
  return { items: c.items.filter((i) => i.code !== code), backups }
}

/**
 * Öğrenci değişince bileşen `key` ile yeniden kurulur; sepet o öğrencinin kaydından yüklenir.
 * Kayıt yoksa (ilk ziyaret) ya da `forceDemo` ise örnek sepetle açılır.
 */
export function useCart(studentId: string, demo?: Cart, forceDemo = false) {
  const [cart, setCart] = useState(() => (forceDemo ? demo : load(studentId)) ?? demo ?? EMPTY)

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(studentId), JSON.stringify(cart))
    } catch {
      // depolama kapalıysa sepet yalnızca bu oturumda kalır
    }
  }, [studentId, cart])

  return {
    cart,
    replace: setCart,
    clear: () => setCart(EMPTY),
    setSection: (code: string, section: number) => setCart((c) => withItem(c, code, section)),
    remove: (code: string) => setCart((c) => without(c, code)),
    addBackup: (code: string, item: CartItem) =>
      setCart((c) => ({ ...c, backups: { ...c.backups, [code]: [...(c.backups[code] ?? []), item] } })),
    removeBackup: (code: string, index: number) =>
      setCart((c) => ({
        ...c,
        backups: { ...c.backups, [code]: (c.backups[code] ?? []).filter((_, i) => i !== index) },
      })),
    applyFix: (fix: Fix) =>
      setCart((c) => (fix.type === 'remove' ? without(c, fix.code) : withItem(c, fix.code, fix.section))),
  }
}

export type CartApi = ReturnType<typeof useCart>
