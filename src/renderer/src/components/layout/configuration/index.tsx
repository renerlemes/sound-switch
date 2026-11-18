import type { ReactNode } from 'react';
import './styles.css';

function ConfigurationRoot({ children }: { children: ReactNode }) {
  return <div className="ec-page">{children}</div>;
}

function Group({ title, children }: { children: ReactNode; title: string }) {
  return (
    <section className="about-group">
      <h2>{title}</h2>
      <div className="settings-sheet">{children}</div>
    </section>
  );
}

function Line({ label, note, children }: { children?: ReactNode; label: string; note?: ReactNode }) {
  return (
    <div className="settings-row">
      <div>
        <span className="settings-row-label">{label}</span>
        {note ? <p className="about-note">{note}</p> : null}
      </div>
      {children}
    </div>
  );
}

export const Configuration = Object.assign(ConfigurationRoot, { Group, Line });
