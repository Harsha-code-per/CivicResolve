import type { ReactElement } from 'react';
import type { Theme } from '../app/hooks.js';
import type { IssueAnalytics } from '../domain/types.js';
import { Hero, LandingNav } from './Hero.js';
import { CtaBand, LiveNumbers, LivePipeline } from './LiveSections.js';
import { GeminiSection, HowItWorks } from './Sections.js';

export interface LandingProps {
  readonly analytics: IssueAnalytics;
  readonly loading: boolean;
  readonly theme: Theme;
  readonly onToggleTheme: () => void;
}

/**
 * Public landing page: cinematic hero with a 3D city, live numbers, how it works,
 * how Gemini is kept honest, and the live resolution pipeline.
 *
 * @param props - Live analytics, loading flag and theme controls.
 * @returns Landing page.
 */
export function Landing({ analytics, loading, theme, onToggleTheme }: LandingProps): ReactElement {
  return (
    <div className="landing">
      <a href="#landing-main" className="skip-link">
        Skip to content
      </a>
      <LandingNav theme={theme} onToggleTheme={onToggleTheme} />
      <main id="landing-main" tabIndex={-1}>
        <Hero />
        <LiveNumbers analytics={analytics} loading={loading} />
        <HowItWorks />
        <GeminiSection />
        <LivePipeline analytics={analytics} loading={loading} />
        <CtaBand />
      </main>
      <footer className="land-foot">
        <span>CivicResolve · Citizen grievance management</span>
        <span>Google Gemini · Firebase Auth · Cloud Firestore · Cloud Run</span>
      </footer>
    </div>
  );
}
