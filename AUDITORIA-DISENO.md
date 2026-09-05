# Auditoría de diseño y calidad — supportstaffsolutionsusa.com

**Estado: aplicada y en producción.** 5 de septiembre de 2026 · rama `main`.
Base auditada `a99e845` · arreglos en `f550d7a` · desplegado en
`https://support-staff-solutions.vercel.app` y verificado allí, no solo en local.

Medido sobre `node .claude/serve.js . 4321` y reconfirmado en
`https://support-staff-solutions.vercel.app`, que era **byte a byte idéntico** al disco
(los 5 HTML coinciden exactamente y los 4 CSS tienen el mismo SHA-256).

`npm test`: **11/11 en verde**, antes y después de cada tanda de cambios.

**18 hallazgos aplicados · 5 dejados a propósito · 1 bloqueado.**

---

## Antes de nada: una corrección a mi propia auditoría

En la primera pasada dije que había **cuatro** declaraciones muertas por duplicado
(P3-06). Al ir a arreglarlas resultó que solo una lo era:

| Selector | Qué pasa de verdad |
|---|---|
| `.footer-cta__title` | **Muerta de verdad.** `18ch` en `components.css:422` la pisa `24ch` en `:455` |
| `.who__body` | `pages.css:91` fija `max-width` y `color`; `:339` fija `margin-block-start`. **No se pisan** |
| `.process__media` | `:134` fija `aspect-ratio`; `:340` fija `margin-block-start`. **No se pisan** |
| `.w-form-done, .w-form-fail` | `components.css:408` es el `display:none` y `:410` es otro bloque. **No se pisan** — y ese `display:none` es justo el que el README avisa de no borrar: sin él los dos mensajes se ven siempre en las dos páginas con formulario |

Si llego a "arreglar" ese último a ciegas, rompo los dos formularios exactamente como el
repo advierte. Solo se tocó la de `.footer-cta__title`.

---

# Lo aplicado

## Accesibilidad

### F-01 · El botón secundario del hero era casi invisible
`index.html:73` · `css/components.css`

«See what we do» salía con texto **y** borde de carbón sobre el verde profundo. La causa:
`.hero` es superficie oscura pero **no lleva la clase `.u-on-dark`** —declara su color a
mano—, así que el override `.u-on-dark .btn--ghost` no casaba nunca. Es el único
`.btn--ghost` del sitio.

```css
.hero .btn--ghost { color: var(--c-on-dark); }
.hero .btn--ghost:hover { background: var(--c-on-dark); color: var(--c-ink); }
```

**2,00:1 → 8,73:1.**

### F-02 y P1-02 · El anillo de foco no llegaba a 3:1 en media web
`css/base.css`

Dos problemas del mismo origen. El anillo era `--c-green` fijo, y no hay **ningún** color
único que pase 3:1 sobre las cinco superficies del sitio:

| Superficie | Verde | Carbón |
|---|---|---|
| `--c-green` #43b556 | **1,00:1** | 6,65:1 |
| `--c-paper-2` #eff2ee | **2,33:1** | 16,49:1 |
| `--c-paper` #ffffff | **2,63:1** | 17,50:1 |
| `--c-green-deep` #2a542d | 3,36:1 | **1,86:1** |
| `--c-ink` #1b1919 | 6,65:1 | **1,00:1** |

Así que el anillo se elige por superficie. Por defecto **carbón**, que cubre toda la mitad
clara del sitio; **verde** en las oscuras. Y aquí estaba la trampa: `.u-on-dark` solo está
en dos elementos de todo el sitio, mientras hay **ocho superficies oscuras más** que
declaran su color a mano. Hay que nombrarlas todas.

```css
:focus-visible { outline: var(--focus-w) solid var(--c-ink); outline-offset: 2px; border-radius: var(--r-1); }
.u-on-dark :focus-visible, .site-header :focus-visible, .site-footer :focus-visible,
.hero :focus-visible, .who :focus-visible, .cta-band :focus-visible,
.page-hero :focus-visible, .contact-hero :focus-visible, .facts :focus-visible,
.positions :focus-visible { outline-color: var(--c-green); }
/* la banda CTA es verde y vive dentro del pie: vuelve a carbón. Va la última. */
.footer-cta-band :focus-visible { outline-color: var(--c-ink); }
```

