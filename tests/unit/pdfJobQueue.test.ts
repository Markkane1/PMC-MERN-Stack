import { describe, expect, it, vi } from 'vitest'
import { PdfJobQueueService } from '../../server/src/application/services/pmc/PdfJobQueueService'
import type { PdfArtifact } from '../../server/src/application/services/pmc/PdfGenerationRuntime'

const sampleChalanData = {
  chalanNumber: 'CHN-TEST-001',
  applicantId: '101',
  applicantName: 'Queue Test',
  amountDue: 1500,
  dueDate: new Date('2099-01-01T00:00:00.000Z'),
  description: 'Queue test',
}

function createArtifact(filename: string): PdfArtifact {
  return {
    buffer: Buffer.from(`${filename}-buffer`),
    filename,
    mimeType: 'application/pdf',
    size: 1024,
    generatedAt: new Date('2026-03-11T00:00:00.000Z'),
  }
}

describe('PdfJobQueueService', () => {
  it('limits queued worker execution to max concurrency of 2', async () => {
    let active = 0
    let maxActive = 0
    const resolvers: Array<() => void> = []

    const runner = vi.fn((_type, _data) => {
      active += 1
      maxActive = Math.max(maxActive, active)

      return new Promise<PdfArtifact>((resolve) => {
        resolvers.push(() => {
          active -= 1
          resolve(createArtifact(`job-${resolvers.length}.pdf`))
        })
      })
    })

    const service = new PdfJobQueueService(runner as any, 2, 60_000)

    const [first, second, third] = await Promise.all([
      service.generateOrQueue('chalan', sampleChalanData, 'user:test'),
      service.generateOrQueue('chalan', { ...sampleChalanData, chalanNumber: 'CHN-TEST-002' }, 'user:test'),
      service.generateOrQueue('chalan', { ...sampleChalanData, chalanNumber: 'CHN-TEST-003' }, 'user:test'),
    ])

    expect(first.mode).toBe('queued')
    expect(second.mode).toBe('queued')
    expect(third.mode).toBe('queued')
    expect(runner).toHaveBeenCalledTimes(2)
    expect(maxActive).toBe(2)

    resolvers.shift()?.()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(runner).toHaveBeenCalledTimes(3)
    expect(maxActive).toBe(2)

    resolvers.splice(0).forEach((release) => release())
    await new Promise((resolve) => setTimeout(resolve, 0))

    const firstJobId = (first as any).job.jobId as string
    const snapshot = service.getJobSnapshot(firstJobId, 'user:test')
    expect(snapshot?.status).toBe('completed')
  })
})
