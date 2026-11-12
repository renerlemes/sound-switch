import { Configuration, Input, Intro, Segment, Toggle } from '@electron-components/ui';
import { useEffect, useRef, useState } from 'react';
import { captureShortcut } from '../../core/shortcuts';
import type { AppState, ThemeChoice } from '../../shared/contracts';
import { call, loadState, subscribe } from './api';
import { greetingDate, greetingForHour } from './greeting';
import { applyTheme } from './theme';

const YES_NO = [
  { id: 'sim', label: 'Sim' },
  { id: 'nao', label: 'Não' },
] as const;

export function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadState()
      .then((next) => {
        applyTheme(next.theme);
        setState(next);
      })
      .catch((reason: unknown) => setError(message(reason)));
    return subscribe((next) => {
      applyTheme(next.theme);
      setState(next);
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!state) {
    return <main className="shell" />;
  }

  const commit = (work: () => Promise<AppState>): void => {
    void work()
      .then((next) => {
        applyTheme(next.theme);
        setError(null);
        setState(next);
      })
      .catch((reason: unknown) => {
        applyTheme(state.theme);
        setError(message(reason));
      });
  };

  if (!state.introCompleted) {
    return (
      <Intro
        onSkip={() => commit(() => call('intro.complete'))}
        onFinish={() => commit(() => call('intro.complete'))}
        steps={[
          {
            id: 'bandeja',
            content: (
              <>
                <h1>Boas-vindas ao SoundSwitch</h1>
                <p className="welcome-lead">O dispositivo de áudio muda pelo ícone da bandeja.</p>
                <p className="welcome-text">
                  Escolha os dispositivos uma vez.
                  <br />
                  Depois, troque pelo atalho ou pelo clique no ícone.
                </p>
              </>
            ),
          },
          {
            id: 'dispositivos',
            illustrated: true,
            content: (
              <>
                <h1>Reprodução e gravação</h1>
                <p className="welcome-text">
                  Ligue só os dispositivos que entram na alternância.
                  <br />O atalho padrão de reprodução é Ctrl + F1. O de gravação é Ctrl + F2.
                </p>
              </>
            ),
          },
          {
            id: 'som',
            content: (
              <>
                <h1>O som fica no computador</h1>
                <p className="welcome-text">
                  Dá para iniciar com o Windows, silenciar ao bloquear
                  <br />e avisar quando o dispositivo padrão mudar.
                </p>
              </>
            ),
          },
        ]}
      />
    );
  }

  return (
    <div className="shell">
      <main className="content">
        <Configuration>
          {error || state.audioError ? <p className="audio-error">{error ?? state.audioError}</p> : null}
          <header className="dashboard-hello">
            <h1>{greetingForHour(now.getHours())}</h1>
            <p>{greetingDate(now)}</p>
          </header>
          <DeviceGroup title="Reprodução" devices={state.playback} shortcut={state.playbackShortcut} playback commit={commit} />
          <DeviceGroup title="Gravação" devices={state.recording} shortcut={state.recordingShortcut} playback={false} commit={commit} />
          <Configuration.Group title="Configurações">
            <Configuration.Line label="Iniciar com o Windows" note="Abre o aplicativo no login">
                <Segment
                  label="Iniciar com o Windows"
                  value={state.autoStart ? 'sim' : 'nao'}
                  options={YES_NO}
                  onChange={(value) => commit(() => call('settings.setAutoStart', { enabled: value === 'sim' }))}
                />
            </Configuration.Line>
            <Configuration.Line label="Mudo ao bloquear" note="Silencia o som ao bloquear e devolve ao desbloquear">
                <Segment
                  label="Mudo ao bloquear"
                  value={state.muteOnLock ? 'sim' : 'nao'}
                  options={YES_NO}
                  onChange={(value) => commit(() => call('settings.setMuteOnLock', { enabled: value === 'sim' }))}
                />
            </Configuration.Line>
            <Configuration.Line label="Notificações" note="Avisa quando o dispositivo padrão muda">
                <Segment
                  label="Notificações"
                  value={state.showNotification ? 'sim' : 'nao'}
                  options={YES_NO}
                  onChange={(value) => commit(() => call('settings.setNotifications', { enabled: value === 'sim' }))}
                />
            </Configuration.Line>
            <Configuration.Line label="Tema">
                <div className="theme-segment" role="radiogroup" aria-label="Tema">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={state.theme === 'system'}
                    className={state.theme === 'system' ? 'on' : undefined}
                    onClick={() => chooseTheme(state, commit, 'system')}>
                    <MonitorIcon />
                    Sistema
                  </button>
                  <button type="button" role="radio" aria-checked={state.theme === 'light'} className={state.theme === 'light' ? 'on' : undefined} onClick={() => chooseTheme(state, commit, 'light')}>
                    <SunIcon />
                    Claro
                  </button>
                  <button type="button" role="radio" aria-checked={state.theme === 'dark'} className={state.theme === 'dark' ? 'on' : undefined} onClick={() => chooseTheme(state, commit, 'dark')}>
                    <MoonIcon />
                    Escuro
                  </button>
                </div>
            </Configuration.Line>
            <Configuration.Line label="Versão">
                <span className="about-value">{state.version}</span>
            </Configuration.Line>
            <Configuration.Line label="Atualizações" note={state.updateVersion ? `Disponível: ${state.updateVersion}` : 'Nenhuma atualização encontrada ainda'}>
                {state.updateProgress !== null ? (
                  <div className="update-progress-wrap">
                    <progress className="update-progress" max={100} value={state.updateProgress} />
                    <span className="update-progress-value">{state.updateProgress}%</span>
                  </div>
                ) : null}
                <button type="button" className="ec-action" disabled={state.updateBusy} onClick={() => commit(() => (state.updateVersion ? call('update.download') : call('update.check')))}>
                  {state.updateVersion ? 'Atualizar' : 'Verificar atualizações'}
                </button>
            </Configuration.Line>
          </Configuration.Group>
        </Configuration>
      </main>
    </div>
  );
}

