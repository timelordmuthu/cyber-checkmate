import { ApiError } from './errors.js'
import { getAdminToken } from '../lib/session.js'
import { normalizeAnalyzeResponse, normalizeHealth } from './normalize.js'

import adminAddRuleFixture from '@contracts/fixtures/admin_add_rule.json'
import adminModelsFixture from '@contracts/fixtures/admin_models.json'
import adminPingFixture from '@contracts/fixtures/admin_ping.json'
import adminReportsPendingFixture from '@contracts/fixtures/admin_reports_pending.json'
import adminRetrainPassedFixture from '@contracts/fixtures/admin_retrain_passed.json'
import adminRetrainRunningFixture from '@contracts/fixtures/admin_retrain_running.json'
import adminRulesFixture from '@contracts/fixtures/admin_rules.json'
import adminVariantsFixture from '@contracts/fixtures/admin_variants.json'

import analyzeAmberJobHinglishFixture from '@contracts/fixtures/analyze_amber_job_hinglish.json'
import analyzeGreenOtpFixture from '@contracts/fixtures/analyze_green_otp.json'
import analyzeImageRedFixture from '@contracts/fixtures/analyze_image_red.json'
import analyzeRedKycEnFixture from '@contracts/fixtures/analyze_red_kyc_en.json'
import analyzeTaTranslatedFixture from '@contracts/fixtures/analyze_ta_translated.json'
import analyzeTaTranslationFailedFixture from '@contracts/fixtures/analyze_ta_translation_failed.json'
import analyzeUrlOnlyOfficialFixture from '@contracts/fixtures/analyze_url_only_official.json'

import error400EmptyFixture from '@contracts/fixtures/error_400_empty.json'
import healthV2Fixture from '@contracts/fixtures/health_v2.json'
import languagesFixture from '@contracts/fixtures/languages.json'
import radarDemoFixture from '@contracts/fixtures/radar_demo.json'
import reportOkFixture from '@contracts/fixtures/report_ok.json'

let retrainCallCount = 0

export function resetMockRetrainCounter() {
  retrainCallCount = 0
}

export function isMockMode() {
  return import.meta.env?.VITE_USE_MOCK === 'true' || import.meta.env?.VITE_USE_MOCK === true
}

export async function mockCall(name, args = {}) {
  await new Promise((resolve) => setTimeout(resolve, 300))

  if (name.startsWith('admin.')) {
    const token = args?.token || getAdminToken()
    if (token !== 'mock') {
      throw new ApiError('Invalid admin token', 401)
    }

    switch (name) {
      case 'admin.ping':
        return structuredClone(adminPingFixture)
      case 'admin.listReports': {
        const reports = structuredClone(adminReportsPendingFixture)
        if (args?.status) {
          return reports.filter((r) => r.status === args.status)
        }
        return reports
      }
      case 'admin.approve':
        return {
          ...structuredClone(adminReportsPendingFixture[0]),
          status: 'approved'
        }
      case 'admin.reject':
        return {
          ...structuredClone(adminReportsPendingFixture[0]),
          status: 'rejected'
        }
      case 'admin.listVariants':
        return structuredClone(adminVariantsFixture)
      case 'admin.makeVariants':
        return {
          added: 1,
          variants: structuredClone(adminVariantsFixture)
        }
      case 'admin.deleteVariant':
        return { deleted: Number(args?.id) || 1 }
      case 'admin.startRetrain':
        return { status: 'running' }
      case 'admin.retrainStatus': {
        retrainCallCount += 1
        if (retrainCallCount <= 2) {
          return structuredClone(adminRetrainRunningFixture)
        }
        return structuredClone(adminRetrainPassedFixture)
      }
      case 'admin.listModels':
        return structuredClone(adminModelsFixture)
      case 'admin.activate':
        return { active: args?.version || 'v2', warning: null }
      case 'admin.getRules':
        return structuredClone(adminRulesFixture)
      case 'admin.addRule':
        return structuredClone(adminAddRuleFixture)
      default:
        throw new Error(`Unknown admin mock method: ${name}`)
    }
  }

  if (name === 'health') {
    return normalizeHealth(structuredClone(healthV2Fixture))
  }

  if (name === 'languages') {
    return structuredClone(languagesFixture)
  }

  if (name === 'radar') {
    return structuredClone(radarDemoFixture)
  }

  if (name === 'report') {
    return structuredClone(reportOkFixture)
  }

  if (name === 'analyze') {
    const text = typeof args?.text === 'string' ? args.text.trim() : ''
    const url = typeof args?.url === 'string' ? args.url.trim() : ''
    const hasImage = Boolean(args?.image)

    if (!text && !url && !hasImage) {
      throw new ApiError(error400EmptyFixture.error, 400)
    }

    if (text.includes('translation fail')) {
      return normalizeAnalyzeResponse(structuredClone(analyzeTaTranslationFailedFixture))
    }

    if (/[\u0B80-\u0BFF]/.test(text)) {
      return normalizeAnalyzeResponse(structuredClone(analyzeTaTranslatedFixture))
    }

    if (hasImage) {
      return normalizeAnalyzeResponse(structuredClone(analyzeImageRedFixture))
    }

    if (url && !text) {
      return normalizeAnalyzeResponse(structuredClone(analyzeUrlOnlyOfficialFixture))
    }

    if (/otp/i.test(text)) {
      return normalizeAnalyzeResponse(structuredClone(analyzeGreenOtpFixture))
    }

    if (/job|earn/i.test(text)) {
      return normalizeAnalyzeResponse(structuredClone(analyzeAmberJobHinglishFixture))
    }

    return normalizeAnalyzeResponse(structuredClone(analyzeRedKycEnFixture))
  }

  throw new Error(`Unknown mock call: ${name}`)
}
