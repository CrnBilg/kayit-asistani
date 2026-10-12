// `npm run build` çıktısını tek bir HTML dosyasına gömer (claude.ai Artifact olarak yayınlamak için).
// Kullanım: npm run build:artifact  →  dist-artifact/kayit-asistani.html
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const html = readFileSync(join(dist, 'index.html'), 'utf8')

const asset = (re) => {
  const m = html.match(re)
  if (!m) throw new Error(`dist/index.html içinde bulunamadı: ${re}`)
  return readFileSync(join(dist, m[1].replace(/^\.?\//, '')), 'utf8')
}

const css = asset(/<link[^>]+href="([^"]+\.css)"/)
// Gömülü script içinde "</script" geçerse sayfayı bozmasın
const js = asset(/<script[^>]+src="([^"]+\.js)"/).replace(/<\/script/gi, '<\\/script')

const out = `<title>Kayıt Asistanı</title>
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`

mkdirSync(join(root, 'dist-artifact'), { recursive: true })
writeFileSync(join(root, 'dist-artifact', 'kayit-asistani.html'), out)
console.log(`dist-artifact/kayit-asistani.html yazıldı (${(out.length / 1024).toFixed(0)} KB)`)
