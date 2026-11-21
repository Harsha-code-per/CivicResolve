import type { ReactElement } from 'react';
import type { IssueAnalytics } from '../domain/types.js';

export type ActiveView = 'overview' | 'report' | 'tracker' | 'admin';

export interface LandingHeroProps {
  readonly analytics: IssueAnalytics;
  readonly onNavigate: (view: ActiveView) => void;
}

/**
 * Renders the editorial landing hero, live municipal KPI bento, and 3-step AI architecture.
 *
 * @param props - Live analytics and navigation callback.
 * @returns LandingHero element.
 */
export function LandingHero({ analytics, onNavigate }: LandingHeroProps): ReactElement {
  return (
    <section aria-labelledby="hero-heading">
      <div className="hero">
        <span className="eyebrow">Google Gemini Powered Civic Infrastructure</span>
        <h1 id="hero-heading" className="hero-title">
          Turn neighborhood friction into <span className="hero-serif">verified resolution.</span>
        </h1>
        <p className="hero-lead">
          Report potholes, overflowing bins, dark streetlights, or water leaks in seconds.
          CivicResolve uses Google Gemini multimodal triage and deterministic SLA routing to
          prioritize hazards and track every repair transparently.
        </p>
        <div className="cta-row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onNavigate('report');
            }}
          >
            Report a Civic Issue
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              onNavigate('tracker');
            }}
          >
            Explore Live Tracker
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              onNavigate('admin');
            }}
          >
            Open Admin Command
          </button>
        </div>

        <div className="bento-grid" aria-label="Live municipal resolution metrics">
          <article className="kpi-card">
            <div className="kpi-label">Total Civic Reports</div>
            <div className="kpi-value">{analytics.total}</div>
          </article>
          <article className="kpi-card">
            <div className="kpi-label">Active Critical Hazards</div>
            <div className="kpi-value">{analytics.criticalOpen}</div>
          </article>
          <article className="kpi-card">
            <div className="kpi-label">In Progress</div>
            <div className="kpi-value">{analytics.inProgress}</div>
          </article>
          <article className="kpi-card">
            <div className="kpi-label">Resolution Rate</div>
            <div className="kpi-value">{analytics.resolutionRate}%</div>
          </article>
        </div>
      </div>

      <div className="steps-grid" aria-label="How CivicResolve works">
        <article className="panel">
          <div className="step-num">01 / CITIZEN REPORT</div>
          <h2>Capture with optional photo</h2>
          <p>
            Submit title, description, location, and an optional photo with magic-byte verification
            and accessible validation.
          </p>
        </article>
        <article className="panel">
          <div className="step-num">02 / GEMINI AI TRIAGE</div>
          <h2>Classify, prioritize &amp; route</h2>
          <p>
            Google Gemini analyzes text and visual evidence to detect urgency, recommend the exact
            municipal department, and assign an SLA.
          </p>
        </article>
        <article className="panel">
          <div className="step-num">03 / PUBLIC ACCOUNTABILITY</div>
          <h2>Track from report to repair</h2>
          <p>
            Citizens monitor live status timelines while administrators update progress and record
            immutable audit notes.
          </p>
        </article>
      </div>
    </section>
  );
}