**Cero elementos enfocables por debajo de 3:1** en las cinco rutas y todos los anchos
medidos. El único que queda sin verificar es `.u-skip`, que vive fuera de pantalla hasta
recibir foco.

## Composición

### P1-01 · El lead del hero se salía del plano y caía sobre la fotografía
`css/pages.css` · `/services` y `/about-us`, ≥1024px

El párrafo de entrada tenía `max-width: 48ch` —759px de caja— contra un plano opaco que
acaba en el 48% del ancho. En `/about-us` cruzaban las tres líneas; en `/services`, la
primera. Baja a **`34ch`**, que es el mismo que ya usaba el lead del hero de la home.

| Ruta | Ancho | Antes | Después |
|---|---|---|---|
| `/services` | 1024 | 1 de 2 líneas fuera · 2,26:1 | **0 fuera · 10,45:1** |
| `/services` | 1440 | 1 de 2 fuera · 1,27:1 | **0 fuera · 10,45:1** |
| `/about-us` | 1024 | 3 de 3 fuera · 1,76:1 | **0 fuera · 5,85:1** |
| `/about-us` | 1440 | 3 de 3 fuera · 1,41:1 | **0 fuera · 5,85:1** |
| `/about-us` | 1920 | 3 de 3 fuera · 1,86:1 | **0 fuera · 5,85:1** |

Las **fichas de ancla** de `/services` tenían el mismo problema: la tercera acababa 16px
pasado el corte y su anillo de foco caía sobre una zona clara de la foto, a 1,98:1. Ahora
`max-width: 45%` a ≥64rem; a 1440 la última acaba en x589 con el corte en 691.

### P2-01 · El conector de «Our process» no llegaba al siguiente paso
`css/components.css`

La altura estaba cableada como `calc(100% + var(--s-7) - 3.25rem + 0.5rem)`, donde `100%`
es el propio marcador: **56px fijos, siempre**, contra huecos de 79 a 176px según el ancho.
La línea se cortaba en el aire en los seis anchos medidos.

La línea se muda del marcador al `.step`, que ya es `position: relative` y cuyo
`padding-block-end` acaba justo donde empieza el marcador siguiente:

```css
.step:not(:last-child)::after {
  content: ""; position: absolute;
  inset-block: 3.25rem 0;
  inset-inline-start: calc(1.625rem - 1px);
  width: 0; border-inline-start: 2px dashed var(--c-line);
}
```

**Déficit 0px** en 320, 375, 414, 640, 768, 1024 y 1440, con la línea centrada en el marcador.

### P2-02 · El carrusel no asomaba nada a partir de 768px
`css/components.css`

En escritorio las tarjetas encajaban exactas y parecía una rejilla de tres, no un carrusel,
pese a tener entre 709 y 1094px de desplazamiento. La aritmética es `asomo = resta − hueco`,
así que se resta el hueco más el asomo que se quiere, con un token que lo dice:

```css
.quotes__track { --peek: calc(var(--s-5) + 2.5rem); }
@media (min-width: 48rem) { .quotes__track { grid-auto-columns: calc((100% - var(--s-5) - var(--peek)) / 2); } }
@media (min-width: 64rem) { .quotes__track { grid-auto-columns: calc((100% - 2 * var(--s-5) - var(--peek)) / 3); } }
```

| Ancho | Antes | Después |
|---|---|---|
| 768 | **0px** | **40px** (13,0% de la tarjeta) |
| 1024 | **0px** | **40px** (14,4%) |
| 1440 | **0px** | **40px** (11,0%) |

Por debajo de 768 no se toca nada: 18px a 320, 26,2 a 375, 31,7 a 414, 54,3 a 544 y 145 a 640.

### P2-03 · Dos secciones blancas seguidas en la home
`css/pages.css`

`.brands` y la sección de servicios resolvían las dos a blanco: **2.140px de blanco corrido
a 375px**, 2,6 alturas de pantalla sin nada que marcase la costura. Un filete de `--c-line`
a ancho de `.u-page`, que es el mismo divisor que el sistema ya usa en `.value`,
`.positions__item` y `.includes__item`.

