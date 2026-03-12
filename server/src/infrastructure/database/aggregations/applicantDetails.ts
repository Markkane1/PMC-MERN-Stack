import { ApplicantDetailModel } from '../models/pmc/ApplicantDetail'

type ApplicantAggregationOptions = {
  filter?: Record<string, unknown>
  page: number
  limit: number
  sort?: Record<string, 1 | -1>
  compact?: boolean
}

const DEFAULT_SORT = {
  createdAt: -1,
  created_at: -1,
  numericId: -1,
  numeric_id: -1,
} as const

function coalesceExpressions(expressions: any[]) {
  return expressions.reduceRight((fallback, expression) => ({ $ifNull: [expression, fallback] }), null)
}

function valueFromFields(...fields: string[]) {
  return coalesceExpressions(fields.map((field) => `$${field}`))
}

function numericValueFromFields(...fields: string[]) {
  return {
    $convert: {
      input: valueFromFields(...fields),
      to: 'long',
      onError: null,
      onNull: null,
    },
  }
}

function stringValueFromFields(...fields: string[]) {
  return {
    $let: {
      vars: {
        raw: valueFromFields(...fields),
      },
      in: {
        $cond: [{ $eq: ['$$raw', null] }, null, { $toString: '$$raw' }],
      },
    },
  }
}

function buildApplicantRelationLookup(
  from: string,
  as: string,
  options: {
    limit?: number
    sort?: Record<string, 1 | -1>
    extraMatch?: Record<string, unknown>
  } = {}
) {
  const pipeline: any[] = [
    {
      $match: {
        $expr: {
          $or: [
            { $eq: ['$applicantId', '$$applicantNumericId'] },
            { $eq: ['$applicant_id', '$$applicantNumericId'] },
            { $eq: ['$applicant_id', '$$applicantStringId'] },
            { $eq: ['$applicantIdString', '$$applicantStringId'] },
          ],
        },
      },
    },
  ]

  if (options.extraMatch) {
    pipeline.push({ $match: options.extraMatch })
  }

  if (options.sort) {
    pipeline.push({ $sort: options.sort })
  }

  if (options.limit) {
    pipeline.push({ $limit: options.limit })
  }

  return {
    $lookup: {
      from,
      let: {
        applicantNumericId: '$__applicantNumericId',
        applicantStringId: '$__applicantStringId',
      },
      pipeline,
      as,
    },
  }
}

function buildDistrictLookup() {
  return {
    $lookup: {
      from: 'District',
      let: {
        districtId: '$__districtId',
        districtIdString: '$__districtIdString',
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $or: [
                { $eq: ['$districtId', '$$districtId'] },
                { $eq: ['$district_id', '$$districtId'] },
                { $eq: ['$district_id', '$$districtIdString'] },
              ],
            },
          },
        },
        { $limit: 1 },
      ],
      as: 'districtDocs',
    },
  }
}

function buildTehsilLookup() {
  return {
    $lookup: {
      from: 'Tehsil',
      let: {
        tehsilId: '$__tehsilId',
        tehsilIdString: '$__tehsilIdString',
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $or: [
                { $eq: ['$tehsilId', '$$tehsilId'] },
                { $eq: ['$tehsil_id', '$$tehsilId'] },
                { $eq: ['$tehsil_id', '$$tehsilIdString'] },
              ],
            },
          },
        },
        { $limit: 1 },
      ],
      as: 'tehsilDocs',
    },
  }
}

export function buildApplicantListAggregationPipeline({
  filter = {},
  page,
  limit,
  sort = DEFAULT_SORT,
  compact = false,
}: ApplicantAggregationOptions) {
  const skip = Math.max(0, (page - 1) * limit)

  const dataPipeline: any[] = [
    { $skip: skip },
    { $limit: limit },
    {
      $addFields: {
        __applicantNumericId: numericValueFromFields('numericId', 'numeric_id', 'id'),
        __applicantStringId: stringValueFromFields('numericId', 'numeric_id', 'id'),
      },
    },
    buildApplicantRelationLookup('ApplicationAssignment', 'assignmentDocs', {
      sort: { createdAt: -1, created_at: -1 },
    }),
    buildApplicantRelationLookup('ApplicationSubmitted', 'submittedDocs', {
      sort: { createdAt: -1, created_at: -1 },
      limit: 1,
    }),
    buildApplicantRelationLookup('ApplicantFee', 'feeDocs', {
      sort: { createdAt: -1, created_at: -1 },
    }),
  ]

  if (!compact) {
    dataPipeline.push(
      buildApplicantRelationLookup('BusinessProfile', 'businessProfileDocs', { limit: 1 }),
      buildApplicantRelationLookup('ApplicantDocument', 'documentDocs'),
      buildApplicantRelationLookup('ApplicantFieldResponse', 'fieldResponseDocs'),
      buildApplicantRelationLookup('ApplicantManualFields', 'manualFieldDocs', { limit: 1 }),
      buildApplicantRelationLookup('PSIDTracking', 'psidTrackingDocs', {
        extraMatch: {
          $or: [{ paymentStatus: 'PAID' }, { payment_status: 'PAID' }],
        },
      }),
      buildApplicantRelationLookup('Producer', 'producerDocs', { limit: 1 }),
      buildApplicantRelationLookup('Consumer', 'consumerDocs', { limit: 1 }),
      buildApplicantRelationLookup('Collector', 'collectorDocs', { limit: 1 }),
      buildApplicantRelationLookup('Recycler', 'recyclerDocs', { limit: 1 }),
      {
        $addFields: {
          businessProfileDoc: { $first: '$businessProfileDocs' },
          producerDoc: { $first: '$producerDocs' },
          consumerDoc: { $first: '$consumerDocs' },
          collectorDoc: { $first: '$collectorDocs' },
          recyclerDoc: { $first: '$recyclerDocs' },
          manualFieldDoc: { $first: '$manualFieldDocs' },
          submittedDoc: { $first: '$submittedDocs' },
        },
      },
      {
        $addFields: {
          __districtId: numericValueFromFields('businessProfileDoc.districtId', 'businessProfileDoc.district_id'),
          __districtIdString: stringValueFromFields('businessProfileDoc.districtId', 'businessProfileDoc.district_id'),
          __tehsilId: numericValueFromFields('businessProfileDoc.tehsilId', 'businessProfileDoc.tehsil_id'),
          __tehsilIdString: stringValueFromFields('businessProfileDoc.tehsilId', 'businessProfileDoc.tehsil_id'),
        },
      },
      buildDistrictLookup(),
      buildTehsilLookup(),
      {
        $addFields: {
          districtDoc: { $first: '$districtDocs' },
          tehsilDoc: { $first: '$tehsilDocs' },
        },
      },
    )
  } else {
    dataPipeline.push({
      $addFields: {
        submittedDoc: { $first: '$submittedDocs' },
      },
    })
  }

  return [
    { $match: filter },
    { $sort: sort },
    {
      $facet: {
        data: dataPipeline,
        metadata: [{ $count: 'total' }],
      },
    },
  ]
}

export async function aggregateApplicantListDetails(options: ApplicantAggregationOptions) {
  const [result] = await ApplicantDetailModel.aggregate(buildApplicantListAggregationPipeline(options)).allowDiskUse(true)
  return {
    data: Array.isArray(result?.data) ? result.data : [],
    total: Number(result?.metadata?.[0]?.total || 0),
  }
}
