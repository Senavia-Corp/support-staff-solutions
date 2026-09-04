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

  > Comprobado el 2026-09-04: el widget **no pinta nada, tampoco en el sitio de Webflow**.
  > El contenedor existe pero queda con 0 hijos y 0 px de alto en ambos. Ya estaba roto
  > antes de migrar — probablemente la cuenta de Elfsight caducó. No es una regresión de
  > la migración, pero conviene revisarlo con el cliente.

## Pendiente

- **Cambio de DNS.** El dominio sigue apuntando a Webflow.
- **Turnstile.** El anti-spam se monta al conectar el DNS: necesita el dominio dado de alta
  en Cloudflare para emitir las claves. `js/webflow.js` ya trae soporte de fábrica.
- **Cancelar Webflow**, una vez el DNS esté cambiado y verificado.

## Verificado

Comparado el despliegue contra el sitio vivo de Webflow el 2026-09-04:

- **Texto visible**: 0 diferencias en las 5 páginas.
- **DOM del `<body>`** (etiquetas y clases): 0 diferencias en las 5 páginas.
- **Layout**: las 5 páginas × 2 anchos (1280 y 375 px) dan la misma huella de cajas —
  mismas coordenadas, mismos tamaños, misma altura de documento. 10/10 idénticas.
- **Rutas**: `/about-us` y compañía sirven 200; `/about-us.html` redirige 308 a la limpia.
- **Assets**: ninguna imagen rota (0 de 23 en la home), consola sin errores, y las únicas
  peticiones externas son a jsdelivr y elfsight.
- **API**: `GET /api/submit` devuelve 405, un formulario desconocido 400.
- **Formularios**: el shim intercepta sin navegar, `contact-us` muestra el mensaje en línea
  y mueve el foco a él, y `employment-application-form` redirige a la home.

Lo único sin verificar es que el correo llegue de verdad, porque depende de `SMTP_PASS`.

## Si los formularios devuelven 502

Significa que Gmail rechaza la credencial (`535 BadCredentials`), no que el sitio falle.
Antes de tocar Vercel, comprueba la clave en local — tarda dos segundos y no envía nada:

```bash
npm run check-smtp
```

La causa más habitual es pegar la app password **con los espacios** con que Google la
muestra. Son 16 caracteres seguidos. El script te los quita y te dice si Gmail la acepta.
