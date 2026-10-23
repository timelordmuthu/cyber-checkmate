import { describe, it, expect } from 'vitest'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// contracts/ directory sits at repo root (../contracts relative to frontend/)
const contractsDir = path.resolve(__dirname, '../../../contracts')
const schemasDir = path.join(contractsDir, 'schemas')
const fixturesDir = path.join(contractsDir, 'fixtures')

describe('Contract Fixtures Validation (Ajv 2020-12)', () => {
  const ajv = new Ajv2020({ allErrors: true })
  addFormats(ajv)

  const adminSchema = JSON.parse(fs.readFileSync(path.join(schemasDir, 'admin.schema.json'), 'utf8'))

  const schemaMap = {
    analyze: JSON.parse(fs.readFileSync(path.join(schemasDir, 'analyze.schema.json'), 'utf8')),
    error: JSON.parse(fs.readFileSync(path.join(schemasDir, 'error.schema.json'), 'utf8')),
    health: JSON.parse(fs.readFileSync(path.join(schemasDir, 'health.schema.json'), 'utf8')),
    languages: JSON.parse(fs.readFileSync(path.join(schemasDir, 'languages.schema.json'), 'utf8')),
    radar: JSON.parse(fs.readFileSync(path.join(schemasDir, 'radar.schema.json'), 'utf8')),
    'report-response': JSON.parse(fs.readFileSync(path.join(schemasDir, 'report-response.schema.json'), 'utf8')),
  }

  const adminDefs = [
    'Ping',
    'ReportList',
    'VariantList',
    'RetrainStatus',
    'ModelList',
    'Rules',
    'AddRuleResponse',
  ]

  for (const def of adminDefs) {
    schemaMap[def] = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: adminSchema.$defs,
      $ref: `#/$defs/${def}`,
    }
  }

  const validators = {}
  for (const [key, schema] of Object.entries(schemaMap)) {
    validators[key] = ajv.compile(schema)
  }

  function getValidatorKey(filename) {
    if (filename.startsWith('analyze_')) return 'analyze'
    if (filename.startsWith('error_')) return 'error'
    if (filename.startsWith('health_')) return 'health'
    if (filename.startsWith('languages')) return 'languages'
    if (filename.startsWith('radar')) return 'radar'
    if (filename.startsWith('report_ok')) return 'report-response'
    if (filename.startsWith('admin_ping')) return 'Ping'
    if (filename.startsWith('admin_reports')) return 'ReportList'
    if (filename.startsWith('admin_variants')) return 'VariantList'
    if (filename.startsWith('admin_retrain')) return 'RetrainStatus'
    if (filename.startsWith('admin_models')) return 'ModelList'
    if (filename.startsWith('admin_rules')) return 'Rules'
    if (filename.startsWith('admin_add_rule')) return 'AddRuleResponse'
    return null
  }

  const fixtureFiles = fs.readdirSync(fixturesDir).filter((f) => f.endsWith('.json'))

  it('found all 26 fixtures in contracts/fixtures/', () => {
    expect(fixtureFiles.length).toBe(26)
  })

  it.each(fixtureFiles)('validates fixture: %s', (filename) => {
    const validatorKey = getValidatorKey(filename)
    expect(validatorKey, `No schema mapping found for fixture: ${filename}`).toBeTruthy()

    const validate = validators[validatorKey]
    expect(validate, `Compiled validator not found for: ${validatorKey}`).toBeDefined()

    const raw = fs.readFileSync(path.join(fixturesDir, filename), 'utf8')
    const data = JSON.parse(raw)

    const valid = validate(data)
    if (!valid) {
      console.error(`Validation failed for ${filename} using schema ${validatorKey}:`, validate.errors)
    }

    expect(valid, `Fixture ${filename} failed validation: ${JSON.stringify(validate.errors, null, 2)}`).toBe(true)
  })
})
