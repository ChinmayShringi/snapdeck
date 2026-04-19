import { CodeBlock } from '../../../components/CodeBlock';

export const metadata = {
  title: 'Events — Snapdeck',
};

const USAGE = `const off = api.on('afterLoad', ({ to, trigger }) => {
  console.log('entered', to.index, 'via', trigger);
});

// later
off();`;

const PAYLOADS = `type NavigationPayload = {
  from: Section;
  to: Section;
  direction: 'up' | 'down';
  trigger: Trigger;
};

type SlideNavigationPayload = {
  section: Section;
  from: Slide;
  to: Slide;
  direction: 'left' | 'right';
  trigger: Trigger;
};

type ResizePayload = {
  viewport: { width: number; height: number };
};`;

interface EventRow {
  readonly name: string;
  readonly when: string;
  readonly payload: string;
}

const EVENTS: ReadonlyArray<EventRow> = [
  { name: 'beforeLeave', when: 'immediately before navigation starts', payload: 'NavigationPayload' },
  { name: 'afterLoad', when: 'destination section is active', payload: 'NavigationPayload' },
  { name: 'onSlideLeave', when: 'before a slide change', payload: 'SlideNavigationPayload' },
  { name: 'afterSlideLoad', when: 'slide change complete', payload: 'SlideNavigationPayload' },
  { name: 'afterResize', when: 'viewport dimensions changed', payload: 'ResizePayload' },
  { name: 'afterRender', when: 'initial mount complete', payload: 'void' },
];

export default function EventsPage() {
  return (
    <>
      <div className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
        Docs / events
      </div>
      <h1>Events.</h1>
      <p>Typed, unsubscribable, synchronous handlers.</p>

      <h2>Subscribe</h2>
      <CodeBlock code={USAGE} lang="ts" />

      <h2>Events</h2>
      <table>
        <thead>
          <tr>
            <th>event</th>
            <th>when</th>
            <th>payload</th>
          </tr>
        </thead>
        <tbody>
          {EVENTS.map((e) => (
            <tr key={e.name}>
              <td><code>{e.name}</code></td>
              <td>{e.when}</td>
              <td><code>{e.payload}</code></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Payload shapes</h2>
      <CodeBlock code={PAYLOADS} lang="ts" />
    </>
  );
}
