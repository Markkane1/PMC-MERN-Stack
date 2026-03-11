import { parentPort, workerData } from 'worker_threads'
import { generatePdfArtifact, type PdfJobType, type PdfJobPayloadMap } from '../PdfGenerationRuntime'

async function main() {
  const { type, data } = workerData as {
    type: PdfJobType
    data: PdfJobPayloadMap[PdfJobType]
  }

  try {
    const artifact = await generatePdfArtifact(type, data)

    parentPort?.postMessage({
      ok: true,
      artifact: {
        bufferBase64: artifact.buffer.toString('base64'),
        filename: artifact.filename,
        mimeType: artifact.mimeType,
        size: artifact.size,
        generatedAt: artifact.generatedAt.toISOString(),
      },
    })
  } catch (error) {
    parentPort?.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown PDF worker error',
    })
  }
}

void main()
