import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.resolve(__dirname, '..')

const routesFilePath = path.join(frontendRoot, 'src', 'routes.js')
if (!fs.existsSync(routesFilePath)) {
  console.error(`Missing routes file: ${routesFilePath}`)
  process.exit(1)
}

const routesContent = fs.readFileSync(routesFilePath, 'utf8')

// 1. Extract RESERVED_PREFIXES and SHARED_EXCEPTIONS
const reservedMatch = routesContent.match(/RESERVED_PREFIXES\s*=\s*\[([\s\S]*?)\]/)
const sharedMatch = routesContent.match(/SHARED_EXCEPTIONS\s*=\s*\[([\s\S]*?)\]/)

const RESERVED_PREFIXES = reservedMatch
  ? Array.from(reservedMatch[1].matchAll(/['"]([^'"]+)['"]/g)).map((m) => m[1])
  : []

const SHARED_EXCEPTIONS = sharedMatch
  ? Array.from(sharedMatch[1].matchAll(/['"]([^'"]+)['"]/g)).map((m) => m[1])
  : []

// 2. Extract every path value from ROUTES block
const routesBlockMatch = routesContent.match(/export\s+const\s+ROUTES\s*=\s*\{([\s\S]*?)\}/)
if (!routesBlockMatch) {
  console.error('Could not locate ROUTES definition in src/routes.js')
  process.exit(1)
}

const routesBlock = routesBlockMatch[1]
const routePathMatches = Array.from(routesBlock.matchAll(/:\s*['"]([^'"]+)['"]/g)).map((m) => m[1])

if (routePathMatches.length === 0) {
  console.error('No route paths found in ROUTES')
  process.exit(1)
}

// 3. Verify no route starts with a RESERVED prefix (exact segment match)
for (const routePath of routePathMatches) {
  if (SHARED_EXCEPTIONS.includes(routePath)) {
    continue
  }
  for (const prefix of RESERVED_PREFIXES) {
    if (routePath === prefix || routePath.startsWith(prefix + '/')) {
      console.error(`Error: Route '${routePath}' matches reserved API prefix '${prefix}'`)
      process.exit(1)
    }
  }
}

// 4. Grep src/**/*.jsx for to="/ or navigate('/ string literals
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

const srcDir = path.join(frontendRoot, 'src')
const jsxFiles = findJsxFiles(srcDir)
const hardcodedPatterns = [
  /to\s*=\s*["']\/[^"']*/g,
  /navigate\s*\(\s*["']\/[^"']*/g,
]

let foundViolations = false

for (const file of jsxFiles) {
  const content = fs.readFileSync(file, 'utf8')
  for (const pattern of hardcodedPatterns) {
    const matches = content.match(pattern)
    if (matches && matches.length > 0) {
      console.error(`Error: Hardcoded route literal found in ${path.relative(frontendRoot, file)}: ${matches.join(', ')}`)
      foundViolations = true
    }
  }
}

if (foundViolations) {
  process.exit(1)
}

console.log('routes OK')
process.exit(0)
