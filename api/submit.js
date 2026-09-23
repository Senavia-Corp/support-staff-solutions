// Recibe los dos formularios del sitio y los manda por email.
//
// Sustituye al backend de formularios de Webflow, que desaparece al cancelar la cuenta.
// El formulario de empleo lleva SSN y datos bancarios, asi que hay tres reglas que no se
// relajan por brevedad:
//
//   1. Solo POST. Un GET devuelve 405. Es lo que evita que el SSN acabe en la barra de
//      direcciones, en el historial del navegador y en los logs de acceso.
//   2. Los campos se leen por lista blanca. Lo que no este en FORMS no se lee ni se envia.
//   3. El contenido del formulario NO se loguea. Los logs de Vercel se leen desde el panel.

const nodemailer = require('nodemailer')

// La clave es el name= del input en el HTML; el valor, la etiqueta que sale en el email.
const FORMS = {
  contact: {
    subject: 'Nueva consulta desde supportstaffsolutionsusa.com',
    fields: {
      name: 'Full Name',
      Phone: 'Phone',
      Email: 'Email',
      Message: 'Message',
    },
    // Los mismos que el HTML marca required=. Message es opcional.
    required: ['name', 'Phone', 'Email'],
  },
  employment: {
    subject: 'Nueva solicitud de empleo',
    fields: {
      'Full-Name': 'Full Name',
      Email: 'Email',
      Phone: 'Phone',
      Address: 'Address',
      City: 'City',
      State: 'State',
      'Zip-Code': 'Zip Code',
      'Social-Security-Number-SSN': 'Social Security Number (SSN)',
      'Date-Of-Birth': 'Date Of Birth',
      'Bank-Account-Number': 'Bank Account Number',
      'Routing-Number': 'Routing Number',
      'Bank-Name': 'Bank Name',
    },
    // Sale en el correo HTML, encima de los datos.
    aviso: 'Contiene datos sensibles (SSN y cuenta bancaria). No lo reenvíes y bórralo cuando ya no haga falta.',
    // En este el HTML marca los 12 como required.
    required: [
      'Full-Name', 'Email', 'Phone', 'Address', 'City', 'State', 'Zip-Code',
      'Social-Security-Number-SSN', 'Date-Of-Birth', 'Bank-Account-Number',
      'Routing-Number', 'Bank-Name',
    ],
  },
}

const ENV = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_TO', 'TURNSTILE_SECRET_KEY']

// Turnstile. El widget de los dos formularios mete su token en cf-turnstile-response, que
// no esta en FORMS y por eso no viaja al email. Sin validarlo aqui el widget es decorado.
// Devuelve los error-codes de Cloudflare (vacio = humano); no contienen nada secreto y
// distinguen un token malo ('invalid-input-response') de un secreto mal puesto
// ('invalid-input-secret').
// ponytail: falla cerrado. Si Cloudflare no contesta en 8s, el envio se rechaza y el
// visitante ve el panel de error con el telefono. Fallar abierto solo si eso molesta.
async function turnstile(token, ip) {
  if (!token) return ['missing-input-response']
  const params = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: token })
  if (ip) params.set('remoteip', ip)
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: params,
      signal: AbortSignal.timeout(8000),
    })
    const data = await r.json()
    return data.success === true ? [] : data['error-codes'] || ['rejected']
  } catch (err) {
    console.error('Turnstile no respondio:', err && err.message)
    return ['siteverify-unreachable']
  }
}

// El correo en HTML, con la marca del sitio. Va junto al texto plano (multipart): cada
// cliente de correo elige, y el texto sigue siendo la version sin estilos. Estilos en
// linea y tablas porque Gmail y Outlook ignoran casi todo lo demas; sin imagenes, para
// que se vea igual con la carga de imagenes bloqueada.
// Todo lo que escribio el visitante pasa por esc(): sin eso, un nombre con etiquetas se
// pintaria como HTML en el buzon del cliente.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// Los colores salen de css/tokens.css. Texto sobre carbon en blanco; el verde es
// superficie o grafico, nunca letra sobre blanco (2,63:1).
const C = { tinta: '#1b1919', verde: '#43b556', mute: '#5c6167', linea: '#e0e4e0', fondo: '#eff2ee', peligro: '#b3261e' }
const FUENTE = 'Arial, Helvetica, sans-serif'

