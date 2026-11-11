import type { ThemeChoice } from '../../shared/contracts';

let stopWatchingSystemTheme = (): void => {};

/** Aplica o tema na janela. `system` acompanha `prefers-color-scheme` e reage quando o sistema muda. */
export function applyTheme(theme: ThemeChoice): void {
  stopWatchingSystemTheme();
  stopWatchingSystemTheme = () => {};
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const paint = (): void => {
    document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
  };
  paint();
  if (theme !== 'system') return;
  media.addEventListener('change', paint);
  stopWatchingSystemTheme = () => media.removeEventListener('change', paint);
}
