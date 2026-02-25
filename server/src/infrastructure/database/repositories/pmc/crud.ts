import type { Model } from 'mongoose'

export type CrudRepository = {
  list(filter?: Record<string, unknown>): Promise<any[]>
  findById(id: string | number): Promise<any | null>
  create(payload: any): Promise<any>
  updateById(id: string | number, payload: any): Promise<any | null>
  deleteById(id: string | number): Promise<any | null>
}

function toSnakeCase(input: string) {
  return input.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`)
}

function toFiniteNumber(value: string | number) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function buildLegacyAwareFilter(filter: Record<string, unknown> = {}) {
  const clauses: Record<string, unknown>[] = []

  for (const [key, value] of Object.entries(filter)) {
    if (key.startsWith('$')) {
      clauses.push({ [key]: value })
      continue
    }

    if (key === 'numericId') {
      const numeric = toFiniteNumber(value as any)
      const asString = String(value)
      const orTerms: Record<string, unknown>[] = []
      if (numeric !== null) {
        orTerms.push({ numericId: numeric }, { numeric_id: numeric }, { id: numeric })
      }
      orTerms.push({ id: asString })
      clauses.push({ $or: orTerms })
      continue
    }

    const snakeKey = toSnakeCase(key)
    if (snakeKey !== key) {
      clauses.push({ $or: [{ [key]: value }, { [snakeKey]: value }] })
    } else {
      clauses.push({ [key]: value })
    }
  }

  if (!clauses.length) return {}
  if (clauses.length === 1) return clauses[0]
  return { $and: clauses }
}

export function createMongooseCrudRepository(model: Model<any>, idField: string = '_id'): CrudRepository {
  return {
    async list(filter: Record<string, unknown> = {}) {
      return model.find(buildLegacyAwareFilter(filter)).lean()
    },
    async findById(id: string | number) {
      if (idField === '_id') return model.findById(id).lean()
      if (idField === 'numericId') {
        const numeric = toFiniteNumber(id)
        const orTerms: Record<string, unknown>[] = [{ id: String(id) }]
        if (numeric !== null) {
          orTerms.unshift({ numericId: numeric }, { numeric_id: numeric }, { id: numeric })
        }
        return model.findOne({ $or: orTerms }).lean()
      }
      return model.findOne(buildLegacyAwareFilter({ [idField]: Number(id) })).lean()
    },
    async create(payload: any) {
      const doc = await model.create(payload)
      if (Array.isArray(doc)) return doc.map((d) => (d as any).toObject?.() ?? d)
      return (doc as any).toObject?.() ?? doc
    },
    async updateById(id: string | number, payload: any) {
      if (idField === '_id') return model.findByIdAndUpdate(id, payload, { new: true }).lean()
      if (idField === 'numericId') {
        const numeric = toFiniteNumber(id)
        const orTerms: Record<string, unknown>[] = [{ id: String(id) }]
        if (numeric !== null) {
          orTerms.unshift({ numericId: numeric }, { numeric_id: numeric }, { id: numeric })
        }
        return model.findOneAndUpdate({ $or: orTerms }, payload, { new: true }).lean()
      }
      return model.findOneAndUpdate(buildLegacyAwareFilter({ [idField]: Number(id) }), payload, { new: true }).lean()
    },
    async deleteById(id: string | number) {
      if (idField === '_id') return model.findByIdAndDelete(id).lean()
      if (idField === 'numericId') {
        const numeric = toFiniteNumber(id)
        const orTerms: Record<string, unknown>[] = [{ id: String(id) }]
        if (numeric !== null) {
          orTerms.unshift({ numericId: numeric }, { numeric_id: numeric }, { id: numeric })
        }
        return model.findOneAndDelete({ $or: orTerms }).lean()
      }
      return model.findOneAndDelete(buildLegacyAwareFilter({ [idField]: Number(id) })).lean()
    },
  }
}
