import { InvalidResponseError } from './errors.js'

export function normalizeAnalyzeResponse(raw) {
  if (
    !raw ||
    typeof raw !== 'object' ||
    !Number.isInteger(raw.risk_score) ||
    raw.risk_score < 0 ||
    raw.risk_score > 100 ||
    !['green', 'amber', 'red'].includes(raw.level)
  ) {
    throw new InvalidResponseError('The server sent a result we could not read.')
  }

  const entities = {
    phones: Array.isArray(raw.entities?.phones) ? [...raw.entities.phones] : [],
    upi_ids: Array.isArray(raw.entities?.upi_ids) ? [...raw.entities.upi_ids] : [],
    urls: Array.isArray(raw.entities?.urls) ? [...raw.entities.urls] : [],
    amounts: Array.isArray(raw.entities?.amounts) ? [...raw.entities.amounts] : [],
    emails: Array.isArray(raw.entities?.emails) ? [...raw.entities.emails] : [],
    account_like: Array.isArray(raw.entities?.account_like) ? [...raw.entities.account_like] : []
  }

  const defaultLanguage = {
    code: 'en',
    script: 'Latin',
    translated: false,
    translation: null,
    translator: null,
    mixed: false
  }

  const language = {
    ...defaultLanguage,
    ...(raw.language || {})
  }

  const component_scores = {
    text: raw.component_scores?.text ?? null,
    url: raw.component_scores?.url ?? null,
    rules: raw.component_scores?.rules ?? 0
  }

  return {
    risk_score: raw.risk_score,
    level: raw.level,
    input_type: raw.input_type || 'text',
    extracted_text: raw.extracted_text ?? '',
    urls_found: Array.isArray(raw.urls_found) ? [...raw.urls_found] : [],
    red_flags: Array.isArray(raw.red_flags) ? [...raw.red_flags] : [],
    component_scores,
    overrides_fired: Array.isArray(raw.overrides_fired) ? [...raw.overrides_fired] : [],
    advice_en: raw.advice_en || '',
    advice_hi: raw.advice_hi || '',
    advice_local: raw.advice_local ?? null,
    next_steps: Array.isArray(raw.next_steps) ? [...raw.next_steps] : [],
    next_steps_hi: Array.isArray(raw.next_steps_hi) ? [...raw.next_steps_hi] : [],
    next_steps_local: raw.next_steps_local ?? null,
    local_reviewed: raw.local_reviewed ?? null,
    entities,
    language,
    reputation: Array.isArray(raw.reputation) ? [...raw.reputation] : [],
    explanation_source: raw.explanation_source || 'template',
    model_version: raw.model_version || 'unknown',
    processing_ms: raw.processing_ms ?? 0,
    error: raw.error ?? null,
    ...(raw._fallback ? { _fallback: true } : {})
  }
}

export function normalizeHealth(raw) {
  const components = raw?.components || {}
  return {
    online: true,
    status: raw?.status || 'ok',
    apiVersion: raw?.api_version ?? 1,
    modelVersion: raw?.model_version ?? null,
    ocr: Boolean(components.ocr),
    translator: typeof components.translator === 'string' ? components.translator : 'not_loaded',
    translatorEngine: components.translator_engine ?? null,
    llm: Boolean(components.llm_gemini || components.llm_groq),
    raw: raw || null
  }
}
