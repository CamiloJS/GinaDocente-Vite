// src/components/GifPickerModal.jsx
import React, { useState } from 'react'
import { X } from './Icons.jsx'

const GIPHY_KEY = 'kwprszfXeLxqBuRcVDtNkhliq9jDpB5e'

const GifPickerModal = ({ onSelect, onClose, isDarkMode }) => {
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const searchGifs = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(query)}&api_key=${GIPHY_KEY}&limit=12&rating=g`)
      const data = await res.json()
      const gifs = (data.data || []).map((g) => ({
        id: g.id,
        url: g.images?.fixed_height?.url || g.images?.original?.url,
      })).filter((g) => g.url)
      setResults(gifs)
    } catch (error) {}
    setLoading(false)
  }
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-md rounded-3xl shadow-2xl flex flex-col overflow-hidden ${isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-500/30">
          <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Buscar GIF</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-red-500"><X size={20} /></button>
        </div>
        <form onSubmit={searchGifs} className="p-4 flex gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ej: Gato riendo..." className={`flex-1 px-4 py-2.5 rounded-xl outline-none border focus:ring-2 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-300'}`} autoFocus />
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors">{loading ? '⏳' : 'Buscar'}</button>
        </form>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2 max-h-64 bg-black/5">
          {results.length === 0 && !loading && <p className="col-span-2 text-center text-gray-500 text-sm py-4">Escribe algo y presiona Buscar.</p>}
          {results.map((gif) => (
            <img key={gif.id} src={gif.url} className="w-full h-24 object-cover rounded-xl cursor-pointer hover:scale-105 hover:shadow-lg transition-all" onClick={() => onSelect(gif.url)} alt="GIF" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default GifPickerModal
