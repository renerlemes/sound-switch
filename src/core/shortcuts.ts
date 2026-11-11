export type ShortcutCapture = { kind: 'clear' } | { kind: 'partial'; text: string } | { kind: 'complete'; text: string };

const MODIFIER_CODES = new Set(['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight']);

const CLEAR_CODES = new Set(['Escape', 'Backspace', 'Delete']);

/** Converte o texto salvo ("Ctrl + F1") no acelerador do Electron. */
export function toAccelerator(shortcut: string | null | undefined): string | null {
  if (!shortcut?.trim()) return null;
  const parts = shortcut.split(' + ').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const mapped = parts.map(acceleratorPart);
  if (mapped.some((part) => part === null)) return null;
  const keys = mapped.filter((part): part is string => part !== null);
  const key = keys.find((part) => part !== 'CommandOrControl' && part !== 'Alt' && part !== 'Shift');
  if (!key) return null;
  return keys.join('+');
}

/** Atalho salvo correspondente à tecla, ou null se a combinação ainda não está completa. */
export function shortcutFromInput(input: { alt: boolean; code: string; control: boolean; meta: boolean; shift: boolean }): string | null {
  if (input.meta) return null;
  const captured = captureShortcut({ altKey: input.alt, code: input.code, ctrlKey: input.control, shiftKey: input.shift });
  return captured.kind === 'complete' ? captured.text : null;
}

export function captureShortcut(event: { ctrlKey: boolean; altKey: boolean; shiftKey: boolean; code: string }): ShortcutCapture {
  if (CLEAR_CODES.has(event.code)) return { kind: 'clear' };

  const parts: string[] = [];
  if (event.ctrlKey || event.code.startsWith('Control')) parts.push('Ctrl');
  if (event.altKey || event.code.startsWith('Alt')) parts.push('Alt');
  if (event.shiftKey || event.code.startsWith('Shift')) parts.push('Shift');

  if (MODIFIER_CODES.has(event.code)) {
    return parts.length > 0 ? { kind: 'partial', text: parts.join(' + ') } : { kind: 'partial', text: '' };
  }

  const key = keyName(event.code);
  if (!key) return { kind: 'partial', text: parts.join(' + ') };
  parts.push(key);
  return { kind: 'complete', text: parts.join(' + ') };
}

function acceleratorPart(part: string): string | null {
  switch (part) {
    case 'Ctrl':
      return 'CommandOrControl';
    case 'Alt':
      return 'Alt';
    case 'Shift':
      return 'Shift';
    case 'Page Up':
      return 'PageUp';
    case 'Page Down':
      return 'PageDown';
    case 'Caps Lock':
      return 'Capslock';
    case 'Enter':
      return 'Enter';
    case '+':
      return 'Plus';
    case '-':
      return 'Minus';
    case 'Space':
      return 'Space';
    default:
      break;
  }

  if (/^F\d{1,2}$/.test(part)) return part;
  if (/^[A-Z0-9]$/.test(part)) return part;
  const numpad = /^Num (\d)$/.exec(part);
  if (numpad?.[1]) return `num${numpad[1]}`;
  return null;
}

function keyName(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^F\d{1,2}$/.test(code)) return code;
  if (/^Numpad[0-9]$/.test(code)) return `Num ${code.slice(6)}`;

  switch (code) {
    case 'NumpadAdd':
    case 'Equal':
      return '+';
    case 'NumpadSubtract':
    case 'Minus':
      return '-';
    case 'Comma':
      return ',';
    case 'Period':
    case 'NumpadDecimal':
      return '.';
    case 'PageUp':
      return 'Page Up';
    case 'PageDown':
      return 'Page Down';
    case 'Enter':
    case 'NumpadEnter':
      return 'Enter';
    case 'CapsLock':
      return 'Caps Lock';
    case 'Space':
      return 'Space';
    default:
      return null;
  }
}
