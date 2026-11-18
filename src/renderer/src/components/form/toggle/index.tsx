import './styles.css';

export function Toggle({
  checked,
  label,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  label: string;
  onChange(checked: boolean): void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      className={checked ? 'ec-toggle on' : 'ec-toggle'}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="ec-toggle-thumb" />
    </button>
  );
}