function DeviceGroup({
  title,
  devices,
  shortcut,
  playback,
  commit,
}: {
  title: string;
  devices: AppState['playback'];
  shortcut: string;
  playback: boolean;
  commit(work: () => Promise<AppState>): void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? shortcut;

  return (
    <Configuration.Group title={title}>
        {devices.length === 0 ? <p className="empty-devices">Nenhum dispositivo conectado.</p> : null}
        {devices.map((device) => (
          <div key={device.id} className="device-row">
            {device.iconUrl ? <img src={device.iconUrl} alt="" /> : null}
            <DeviceName device={device} playback={playback} commit={commit} />
            <Toggle checked={device.enabled} label={device.name} onChange={(enabled) => commit(() => call('devices.setEnabled', { playback, id: device.id, enabled }))} />
          </div>
        ))}
        <div className="shortcut-line">
          <Configuration.Line label="Atalho">
            <Input
              className="shortcut-field"
              aria-label={`Atalho de ${title}`}
              value={shown}
              readOnly
              onFocus={() => void call('hotkeys.suspend', { suspended: true })}
              onBlur={() => {
                setDraft(null);
                void call('hotkeys.suspend', { suspended: false });
              }}
              onKeyDown={(event) => {
                event.preventDefault();
                const captured = captureShortcut(event);
                if (captured.kind === 'clear') {
                  setDraft(null);
                  commit(() => call('devices.setShortcut', { playback, shortcut: '' }));
                  return;
                }
                if (captured.kind === 'partial') {
                  setDraft(captured.text);
                  return;
                }
                setDraft(captured.text);
                commit(() => call('devices.setShortcut', { playback, shortcut: captured.text }));
              }}
            />
          </Configuration.Line>
        </div>
    </Configuration.Group>
  );
}

function DeviceName({
  device,
  playback,
  commit,
}: {
  device: AppState['playback'][number];
  playback: boolean;
  commit(work: () => Promise<AppState>): void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(device.name);
  const cancel = useRef(false);

  const save = (value: string) => {
    setEditing(false);
    if (value.trim() === device.name) return;
    commit(() => call('devices.setAlias', { playback, id: device.id, alias: value }));
  };

  return (
    <div className="device-name">
      <Input
        className={editing ? 'device-name-field editing' : 'device-name-field'}
        aria-label={`Nome de ${device.originalName}`}
        value={editing ? draft : device.name}
        onFocus={() => {
          setDraft(device.name);
          setEditing(true);
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (cancel.current) {
            cancel.current = false;
            setEditing(false);
            return;
          }
          save(draft);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            cancel.current = true;
            setDraft(device.name);
            event.currentTarget.blur();
          }
        }}
      />
      <span className="about-note">{device.originalName}</span>
    </div>
  );
}

function chooseTheme(state: AppState, commit: (work: () => Promise<AppState>) => void, theme: ThemeChoice): void {
  if (state.theme === theme) return;
  applyTheme(theme);
  commit(() => call('settings.setTheme', { theme }));
}

function MonitorIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2.2" y="2.6" width="11.6" height="8.2" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 13.2h4M8 10.8v2.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 2.4v1.4M8 12.2v1.4M2.4 8h1.4M12.2 8h1.4M4 4l1 1M11 11l1 1M12 4l-1 1M5 11l-1 1" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M9.2 2.4a4.8 4.8 0 1 0 4.4 6.6 3.8 3.8 0 0 1-4.4-6.6z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function message(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Não foi possível concluir a ação.';
}
