import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const adminToken = process.env.ADMIN_TOKEN || null
const isRecord = process.argv.includes('--record')

const contractsDir = path.resolve(__dirname, '../../contracts')
const schemasDir = path.join(contractsDir, 'schemas')
const recordedDir = path.join(contractsDir, 'recorded')

if (isRecord) {
  fs.mkdirSync(recordedDir, { recursive: true })
}

// Compile AJV schemas
const ajv = new Ajv2020({ allErrors: true })
addFormats(ajv)

const adminSchema = JSON.parse(fs.readFileSync(path.join(schemasDir, 'admin.schema.json'), 'utf8'))
const analyzeSchema = JSON.parse(fs.readFileSync(path.join(schemasDir, 'analyze.schema.json'), 'utf8'))
const errorSchema = JSON.parse(fs.readFileSync(path.join(schemasDir, 'error.schema.json'), 'utf8'))
const healthSchema = JSON.parse(fs.readFileSync(path.join(schemasDir, 'health.schema.json'), 'utf8'))
const languagesSchema = JSON.parse(fs.readFileSync(path.join(schemasDir, 'languages.schema.json'), 'utf8'))
const radarSchema = JSON.parse(fs.readFileSync(path.join(schemasDir, 'radar.schema.json'), 'utf8'))

const validators = {
  health: ajv.compile(healthSchema),
  languages: ajv.compile(languagesSchema),
  analyze: ajv.compile(analyzeSchema),
  error: ajv.compile(errorSchema),
  radar: ajv.compile(radarSchema),
  Ping: ajv.compile({ $schema: 'https://json-schema.org/draft/2020-12/schema', $defs: adminSchema.$defs, $ref: '#/$defs/Ping' }),
  ReportList: ajv.compile({ $schema: 'https://json-schema.org/draft/2020-12/schema', $defs: adminSchema.$defs, $ref: '#/$defs/ReportList' }),
  ModelList: ajv.compile({ $schema: 'https://json-schema.org/draft/2020-12/schema', $defs: adminSchema.$defs, $ref: '#/$defs/ModelList' }),
  Rules: ajv.compile({ $schema: 'https://json-schema.org/draft/2020-12/schema', $defs: adminSchema.$defs, $ref: '#/$defs/Rules' }),
  RetrainStatus: ajv.compile({ $schema: 'https://json-schema.org/draft/2020-12/schema', $defs: adminSchema.$defs, $ref: '#/$defs/RetrainStatus' }),
}

const inputs = JSON.parse(fs.readFileSync(path.join(contractsDir, 'contract-inputs.json'), 'utf8'))

const rows = []

function addRow(id, endpoint, result, detail, rawData = null) {
  rows.push({ id, endpoint, result, detail })
  if (isRecord && rawData !== null) {
    fs.writeFileSync(path.join(recordedDir, `${id}.json`), JSON.stringify(rawData, null, 2))
  }
}

