import { requestJson } from './http.js'
import { normalizeHealth } from './normalize.js'
import { NetworkError } from './errors.js'

export async function getHealth() {
  try {
    const data = await requestJson('/health')
    return normalizeHealth(data)
  } catch (err) {
    if (err instanceof NetworkError) {
      return {
        online: false,
        status: 'offline',
        apiVersion: null,
        ocr: false,
        translator: 'not_loaded',
        translatorEngine: null,
        llm: false,
        modelVersion: null,
        raw: null
      }
    }
    throw err
  }
}