```css
.brands { padding-block: var(--s-8); border-block-end: 1px solid var(--c-line); }
```

**No** se movió la franja a `--c-paper-2`, que sería el gesto más fuerte, porque dos de los
seis logos traen fondo blanco opaco y sobre `#eff2ee` aparecerían las cajas. Eso queda
atado a los dos ficheros pendientes (ver «Sigue abierto»).

### P2-04 · Tres diagonales en una pantalla en `/about-us`
`about-us.html`

La regla 3 de la diagonal —una por altura de pantalla— la incumplían tres sitios distintos,
y **solo uno merecía tocarse**:

- **Se quitaron las dos cuñas de `.facts`.** El hero cerraba con una cuña de papel abajo a
  la derecha y `.facts` abría con otra arriba a la derecha, a 61px: juntas formaban un rombo
  blanco a caballo de la costura que no significaba nada. Y la de abajo a la izquierda
  cerraba el zigzag. El hero ya pone la diagonal de esa pantalla. **De 3 a 2 por pantalla.**
- **Las dos cuñas de la banda CTA del pie se quedan.** Son las dos caras de una misma banda
  y leen como un solo gesto.
- **Las tres tarjetas de servicio se quedan.** En escritorio van en fila y a la misma
  altura: es ritmo de componente, no tres gestos compitiendo.

### P2-05 · Tres imágenes con `loading="lazy"` sobre el pliegue
`contact-us.html`

Los tres iconos de las fichas de contacto, en la primera sección de `<main>`. Eran los
únicos `lazy` sobre el pliegue del sitio. Quitado el atributo.

### P2-06 · Dos bloques donde el relleno pesaba más que el contenido
`css/pages.css`

**La franja de cifras de `/about-us`** era 70,9% de aire a 1440 y 74,3% a 1920: tres números
de 131,8px dentro de 453,6px, con 160,9px de relleno arriba y abajo. Dos causas —el factor
`.6` y el `--diag` que reservaba sitio para las cuñas—. Como las cuñas se fueron (P2-04) ya
no hay nada que reservar:

```css
.facts__inner { padding-block: clamp(var(--s-6), calc(var(--section-y) * .45), var(--s-8)); }
```

| Ancho | Antes | Después |
|---|---|---|
| 375 | 430,7px · 26,0% de aire | 382px · 16,7% |
| 1440 | 453,6px · **70,9%** | 243,6px · **45,9%** |
| 1920 | 512,6px · **74,3%** | 259,8px · **49,3%** |

**El raíl del perfil** dejaba 518,4px de columna izquierda vacía a 1440 —el 61%— porque el
raíl mide 331,5px dentro de una fila de 849,9px. Ahora acompaña al texto, con el mismo
patrón que ya usa `.why__intro`:

```css
@media (min-width: 64rem) { .profile__rail { position: sticky; top: calc(var(--header-h) + var(--s-6)); } }
```

## Tipografía y sistema

### P3-02 · La viuda de `.includes__term`
`css/pages.css`

`<dt>` no es un heading, así que el `text-wrap: balance` de `base.css:46` no le llegaba.
Añadido — pero no bastaba: «Workers' compensation insurance» necesita ~13,5em de caja y con
tres columnas y el hueco de `--s-8` la columna medía 357px. Balance no puede hacer nada si
sencillamente no cabe.

Tres columnas solo caben cuando `.u-page` toca su tope de 75rem, y eso pasa a partir de
**80rem** de viewport. Hasta ahí, dos columnas; y el hueco baja a `--s-6` para dar los
últimos píxeles. A 1024 la columna pasa de 294,5px a **441,7px**; a 1280 y por encima son
378,7px con tres columnas. **Cero viudas a 1024, 1280, 1440 y 1920.**

### P3-03 · «6:00 PM» se partía en dos líneas a 320px
`contact-us.html`

Espacios duros donde la unidad no debe partirse:
`Mon&ndash;Fri, 8:00&nbsp;AM &ndash; 6:00&nbsp;PM`.

