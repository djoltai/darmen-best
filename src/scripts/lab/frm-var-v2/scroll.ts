// FRM-VaR v2 — scroll listener (kursk pattern, zero deps).
// Switches palette by toggling mode-cream / mode-dark / mode-cut on .frm-var-page.
// Marks the current .screen with .is-active so CSS animations can hook in.

export function initScroll(): void {
  const page = document.querySelector<HTMLElement>('.frm-var-page');
  if (!page) return;

  const screens = Array.from(document.querySelectorAll<HTMLElement>('.screen'));
  if (!screens.length) return;

  let currentMode: string | null = null;
  let activeScreen: HTMLElement | null = null;

  function getActiveScreen(): HTMLElement | null {
    const center = window.scrollY + window.innerHeight / 2;
    for (const s of screens) {
      const top = s.offsetTop;
      const bottom = top + s.offsetHeight;
      if (center >= top && center < bottom) return s;
    }
    return null;
  }

  function applyMode(active: HTMLElement): void {
    const mode = active.dataset.mode || 'default';
    if (mode === currentMode) return;

    const cut = active.dataset.cut === 'true';
    if (cut) {
      page!.classList.add('mode-cut');
      page!.classList.remove('mode-cream', 'mode-dark');
      if (mode === 'cream') page!.classList.add('mode-cream');
      else if (mode === 'dark') page!.classList.add('mode-dark');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => page!.classList.remove('mode-cut'));
      });
    } else {
      page!.classList.remove('mode-cream', 'mode-dark');
      if (mode === 'cream') page!.classList.add('mode-cream');
      else if (mode === 'dark') page!.classList.add('mode-dark');
    }
    currentMode = mode;
  }

  function applyTriggers(active: HTMLElement): void {
    if (active === activeScreen) return;
    if (activeScreen) activeScreen.classList.remove('is-active');
    active.classList.add('is-active');
    activeScreen = active;
  }

  function onScroll(): void {
    const active = getActiveScreen();
    if (!active) return;
    applyMode(active);
    applyTriggers(active);
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => { onScroll(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });

  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();
}
