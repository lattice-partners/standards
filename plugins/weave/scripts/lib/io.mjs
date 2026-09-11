import fs from 'node:fs'

export async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

export async function readStdinJson() {
  const raw = (await readStdin()).trim()
  if (!raw) throw new Error('empty stdin')
  return JSON.parse(raw)
}

export function writeJson(value) {
  process.stdout.write(JSON.stringify(value) + '\n')
}

export function note(message) {
  process.stderr.write(`${message}\n`)
}

export function fileExists(path) {
  try {
    return fs.existsSync(path)
  } catch {
    return false
  }
}

export function readText(path) {
  try {
    return fs.readFileSync(path, 'utf8')
  } catch {
    return null
  }
}
