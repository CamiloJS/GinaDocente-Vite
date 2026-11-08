// src/components/ScrollToTop.jsx
import React, { useEffect, useState } from 'react'
import { ChevronUp } from './Icons.jsx'

const ScrollToTop = ({ isDarkMode }) => {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const getScrollTop = () => {
      const container = document.getElementById('main-scroll-container')
      return container ? container.scrollTop : window.scrollY
    }

    const onScroll = () => {
      if (getScrollTop() > 350) {
        setShow(true)
      } else {
        setShow(false)
      }
    }

    const container = document.getElementById('main-scroll-container')
    if (container) {
      container.addEventListener('scroll', onScroll, { passive: true })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => {
      if (container) {
        container.removeEventListener('scroll', onScroll)
      }
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const handleScrollToTop = () => {
    const container = document.getElementById('main-scroll-container')
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      onClick={handleScrollToTop}
      aria-label="Volver arriba"
      className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[90] w-11 h-11 rounded-full shadow-xl transition-all duration-300 flex items-center justify-center backdrop-blur-md active:scale-95 ${
        show ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
      } ${isDarkMode ? 'bg-gray-800/90 text-gray-200 hover:bg-gray-700 border border-gray-700' : 'bg-white/90 text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
    >
      <ChevronUp size={22} />
    </button>
  )
}

export default ScrollToTop