### P3-04 · Cuatro transiciones de `transform` fuera de `no-preference`
`css/components.css` · `css/pages.css`

El sitio promete que el movimiento se **añade** bajo `no-preference`, nunca se da por hecho.
Quitada la transición de `transform` de `.nav-toggle__bars`, `.btn`, `.quotes__dot::before`
y `.contact-tile`. Los cambios de color se mantienen —no son movimiento— y los `:active`
siguen dando su respuesta táctil, ahora instantánea.

### P3-05 · Radio fuera de botones y campos
`css/components.css` · Quitado el `--r-2` de `.w-form-done` y `.w-form-fail`: no son ni
botón ni campo, y ya se separan con su filete inset. Los dos chips (`.anchor-chip`,
`.partner-chip`) se quedan: son enlaces con forma de píldora, familia de botón.

### P3-06 · La declaración muerta
`css/components.css` · Quitado el `max-width: 18ch` de `.footer-cta__title` que pisaba el
`24ch` de más abajo. (Las otras tres no lo eran; ver la corrección del principio.)

### P3-07 · Los dos tokens fantasma
`css/tokens.css` · `css/base.css` · `css/pages.css`

- **`--fs-xs`** estaba definido y no lo consumía nadie. Borrado.
- **`--diag-pad`** era al revés: la regla 2 de la diagonal lo declara obligatorio y **no
  existía**; la holgura se escribía a mano en las siete secciones que la usan. Ahora el
  token existe, vale `calc(var(--section-y) + var(--diag))`, y es el que se aplica en las
  siete.

### P3-08 · La franja de logos quedaba muy apagada
`css/components.css` · Opacidad de reposo de `.66` a `.78`. Con `.66` la mitad de las marcas
estaban por debajo de 3:1 de gris medio sobre blanco y Miami Agro en 1,92:1. El gris sigue
siendo atenuación, no tinte: no se recolorea nada.

### P3-10 · «Un ángulo en todo el sitio» no era cierto
`css/base.css` · El corte horizontal sí es 3,434° exactos a todos los anchos. El de
`.plane--split` no puede serlo: se mide contra el **alto** de la sección, que depende del
contenido, y va de 5,22° a 1024px a 6,53° a 1440. Corregido el comentario de la cabecera de
la diagonal, que era lo único que estaba mal.

---

# Dejado a propósito

No todo hallazgo merece un cambio. Estos cinco se quedan, y el motivo importa.

**`--lh-display: .92` (P3-01).** El margen del sistema es de **−0,33px**: el paso entre
líneas mide 95,60px y el punto de la `i` de Anton mide 95,93px de tinta. Hoy el peor par del
sitio se solapa 1,14px y no se estropea. Subir el interlineado cambiaría la voz del display
en todo el sitio para arreglar un roce de un píxel. **Queda como restricción de redacción**:
en titulares de display, evitar que una letra con descendente caiga justo encima de una `i`,
una `j` o una mayúscula acentuada — ahí el choque sería de 13,5px.

**Las cuñas del pie y las tarjetas de servicio (P2-04).** Ya explicado arriba: un gesto de
dos caras y un ritmo de componente. Formalmente incumplen la regla 3; en la pantalla no
molestan.

**La viuda de `.profile__name`.** «Alejandro Amado» parte tras el nombre en un raíl de
224px. Un nombre propio en dos líneas dentro de una ficha de retrato es tipografía normal,
no un defecto. Arreglarlo obligaría a bajar el cuerpo del `h2` o a ensanchar el raíl, y las
dos cosas son peores que el problema.

**Las viudas de `.cta-band__title` a 320 y `.value__title` a 1024.** `text-wrap: balance` ya
está activo en las dos y ya hizo lo que podía: no hay mejor corte disponible con el ancho de
caja actual.

---

# Sigue abierto

**P3-09 · Las dos Campton son TTF y pesan el 24% de la página.** `Campton-Medium.ttf`
(115,5 KB) y `Campton-SemiBold.ttf` (103,7 KB) suman **219 KB** de los 1.084 KB que carga la
home a 375/DPR2. En woff2 pesarían en torno a la mitad. **No se ha hecho**: no hay conversor
en el sistema y meter `fonttools` + `brotli` rompería la regla de no añadir dependencias en
un repo que tiene exactamente una. Cuando se quiera, es una sola vez y fuera del repo:

