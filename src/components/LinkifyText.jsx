// src/components/LinkifyText.jsx
// Renderiza texto con Markdown básico (**negritas**, *cursivas*), URLs clicables y embeds de YouTube.

const extractYouTubeId = (url) => {
  const m = String(url).match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i)
  return m ? m[1] : null
}

const renderWithMarkdown = (text, keyPrefix) => {
  const out = []
  // Procesar negritas primero: **texto**
  const boldParts = String(text).split(/(\*\*[^*]+\*\*)/g)
  boldParts.forEach((bp, bi) => {
    const boldMatch = bp.match(/^\*\*(.*)\*\*$/s)
    if (boldMatch) {
      out.push(<strong key={`${keyPrefix}-b${bi}`} className="font-bold text-gray-900 dark:text-white">{renderWithMarkdown(boldMatch[1], `${keyPrefix}-b${bi}`)}</strong>)
      return
    }
    // Luego cursivas: *texto*
    const emParts = bp.split(/(\*[^*]+\*)/g)
    emParts.forEach((ep, ei) => {
      const emMatch = ep.match(/^\*(.*)\*$/s)
      if (emMatch) {
        out.push(<em key={`${keyPrefix}-e${bi}-${ei}`} className="italic">{emMatch[1]}</em>)
      } else {
        out.push(<span key={`${keyPrefix}-t${bi}-${ei}`}>{ep}</span>)
      }
    })
  })
  return out
}

const LinkifyText = ({ text }) => {
  if (!text) return null
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = String(text).split(urlRegex)
  const ytIds = []
  const elements = parts.map((part, idx) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0
      const videoId = extractYouTubeId(part)
      if (videoId && !ytIds.includes(videoId)) ytIds.push(videoId)
      return (
        <a key={idx} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">
          {part}
        </a>
      )
    }
    return <span key={idx}>{renderWithMarkdown(part, idx)}</span>
  })
  return (
    <>
      {elements}
      {ytIds.slice(0, 1).map((videoId, idx) => (
        <iframe
          key={'yt-' + idx}
          src={`https://www.youtube.com/embed/${videoId}`}
          title="Video de YouTube"
          className="w-full aspect-video rounded-xl mt-3 shadow-md"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ))}
    </>
  )
}

export default LinkifyText
