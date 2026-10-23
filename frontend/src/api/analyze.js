import { requestJson } from './http.js'
import { normalizeAnalyzeResponse } from './normalize.js'

export async function analyzeRemote({ text, url, image, lang } = {}) {
  const form = new FormData()

  if (typeof text === 'string') {
    const trimmed = text.trim()
    if (trimmed.length > 0) {
      form.append('text', trimmed.slice(0, 5000))
    }
  }

  if (typeof url === 'string') {
    const trimmedUrl = url.trim()
    if (trimmedUrl.length > 0) {
      form.append('url', trimmedUrl)
    }
  }

  if (image) {
    form.append('image', image)
  }

  if (lang) {
    form.append('lang', lang)
  }

  const isExtendedTimeout = Boolean(image || (lang && !['en', 'hi'].includes(lang)))
  const timeoutMs = isExtendedTimeout ? 60000 : 20000

  const data = await requestJson('/analyze', {
    method: 'POST',
    form,
    timeoutMs
  })

  return normalizeAnalyzeResponse(data)
}
