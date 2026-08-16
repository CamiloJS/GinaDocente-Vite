// src/components/LinkifyText.jsx
// Renderiza texto convirtiendo URLs en enlaces clicables y embeber YouTube

const extractYouTubeId = (url) => {
  const m = String(url).match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i)
  return m ? m[1] : null
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
    return <span key={idx}>{part}</span>
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
