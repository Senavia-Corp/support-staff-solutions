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
    // En este el HTML marca los 12 como required.
    required: [
      'Full-Name', 'Email', 'Phone', 'Address', 'City', 'State', 'Zip-Code',
      'Social-Security-Number-SSN', 'Date-Of-Birth', 'Bank-Account-Number',
      'Routing-Number', 'Bank-Name',
    ],
  },
}

const ENV = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_TO']

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

  const text = Object.entries(spec.fields)
    .map(([name, label]) => `${label}: ${value(name) || '-'}`)
    .join('\n')

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
    })
    return res.status(200).json({ ok: true })
  } catch (err) {
    // El mensaje de error de SMTP no contiene datos del formulario.
    console.error('Fallo al enviar el email:', err && err.message)
    return res.status(502).json({ error: 'Delivery failed' })
  }
}
