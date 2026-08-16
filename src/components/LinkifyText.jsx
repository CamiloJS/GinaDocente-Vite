// src/components/LinkifyText.jsx
// Renderiza texto convirtiendo URLs en enlaces clicables (target _blank, break-all)
const LinkifyText = ({ text }) => {
  if (!text) return null
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = String(text).split(urlRegex)
  return (
    <>
      {parts.map((part, idx) => {
        if (urlRegex.test(part)) {
          urlRegex.lastIndex = 0
          return (
            <a key={idx} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">
              {part}
            </a>
          )
        }
        return <span key={idx}>{part}</span>
      })}
    </>
  )
}

export default LinkifyText
