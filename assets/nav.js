// Header menu on phones and tablets: a <details> element, so it opens without this script too.
// This only closes it on Escape, on a tap outside it, and when the window grows past the phone layout.
for (const menu of document.querySelectorAll('.nav-menu')) {
  const summary = menu.querySelector('summary');
  const close = () => { if (menu.open) menu.open = false; };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.open) { close(); summary.focus(); }
  });
  document.addEventListener('click', e => { if (!menu.contains(e.target)) close(); });
  matchMedia('(min-width: 1100px)').addEventListener('change', e => { if (e.matches) close(); });
}
