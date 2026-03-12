import { describe, expect, it } from 'vitest'
import {
  buildApplicantListAggregationPipeline,
  buildInspectionReportListAggregationPipeline,
  buildLicenseListAggregationPipeline,
} from '../../server/src/infrastructure/database/aggregations'

describe('PMC aggregation pipelines', () => {
  it('builds the detailed applicant list pipeline with all lookup joins', () => {
    const pipeline = buildApplicantListAggregationPipeline({
      filter: { assignedGroup: 'LSO' },
      page: 2,
      limit: 10,
    })

    const facet = pipeline[2] as any
    const dataPipeline = facet.$facet.data

    expect(dataPipeline.some((stage: any) => stage.$lookup?.from === 'BusinessProfile')).toBe(true)
    expect(dataPipeline.some((stage: any) => stage.$lookup?.from === 'ApplicantDocument')).toBe(true)
    expect(dataPipeline.some((stage: any) => stage.$lookup?.from === 'ApplicantFee')).toBe(true)
    expect(dataPipeline.some((stage: any) => stage.$lookup?.from === 'District')).toBe(true)
    expect(dataPipeline.some((stage: any) => stage.$lookup?.from === 'Tehsil')).toBe(true)
  })

  it('builds the compact applicant list pipeline without heavy document/profile lookups', () => {
    const pipeline = buildApplicantListAggregationPipeline({
      filter: {},
      page: 1,
      limit: 20,
      compact: true,
    })

    const facet = pipeline[2] as any
    const dataPipeline = facet.$facet.data

    expect(dataPipeline.some((stage: any) => stage.$lookup?.from === 'ApplicationAssignment')).toBe(true)
    expect(dataPipeline.some((stage: any) => stage.$lookup?.from === 'ApplicantFee')).toBe(true)
    expect(dataPipeline.some((stage: any) => stage.$lookup?.from === 'BusinessProfile')).toBe(false)
    expect(dataPipeline.some((stage: any) => stage.$lookup?.from === 'ApplicantDocument')).toBe(false)
  })

  it('builds the inspection report list pipeline with district enrichment', () => {
    const pipeline = buildInspectionReportListAggregationPipeline({
      filter: { status: 'COMPLETED' },
      page: 1,
      limit: 25,
    })

    const facet = pipeline[2] as any
    const dataPipeline = facet.$facet.data

    expect(dataPipeline.some((stage: any) => stage.$lookup?.from === 'District')).toBe(true)
  })

  it('builds the license list pipeline with profile and location joins', () => {
    const pipeline = buildLicenseListAggregationPipeline({
      filter: {},
      page: 1,
      limit: 20,
    })

    const facet = pipeline[2] as any
    const dataPipeline = facet.$facet.data

    expect(dataPipeline.some((stage: any) => stage.$lookup?.from === 'BusinessProfile')).toBe(true)
    expect(dataPipeline.some((stage: any) => stage.$lookup?.from === 'District')).toBe(true)
    expect(dataPipeline.some((stage: any) => stage.$lookup?.from === 'Tehsil')).toBe(true)
  })
})
