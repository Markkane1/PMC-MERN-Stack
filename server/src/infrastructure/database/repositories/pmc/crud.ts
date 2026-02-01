import type { Model } from 'mongoose'

export type CrudRepository = {
  list(filter?: Record<string, unknown>): Promise<any[]>
  findById(id: string | number): Promise<any | null>
  create(payload: any): Promise<any>
  updateById(id: string | number, payload: any): Promise<any | null>
  deleteById(id: string | number): Promise<any | null>
}

export function createMongooseCrudRepository(model: Model<any>, idField: string = '_id'): CrudRepository {
  return {
    async list(filter: Record<string, unknown> = {}) {
      return model.find(filter).lean()
    },
    async findById(id: string | number) {
      if (idField === '_id') return model.findById(id).lean()
      return model.findOne({ [idField]: Number(id) }).lean()
    },
    async create(payload: any) {
      const doc = await model.create(payload)
      if (Array.isArray(doc)) return doc.map((d) => (d as any).toObject?.() ?? d)
      return (doc as any).toObject?.() ?? doc
    },
    async updateById(id: string | number, payload: any) {
      if (idField === '_id') return model.findByIdAndUpdate(id, payload, { new: true }).lean()
      return model.findOneAndUpdate({ [idField]: Number(id) }, payload, { new: true }).lean()
    },
    async deleteById(id: string | number) {
      if (idField === '_id') return model.findByIdAndDelete(id).lean()
      return model.findOneAndDelete({ [idField]: Number(id) }).lean()
    },
  }
}