```bash
pipx run --spec 'fonttools[woff]' fonttools ttLib.woff2 compress fonts/Campton-Medium.ttf
pipx run --spec 'fonttools[woff]' fonttools ttLib.woff2 compress fonts/Campton-SemiBold.ttf
```

Después hay que cambiar los dos `@font-face` de `css/tokens.css:33-46` a
`format('woff2')` y considerar un `preload` como el que ya tiene Anton.

**Los dos ficheros de logo que faltan**, que no son hallazgo míos sino del propio repo: el
SVG morado de The Elite Flower y un PNG con alfa de Miami Agro a ≥360px. Mientras no
lleguen, la franja de marcas tiene que seguir sobre `--c-paper` puro, que es lo que limita
el arreglo de P2-03 a un filete.

---

# Verificación

**37 celdas** (ruta × ancho) sobre 320, 375, 414, 544, 640, 768, 1023, 1024, 1104, 1280,
1440 y 1920, más la pasada global de CSSOM. Doce sondas por celda. Resultado tras aplicar:

- **Cero fallos de contraste de texto** en las cinco rutas y todos los anchos.
- **Cero elementos enfocables por debajo de 3:1**, salvo `.u-skip`, que no es medible
  estáticamente.
- **Cero desbordes horizontales de documento**: `scrollWidth` es exactamente el viewport en
  las cinco rutas a 320px. Cero texto recortado.
- **Conector a déficit 0px** en los seis anchos con pasos.
- **Asomo del carrusel ≥ 24px** en todos los anchos salvo 320, donde son 18px y no se toca
  para no estrechar más la tarjeta.
- **Diagonales**: 3,434° en todos los cortes horizontales; `/about-us` baja de 3 a 2 por
  pantalla.
- `npm test` **11/11**.

Sin verificar, igual que antes: el punto activo del carrusel (lo mueve un
`IntersectionObserver` y sus callbacks necesitan que la página se pinte), los estados
`:hover`, Safari iOS y el encuadre fotográfico.

## En producción

Los 11 ficheros servidos son idénticos byte a byte a los del disco: los cuatro CSS, los dos
JS y las cinco rutas. Y lo que no debe ser público devuelve 404: este mismo informe,
`.claude/probes.js`, `.env.local`, `test/` y `scripts/`. El informe se añadió a
`.vercelignore` antes de desplegar porque, estando en la raíz, se habría subido.

Medido contra el `.vercel.app`, no contra local: lead del hero de `/services` a 1440
dentro del plano con **10,45:1**; fichas de ancla acabando en 285/453/589 con el corte en
691; anillo de foco de la banda CTA del pie a **6,65:1**; botón «See what we do» a
**8,73:1**; conector de «Our process» con **0px de déficit** en los dos pasos; y **40px**
de asomo en el carrusel.

**Aviso que no es de este despliegue:** los dos formularios devuelven **500** en producción
y venían así de antes. De las cinco variables que necesita `api/submit.js`, en Vercel hay
cuatro — falta `SMTP_PASS`. El sitio está en producción con el diseño arreglado pero nadie
puede contactar por formulario.

---

El arnés vive en `.claude/probes.js`, ignorado por git y por Vercel. Durante la auditoría
**cuatro sondas fallaron en abierto** y se corrigieron antes de dar por buena ninguna cifra:
el censo de CSSOM se tragaba todas las reglas normales por el `cssRules` que Chrome expone
en toda `CSSStyleRule`; `polyPoints` cortaba en el primer paréntesis y dejaba 5 de 7 planos
sin resolver; el contraste con tres puntos por línea daba «sin fallos» a 1920 donde un
sondeo denso encontraba 1,86:1; y el emparejador de `:focus-visible` comprobaba si el botón
*era* la banda en vez de si estaba *dentro*. Una quinta apareció al verificar los arreglos:
la sonda del conector seguía mirando el pseudo del marcador después de que la línea se
mudara al `.step`.
