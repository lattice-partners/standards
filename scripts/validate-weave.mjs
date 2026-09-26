#!/usr/bin/env node
// Offline Weave plugin validation: Cursor schemas, versions, frontmatter,
// discovered names, and command structure.

import fs from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { checkPrinciples, EXPECTED_PRINCIPLES } from './build-weave.mjs'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const PLUGIN_ROOT = join(ROOT, 'plugins/weave')
const EXPECTED_SKILLS = [
  ...EXPECTED_PRINCIPLES,
  'lattice-design',
  'utility-ui-options-toggle',
  'lattice-stack',
]
const EXPECTED_COMMANDS = [
  'review-weave',
  'setup-weave',
  'utility-weave-improvements',
]
const COMMAND_SECTIONS = ['Preflight', 'Plan', 'Commands', 'Verification', 'Summary']
const TEMPLATE_SECTIONS = ['Configuration', 'Approved exceptions and notes']
const EXPECTED_RULES = ['engineering-process.mdc']

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'))
}

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function listDirs(path) {
  return fs
    .readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

function listFiles(path, ext) {
  return fs
    .readdirSync(path)
    .filter((name) => name.endsWith(ext))
    .sort()
}

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

function sameNames(actual, expected) {
  return [...actual].sort().join() === [...expected].sort().join()
}

function heading(markdown, title) {
  return new RegExp(`^## ${title}\\s*$`, 'm').test(markdown)
}

export function validateWeave() {
  const problems = []
  const fail = (message) => problems.push(message)

  const version = read(join(ROOT, 'VERSION')).trim()
  const pkg = readJson(join(ROOT, 'package.json'))
  const plugin = readJson(join(PLUGIN_ROOT, '.cursor-plugin/plugin.json'))
  const marketplace = readJson(join(ROOT, '.cursor-plugin/marketplace.json'))

  if (pkg.version !== version) fail(`package.json version ${pkg.version} != VERSION ${version}`)
  if (plugin.version !== version) fail(`plugin.json version ${plugin.version} != VERSION ${version}`)
  if (plugin.$schema) fail('plugin.json must not include $schema')
  if (plugin.name !== 'weave') fail('plugin.json name must be weave')
  if (!plugin.logo || !fs.existsSync(join(PLUGIN_ROOT, plugin.logo))) {
    fail(`missing plugin logo ${plugin.logo}`)
  }

  const ajv = new Ajv({ allErrors: true, strict: false })
  addFormats(ajv)
  const pluginSchema = readJson(join(ROOT, 'scripts/schemas/plugin.schema.json'))
  const marketplaceSchema = readJson(join(ROOT, 'scripts/schemas/marketplace.schema.json'))
  const validatePlugin = ajv.compile(pluginSchema)
  const validateMarketplace = ajv.compile(marketplaceSchema)
  if (!validatePlugin(plugin)) {
    fail(`plugin.json schema: ${ajv.errorsText(validatePlugin.errors)}`)
  }
  if (!validateMarketplace(marketplace)) {
    fail(`marketplace.json schema: ${ajv.errorsText(validateMarketplace.errors)}`)
  }
  if (marketplace.plugins?.[0]?.name !== 'weave') fail('marketplace plugin name must be weave')
  if (marketplace.plugins?.[0]?.source !== './plugins/weave') {
    fail('marketplace source must be ./plugins/weave')
  }

  for (const key of ['skills', 'commands', 'rules']) {
    const rel = plugin[key]
    if (!rel || !fs.existsSync(join(PLUGIN_ROOT, rel))) fail(`plugin.json ${key} path missing`)
  }
  const rules = listFiles(join(PLUGIN_ROOT, 'rules'), '.mdc')
  if (!sameNames(rules, EXPECTED_RULES)) fail(`rules mismatch: ${rules.join(', ')}`)
  for (const file of rules) {
    const fm = frontmatter(read(join(PLUGIN_ROOT, 'rules', file)))
    if (!fm.description) fail(`${file} missing description`)
    if (fm.alwaysApply !== 'true') fail(`${file} must set alwaysApply: true`)
  }

  if (!fs.existsSync(join(PLUGIN_ROOT, 'templates/weave.md'))) {
    fail('missing templates/weave.md')
  } else {
    const template = read(join(PLUGIN_ROOT, 'templates/weave.md'))
    for (const section of TEMPLATE_SECTIONS) {
      if (!heading(template, section)) fail(`weave.md template missing ## ${section}`)
    }
  }

  const skills = listDirs(join(PLUGIN_ROOT, 'skills'))
  if (!sameNames(skills, EXPECTED_SKILLS)) {
    fail(`skills mismatch: ${skills.join(', ')}`)
  }
  for (const name of skills) {
    const path = join(PLUGIN_ROOT, 'skills', name, 'SKILL.md')
    if (!fs.existsSync(path)) {
      fail(`missing ${name}/SKILL.md`)
      continue
    }
    const fm = frontmatter(read(path))
    if (fm.name !== name) fail(`${name} skill name frontmatter is ${fm.name}`)
    if (!fm.description) fail(`${name} skill missing description`)
    if ('alwaysApply' in fm) fail(`${name} skill has unsupported alwaysApply`)
  }

  const commands = listFiles(join(PLUGIN_ROOT, 'commands'), '.md').filter(
    (name) => !name.startsWith('_'),
  )
  const commandNames = commands.map((name) => name.replace(/\.md$/, ''))
  if (!sameNames(commandNames, EXPECTED_COMMANDS)) {
    fail(`commands mismatch: ${commandNames.join(', ')}`)
  }
  for (const file of commands) {
    const markdown = read(join(PLUGIN_ROOT, 'commands', file))
    const fm = frontmatter(markdown)
    if (!fm.description) fail(`${file} missing description`)
    for (const section of COMMAND_SECTIONS) {
      if (!heading(markdown, section)) fail(`${file} missing ## ${section}`)
    }
  }

  for (const problem of checkPrinciples()) fail(problem)

  return problems
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href

if (isMain) {
  const problems = validateWeave()
  if (problems.length) {
    for (const problem of problems) console.error(problem)
    process.exit(1)
  }
  console.error('ok: Weave plugin validated')
}
