/** Bom dia: 5h–11h. Boa tarde: 12h–17h. Boa noite: 18h–4h. */
export function greetingForHour(hour: number): 'Bom dia' | 'Boa tarde' | 'Boa noite' {
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function greetingDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}
