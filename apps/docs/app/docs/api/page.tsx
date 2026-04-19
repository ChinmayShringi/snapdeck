export const metadata = {
  title: 'API — Snapdeck',
  description: 'Snapdeck options, methods, and events.',
};

export default function ApiPage() {
  return (
    <main className="container">
      <h1>API reference</h1>

      <h2>Factory</h2>
      <pre>
        <code>{`snapdeck(target: HTMLElement | string, options?: Partial<SnapdeckOptions>): SnapdeckInstance`}</code>
      </pre>

      <h2>Core options</h2>
      <ul>
        <li>
          <code>scrollingSpeed</code> — animation duration in ms. Default 700.
        </li>
        <li>
          <code>anchors</code> — array of string anchors, one per section. Enables URL hash sync.
        </li>
        <li>
          <code>loopTop</code> / <code>loopBottom</code> — wrap around at the edges.
        </li>
        <li>
          <code>keyboardScrolling</code> — enable arrow-key navigation.
        </li>
        <li>
          <code>plugins</code> — array of <code>Plugin</code> values.
        </li>
      </ul>

      <h2>Instance methods</h2>
      <ul>
        <li>
          <code>moveTo(target: AnchorOrIndex)</code> — navigate to a section.
        </li>
        <li>
          <code>moveSectionUp()</code> / <code>moveSectionDown()</code>.
        </li>
        <li>
          <code>on(event, handler)</code> / <code>off(event, handler)</code> — typed events.
        </li>
        <li>
          <code>setOption(key, value)</code> — mutate a runtime option.
        </li>
        <li>
          <code>destroy()</code> — tear down listeners and plugins.
        </li>
      </ul>

      <h2>Events</h2>
      <ul>
        <li>
          <code>beforeLeave</code> — fires before navigation begins.
        </li>
        <li>
          <code>afterLoad</code> — fires after the destination section is active.
        </li>
        <li>
          <code>afterResize</code> — viewport dimensions changed.
        </li>
      </ul>

      <h2>TypeScript</h2>
      <p>
        All public types are exported from <code>@snapdeck/core</code> and re-exported from
        framework wrappers such as <code>@snapdeck/react</code>.
      </p>
    </main>
  );
}
