# Support Staff Solutions

Sitio de [supportstaffsolutionsusa.com](https://www.supportstaffsolutionsusa.com), migrado
de Webflow a Vercel. 5 páginas estáticas, sin CMS, sin build.

El primer commit del repo es el export de Webflow **sin tocar**. Todo lo que cambió respecto
al original se ve con:

```bash
git diff $(git rev-list --max-parents=0 HEAD)
```

## Estructura

| | |
|---|---|
| `*.html` | Las 5 páginas, tal cual salieron de Webflow salvo lo listado abajo |
| `css/ fonts/ images/` | Assets del export |
| `js/webflow.js` | Runtime de Webflow (animaciones, menú, carrusel). Sin tocar |
| `js/jquery-3.5.1.min.js` | Dependencia de `webflow.js`. Bajada del CDN de Webflow |
| `js/form-submit.js` | Envía los formularios a la API y replica el done/fail de Webflow |
| `api/submit.js` | Recibe los 2 formularios y los manda por email |
| `test/` | Comprobaciones de `api/submit.js`. `npm test` |

## Qué cambió respecto al export de Webflow

1. **jQuery y 7 SVGs bajados a local.** El export los seguía pidiendo a servidores de
   Webflow, incluido `uploads-ssl.webflow.com`, que Webflow está retirando. El sitio ya no
   depende de Webflow para nada. El jQuery local es byte a byte el mismo fichero: su
   SHA-256 coincide con el `integrity` que traía el export.
2. **Título de la home.** Decía `Copy of Support Staff Solutions` porque el export salió de
   un duplicado del sitio. Ahora dice lo que sirve producción.
3. **Los formularios.** Ver abajo.

Nada más. El contenido es idéntico.

## Formularios

Los recibía el backend de Webflow, que desaparece al cancelar la cuenta. En el export
quedaban con `method="get"` y sin `action`: los datos habrían acabado en la URL.

Ahora van por `POST /api/submit?f=contact` y `POST /api/submit?f=employment`, y la función
los manda por email a `MAIL_TO`. El `Reply-To` se pone al email de quien rellena, así que
Responder le contesta a él.

`js/form-submit.js` reproduce el comportamiento original: `contact-us` muestra el mensaje
de éxito en línea y `employment-application-form` redirige a la home, que es lo que hacía
Webflow vía `data-redirect`.

> **Sobre el formulario de empleo:** pide SSN, número de cuenta y routing bancario. La
> función nunca loguea el contenido y solo acepta POST, pero el correo no es un canal
> adecuado a largo plazo para ese dato. Merece una revisión aparte con el cliente.

### Variables de entorno

Las cinco son obligatorias; sin ellas la función devuelve 500.

| Variable | Valor |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | Cuenta de Google. Gmail obliga a que el remitente sea esta misma |
| `SMTP_PASS` | App password de Google. **Solo en Vercel, nunca en el repo** |
| `MAIL_TO` | Buzón que recibe los envíos |

## Dependencias externas que quedan

Ninguna de Webflow. Quedan dos de terceros, que ya estaban y no se caen al cancelar:

- **Splide** (`cdn.jsdelivr.net`) — carrusel de la home.
- **Elfsight** (`static.elfsight.com`) — widget de reseñas en home y about. No se puede
  localizar: es un widget de datos en vivo y depende de la cuenta de Elfsight del cliente.

## Pendiente

- **Cambio de DNS.** El dominio sigue apuntando a Webflow.
- **Turnstile.** El anti-spam se monta al conectar el DNS: necesita el dominio dado de alta
  en Cloudflare para emitir las claves. `js/webflow.js` ya trae soporte de fábrica.
- **Cancelar Webflow**, una vez el DNS esté cambiado y verificado.
