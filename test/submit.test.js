// Comprobacion de api/submit.js sin tocar SMTP ni Cloudflare: createTransport y fetch se
// sustituyen por dobles que guardan lo que se habria enviado. Cubre lo que de verdad puede
// romperse en silencio: que un GET no pase, que solo salgan los campos de la lista blanca,
// que un Reply-To manipulado no cuele cabeceras, y que sin un token de Turnstile valido
// no salga ningun email.

const test = require('node:test')
const assert = require('node:assert')

Object.assign(process.env, {
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '465',
  SMTP_USER: 'remitente@example.com',
  SMTP_PASS: 'x',
  MAIL_TO: 'destino@example.com',
  TURNSTILE_SECRET_KEY: 'secreto-de-prueba',
})

const sent = []
require('nodemailer').createTransport = () => ({
  sendMail: async (msg) => { sent.push(msg); return { messageId: 'test' } },
})

// Doble de siteverify: acepta el token 'bueno', simula una caida con 'cae' y rechaza el resto.
const verificados = []
global.fetch = async (url, opts) => {
  const p = new URLSearchParams(opts.body)
  verificados.push({ url, secret: p.get('secret'), response: p.get('response'), remoteip: p.get('remoteip') })
  if (p.get('response') === 'cae') throw new Error('The operation was aborted due to timeout')
  const ok = p.get('response') === 'bueno'
  return { json: async () => ({ success: ok, 'error-codes': ok ? [] : ['invalid-input-response'] }) }
}

const handler = require('../api/submit.js')

function res() {
  const r = { statusCode: null, body: null, headers: {} }
  r.setHeader = (k, v) => { r.headers[k] = v; return r }
  r.status = (c) => { r.statusCode = c; return r }
  r.json = (b) => { r.body = b; return r }
  return r
}

const CONTACT = { name: 'Ana Perez', Phone: '786-357-9121', Email: 'ana@example.com', Message: 'Hola', 'cf-turnstile-response': 'bueno' }

test('un GET no pasa: es lo que evita el SSN en la URL', async () => {
  const r = res()
  await handler({ method: 'GET', query: { f: 'employment' }, body: {} }, r)
  assert.strictEqual(r.statusCode, 405)
  assert.strictEqual(r.headers.Allow, 'POST')
})

test('un formulario que no existe se rechaza', async () => {
  const r = res()
  await handler({ method: 'POST', query: { f: 'otro' }, body: CONTACT }, r)
  assert.strictEqual(r.statusCode, 400)
})

test('faltando un campo obligatorio devuelve 400 y dice cual, sin el valor', async () => {
  const r = res()
  await handler({ method: 'POST', query: { f: 'contact' }, body: { ...CONTACT, Phone: '  ' } }, r)
  assert.strictEqual(r.statusCode, 400)
  assert.deepStrictEqual(r.body.fields, ['Phone'])
})

test('un envio valido sale con el Reply-To de quien rellena', async () => {
  sent.length = 0
  const r = res()
  await handler({ method: 'POST', query: { f: 'contact' }, body: CONTACT }, r)
  assert.strictEqual(r.statusCode, 200)
  assert.strictEqual(sent.length, 1)
  assert.strictEqual(sent[0].to, 'destino@example.com')
  assert.strictEqual(sent[0].replyTo, 'ana@example.com')
  assert.match(sent[0].text, /Full Name: Ana Perez/)
  assert.match(sent[0].text, /Message: Hola/)
})

test('lo que no esta en la lista blanca no viaja al email', async () => {
  sent.length = 0
  const r = res()
  await handler({ method: 'POST', query: { f: 'contact' },
    body: { ...CONTACT, admin: 'true', __proto__polluted: 'x' } }, r)
  assert.strictEqual(r.statusCode, 200)
  assert.doesNotMatch(sent[0].text, /admin|polluted/)
})

test('un Email con salto de linea no llega a Reply-To (inyeccion de cabeceras)', async () => {
  sent.length = 0
  const r = res()
  await handler({ method: 'POST', query: { f: 'contact' },
    body: { ...CONTACT, Email: 'a@b.com\nBcc: fuga@evil.com' } }, r)
  assert.strictEqual(r.statusCode, 200)
  assert.strictEqual(sent[0].replyTo, undefined)
})

test('el formulario de empleo exige sus 12 campos', async () => {
  const r = res()
  await handler({ method: 'POST', query: { f: 'employment' }, body: { 'Full-Name': 'Ana' } }, r)
  assert.strictEqual(r.statusCode, 400)
  assert.strictEqual(r.body.fields.length, 11)
})

test('sin token de Turnstile no sale ningun email', async () => {
  sent.length = 0
  const { 'cf-turnstile-response': _, ...sinToken } = CONTACT
  const r = res()
  await handler({ method: 'POST', query: { f: 'contact' }, body: sinToken }, r)
  assert.strictEqual(r.statusCode, 403)
  assert.deepStrictEqual(r.body.codes, ['missing-input-response'])
  assert.strictEqual(sent.length, 0)
})

test('un token que Cloudflare rechaza no envia nada', async () => {
  sent.length = 0
  const r = res()
  await handler({ method: 'POST', query: { f: 'contact' }, body: { ...CONTACT, 'cf-turnstile-response': 'robot' } }, r)
  assert.strictEqual(r.statusCode, 403)
  assert.deepStrictEqual(r.body.codes, ['invalid-input-response'])
  assert.strictEqual(sent.length, 0)
})

test('si Cloudflare no contesta se rechaza: falla cerrado', async () => {
  sent.length = 0
  const r = res()
  await handler({ method: 'POST', query: { f: 'contact' }, body: { ...CONTACT, 'cf-turnstile-response': 'cae' } }, r)
  assert.strictEqual(r.statusCode, 403)
  assert.strictEqual(sent.length, 0)
})

test('el token va a siteverify con el secreto y la IP, y no llega al email', async () => {
  sent.length = 0
  verificados.length = 0
  const r = res()
  await handler({ method: 'POST', query: { f: 'contact' }, body: CONTACT,
    headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } }, r)
  assert.strictEqual(r.statusCode, 200)
  const [v] = verificados
  assert.strictEqual(v.url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify')
  assert.strictEqual(v.secret, 'secreto-de-prueba')
  assert.strictEqual(v.response, 'bueno')
  assert.strictEqual(v.remoteip, '203.0.113.7')
  assert.doesNotMatch(sent[0].text, /bueno|turnstile/i)
})

test('sin TURNSTILE_SECRET_KEY la funcion no arranca: 500', async () => {
  const antes = process.env.TURNSTILE_SECRET_KEY
  delete process.env.TURNSTILE_SECRET_KEY
  try {
    const r = res()
    await handler({ method: 'POST', query: { f: 'contact' }, body: CONTACT }, r)
    assert.strictEqual(r.statusCode, 500)
  } finally {
    process.env.TURNSTILE_SECRET_KEY = antes
  }
})
