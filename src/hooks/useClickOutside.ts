import { useEffect, RefObject } from 'react';

/**
 * Custom hook to detect clicks outside of a specified element (or array of elements).
 * Calls the handler function when a click or touch occurs outside.
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null> | (RefObject<T | null>[]),
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const refs = Array.isArray(ref) ? ref : [ref];
      
      // Check if target is inside any of the refs
      const isInside = refs.some((r) => {
        const el = r?.current;
        return el ? el.contains(target) : false;
      });

      if (!isInside) {
        handler(event);
      }
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, enabled]);
}

export default useClickOutside;
