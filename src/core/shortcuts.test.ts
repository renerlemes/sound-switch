import { describe, expect, it } from 'vitest';
import { captureShortcut, shortcutFromInput, toAccelerator } from './shortcuts';

describe('atalhos', () => {
  it('converte o texto salvo para o acelerador do Electron', () => {
    expect(toAccelerator('Ctrl + F1')).toBe('CommandOrControl+F1');
    expect(toAccelerator('Ctrl + Alt + Shift + A')).toBe('CommandOrControl+Alt+Shift+A');
    expect(toAccelerator('Ctrl + Num 3')).toBe('CommandOrControl+num3');
    expect(toAccelerator('Ctrl')).toBeNull();
    expect(toAccelerator('')).toBeNull();
  });

  it('mostra a combinação e só conclui quando há uma tecla além dos modificadores', () => {
    expect(captureShortcut({ ctrlKey: true, altKey: false, shiftKey: false, code: 'ControlLeft' })).toEqual({
      kind: 'partial',
      text: 'Ctrl',
    });
    expect(captureShortcut({ ctrlKey: true, altKey: false, shiftKey: false, code: 'F1' })).toEqual({
      kind: 'complete',
      text: 'Ctrl + F1',
    });
    expect(captureShortcut({ ctrlKey: true, altKey: false, shiftKey: false, code: 'Escape' })).toEqual({ kind: 'clear' });
    expect(captureShortcut({ ctrlKey: false, altKey: false, shiftKey: false, code: 'Backspace' })).toEqual({ kind: 'clear' });
  });

  it('reconhece a tecla da janela como o atalho salvo', () => {
    expect(shortcutFromInput({ alt: false, code: 'F1', control: true, meta: false, shift: false })).toBe('Ctrl + F1');
    expect(shortcutFromInput({ alt: false, code: 'F2', control: true, meta: false, shift: false })).toBe('Ctrl + F2');
    expect(shortcutFromInput({ alt: false, code: 'F1', control: true, meta: true, shift: false })).toBeNull();
    expect(shortcutFromInput({ alt: false, code: 'ControlLeft', control: true, meta: false, shift: false })).toBeNull();
  });
});
