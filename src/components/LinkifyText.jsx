import CustomVideoPlayer, { extractYouTubeId } from './CustomVideoPlayer.jsx';

const renderWithMarkdown = (text, keyPrefix) => {
  const out = []
  // Procesar negritas primero: **texto**
  const boldParts = String(text).split(/(\*\*[^*]+\*\*)/g)
  boldParts.forEach((bp, bi) => {
    const boldMatch = bp.match(/^\*\*([\s\S]*)\*\*$/)
    if (boldMatch) {
      out.push(<strong key={`${keyPrefix}-b${bi}`} className="font-bold text-gray-900 dark:text-white">{renderWithMarkdown(boldMatch[1], `${keyPrefix}-b${bi}`)}</strong>)
      return
    }
    // Luego cursivas: *texto*
    const emParts = bp.split(/(\*[^*]+\*)/g)
    emParts.forEach((ep, ei) => {
      const emMatch = ep.match(/^\*([\s\S]*)\*$/)
      if (emMatch) {
        out.push(<em key={`${keyPrefix}-e${bi}-${ei}`} className="italic">{emMatch[1]}</em>)
      } else {
        out.push(<span key={`${keyPrefix}-t${bi}-${ei}`}>{ep}</span>)
      }
    })
  })
  return out
}

const LinkifyText = ({ text, isDarkMode = false }) => {
  if (!text) return null
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = String(text).split(urlRegex)
  const ytIds = []
  const elements = parts.map((part, idx) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0
      const videoId = extractYouTubeId(part)
      if (videoId && !ytIds.includes(videoId)) {
        ytIds.push(videoId)
        // No renderizamos el link de texto crudo para YouTube, solo el reproductor personalizado abajo
        return null;
      }
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
        <div key={'yt-' + idx} className="mt-2.5 max-w-full">
          <CustomVideoPlayer videoId={videoId} title="Video de la clase" isDarkMode={isDarkMode} />
        </div>
      ))}
    </>
  )
}

export default LinkifyText
