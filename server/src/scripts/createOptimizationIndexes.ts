/**
 * Week 3: Create Database Optimization Indexes
 * Run: npx ts-node src/scripts/createOptimizationIndexes.ts
 */

import mongoose from 'mongoose'
import { env } from '../infrastructure/config/env'
import { ApplicantDetailModel } from '../infrastructure/database/models/pmc/ApplicantDetail'
import { ApplicantDocumentModel } from '../infrastructure/database/models/pmc/ApplicantDocument'
import { BusinessProfileModel } from '../infrastructure/database/models/pmc/BusinessProfile'
import { DistrictModel } from '../infrastructure/database/models/pmc/District'
import { ApplicationAssignmentModel } from '../infrastructure/database/models/pmc/ApplicationAssignment'

async function createIndexes() {
  console.log('\n🔧 Creating Optimization Indexes...\n')

  try {
    await mongoose.connect(env.mongoUri)
    console.log('✅ Connected to MongoDB\n')

    console.log('📍 Creating ApplicantDetail indexes...')
    // Composite index for district filtering + sorting
    await ApplicantDetailModel.collection.createIndex({
      districtId: 1,
      applicationStatus: 1,
      createdAt: -1,
    })
    console.log('   ✓ (districtId, status, createdAt)')

    // Index for tracking number lookup
    await ApplicantDetailModel.collection.createIndex({
      trackingNumber: 1,
    })
    console.log('   ✓ (trackingNumber)')

    // Index for pagination + filtering
    await ApplicantDetailModel.collection.createIndex({
      numericId: 1,
      applicationStatus: 1,
    })
    console.log('   ✓ (numericId, status)')

    // Index for creator + status filtering
    await ApplicantDetailModel.collection.createIndex({
      createdBy: 1,
      applicationStatus: 1,
      createdAt: -1,
    })
    console.log('   ✓ (createdBy, status, createdAt)')

    console.log('\n📍 Creating ApplicantDocument indexes...')
    // Document queries by applicant + type + date
    await ApplicantDocumentModel.collection.createIndex({
      applicantId: 1,
      documentDescription: 1,
      createdAt: -1,
    })
    console.log('   ✓ (applicantId, type, createdAt)')

    console.log('\n📍 Creating BusinessProfile indexes...')
    // District filtering for profiles
    await BusinessProfileModel.collection.createIndex({
      districtId: 1,
      createdAt: -1,
    })
    console.log('   ✓ (districtId, createdAt)')

    // Applicant lookup
    await BusinessProfileModel.collection.createIndex({
      applicantId: 1,
    })
    console.log('   ✓ (applicantId)')

    console.log('\n📍 Creating District indexes...')
    // District lookup and filtering
    await DistrictModel.collection.createIndex({
      districtId: 1,
    })
    console.log('   ✓ (districtId)')

    await DistrictModel.collection.createIndex({
      districtName: 1,
    })
    console.log('   ✓ (districtName)')

    console.log('\n📍 Creating ApplicationAssignment indexes...')
    // Assignment lookups
    await ApplicationAssignmentModel.collection.createIndex({
      applicantId: 1,
      createdAt: -1,
    })
    console.log('   ✓ (applicantId, createdAt)')

    await ApplicationAssignmentModel.collection.createIndex({
      assignedGroup: 1,
      applicantId: 1,
    })
    console.log('   ✓ (assignedGroup, applicantId)')

    console.log('\n✅ All optimization indexes created successfully!\n')

    // Display index statistics
    console.log('📊 Index Summary:')
    console.log('─'.repeat(60))

    const indexStats = await Promise.all([
      ApplicantDetailModel.collection.listIndexes().toArray(),
      ApplicantDocumentModel.collection.listIndexes().toArray(),
      BusinessProfileModel.collection.listIndexes().toArray(),
      DistrictModel.collection.listIndexes().toArray(),
      ApplicationAssignmentModel.collection.listIndexes().toArray(),
    ])

    console.log(`ApplicantDetail indexes: ${indexStats[0].length}`)
    console.log(`ApplicantDocument indexes: ${indexStats[1].length}`)
    console.log(`BusinessProfile indexes: ${indexStats[2].length}`)
    console.log(`District indexes: ${indexStats[3].length}`)
    console.log(`ApplicationAssignment indexes: ${indexStats[4].length}`)
    console.log(`Total indexes created: ${indexStats.reduce((a: any, b: any) => a + b.length, 0)}\n`)
  } catch (error) {
    console.error('❌ Error creating indexes:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('✅ Disconnected from MongoDB\n')
  }
}

createIndexes()
