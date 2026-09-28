// src/utils/hooks.js
import React from 'react'

export const useClickOutside = (ref, callback) => {
  const cbRef = React.useRef(callback);
  cbRef.current = callback;

  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        cbRef.current?.(e);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [ref]);
};
