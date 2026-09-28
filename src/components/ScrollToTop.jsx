// src/components/ScrollToTop.jsx
import React, { useEffect, useState } from 'react'
import { ChevronUp } from './Icons.jsx'

const ScrollToTop = ({ isDarkMode }) => {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 350) {
        setShow(true)
      } else {
        setShow(false)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Volver arriba"
      className={`fixed bottom-6 right-6 z-[100] w-11 h-11 rounded-full shadow-xl transition-all duration-300 flex items-center justify-center backdrop-blur-md active:scale-95 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      } ${isDarkMode ? 'bg-gray-800/90 text-gray-200 hover:bg-gray-700 border border-gray-700' : 'bg-white/90 text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
    >
      <ChevronUp size={22} />
    </button>
  )
}

export default ScrollToTop
