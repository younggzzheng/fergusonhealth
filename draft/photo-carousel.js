(() => {
  'use strict';

  // Kept independent of the DOM so timing and pause behaviour can be tested.
  function createPlayback({ advance, blockers = [], interval = 7000,
    schedule = setTimeout, cancel = clearTimeout }) {
    const blocked = new Set(blockers);
    let timer = null;
    let destroyed = false;
    function reset() {
      if (timer !== null) cancel(timer);
      timer = null;
      if (!destroyed && !blocked.size) {
        timer = schedule(() => {
          timer = null;
          advance();
          reset();
        }, interval);
      }
    }
    const playback = {
      setBlocked(reason, value) {
        if (blocked.has(reason) === value) return;
        if (value) blocked.add(reason); else blocked.delete(reason);
        reset();
      },
      reset,
      destroy() { destroyed = true; reset(); }
    };
    reset();
    return playback;
  }

  function init() {
    const gallery = document.querySelector('.photo-gallery');
    if (!gallery) return;
    const slides = [...gallery.querySelectorAll('[data-photo-slide]')];
    const images = slides.map(slide => slide.querySelector('img'));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const failed = new Set();
    let active = 0;
    let pending = null;
    let playback;

    function render(index) {
      active = index;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === index);
        slide.setAttribute('aria-hidden', String(i !== index));
      });
    }
    function show(index) {
      if (failed.has(index)) return;
      pending = null;
      const image = images[index];
      if (image.complete && image.naturalWidth > 0) {
        render(index);
        playback.setBlocked('image', false);
      } else {
        // Leave the current photo in place until the requested one is ready.
        pending = index;
        playback.setBlocked('image', true);
        image.loading = 'eager';
      }
    }
    function nextIndex() {
      for (let step = 1; step < slides.length; step++) {
        const index = (active + step) % slides.length;
        if (!failed.has(index)) return index;
      }
      return null;
    }
    function advance() {
      const index = nextIndex();
      if (index !== null) show(index);
    }
    function imageFailed(index) {
      failed.add(index);
      images[index].hidden = true;
      playback.setBlocked('single', slides.length - failed.size < 2);
      if (pending === index || active === index) {
        pending = null;
        playback.setBlocked('image', false);
        const next = nextIndex();
        if (next !== null) show(next);
      }
    }

    slides.forEach(slide => { slide.hidden = false; });
    render(0);
    playback = createPlayback({
      advance,
      blockers: ['outside', ...(document.hidden ? ['document'] : []), ...(reducedMotion.matches ? ['motion'] : [])]
    });
    images.forEach((image, index) => {
      image.addEventListener('load', () => {
        if (pending === index) show(index);
      });
      image.addEventListener('error', () => imageFailed(index));
      if (image.hidden || (image.complete && !image.naturalWidth)) imageFailed(index);
    });
    document.addEventListener('visibilitychange', () => playback.setBlocked('document', document.hidden));
    reducedMotion.addEventListener('change', event => playback.setBlocked('motion', event.matches));
    function setInView(visible) {
      playback.setBlocked('outside', !visible);
      if (visible) images.forEach(image => { image.loading = 'eager'; });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => setInView(entries[0].isIntersecting), { threshold: .25 }).observe(gallery);
    } else setInView(true);
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { createPlayback };
  if (typeof window !== 'undefined') window.FergusonPhotos = { init };
})();
