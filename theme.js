(function () {
  const KEY = 'camborio-theme-v4';
  const root = document.documentElement;

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
