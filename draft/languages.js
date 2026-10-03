/* Shared, entirely local language controls for the homepage and insights. */
(() => {
  'use strict';
  const codes = { en: 'en', zh: 'zh-CN', fr: 'fr', de: 'de', es: 'es' };
  window.FergusonLanguages = {
    init({ translations, titles, onChange = () => {} }) {
      const elements = [...document.querySelectorAll('[data-i18n], [data-i18n-html], [data-i18n-alt], [data-i18n-aria-label]')];
      const buttons = [...document.querySelectorAll('[data-language]')];
      const bindings = elements.flatMap(element => ['text', 'html', 'alt', 'aria-label'].flatMap(type => {
        const attribute = type === 'text' ? 'data-i18n' : `data-i18n-${type}`;
        const key = element.getAttribute(attribute);
        if (!key) return [];
        const original = type === 'text' ? element.textContent : type === 'html' ? element.innerHTML : element.getAttribute(type);
        translations.en[key] = original;
        return [{ element, type, key }];
      }));
      // Missing translations must be caught before changing any page content.
      for (const code of Object.keys(codes)) {
        for (const { key } of bindings) {
          if (typeof translations[code]?.[key] !== 'string' || !translations[code][key].trim()) {
            throw new Error(`Missing ${code} translation: ${key}`);
          }
        }
      }
      let language = 'en';
      try {
        const saved = localStorage.getItem('ferguson-language');
        if (Object.hasOwn(codes, saved)) language = saved;
      } catch (_) { /* Preference storage is optional. */ }
      function apply(code) {
        if (!Object.hasOwn(codes, code)) return;
        language = code;
        document.documentElement.lang = codes[code];
        for (const { element, type, key } of bindings) {
          const value = translations[code][key];
          if (type === 'text') element.textContent = value;
          else if (type === 'html') element.innerHTML = value;
          else element.setAttribute(type, value);
        }
        buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === code)));
        document.title = titles[code];
        onChange(code);
        try { localStorage.setItem('ferguson-language', code); } catch (_) { /* The current selection still works. */ }
      }
      buttons.forEach(button => button.addEventListener('click', () => apply(button.dataset.language)));
      apply(language);
      return { apply, get language() { return language; } };
    }
  };
})();
