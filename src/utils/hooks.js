// src/utils/hooks.js
// Hooks reutilizables (migrados del HTML original)

import React from 'react'

export const useClickOutside = (ref, callback) => {
  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) callback()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [ref, callback])
}
