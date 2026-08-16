// src/components/EmptyState.jsx
import React from 'react'

const EmptyState = ({ icon: Icon, title, message, isDarkMode }) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-4 rounded-2xl border border-dashed ${isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-gray-50/50'}`}>
      {Icon && (
        <div className={`mb-4 p-4 rounded-full ${isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
          <Icon size={48} className="opacity-70" />
        </div>
      )}
      <h3 className={`text-lg font-bold mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{title}</h3>
      {message && <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{message}</p>}
    </div>
  )
}

export default EmptyState
