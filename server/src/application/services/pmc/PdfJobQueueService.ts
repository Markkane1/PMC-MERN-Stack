import path from 'path'
import { randomUUID } from 'crypto'
import { Worker } from 'worker_threads'
import {
  generateSynchronouslyIfSmall,
  type PdfArtifact,
  type PdfJobPayloadMap,
  type PdfJobType,
} from './PdfGenerationRuntime'

export type PdfJobStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface PdfJobSnapshot {
  jobId: string
  type: PdfJobType
  status: PdfJobStatus
  createdAt: string
  updatedAt: string
  filename?: string
  mimeType?: string
  size?: number
  generatedAt?: string
  error?: string
}

type PdfJobRecord = {
  jobId: string
  type: PdfJobType
  data: PdfJobPayloadMap[PdfJobType]
  requesterKeys: string[]
  status: PdfJobStatus
  createdAt: Date
  updatedAt: Date
  artifact?: PdfArtifact
  error?: string
}

type WorkerRunner = <T extends PdfJobType>(
  type: T,
  data: PdfJobPayloadMap[T]
) => Promise<PdfArtifact>

type GenerateOrQueueResult =
  | { mode: 'inline'; artifact: PdfArtifact }
  | { mode: 'queued'; job: PdfJobSnapshot }

function normalizeRequesterKeys(keys: string | string[]) {
  return Array.from(new Set((Array.isArray(keys) ? keys : [keys]).filter(Boolean)))
}

const DEFAULT_RETENTION_MS = 15 * 60 * 1000
const PDF_JOB_ROUTE_PREFIX = '/api/pmc/pdf'

function buildWorkerPath() {
  const workerExtension = __filename.endsWith('.ts') ? 'ts' : 'js'
  return path.resolve(__dirname, 'workers', `pdf.worker.${workerExtension}`)
}

const defaultWorkerRunner: WorkerRunner = (type, data) =>
  new Promise((resolve, reject) => {
    const isTsRuntime = __filename.endsWith('.ts')
    const worker = new Worker(buildWorkerPath(), {
      workerData: { type, data },
      execArgv: isTsRuntime ? ['--require', 'tsx/cjs'] : undefined,
    })

    let settled = false

    worker.once('message', (message: any) => {
      settled = true

      if (!message?.ok) {
        reject(new Error(message?.error || 'Unknown PDF worker error'))
        return
      }

      resolve({
        buffer: Buffer.from(message.artifact.bufferBase64, 'base64'),
        filename: message.artifact.filename,
        mimeType: message.artifact.mimeType,
        size: Number(message.artifact.size),
        generatedAt: new Date(message.artifact.generatedAt),
      })
    })

    worker.once('error', (error) => {
      settled = true
      reject(error)
    })

    worker.once('exit', (code) => {
      if (!settled && code !== 0) {
        reject(new Error(`PDF worker exited with code ${code}`))
      }
    })
  })

export class PdfJobQueueService {
  private readonly jobs = new Map<string, PdfJobRecord>()
  private readonly pending: string[] = []
  private activeCount = 0

  constructor(
    private readonly workerRunner: WorkerRunner = defaultWorkerRunner,
    private readonly maxConcurrency = 2,
    private readonly retentionMs = DEFAULT_RETENTION_MS
  ) {}

  async generateOrQueue<T extends PdfJobType>(
    type: T,
    data: PdfJobPayloadMap[T],
    requesterKeys: string | string[]
  ): Promise<GenerateOrQueueResult> {
    this.pruneExpiredJobs()

    const inlineArtifact = await generateSynchronouslyIfSmall(type, data)
    if (inlineArtifact) {
      return { mode: 'inline', artifact: inlineArtifact }
    }

    const jobId = randomUUID()
    const now = new Date()
    const record: PdfJobRecord = {
      jobId,
      type,
      data: data as PdfJobPayloadMap[PdfJobType],
      requesterKeys: normalizeRequesterKeys(requesterKeys),
      status: 'queued',
      createdAt: now,
      updatedAt: now,
    }

    this.jobs.set(jobId, record)
    this.pending.push(jobId)
    this.processQueue()

    return {
      mode: 'queued',
      job: this.toSnapshot(record),
    }
  }

  getJob(jobId: string, requesterKeys: string | string[]): PdfJobRecord | null {
    this.pruneExpiredJobs()
    const job = this.jobs.get(jobId)
    const normalizedRequesterKeys = normalizeRequesterKeys(requesterKeys)

    if (
      !job ||
      normalizedRequesterKeys.length === 0 ||
      !normalizedRequesterKeys.some((key) => job.requesterKeys.includes(key))
    ) {
      return null
    }
    return job
  }

  getJobSnapshot(jobId: string, requesterKeys: string | string[]): PdfJobSnapshot | null {
    const job = this.getJob(jobId, requesterKeys)
    return job ? this.toSnapshot(job) : null
  }

  buildPollUrl(jobId: string) {
    return `${PDF_JOB_ROUTE_PREFIX}/${jobId}`
  }

  private processQueue() {
    while (this.activeCount < this.maxConcurrency && this.pending.length > 0) {
      const jobId = this.pending.shift()
      if (!jobId) {
        return
      }

      const job = this.jobs.get(jobId)
      if (!job || job.status !== 'queued') {
        continue
      }

      this.activeCount += 1
      job.status = 'processing'
      job.updatedAt = new Date()

      void this.workerRunner(job.type, job.data as never)
        .then((artifact) => {
          job.status = 'completed'
          job.updatedAt = new Date()
          job.artifact = artifact
        })
        .catch((error) => {
          job.status = 'failed'
          job.updatedAt = new Date()
          job.error = error instanceof Error ? error.message : 'Unknown PDF generation error'
        })
        .finally(() => {
          this.activeCount = Math.max(0, this.activeCount - 1)
          this.processQueue()
        })
    }
  }

  private toSnapshot(job: PdfJobRecord): PdfJobSnapshot {
    return {
      jobId: job.jobId,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      filename: job.artifact?.filename,
      mimeType: job.artifact?.mimeType,
      size: job.artifact?.size,
      generatedAt: job.artifact?.generatedAt.toISOString(),
      error: job.error,
    }
  }

  private pruneExpiredJobs() {
    const cutoff = Date.now() - this.retentionMs
    for (const [jobId, job] of this.jobs.entries()) {
      const isTerminal = job.status === 'completed' || job.status === 'failed'
      if (isTerminal && job.updatedAt.getTime() < cutoff) {
        this.jobs.delete(jobId)
      }
    }
  }
}

export function buildPdfJobAcceptedResponse(job: PdfJobSnapshot) {
  return {
    success: true,
    jobId: job.jobId,
    status: job.status,
    pollUrl: `${PDF_JOB_ROUTE_PREFIX}/${job.jobId}`,
  }
}

export const pdfJobQueueService = new PdfJobQueueService()
