import { requestJson } from './http.js'

export async function sendReport(body) {
  return requestJson('/report', {
    method: 'POST',
    body
  })
}
