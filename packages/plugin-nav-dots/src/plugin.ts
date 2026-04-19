import type {
  Plugin,
  Section,
  SnapdeckInstance,
  Unsubscribe,
} from '@snapdeck/core';

export interface NavDotsOptions {
  readonly position?: 'left' | 'right';
  readonly tooltips?: boolean;
  readonly showActiveLabel?: boolean;
  readonly className?: string;
}

const ROOT_CLASS = 'snapdeck-nav-dots';
const LIST_CLASS = 'snapdeck-nav-dots__list';
const ITEM_CLASS = 'snapdeck-nav-dots__item';
const BUTTON_CLASS = 'snapdeck-nav-dots__button';
const TOOLTIP_CLASS = 'snapdeck-nav-dots__tooltip';
const ACTIVE_LABEL_CLASS = 'snapdeck-nav-dots__active-label';
const POS_LEFT_CLASS = 'snapdeck-nav-dots--left';
const POS_RIGHT_CLASS = 'snapdeck-nav-dots--right';

function labelForSection(section: Section, index: number): string {
  return section.anchor ?? `Section ${index + 1}`;
}

/**
 * Vertical dot navigation strip for Snapdeck.
 * Renders a nav element in document.body with one button per section.
 */
export function navDots(options: NavDotsOptions = {}): Plugin {
  const position = options.position ?? 'right';
  const tooltips = options.tooltips ?? false;
  const showActiveLabel = options.showActiveLabel ?? false;
  const extraClassName = options.className ?? '';

  let root: HTMLElement | null = null;
  let buttons: HTMLButtonElement[] = [];
  let activeLabelEl: HTMLSpanElement | null = null;
  let instanceRef: SnapdeckInstance | null = null;
  const subs: Unsubscribe[] = [];
  const clickHandlers = new WeakMap<HTMLButtonElement, (ev: Event) => void>();

  function render(instance: SnapdeckInstance): void {
    removeDom();

    const sections = instance.state.sections;
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Snapdeck navigation');
    nav.classList.add(ROOT_CLASS);
    nav.classList.add(position === 'left' ? POS_LEFT_CLASS : POS_RIGHT_CLASS);
    nav.dataset.position = position;
    if (extraClassName) {
      for (const cls of extraClassName.split(/\s+/).filter(Boolean)) {
        nav.classList.add(cls);
      }
    }

    const list = document.createElement('ul');
    list.classList.add(LIST_CLASS);

    const nextButtons: HTMLButtonElement[] = [];

    sections.forEach((section, index) => {
      const item = document.createElement('li');
      item.classList.add(ITEM_CLASS);

      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add(BUTTON_CLASS);
      const label = labelForSection(section, index);
      button.setAttribute('aria-label', label);
      button.dataset.index = String(index);

      const handler = (ev: Event): void => {
        ev.preventDefault();
        if (instanceRef) {
          void instanceRef.moveTo(index);
        }
      };
      button.addEventListener('click', handler);
      clickHandlers.set(button, handler);

      if (tooltips) {
        const tip = document.createElement('span');
        tip.classList.add(TOOLTIP_CLASS);
        tip.textContent = label;
        button.appendChild(tip);
      }

      item.appendChild(button);
      list.appendChild(item);
      nextButtons.push(button);
    });

    nav.appendChild(list);

    if (showActiveLabel) {
      const label = document.createElement('span');
      label.classList.add(ACTIVE_LABEL_CLASS);
      nav.appendChild(label);
      activeLabelEl = label;
    } else {
      activeLabelEl = null;
    }

    document.body.appendChild(nav);
    root = nav;
    buttons = nextButtons;

    updateActive(instance);
  }

  function updateActive(instance: SnapdeckInstance): void {
    const activeIndex = instance.state.activeSectionIndex;
    buttons.forEach((btn, i) => {
      if (i === activeIndex) {
        btn.setAttribute('aria-current', 'true');
        btn.classList.add('is-active');
      } else {
        btn.removeAttribute('aria-current');
        btn.classList.remove('is-active');
      }
    });
    if (activeLabelEl) {
      const section = instance.state.sections[activeIndex];
      activeLabelEl.textContent = section ? labelForSection(section, activeIndex) : '';
    }
  }

  function removeDom(): void {
    if (!root) return;
    for (const btn of buttons) {
      const handler = clickHandlers.get(btn);
      if (handler) {
        btn.removeEventListener('click', handler);
        clickHandlers.delete(btn);
      }
    }
    if (root.parentNode) {
      root.parentNode.removeChild(root);
    }
    root = null;
    buttons = [];
    activeLabelEl = null;
  }

  return {
    name: 'nav-dots',
    install(instance: SnapdeckInstance): void {
      instanceRef = instance;
      render(instance);

      subs.push(
        instance.on('afterLoad', () => updateActive(instance)),
        instance.on('afterRender', () => updateActive(instance)),
        instance.on('afterRebuild', () => render(instance)),
      );
    },
    destroy(): void {
      for (const unsub of subs) {
        try {
          unsub();
        } catch {
          // ignore — destroy must be best-effort
        }
      }
      subs.length = 0;
      removeDom();
      instanceRef = null;
    },
  };
}
