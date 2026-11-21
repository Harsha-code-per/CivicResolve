import type { ReactElement } from 'react';
import { Icon, type IconName } from '../ui/Icon.js';

const STEPS: readonly { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'camera',
    title: 'Report in under a minute',
    body: 'A title, the place, a few words and an optional photo. The photo is shrunk and stripped of GPS data in your browser before it leaves your phone.',
  },
  {
    icon: 'spark',
    title: 'Gemini triages it',
    body: 'Gemini reads the words and the photo, then picks the category, the urgency and the department that owns the fix, in about two seconds.',
  },
  {
    icon: 'check',
    title: 'Follow it to resolved',
    body: 'Crews move it from Reported to In Progress to Resolved with an audit note at every step. You watch it happen in My reports.',
  },
];

const GUARDRAILS: readonly string[] = [
  'A safety floor: Gemini can raise a priority but never downgrade an exposed wire or a gas leak.',
  'Replies must match a JSON schema generated from the same zod schema that validates them.',
  'Citizen text is fenced as data, so a complaint cannot rewrite the instructions.',
  'If every model is busy, a deterministic rule engine triages instead. The app never stalls.',
];

/**
 * The three steps from report to resolution.
 *
 * @returns "How it works" section.
 */
export function HowItWorks(): ReactElement {
  return (
    <section id="how" className="land-section" aria-labelledby="how-title">
      <p className="kicker">How it works</p>
      <h2 id="how-title" className="section-title">
        From a photo on the pavement to a closed ticket.
      </h2>
      <ol className="steps">
        {STEPS.map((step) => (
          <li key={step.title} className="step">
            <Icon name={step.icon} className="icon step-icon" />
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * How Gemini is kept honest: the guardrails and a sample triage receipt.
 *
 * @returns "Gemini, kept honest" section.
 */
export function GeminiSection(): ReactElement {
  return (
    <section id="gemini" className="land-section split" aria-labelledby="gemini-title">
      <div>
        <p className="kicker">Gemini, kept honest</p>
        <h2 id="gemini-title" className="section-title">
          The model understands. <em>The rules decide.</em>
        </h2>
        <ul className="guardrails">
          {GUARDRAILS.map((rule) => (
            <li key={rule}>
              <Icon name="shield" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>
      <figure className="receipt" aria-labelledby="receipt-caption">
        <figcaption id="receipt-caption" className="receipt-head">
          <span>Triage receipt</span>
          <span className="chip chip-progress">gemini-3.5-flash-lite</span>
        </figcaption>
        <dl className="receipt-rows">
          <div>
            <dt>Category</dt>
            <dd>Electrical &amp; streetlights</dd>
          </div>
          <div>
            <dt>Gemini priority</dt>
            <dd>High</dd>
          </div>
          <div>
            <dt>Safety floor</dt>
            <dd>Critical (exposed wire)</dd>
          </div>
          <div>
            <dt>Final priority</dt>
            <dd>
              <span className="chip chip-critical">Critical</span>
            </dd>
          </div>
          <div>
            <dt>Department</dt>
            <dd>Street Lighting &amp; Electrical Wing</dd>
          </div>
          <div>
            <dt>SLA</dt>
            <dd>4 hours</dd>
          </div>
        </dl>
      </figure>
    </section>
  );
}
