(function () {
  const KEY = 'camborio-theme-v4';
  const root = document.documentElement;

  // Layout fix: keep the brand as one left-aligned unit and make the
  // day/night control a genuinely small header button. These rules use
  // !important because index.html still contains legacy inline rules.
  const layoutStyle = document.createElement('style');
  layoutStyle.id = 'camborio-v4-header-fix';
  layoutStyle.textContent = `
    .brand-card {
      position: relative !important;
      justify-content: flex-start !important;
      align-items: center !important;
      padding-left: 8px !important;
      padding-right: 42px !important;
      gap: 7px !important;
    }
    .brand-mark {
      flex: 0 0 auto !important;
      width: 44px !important;
      height: 44px !important;
      margin: 0 !important;
      border-radius: 50% !important;
      clip-path: circle(47% at 50% 50%) !important;
    }
    .brand-copy {
      flex: 0 1 auto !important;
      min-width: 0 !important;
      max-width: none !important;
      margin: 0 !important;
      text-align: left !important;
      overflow: hidden !important;
    }
    .brand-name {
      text-align: left !important;
      font-size: 15px !important;
      overflow: hidden !important;
      white-space: nowrap !important;
    }
    .brand-line {
      justify-content: flex-start !important;
      text-align: left !important;
      gap: 4px !important;
    }
    .theme-toggle {
      position: absolute !important;
      right: 7px !important;
      top: 50% !important;
      transform: translateY(-50%) !important;
      width: 26px !important;
      height: 26px !important;
      min-width: 26px !important;
      min-height: 26px !important;
      padding: 0 !important;
      border-radius: 50% !important;
      font-size: 13px !important;
      line-height: 1 !important;
      box-shadow: 0 2px 6px rgba(30,45,60,.12) !important;
    }
    .theme-toggle:active {
      transform: translateY(-50%) scale(.97) !important;
    }
    .form-card #reservation-form > label {
      margin-bottom: 6px !important;
    }
    .form-card #reservation-form > label .field,
    .form-card #reservation-form > label .textarea-field {
      margin-top: 4px !important;
    }
    .form-card #reservation-form .grid-2 {
      margin-bottom: 1px !important;
    }
  `;
  document.head.appendChild(layoutStyle);

  function getTheme() {
    const saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function apply(theme) {
    root.dataset.theme = theme;
    localStorage.setItem(KEY, theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#15181c' : '#eef2f6');
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      const dark = theme === 'dark';
      button.innerHTML = dark ? '<span aria-hidden="true">☀️</span>' : '<span aria-hidden="true">🌙</span>';
      button.setAttribute('aria-label', dark ? 'Cambiar a modo día' : 'Cambiar a modo noche');
      button.setAttribute('title', dark ? 'Modo día' : 'Modo noche');
      button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    });
  }

  apply(getTheme());
  window.CamborioTheme = {
    toggle: () => apply(root.dataset.theme === 'dark' ? 'light' : 'dark')
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-theme-toggle]');
    if (button) window.CamborioTheme.toggle();
  });
})();
