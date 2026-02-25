import mongoose, { Schema, type Document } from 'mongoose'

export interface CounterDocument extends Document {
  name: string
  seq: number
}

const CounterSchema = new Schema<CounterDocument>({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
})

export const CounterModel = mongoose.model<CounterDocument>('Counter', CounterSchema, 'Counter')

export async function getNextSequence(name: string): Promise<number> {
  const counter = await CounterModel.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )
  return counter.seq
}
