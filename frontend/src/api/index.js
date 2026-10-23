import { isMockMode, mockCall } from './mock.js'
import { analyzeRemote as analyzeRemoteCall } from './analyze.js'
import { getHealth as getHealthRemote } from './health.js'
import { getLanguages as getLanguagesRemote } from './languages.js'
import { sendReport as sendReportRemote } from './report.js'
import { getRadar as getRadarRemote } from './radar.js'
import * as adminRemote from './admin.js'

export { isMockMode, mockCall } from './mock.js'
export { ApiError, NetworkError, FeatureUnavailableError, InvalidResponseError } from './errors.js'
export { normalizeAnalyzeResponse, normalizeHealth } from './normalize.js'
export { requestJson } from './http.js'

export async function analyzeRemote(input) {
  return analyzeRemoteCall(input)
}

export async function analyze(input) {
  if (isMockMode()) {
    return mockCall('analyze', input)
  }
  return analyzeRemoteCall(input)
}

export async function getHealth() {
  if (isMockMode()) {
    return mockCall('health')
  }
  return getHealthRemote()
}

export async function getLanguages() {
  if (isMockMode()) {
    return mockCall('languages')
  }
  return getLanguagesRemote()
}

export async function sendReport(body) {
  if (isMockMode()) {
    return mockCall('report', body)
  }
  return sendReportRemote(body)
}

export async function getRadar() {
  if (isMockMode()) {
    return mockCall('radar')
  }
  return getRadarRemote()
}

export const admin = {
  async ping(token) {
    if (isMockMode()) {
      return mockCall('admin.ping', { token })
    }
    return adminRemote.ping(token)
  },

  async listReports(status) {
    if (isMockMode()) {
      return mockCall('admin.listReports', { status })
    }
    return adminRemote.listReports(status)
  },

  async approve(id, body) {
    if (isMockMode()) {
      return mockCall('admin.approve', { id, body })
    }
    return adminRemote.approve(id, body)
  },

  async reject(id) {
    if (isMockMode()) {
      return mockCall('admin.reject', { id })
    }
    return adminRemote.reject(id)
  },

  async listVariants(id) {
    if (isMockMode()) {
      return mockCall('admin.listVariants', { id })
    }
    return adminRemote.listVariants(id)
  },

  async makeVariants(id, n) {
    if (isMockMode()) {
      return mockCall('admin.makeVariants', { id, n })
    }
    return adminRemote.makeVariants(id, n)
  },

  async deleteVariant(id) {
    if (isMockMode()) {
      return mockCall('admin.deleteVariant', { id })
    }
    return adminRemote.deleteVariant(id)
  },

  async startRetrain() {
    if (isMockMode()) {
      return mockCall('admin.startRetrain')
    }
    return adminRemote.startRetrain()
  },

  async retrainStatus() {
    if (isMockMode()) {
      return mockCall('admin.retrainStatus')
    }
    return adminRemote.retrainStatus()
  },

  async listModels() {
    if (isMockMode()) {
      return mockCall('admin.listModels')
    }
    return adminRemote.listModels()
  },

  async activate(version, force) {
    if (isMockMode()) {
      return mockCall('admin.activate', { version, force })
    }
    return adminRemote.activate(version, force)
  },

  async getRules() {
    if (isMockMode()) {
      return mockCall('admin.getRules')
    }
    return adminRemote.getRules()
  },

  async addRule(body) {
    if (isMockMode()) {
      return mockCall('admin.addRule', body)
    }
    return adminRemote.addRule(body)
  }
}
