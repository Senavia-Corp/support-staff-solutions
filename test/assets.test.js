// Comprueba que ninguna referencia local del sitio apunta a un fichero que no existe, y que
// no queda nada colgando de servidores de Webflow.
//
// Esto es el gate de la migracion: el export traia jQuery y 7 SVGs servidos desde Webflow,
// y el dia que se cancele la cuenta cualquier resto se cae sin avisar. Un 404 en un asset
// no rompe la pagina de forma visible, asi que se comprueba aqui y no a ojo.

const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.join(__dirname, '..')
const html = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'))
const css = fs.readdirSync(path.join(ROOT, 'css')).map((f) => path.join('css', f))

// Ya no queda ningun tercero sirviendo assets: Splide se fue con el carrusel
// propio (scroll-snap en CSS) y el widget de Elfsight llevaba roto desde antes
// de migrar (0 hijos, 0px de alto, tambien en el sitio de Webflow).
// El conjunto vacio es mas estricto que la lista anterior, no menos.
const EXTERNOS_OK = []

function refs(file) {
  const s = fs.readFileSync(path.join(ROOT, file), 'utf8')
  const out = []
  const patterns = [/(?:src|href)="([^"]+)"/g, /url\(["']?([^"')]+)["']?\)/g]
  for (const re of patterns) {
    for (const m of s.matchAll(re)) out.push(m[1])
  }
  return out
}

test('ninguna referencia local apunta a un fichero que no existe', () => {
  const rotas = []
  for (const file of [...html, ...css]) {
    const base = path.dirname(path.join(ROOT, file))
    for (const ref of refs(file)) {
      if (/^(https?:|mailto:|tel:|data:|#|\/api\/)/.test(ref)) continue
      const target = path.resolve(base, ref.split(/[?#]/)[0])
      if (!fs.existsSync(target)) rotas.push(`${file} -> ${ref}`)
    }
  }
  assert.deepStrictEqual(rotas, [], `Referencias rotas:\n${rotas.join('\n')}`)
})

test('no queda nada pidiendo assets a Webflow', () => {
  const restos = []
  for (const file of [...html, ...css]) {
    const s = fs.readFileSync(path.join(ROOT, file), 'utf8')
    for (const m of s.matchAll(/https?:\/\/([^\s"'/)]+)/g)) {
      const host = m[1]
      if (/webflow\.com$|website-files\.com$|cloudfront\.net$/.test(host)) {
        // El comentario "This site was created in Webflow" enlaza a webflow.com y no
        // provoca ninguna peticion. Todo lo demas si.
        if (host === 'webflow.com') continue
        restos.push(`${file}: ${host}`)
      }
    }
  }
  assert.deepStrictEqual(restos, [], `Assets aun servidos por Webflow:\n${restos.join('\n')}`)
})

test('los unicos terceros que sirven assets son los esperados', () => {
  // Solo lo que el navegador descarga: src= de script/img y href= de <link>. Los <a> a
  // sitios de terceros son enlaces de navegacion y no cuentan.
  const hosts = new Set()
  // De los <link>, solo cuentan los rel que provocan una descarga. Un
  // rel="canonical" apunta al dominio final del sitio y no pide ningun byte;
  // contarlo daba un falso positivo en cuanto se anadio la canonica.
  const REL_QUE_DESCARGA = /\brel="(stylesheet|preload|prefetch|icon|shortcut icon|apple-touch-icon|manifest)"/i
  for (const file of html) {
    const s = fs.readFileSync(path.join(ROOT, file), 'utf8')
    for (const m of s.matchAll(/src="https?:\/\/([^\s"'/]+)/g)) hosts.add(m[1])
    for (const m of s.matchAll(/<link\b[^>]*>/g)) {
      if (!REL_QUE_DESCARGA.test(m[0])) continue
      const h = m[0].match(/href="https?:\/\/([^\s"'/]+)/)
      if (h) hosts.add(h[1])
    }
  }
  assert.deepStrictEqual([...hosts].sort(), EXTERNOS_OK.slice().sort())
})
