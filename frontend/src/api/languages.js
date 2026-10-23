import { requestJson } from './http.js'
import { FeatureUnavailableError } from './errors.js'

export async function getLanguages() {
  try {
    const data = await requestJson('/languages')
    return data
  } catch (err) {
    if (err instanceof FeatureUnavailableError || err?.status === 404) {
      return {
        languages: [
          { code: 'en', name: 'English', native_name: 'English', reviewed: true, beta: false },
          { code: 'hi', name: 'Hindi', native_name: 'हिन्दी', reviewed: true, beta: false }
        ],
        translator: 'not_loaded',
        translator_engine: null,
        legacy: true
      }
    }
    throw err
  }
}
