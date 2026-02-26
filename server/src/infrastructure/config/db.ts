import mongoose from 'mongoose'
import { env } from './env'

export async function connectDb(): Promise<void> {
  // Keep legacy snake_case queries working across migrated collections.
  mongoose.set('strictQuery', false)
  await mongoose.connect(env.mongoUri)
}
