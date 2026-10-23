import { requestJson } from './http.js'

export async function getRadar() {
  return requestJson('/radar')
}
