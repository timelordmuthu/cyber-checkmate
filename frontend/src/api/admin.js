import { requestJson } from './http.js'

export async function ping() {
  return requestJson('/admin/ping', { admin: true })
}

export async function listReports(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return requestJson(`/admin/reports${query}`, { admin: true })
}

export async function approve(id, body) {
  return requestJson(`/admin/reports/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    body,
    admin: true
  })
}

export async function reject(id) {
  return requestJson(`/admin/reports/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    admin: true
  })
}

export async function listVariants(id) {
  return requestJson(`/admin/reports/${encodeURIComponent(id)}/variants`, {
    admin: true
  })
}

export async function makeVariants(id, n = 3) {
  const body = typeof n === 'object' && n !== null ? n : { n }
  return requestJson(`/admin/reports/${encodeURIComponent(id)}/variants`, {
    method: 'POST',
    body,
    admin: true
  })
}

export async function deleteVariant(id) {
  return requestJson(`/admin/variants/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    admin: true
  })
}

export async function startRetrain() {
  return requestJson('/admin/retrain', {
    method: 'POST',
    admin: true
  })
}

export async function retrainStatus() {
  return requestJson('/admin/retrain/status', {
    admin: true
  })
}

export async function listModels() {
  return requestJson('/admin/models', {
    admin: true
  })
}

export async function activate(version, force = false) {
  return requestJson(`/admin/models/${encodeURIComponent(version)}/activate`, {
    method: 'POST',
    body: { force: Boolean(force) },
    admin: true
  })
}

export async function getRules() {
  return requestJson('/admin/rules', {
    admin: true
  })
}

export async function addRule(body) {
  return requestJson('/admin/rules', {
    method: 'POST',
    body,
    admin: true
  })
}

export const admin = {
  ping,
  listReports,
  approve,
  reject,
  listVariants,
  makeVariants,
  deleteVariant,
  startRetrain,
  retrainStatus,
  listModels,
  activate,
  getRules,
  addRule
}
