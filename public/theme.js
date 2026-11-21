// Applies the saved or system colour scheme before first paint (external file: the CSP forbids inline script).
(function () {
  var saved = null;
  try {
    saved = localStorage.getItem('cr-theme');
  } catch {
    saved = null;
  }
  var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
})();
