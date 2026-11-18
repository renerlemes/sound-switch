import { type ReactNode, useState } from 'react';
import './styles.css';

export type IntroStep = {
  content: ReactNode;
  id: string;
  illustrated?: boolean;
};

export function Intro({ steps, onFinish, onSkip, finishLabel = 'Começar' }: { steps: readonly IntroStep[]; onFinish(): void; onSkip?(): void; finishLabel?: string }) {
  const [step, setStep] = useState(0);
  const last = Math.max(steps.length - 1, 0);
  const index = Math.min(step, last);
  const current = steps[index];
  const next = () => setStep((value) => Math.min(value + 1, last));
  const back = () => setStep((value) => Math.max(value - 1, 0));

  if (!current) return null;

  return (
    <div className={`welcome welcome-tone-${index % 3}`} data-testid="intro">
      {index > 0 ? (
        <button type="button" className="welcome-back" onClick={back}>
          ‹ Voltar
        </button>
      ) : null}
      {index < last && onSkip ? (
        <button type="button" className="welcome-skip" data-testid="intro-skip" onClick={onSkip}>
          Pular
        </button>
      ) : null}
      <div className={`welcome-body ${current.illustrated ? 'illustrated' : ''}`}>
        {current.content}
        {index < last ? (
          <button type="button" className="welcome-next" onClick={next}>
            Continuar
          </button>
        ) : (
          <button type="button" className="welcome-next" onClick={onFinish}>
            {finishLabel}
          </button>
        )}
      </div>
      <div className="welcome-dots" aria-hidden="true">
        {steps.map((item) => (
          <i key={item.id} className={item === current ? 'on' : undefined} />
        ))}
      </div>
    </div>
  );
}
