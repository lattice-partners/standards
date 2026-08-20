import { describe, expect, it } from 'vitest'
import { GET } from './route'

describe('GET /api/health', () => {
  it('answers 200 with a liveness payload', async () => {
    const response = GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })

  it('leaks nothing beyond the status field', async () => {
    const body: unknown = await GET().json()

    expect(Object.keys(body as Record<string, unknown>)).toEqual(['status'])
  })
})
