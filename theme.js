(function () {
  const KEY = 'camborio-theme';
  const root = document.documentElement;
  const saved = localStorage.getItem(KEY);
  const initial = saved === 'dark' ? 'dark' : 'light';

  function apply(theme) {
    root.dataset.theme = theme;
    localStorage.setItem(KEY, theme);
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.textContent = theme === 'dark' ? '☀️ Día' : '🌙 Noche';
      button.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche');
    });
  }

  apply(initial);
  window.CamborioTheme = { toggle: () => apply(root.dataset.theme === 'dark' ? 'light' : 'dark') };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-theme-toggle]');
    if (button) window.CamborioTheme.toggle();
  });
})();
