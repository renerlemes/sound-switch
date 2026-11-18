import type { InputHTMLAttributes } from 'react';
import './styles.css';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={className ? `ec-input ${className}` : 'ec-input'} {...rest} />;
}
