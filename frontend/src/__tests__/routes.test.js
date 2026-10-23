import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { ROUTES, RESERVED_PREFIXES, SHARED_EXCEPTIONS } from '../routes.js'

describe('routes.js definitions & reserved prefix guardrails', () => {
  it('defines correct paths for radar and console', () => {
    expect(ROUTES.radar).toBe('/scam-radar')
    expect(ROUTES.console).toBe('/console')
  })

  it('ensures no ROUTES path uses a RESERVED_PREFIX unless explicitly in SHARED_EXCEPTIONS', () => {
    const paths = Object.values(ROUTES)

    for (const routePath of paths) {
      if (SHARED_EXCEPTIONS.includes(routePath)) {
        continue
      }
      for (const prefix of RESERVED_PREFIXES) {
        const matchesExactOrChild =
          routePath === prefix || routePath.startsWith(prefix + '/')
        expect(
          matchesExactOrChild,
          `Route '${routePath}' must not use reserved prefix '${prefix}'`
        ).toBe(false)
      }
    }
  })

  it('ensures no jsx file contains hardcoded to="/ or navigate("/ string literals', () => {
    function findJsxFiles(dir) {
      let results = []
      const list = fs.readdirSync(dir)
      for (const file of list) {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)
        if (stat && stat.isDirectory()) {
          results = results.concat(findJsxFiles(fullPath))
        } else if (fullPath.endsWith('.jsx')) {
          results.push(fullPath)
        }
      }
      return results
    }

    const srcDir = path.resolve(__dirname, '..')
    const jsxFiles = findJsxFiles(srcDir)
    const hardcodedPatterns = [
      /to\s*=\s*["']\/[^"']*/g,
      /navigate\s*\(\s*["']\/[^"']*/g,
    ]

    const violations = []

    for (const file of jsxFiles) {
      const content = fs.readFileSync(file, 'utf8')
      for (const pattern of hardcodedPatterns) {
        const matches = content.match(pattern)
        if (matches) {
          violations.push({ file: path.basename(file), matches })
        }
      }
    }

    expect(violations).toEqual([])
  })
})
