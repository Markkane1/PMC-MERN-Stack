import mongoose, { Schema, type Document } from 'mongoose'

export interface SingleUsePlasticsSnapshotDocument extends Document {
  plasticItems: string[]
}

const SingleUsePlasticsSnapshotSchema = new Schema<SingleUsePlasticsSnapshotDocument>(
  {
    plasticItems: { type: [String], default: [] },
  },
  { timestamps: true }
)

export const SingleUsePlasticsSnapshotModel = mongoose.model<SingleUsePlasticsSnapshotDocument>(
  'SingleUsePlasticsSnapshot',
  SingleUsePlasticsSnapshotSchema
, 'singleuseplasticssnapshots')
