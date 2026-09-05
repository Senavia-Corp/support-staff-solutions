/* ============================================================================
   Support Staff Solutions — JS propio. Sin dependencias, sin build.
   Dos cosas: el menu movil y las flechas/puntos del carrusel de testimonios.

   Lo que NO hay aqui, a proposito: revelado al hacer scroll. El contenido es
   visible siempre y su visibilidad no depende de JavaScript en ningun momento.
   El sitio anterior ocultaba 48 elementos con style="opacity:0" y los revelaba
   con un disparador SCROLL_INTO_VIEW que nunca llega a dispararse para lo que
   ya esta en pantalla: la cabecera y el hero se quedaban invisibles en el
   primer pintado. Aqui el unico momento animado es el del hero y es CSS puro,
   anadido solo bajo `prefers-reduced-motion: no-preference`.
   ========================================================================== */
(() => {
  'use strict'

  const reduce = matchMedia('(prefers-reduced-motion: reduce)')

  /* ------------------------------------------------------------- menu movil */
  const btn = document.querySelector('[data-nav-toggle]')
  const panel = document.getElementById('site-nav')

  if (btn && panel) {
    const FOCUSABLE = 'a[href], button:not([disabled])'
    const desktop = matchMedia('(min-width: 64rem)')
    let open = false

    const setOpen = (next) => {
      open = next
      btn.setAttribute('aria-expanded', String(open))
      if (open) {
        panel.removeAttribute('hidden')
        panel.querySelector(FOCUSABLE)?.focus()
      } else {
        panel.setAttribute('hidden', '')
      }
    }

    // En escritorio el panel no es un overlay: siempre visible y sin estado.
    const sync = () => {
      if (desktop.matches) {
        panel.removeAttribute('hidden')
        btn.setAttribute('aria-expanded', 'false')
        open = false
      } else if (!open) {
        panel.setAttribute('hidden', '')
      }
    }

    btn.addEventListener('click', () => setOpen(!open))
    desktop.addEventListener('change', sync)

    // Escape cierra y devuelve el foco al boton. Tab cicla dentro del panel.
    document.addEventListener('keydown', (e) => {
      if (!open) return
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); btn.focus(); return }
      if (e.key !== 'Tab') return
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    })

    // Navegar a un ancla de la propia pagina cierra el panel.
    panel.addEventListener('click', (e) => { if (e.target.closest('a') && !desktop.matches) setOpen(false) })

    sync()
  }

  /* --------------------------------------------------- carrusel de testimonios
     El desplazamiento es CSS (scroll-snap). Esto solo anade flechas y puntos:
     si se borra el fichero, el carrusel sigue arrastrandose con el dedo. */
  document.querySelectorAll('[data-carousel]').forEach((root) => {
    const track = root.querySelector('[data-carousel-track]')
    const dots = root.querySelector('[data-carousel-dots]')
    const prev = root.querySelector('[data-carousel-prev]')
    const next = root.querySelector('[data-carousel-next]')
    if (!track) return

    const slides = [...track.children]
    if (slides.length < 2) {
      root.querySelector('[data-carousel-nav]')?.setAttribute('hidden', '')
      return
    }

    let active = 0

    const go = (i) => {
      const target = slides[Math.max(0, Math.min(slides.length - 1, i))]
      track.scrollTo({
        left: target.offsetLeft - track.offsetLeft,
        behavior: reduce.matches ? 'auto' : 'smooth',
      })
    }

    prev?.addEventListener('click', () => go(active - 1))
    next?.addEventListener('click', () => go(active + 1))

    if (dots) {
      slides.forEach((_, i) => {
        const b = document.createElement('button')
        b.type = 'button'
        b.className = 'quotes__dot'
        b.setAttribute('aria-label', `Testimonial ${i + 1} of ${slides.length}`)
        b.addEventListener('click', () => go(i))
        dots.append(b)
      })
    }

    const paint = () => {
      dots?.querySelectorAll('button').forEach((d, i) => d.setAttribute('aria-current', String(i === active)))
      prev?.toggleAttribute('disabled', active === 0)
      next?.toggleAttribute('disabled', active === slides.length - 1)
    }

    // Un observer sobre la pista mantiene puntos y flechas sincronizados
    // tambien cuando el usuario arrastra en lugar de pulsar.
    if ('IntersectionObserver' in window) {
      const spy = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) active = slides.indexOf(e.target)
        paint()
      }, { root: track, threshold: 0.6 })
      slides.forEach((s) => spy.observe(s))
    }

    paint()
  })
})()
