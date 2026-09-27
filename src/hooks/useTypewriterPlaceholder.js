// Step 12: the placeholder typewriter for the main calculator's Home Price
// input — a faithful port of `script.js#initTypewriter`, driven through
// React state (the `placeholder` prop) instead of direct DOM mutation.
//
// Preserved verbatim from the original:
//   - the exact text, the blinking "|" cursor while typing,
//   - the state machine: type at 100ms, delete at 50ms, 3s pause at the
//     full message, 0.5s pause before restarting (first tick uses the
//     original's initial 150ms),
//   - the stop condition: while the field has a value OR is focused, the
//     placeholder shows the full static text and the loop re-checks every
//     1s (charIndex is preserved, so typing resumes where it left off —
//     same as the original).
//
// Step 12 additions (plan requirements):
//   - `prefers-reduced-motion: reduce` → static full-text placeholder, no
//     animation (re-evaluated live via a media-query change listener).
//   - the pending timer is cleared on unmount (AGENTS.md timer cleanup)
//     and the effect is idempotent under StrictMode's double mount.
//
// Placeholder text is never written into the input's VALUE — the two stay
// separate, as in the original.

import { useEffect, useRef, useState } from 'react';

const TEXT = 'Enter your home price here...';
const PRICE_INPUT_ID = 'price';

/**
 * @param {string} value  The current Home Price field value (kept in a ref
 *   so the animation loop always sees the latest one without restarting).
 * @returns {string} The placeholder string for the input.
 */
export function useTypewriterPlaceholder(value) {
  const [placeholder, setPlaceholder] = useState('');
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer = null;
    let disposed = false;

    function start() {
      // Reduced motion: no animation at all — just the plain, full text.
      if (mq.matches) {
        setPlaceholder(TEXT);
        return;
      }

      // The original's local state machine, character for character.
      let charIndex = 0;
      let isDeleting = false;
      let typeSpeed = 150;

      function type() {
        if (disposed) return;

        // Stop and hold the full text while the user has typed something
        // or is focused on the field; re-check once per second.
        if (
          valueRef.current !== '' ||
          document.activeElement === document.getElementById(PRICE_INPUT_ID)
        ) {
          setPlaceholder(TEXT);
          timer = setTimeout(type, 1000);
          return;
        }

        const currentText = isDeleting
          ? TEXT.substring(0, charIndex--)
          : TEXT.substring(0, charIndex++);

        setPlaceholder(currentText + (isDeleting ? '' : '|'));

        if (!isDeleting && charIndex > TEXT.length) {
          isDeleting = true;
          typeSpeed = 3000; // long pause at the full message
        } else if (isDeleting && charIndex < 0) {
          isDeleting = false;
          charIndex = 0;
          typeSpeed = 500; // pause before restarting
        } else {
          typeSpeed = isDeleting ? 50 : 100;
        }

        timer = setTimeout(type, typeSpeed);
      }

      type();
    }

    function restart() {
      if (timer) clearTimeout(timer);
      start();
    }

    start();
    mq.addEventListener('change', restart);

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      mq.removeEventListener('change', restart);
    };
  }, []);

  return placeholder;
}
