# Support Staff Solutions

Sitio de [supportstaffsolutionsusa.com](https://www.supportstaffsolutionsusa.com).
5 páginas estáticas, sin CMS, sin build, sin dependencias de terceros en runtime.

El repo tiene dos hitos que conviene conocer:

```bash
# el export original de Webflow, sin tocar
git diff $(git rev-list --max-parents=0 HEAD) --stat

# solo el rediseño visual
git diff bffa6d7 --stat
```

## Estructura

| | |
|---|---|
| `*.html` | Las 5 páginas. HTML escrito a mano, sin generador |
| `css/tokens.css` | Tipografías, paleta, escala tipográfica, espaciado, la diagonal. **Las reglas de contraste están escritas aquí** |
| `css/base.css` | Reset, elementos, primitivas de maquetación y la primitiva `.plane` |
| `css/components.css` | Cabecera, botones, tarjetas, testimonios, formularios, pie |
| `css/pages.css` | La composición de cada página |
| `js/site.js` | 130 líneas: menú móvil y flechas del carrusel. Nada más |
| `js/form-submit.js` | Envía los formularios a la API y replica el done/fail de Webflow |
| `api/submit.js` | Recibe los 2 formularios y los manda por email |
| `fonts/` | Anton (titulares, OFL) y Campton Medium/SemiBold (cuerpo, licencia del cliente) |
| `test/` | `npm test`. Es la puerta: si no pasa, no está terminado |
| `robots.txt`, `sitemap.xml` | SEO técnico |

## El sistema visual

La dirección sale del folleto de marca, no de una plantilla. **El corte diagonal es el
gesto de marca** y ahora está en todo el sitio, no solo en el pie.

Los tres colores están muestreados del propio folleto:

| | | |
|---|---|---|
| `--c-green` | `#43b556` | Verde de marca. Es el valor con el que están autorizados los 8 SVG de iconos |
| `--c-green-deep` | `#2a542d` | Verde profundo. El plano que le faltaba al sitio |
| `--c-ink` | `#1b1919` | Carbón **cálido**, no un negro azulado |

**El verde es superficie, nunca tinta sobre blanco**: `#43b556` sobre blanco da 2,63:1 y
falla AA incluso en tamaño grande. Relleno verde lleva texto carbón (6,65:1). Para verde
como texto sobre claro está `--c-green-ink` `#2f7d3d` (5,09:1). Las reglas completas están
comentadas al principio de `css/tokens.css`, que es donde hay que leerlas antes de tocar
un color.

### La diagonal

Un solo ángulo en todo el sitio: **3,43°**, constante a cualquier ancho.

El truco está en expresar el desplazamiento vertical como `6vw` en lugar de un porcentaje.
`clip-path` resuelve los porcentajes **por eje contra la caja del elemento**, así que el
ángulo se mueve con la relación de aspecto: en el sitio anterior iba de 3,6° a 1440px hasta
16,9° a 375px, y por eso el export aplanaba la diagonal a un rectángulo en móvil en vez de
arreglarla. Con `6vw`, `atan(0.06)` es el mismo ángulo en todas partes y el gesto sobrevive
en el móvil.

Se usa con la primitiva `.plane` de `base.css`. Tres reglas que no son negociables:

1. La diagonal **nunca** va sobre el elemento que contiene texto, solo sobre un `.plane`
   hermano que va `aria-hidden`.
2. Una diagonal por altura de pantalla, como máximo.
3. `clip-path` crea bloque contenedor para descendientes `position: fixed`. Nada fijo puede
   vivir dentro de una sección con `.plane`. La cabecera es hermana de todas las secciones,
   así que se cumple por estructura.

### Movimiento

Hay **un** momento animado en todo el sitio, el hero, y es CSS puro. Se **añade** dentro de
`@media (prefers-reduced-motion: no-preference)` en vez de quitarse bajo `reduce`, de modo
que el estado por defecto es el visible.

Esto no es un detalle de estilo. El sitio anterior ocultaba 48 elementos con
`style="opacity:0"` en el HTML y los revelaba con un disparador `SCROLL_INTO_VIEW` de
Webflow IX2, **que no dispara para lo que ya está en el viewport**: la cabecera y el hero se
quedaban invisibles en el primer pintado, y `/about-us` y `/services` pintaban como un
degradado verde vacío. Aquí la visibilidad del contenido no depende de JavaScript en ningún
momento, y no queda ni un `opacity:0` en el HTML.

## Formularios

`js/form-submit.js` intercepta el `submit` **en fase de captura** para cualquier form cuyo
`action` empiece por `/api/submit`. Al tocar estas dos páginas hay que conservar:

- el `action` (`?f=contact` / `?f=employment`);
- el envoltorio `.w-form`, con `.w-form-done` y `.w-form-fail` **como hermanos del `<form>`**;
- el `data-redirect` del formulario de empleo y el `[type="submit"]` con `data-wait`;
- **todos los `name=`**, que `api/submit.js` tiene en lista blanca uno a uno.

> ⚠️ **`.w-form-done` y `.w-form-fail` llevan `display: none` en `css/components.css`.**
> Esa regla venía de `css/webflow.css`, que este rediseño borró, y `form-submit.js` solo
> hace `display:block` al enviar: nunca los oculta al cargar. Sin esa regla los dos mensajes
> se ven permanentemente en las dos páginas con formulario, y sin lanzar ningún error.

### Variables de entorno

`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_TO`. Las cinco son obligatorias;
si falta una, la función responde 500 y registra solo los nombres que faltan, nunca valores.
`npm run check-smtp` verifica la credencial de Gmail sin enviar nada.

## Desarrollo

```bash
node .claude/serve.js . 4321   # servidor estático con cleanUrls, sin dependencias
npm test                        # la puerta
```

`.claude/serve.js` replica lo único de Vercel que importa en local: `cleanUrls`, que sirve
`/services` desde `services.html`.

## Verificado

Sobre el build servido, no a ojo:

- **5 páginas × 4 anchos (375, 768, 1024, 1440)**: 0 elementos en `opacity:0`, 0 scroll
  horizontal, un solo `<h1>` por página, sin saltos de nivel de encabezado, ninguna `<img>`
  sin `alt`, 0 errores de consola.
- **64 referencias locales**, todas 200 por HTTP. **Cero peticiones a terceros.**
- **Anclas de `/services`**: caen con 15px de holgura bajo la barra fija a los cuatro
  anchos, entrando en frío y dentro de la misma página. Antes el destino quedaba 90,7px por
  debajo del borde inferior de la barra.
- **Ángulo de la diagonal**: 3,43° a 375, 768, 1024 y 1440. Dispersión 0,00°.
- **Formularios**, con `fetch` stubeado y sin enviar correo: los dos paneles calculan
  `display:none` al cargar; con `ok:true` sale el de éxito, se oculta el formulario y el
  foco va al panel; con `ok:false` sale el de error y el botón se restaura.
- **Menú**: abre, lleva el foco al primer enlace, `Tab` cicla dentro del panel, `Escape`
  cierra y devuelve el foco al botón. Sin JS la lista se ve apilada y el botón no existe.
- **Contraste**: todos los pares calculados pasan AA, incluidos los que van sobre los planos
  diagonales, que hay que computar a mano porque el fondo visual es un hermano absoluto y no
  un ancestro.

## Pendiente

Del despliegue:

1. **`SMTP_PASS`** en Vercel. Sin ella los formularios devuelven 500.
2. **Cambio de DNS** en Cloudflare, con el usuario delante. **El DNS sigue en Webflow.**
3. **Widget de Turnstile**, que necesita el dominio dado de alta en Cloudflare.
4. **Cancelar Webflow**, ya con el DNS verificado.

Del cliente, para cerrar el diseño:

5. **Logos de clientes** para la franja de marcas. Hasta que lleguen se ven marcadores.
6. **Retrato de Alejandro Amado a 1200px.** El actual son 210×320 y no se puede ampliar.
7. **Confirmar la frase de misión** de `/about-us`, redactada a partir de su propio
   vocabulario porque el titular decía "Our Mission" y el cuerpo describía la visión.

Y una que sigue viva y no la arregla el rediseño:

8. **El formulario de empleo recoge SSN, cuenta y routing bancario y se envía por email.**
   El correo no es el canal adecuado para ese dato a largo plazo. Merece una conversación
   con el cliente.
