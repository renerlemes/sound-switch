import { useId } from 'react';
import './styles.css';

export function Segment<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange(value: T): void;
  disabled?: boolean;
}) {
  const name = useId();

  return (
    <div className="theme-segment" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <label key={option.id} className={value === option.id ? 'on' : undefined}>
          <input
            type="radio"
            name={name}
            value={option.id}
            checked={value === option.id}
            disabled={disabled}
            onChange={() => onChange(option.id)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
