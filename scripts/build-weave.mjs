#!/usr/bin/env node
// Validate hand-authored Weave principle skills in plugins/weave/skills/.

import fs from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SKILLS_DIR = join(ROOT, 'plugins/weave/skills')

export const EXPECTED_PRINCIPLES = [
  'principle-weave',
  'principle-suggested-stack',
  'principle-testing',
  'principle-frontend-ux',
  'principle-code-quality',
  'principle-security',
  'principle-performance',
  'principle-demo',
]

function frontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/)
  if (!match) throw new Error('missing YAML frontmatter')
  const fields = {}
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    fields[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
  return fields
}

export function checkPrinciples() {
  const problems = []

  for (const name of EXPECTED_PRINCIPLES) {
    const path = join(SKILLS_DIR, name, 'SKILL.md')
    if (!fs.existsSync(path)) {
      problems.push(`missing ${name}/SKILL.md`)
      continue
    }
    const markdown = fs.readFileSync(path, 'utf8')
    try {
      const fm = frontmatter(markdown)
      if (fm.name !== name) problems.push(`${name} skill name frontmatter is ${fm.name}`)
      if (!fm.description) problems.push(`${name} missing description`)
      if ('alwaysApply' in fm) problems.push(`${name} skill has unsupported alwaysApply`)
    } catch (err) {
      problems.push(`${name}: ${err.message}`)
    }
  }

  return problems
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])

if (isMain) {
  const problems = checkPrinciples()
  if (problems.length) {
    for (const problem of problems) console.error(problem)
    process.exit(1)
  }
  console.error(`ok: ${EXPECTED_PRINCIPLES.length} Weave principle skills validated`)
}