async function runCheck() {
  console.log(`Checking backend contract at ${backendUrl}...`)
  if (adminToken) {
    console.log(`Admin token configured for admin endpoint checks.`)
  }

  // 1. GET /health
  try {
    const res = await fetch(`${backendUrl}/health`)
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      addRow('health', 'GET /health', 'FAIL', `Status ${res.status}`)
    } else {
      const valid = validators.health(data)
      if (!valid) {
        addRow('health', 'GET /health', 'FAIL', `Schema invalid: ${ajv.errorsText(validators.health.errors)}`, data)
      } else if (data.api_version == null) {
        addRow('health', 'GET /health', 'WARN', 'v1 server (api_version missing)', data)
      } else {
        addRow('health', 'GET /health', 'PASS', `api_version: ${data.api_version}`, data)
      }
    }
  } catch (err) {
    addRow('health', 'GET /health', 'FAIL', `Connection failed: ${err.message}`)
  }

  // 2. GET /languages
  try {
    const res = await fetch(`${backendUrl}/languages`)
    const data = await res.json().catch(() => null)
    if (res.status === 404) {
      addRow('languages', 'GET /languages', 'WARN', '404 legacy (server lacks /languages)', data)
    } else if (!res.ok) {
      addRow('languages', 'GET /languages', 'FAIL', `Status ${res.status}`)
    } else {
      const valid = validators.languages(data)
      if (!valid) {
        addRow('languages', 'GET /languages', 'FAIL', `Schema invalid: ${ajv.errorsText(validators.languages.errors)}`, data)
      } else {
        addRow('languages', 'GET /languages', 'PASS', `${data.languages?.length || 0} languages, translator: ${data.translator}`, data)
      }
    }
  } catch (err) {
    addRow('languages', 'GET /languages', 'FAIL', `Connection failed: ${err.message}`)
  }

  // 3. Analyze inputs
  if (Array.isArray(inputs.analyze)) {
    for (const item of inputs.analyze) {
      try {
        const form = new FormData()
        for (const [k, v] of Object.entries(item.form || {})) {
          form.append(k, v)
        }
        const res = await fetch(`${backendUrl}/analyze`, { method: 'POST', body: form })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          addRow(item.id, 'POST /analyze', 'FAIL', `Status ${res.status} (${data?.error || 'error'})`)
          continue
        }

        const valid = validators.analyze(data)
        if (!valid) {
          addRow(item.id, 'POST /analyze', 'FAIL', `Schema invalid: ${ajv.errorsText(validators.analyze.errors)}`, data)
          continue
        }

        let expectationFailure = null
        if (item.expect?.level_in && !item.expect.level_in.includes(data.level)) {
          expectationFailure = `level "${data.level}" not in [${item.expect.level_in.join(', ')}]`
        } else if (item.expect?.text_score_null && data.component_scores?.text !== null) {
          expectationFailure = `component_scores.text expected null, got ${data.component_scores?.text}`
        } else if (item.expect?.language_code && data.language?.code !== item.expect.language_code) {
          expectationFailure = `language.code expected "${item.expect.language_code}", got "${data.language?.code}"`
        } else if (item.expect?.upi_contains && !data.entities?.upi_ids?.includes(item.expect.upi_contains)) {
          expectationFailure = `entities.upi_ids does not contain "${item.expect.upi_contains}"`
        }

        if (expectationFailure) {
          addRow(item.id, 'POST /analyze', 'FAIL', expectationFailure, data)
        } else {
          addRow(item.id, 'POST /analyze', 'PASS', `level=${data.level}, score=${data.risk_score}`, data)
        }
      } catch (err) {
        addRow(item.id, 'POST /analyze', 'FAIL', `Error: ${err.message}`)
      }
    }
  }

  // 4. Error inputs
  if (Array.isArray(inputs.errors)) {
    for (const item of inputs.errors) {
      try {
        const form = new FormData()
        for (const [k, v] of Object.entries(item.form || {})) {
          form.append(k, v)
        }
        const res = await fetch(`${backendUrl}/analyze`, { method: 'POST', body: form })
        const data = await res.json().catch(() => null)

        if (res.status !== item.expect?.status) {
          addRow(`err_${item.id}`, 'POST /analyze', 'FAIL', `Status expected ${item.expect?.status}, got ${res.status}`)
        } else {
          const valid = validators.error(data)
          if (!valid) {
            addRow(`err_${item.id}`, 'POST /analyze', 'FAIL', `Schema invalid: ${ajv.errorsText(validators.error.errors)}`, data)
          } else {
            addRow(`err_${item.id}`, 'POST /analyze', 'PASS', `Status ${res.status}, error: "${data.error}"`, data)
          }
        }
      } catch (err) {
        addRow(`err_${item.id}`, 'POST /analyze', 'FAIL', `Error: ${err.message}`)
      }
    }
  }

  // 5. GET /radar
  try {
    const res = await fetch(`${backendUrl}/radar`)
    const data = await res.json().catch(() => null)
    if (res.status === 404) {
      addRow('radar', 'GET /radar', 'WARN', '404 (radar not implemented yet)', data)
    } else if (!res.ok) {
      addRow('radar', 'GET /radar', 'FAIL', `Status ${res.status}`)
    } else {
      const valid = validators.radar(data)
      if (!valid) {
        addRow('radar', 'GET /radar', 'FAIL', `Schema invalid: ${ajv.errorsText(validators.radar.errors)}`, data)
      } else {
        addRow('radar', 'GET /radar', 'PASS', `demo=${Boolean(data.demo)}`, data)
      }
    }
  } catch (err) {
    addRow('radar', 'GET /radar', 'FAIL', `Connection failed: ${err.message}`)
  }

  // 6. Admin endpoints (if ADMIN_TOKEN provided)
  if (adminToken) {
    const adminEndpoints = [
      { id: 'admin_ping', endpoint: '/admin/ping', schema: 'Ping' },
      { id: 'admin_reports', endpoint: '/admin/reports?status=pending', schema: 'ReportList' },
      { id: 'admin_models', endpoint: '/admin/models', schema: 'ModelList' },
      { id: 'admin_rules', endpoint: '/admin/rules', schema: 'Rules' },
      { id: 'admin_retrain', endpoint: '/admin/retrain/status', schema: 'RetrainStatus' },
    ]

    for (const ep of adminEndpoints) {
      try {
        const res = await fetch(`${backendUrl}${ep.endpoint}`, {
          headers: { 'X-Admin-Token': adminToken },
        })
        const data = await res.json().catch(() => null)
        if (res.status === 404) {
          addRow(ep.id, `GET ${ep.endpoint}`, 'WARN', '404 (endpoint not implemented yet)', data)
        } else if (!res.ok) {
          addRow(ep.id, `GET ${ep.endpoint}`, 'FAIL', `Status ${res.status}`)
        } else {
          const validator = validators[ep.schema]
          const valid = validator(data)
          if (!valid) {
            addRow(ep.id, `GET ${ep.endpoint}`, 'FAIL', `Schema invalid: ${ajv.errorsText(validator.errors)}`, data)
          } else {
            addRow(ep.id, `GET ${ep.endpoint}`, 'PASS', 'OK', data)
          }
        }
      } catch (err) {
        addRow(ep.id, `GET ${ep.endpoint}`, 'FAIL', `Connection failed: ${err.message}`)
      }
    }
  }

  // Print table
  printTable(rows)

  if (isRecord) {
    console.log(`\n[INFO] Recorded responses written to ../contracts/recorded/ for review.`)
    console.log(`[INFO] Recorded files must NOT replace fixtures automatically.\n`)
  }

  const hasFail = rows.some((r) => r.result === 'FAIL')
  if (hasFail) {
    console.error(`\nContract check FAILED. One or more endpoints failed.\n`)
    process.exit(1)
  } else {
    console.log(`\nContract check PASSED.\n`)
    process.exit(0)
  }
}

function printTable(rows) {
  const colId = Math.max(2, ...rows.map((r) => r.id.length), 'id'.length)
  const colEndpoint = Math.max(8, ...rows.map((r) => r.endpoint.length), 'endpoint'.length)
  const colResult = Math.max(6, ...rows.map((r) => r.result.length), 'result'.length)
  const colDetail = Math.max(6, ...rows.map((r) => r.detail.length), 'detail'.length)

  const pad = (str, len) => str + ' '.repeat(Math.max(0, len - str.length))
  const sep = `+-${'-'.repeat(colId)}-+-${'-'.repeat(colEndpoint)}-+-${'-'.repeat(colResult)}-+-${'-'.repeat(colDetail)}-+`

  console.log('\n' + sep)
  console.log(`| ${pad('id', colId)} | ${pad('endpoint', colEndpoint)} | ${pad('result', colResult)} | ${pad('detail', colDetail)} |`)
  console.log(sep)

  for (const r of rows) {
    console.log(`| ${pad(r.id, colId)} | ${pad(r.endpoint, colEndpoint)} | ${pad(r.result, colResult)} | ${pad(r.detail, colDetail)} |`)
  }
  console.log(sep)
}

runCheck()
