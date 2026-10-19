const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createPlayback } = require('../draft/photo-carousel.js');

function setup(options = {}) {
  let time = 0;
  let counter = 0;
  let advances = 0;
  const timers = new Map();
  const playback = createPlayback({
    advance: () => { advances++; },
    schedule: (callback, delay) => {
      const id = ++counter;
      timers.set(id, { callback, at: time + delay });
      return id;
    },
    cancel: id => timers.delete(id),
    ...options
  });
  return {
    playback, timers,
    get advances() { return advances; },
    tick(duration) {
      const until = time + duration;
      while (true) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > until) break;
        time = next[1].at;
        timers.delete(next[0]);
        next[1].callback();
      }
      time = until;
    }
  };
}

test('advances once every seven seconds with only one timer', () => {
  const clock = setup();
  clock.tick(6999);
  assert.equal(clock.advances, 0);
  clock.tick(1);
  assert.equal(clock.advances, 1);
  clock.tick(14000);
  assert.equal(clock.advances, 3);
  assert.equal(clock.timers.size, 1);
});

test('returning to a visible page gives each photo a full viewing interval', () => {
  const clock = setup();
  clock.tick(6000);
  clock.playback.setBlocked('document', true);
  clock.tick(30000);
  assert.equal(clock.advances, 0);
  clock.playback.setBlocked('document', false);
  clock.tick(6999);
  assert.equal(clock.advances, 0);
  clock.tick(1);
  assert.equal(clock.advances, 1);
});

for (const blocker of ['outside', 'document', 'motion', 'image', 'single']) {
  test(`${blocker} stops playback until cleared`, () => {
    const clock = setup({ blockers: [blocker] });
    clock.tick(14000);
    assert.equal(clock.advances, 0);
    clock.playback.setBlocked(blocker, false);
    clock.tick(7000);
    assert.equal(clock.advances, 1);
    clock.playback.setBlocked(blocker, true);
    clock.tick(14000);
    assert.equal(clock.advances, 1);
  });
}

test('clearing one blocker does not clear another', () => {
  const clock = setup({ blockers: ['outside', 'document'] });
  clock.playback.setBlocked('outside', false);
  clock.tick(14000);
  assert.equal(clock.advances, 0);
  clock.playback.setBlocked('document', false);
  clock.tick(7000);
  assert.equal(clock.advances, 1);
});

test('repeated observer notifications do not restart the timer', () => {
  const clock = setup();
  clock.tick(6000);
  clock.playback.setBlocked('outside', false);
  clock.tick(1000);
  assert.equal(clock.advances, 1);
});

test('reduced-motion preference creates no timer', () => {
  const clock = setup({ blockers: ['motion'] });
  assert.equal(clock.timers.size, 0);
  clock.tick(30000);
  assert.equal(clock.advances, 0);
});

test('destroy cancels playback, including later resets', () => {
  const clock = setup();
  clock.playback.destroy();
  clock.playback.reset();
  clock.tick(30000);
  assert.equal(clock.advances, 0);
  assert.equal(clock.timers.size, 0);
});

// Exercise the actual page initializer without launching a browser.
function scene({ reduced = false } = {}) {
  function element() {
    const events = {};
    const classes = new Set();
    return {
      hidden: false, attrs: {}, classes,
      classList: { toggle(name, value) { if (value) classes.add(name); else classes.delete(name); } },
      setAttribute(name, value) { this.attrs[name] = value; },
      addEventListener(name, callback) { (events[name] ||= []).push(callback); },
      emit(name, event = {}) { for (const callback of events[name] || []) callback(event); }
    };
  }
  const images = Array.from({ length: 3 }, () => Object.assign(element(), { complete: true, naturalWidth: 800 }));
  const slides = images.map(image => Object.assign(element(), { querySelector: () => image }));
  const gallery = { querySelectorAll: () => slides };
  const document = Object.assign(element(), { querySelector: () => gallery });
  const media = Object.assign(element(), { matches: reduced });
  const timers = new Map();
  let id = 0;
  let intersection;
  const context = {
    document, window: { matchMedia: () => media, IntersectionObserver: true },
    IntersectionObserver: class {
      constructor(callback) { intersection = callback; }
      observe() { intersection([{ isIntersecting: true }]); }
    },
    setTimeout(callback, delay) { assert.equal(delay, 7000); timers.set(++id, callback); return id; },
    clearTimeout(timer) { timers.delete(timer); }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../draft/photo-carousel.js'), 'utf8'), context);
  context.window.FergusonPhotos.init();
  return {
    images, slides, document, media, timers,
    get active() { return slides.findIndex(slide => slide.classes.has('is-active')); },
    inView(value) { intersection([{ isIntersecting: value }]); },
    advance() {
      const timer = [...timers][0];
      assert.ok(timer, 'autoplay should have a scheduled frame');
      timers.delete(timer[0]);
      timer[1]();
    }
  };
}

test('page initializer rotates all three photos automatically with only one exposed image', () => {
  const page = scene();
  assert.equal(page.active, 0);
  for (const index of [1, 2, 0]) {
    page.advance();
    assert.equal(page.active, index);
    assert.equal(page.slides.filter(slide => slide.attrs['aria-hidden'] === 'false').length, 1);
    assert.equal(page.timers.size, 1);
  }
});

test('page holds the current photo while the next one is still loading', () => {
  const page = scene();
  Object.assign(page.images[1], { complete: false, naturalWidth: 0 });
  page.advance();
  assert.equal(page.active, 0);
  assert.equal(page.timers.size, 0);
  Object.assign(page.images[1], { complete: true, naturalWidth: 800 });
  page.images[1].emit('load');
  assert.equal(page.active, 1);
  assert.equal(page.timers.size, 1);
});

test('page skips failed photos and stops if only one photo remains', () => {
  const page = scene();
  page.images[2].emit('error');
  page.advance();
  assert.equal(page.active, 1);
  page.advance();
  assert.equal(page.active, 0);
  page.images[1].emit('error');
  assert.equal(page.timers.size, 0);
  assert.equal(page.active, 0);
});

test('page respects reduced motion and suspends offscreen or in the background', () => {
  const page = scene({ reduced: true });
  assert.equal(page.timers.size, 0);
  page.media.emit('change', { matches: false });
  page.advance();
  assert.equal(page.active, 1);
  page.inView(false);
  assert.equal(page.timers.size, 0);
  page.document.hidden = true;
  page.document.emit('visibilitychange');
  page.inView(true);
  assert.equal(page.timers.size, 0);
  page.document.hidden = false;
  page.document.emit('visibilitychange');
  page.advance();
  assert.equal(page.active, 2);
});