function correoHtml(spec, filas, replyTo) {
  // En los titulos, <wbr> antes de cada punto: un asunto con un dominio entero
  // (supportstaffsolutionsusa.com, 315px en negrita de 22px) no cabia en un movil y
  // ensanchaba todo el correo.
  const campos = filas.map(([label, v]) => `
          <tr><td style="padding:14px 0;border-bottom:1px solid ${C.linea}">
            <div style="font:12px/16px ${FUENTE};color:${C.mute};text-transform:uppercase;letter-spacing:.05em">${esc(label)}</div>
            <div style="font:16px/24px ${FUENTE};color:${C.tinta};margin-top:4px;word-break:break-word;overflow-wrap:anywhere">${esc(v).replace(/\r?\n/g, '<br>')}</div>
          </td></tr>`).join('')
  const aviso = spec.aviso ? `
          <tr><td style="padding:14px 16px;background:#fdecea;border-left:4px solid ${C.peligro};font:bold 14px/20px ${FUENTE};color:${C.peligro}">${esc(spec.aviso)}</td></tr>
          <tr><td style="height:8px;line-height:8px;font-size:0">&nbsp;</td></tr>` : ''
  const boton = replyTo ? `
      <tr><td style="padding:8px 32px 0">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${C.verde}" style="border-radius:4px">
          <a href="mailto:${esc(replyTo)}" style="display:inline-block;padding:12px 22px;font:bold 15px/20px ${FUENTE};color:${C.tinta};text-decoration:none">Responder por email</a>
        </td></tr></table>
      </td></tr>` : ''
  const pie = replyTo
    ? 'Si respondes a este correo, la respuesta le llega directamente a quien rellenó el formulario.'
    : 'El email que escribieron no es válido, así que responder a este correo no le llegará a nadie.'
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(spec.subject)}</title></head>
<body style="margin:0;padding:0;background:${C.fondo}">
<div style="display:none;max-height:0;overflow:hidden">${esc(filas.slice(0, 2).map(([, v]) => v).join(' · '))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.fondo}"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff">
    <tr><td style="background:${C.tinta};border-top:6px solid ${C.verde};padding:24px 32px">
      <div style="font:13px/18px ${FUENTE};color:#d9d9d9">Support Staff Solutions USA</div>
      <div style="font:bold 22px/28px ${FUENTE};color:#ffffff;margin-top:4px;overflow-wrap:anywhere">${esc(spec.subject).replace(/\./g, '<wbr>.')}</div>
    </td></tr>
    <tr><td style="padding:24px 32px 8px;font:15px/22px ${FUENTE};color:${C.tinta}">Alguien acaba de enviar un formulario desde la web. Estos son los datos:</td></tr>
    <tr><td style="padding:8px 32px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${aviso}${campos}
      </table>
    </td></tr>${boton}
    <tr><td style="padding:24px 32px 28px;font:13px/19px ${FUENTE};color:${C.mute}">${pie}<br>Enviado automáticamente por el formulario de supportstaffsolutionsusa.com.</td></tr>
  </table>
</td></tr></table>
</body></html>`
}

let transport
function mailer() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT)
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return transport
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const spec = FORMS[req.query.f]
  if (!spec) return res.status(400).json({ error: 'Unknown form' })

  const missingEnv = ENV.filter((k) => !process.env[k])
  if (missingEnv.length) {
    // Los nombres de las variables no son secretos; sus valores no se tocan.
    console.error('Faltan variables de entorno:', missingEnv.join(', '))
    return res.status(500).json({ error: 'Mail not configured' })
  }

  const body = req.body || {}
  const value = (k) => String(body[k] == null ? '' : body[k]).trim()

  const missing = spec.required.filter((k) => !value(k))
  if (missing.length) {
    // Solo los nombres de campo, nunca lo que el usuario escribio.
    return res.status(400).json({ error: 'Missing required fields', fields: missing })
  }

  // Despues de los campos a proposito: la sonda sin correo del README (name=solo -> 400)
  // sigue funcionando sin token.
  const ip = String((req.headers || {})['x-forwarded-for'] || '').split(',')[0].trim()
  const codes = await turnstile(value('cf-turnstile-response'), ip)
  if (codes.length) return res.status(403).json({ error: 'Verification failed', codes })

  const filas = Object.entries(spec.fields).map(([name, label]) => [label, value(name) || '-'])
  const text = filas.map(([label, v]) => `${label}: ${v}`).join('\n')

  // Poner el email de quien rellena en Reply-To hace que Responder le conteste a el.
  // Solo si parece un email de verdad: un salto de linea aqui seria inyeccion de cabeceras.
  const from = value('Email')
  const replyTo = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(from) ? from : undefined

  try {
    await mailer().sendMail({
      from: `"Support Staff Solutions" <${process.env.SMTP_USER}>`,
      to: process.env.MAIL_TO,
      replyTo,
      subject: spec.subject,
      text,
      html: correoHtml(spec, filas, replyTo),
    })
    return res.status(200).json({ ok: true })
  } catch (err) {
    // El mensaje de error de SMTP no contiene datos del formulario.
    console.error('Fallo al enviar el email:', err && err.message)
    return res.status(502).json({ error: 'Delivery failed' })
  }
}
