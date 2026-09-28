// src/components/SkeletonCard.jsx
import React from 'react'

const SkeletonCard = ({ isDarkMode }) => {
  const base = isDarkMode ? 'bg-gray-700/60' : 'bg-gray-200/80'
  return (
    <div className={`p-4 rounded-2xl border shadow-sm animate-pulse ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-full ${base}`} />
        <div className="flex-1 space-y-2">
          <div className={`h-3 w-1/3 rounded ${base}`} />
          <div className={`h-2 w-1/4 rounded ${base}`} />
        </div>
      </div>
      <div className={`h-4 w-full rounded mb-2 ${base}`} />
      <div className={`h-4 w-5/6 rounded mb-2 ${base}`} />
      <div className={`h-4 w-2/3 rounded mb-4 ${base}`} />
      <div className={`h-40 w-full rounded-xl ${base}`} />
    </div>
  )
}

export default SkeletonCard
