'use client';

import { useSnapdeck } from '@snapdeck/react';
import type { Plugin, SnapdeckOptions } from '@snapdeck/core';
import type { ReactNode } from 'react';

export interface DemoSlide {
  readonly className?: string;
  readonly title: string;
  readonly body?: string;
}

export interface SnapdeckDemoProps {
  readonly slides: ReadonlyArray<DemoSlide>;
  readonly plugins?: ReadonlyArray<Plugin>;
  readonly footer?: ReactNode;
}

/**
 * Renders a Snapdeck container with the given slides.
 *
 * The container fills the viewport so the snap behavior is observable.
 * Any plugins passed in are registered via options.
 */
export function SnapdeckDemo({ slides, plugins, footer }: SnapdeckDemoProps) {
  const options: Partial<SnapdeckOptions> = plugins && plugins.length > 0 ? { plugins } : {};
  const { ref } = useSnapdeck(options);

  return (
    <div className="demo-host" ref={ref}>
      {slides.map((slide, idx) => (
        <section key={idx} className={`demo-section ${slide.className ?? ''}`}>
          <div>
            <h2>{slide.title}</h2>
            {slide.body ? <p>{slide.body}</p> : null}
            {idx === slides.length - 1 && footer ? <div>{footer}</div> : null}
          </div>
        </section>
      ))}
    </div>
  );
}
