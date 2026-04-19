/**
 * Mount the DOM structure the engine expects.
 *
 * Responsibilities:
 *  - tag the container, sections, and slides with stable class names;
 *  - group slides of a section under a generated "slides track" element so
 *    horizontal movement has a single transformable parent;
 *  - build the immutable Section / Slide descriptors consumed by the engine;
 *  - provide a teardown that reverses every DOM mutation made at mount time.
 *
 * No inline styles are written; all visual behaviour is delegated to the
 * stylesheet via class names exported from `./classes.ts`.
 */
import type { Section, Slide, SnapdeckOptions } from '../types.js';
import { CLS } from './classes.js';

export interface MountedStructure {
  readonly container: HTMLElement;
  readonly sectionsTrack: HTMLElement;
  readonly sections: ReadonlyArray<Section>;
  readonly slides: ReadonlyArray<Slide>;
  teardown(): void;
}

interface TrackRecord {
  readonly track: HTMLElement;
  readonly section: HTMLElement;
  readonly trackParent: ParentNode;
  readonly slides: ReadonlyArray<HTMLElement>;
}

/** Read the data-anchor attribute, normalising empty values to null. */
function readAnchor(el: HTMLElement): string | null {
  const raw = el.getAttribute('data-anchor');
  if (raw === null) return null;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Ensure `el` lives inside `container` (as descendant). Used to keep the
 * scope of the slide query bounded to the current section.
 */
function queryWithin(
  root: ParentNode,
  selector: string,
): ReadonlyArray<HTMLElement> {
  const nodes = root.querySelectorAll(selector);
  const out: HTMLElement[] = [];
  nodes.forEach((n) => {
    if (n instanceof HTMLElement) out.push(n);
  });
  return out;
}

/**
 * Wrap the given slides under a generated track element. The track is
 * inserted into the first slide's actual parent (which may be the section
 * itself OR a descendant wrapper), then every slide is moved into the
 * track while preserving document order. The section is used only as a
 * safe fallback when the first slide has no parent attached.
 */
function wrapSlidesUnderTrack(
  section: HTMLElement,
  slides: ReadonlyArray<HTMLElement>,
): { track: HTMLElement; trackParent: ParentNode } {
  const doc = section.ownerDocument;
  const track = doc.createElement('div');
  track.classList.add(CLS.slidesTrack);

  const first = slides[0]!;
  const parent: ParentNode = first.parentNode ?? section;
  parent.insertBefore(track, first);

  for (const slide of slides) {
    track.appendChild(slide);
  }

  return { track, trackParent: parent };
}

export function mountStructure(
  container: HTMLElement,
  options: SnapdeckOptions,
): MountedStructure {
  const sectionEls = queryWithin(container, options.sectionSelector);

  if (sectionEls.length === 0) {
    throw new Error(
      `[snapdeck] mountStructure: no sections matched selector "${options.sectionSelector}" inside the container.`,
    );
  }

  container.classList.add(CLS.wrapper);

  // Wrap sections in an inner track element. Transforms are applied to this
  // track, not the container, so the container's overflow:hidden clip box
  // stays in place while content slides up/down underneath it.
  const doc = container.ownerDocument;
  const sectionsTrack = doc.createElement('div');
  sectionsTrack.classList.add(CLS.sectionsTrack);
  const firstSection = sectionEls[0]!;
  container.insertBefore(sectionsTrack, firstSection);
  for (const sectionEl of sectionEls) {
    sectionsTrack.appendChild(sectionEl);
  }

  const tracks: TrackRecord[] = [];
  const sections: Section[] = [];
  const slides: Slide[] = [];

  sectionEls.forEach((sectionEl, sectionIndex) => {
    sectionEl.classList.add(CLS.section);

    const slideEls = queryWithin(sectionEl, options.slideSelector);
    const sectionSlides: Slide[] = [];

    if (slideEls.length > 0) {
      // Capture originals before mutating DOM so teardown can restore order.
      const originals = [...slideEls];

      for (const slideEl of originals) {
        slideEl.classList.add(CLS.slide);
      }

      const { track, trackParent } = wrapSlidesUnderTrack(sectionEl, originals);
      tracks.push({ track, section: sectionEl, trackParent, slides: originals });

      originals.forEach((slideEl, slideIndex) => {
        const slide: Slide = {
          index: slides.length + slideIndex,
          anchor: readAnchor(slideEl),
          element: slideEl,
          parentSectionIndex: sectionIndex,
          isActive: false,
        };
        sectionSlides.push(slide);
      });

      // Push after constructing per-section indices so global slide.index
      // reflects document order across all sections.
      for (const s of sectionSlides) slides.push(s);
    }

    const section: Section = {
      index: sectionIndex,
      anchor: readAnchor(sectionEl),
      element: sectionEl,
      slides: Object.freeze(sectionSlides.slice()),
      isActive: sectionIndex === 0,
    };
    sections.push(section);
  });

  container.classList.add(CLS.initialized);

  const frozenSections = Object.freeze(sections.slice());
  const frozenSlides = Object.freeze(slides.slice());

  let torndown = false;

  const teardown = (): void => {
    if (torndown) return;
    torndown = true;

    // Unwrap tracks: move slides back as direct children of the section,
    // preserving their original order, then remove the track element.
    for (const record of tracks) {
      const { track, trackParent, slides: originalSlides } = record;
      if (track.parentNode === trackParent) {
        for (const slideEl of originalSlides) {
          trackParent.insertBefore(slideEl, track);
        }
        trackParent.removeChild(track);
      }
      for (const slideEl of originalSlides) {
        slideEl.classList.remove(CLS.slide);
      }
    }

    for (const section of frozenSections) {
      section.element.classList.remove(CLS.section);
    }

    // Unwrap the sections track: move sections back as direct children of the
    // container (in order), then remove the track element.
    if (sectionsTrack.parentNode === container) {
      for (const section of frozenSections) {
        container.insertBefore(section.element, sectionsTrack);
      }
      container.removeChild(sectionsTrack);
    }

    container.classList.remove(CLS.wrapper);
    container.classList.remove(CLS.initialized);
  };

  return {
    container,
    sectionsTrack,
    sections: frozenSections,
    slides: frozenSlides,
    teardown,
  };
}
