import { LicenseModel } from '../models/pmc/License'

type LicenseAggregationOptions = {
  filter?: Record<string, unknown>
  page: number
  limit: number
}

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

export function buildLicenseListAggregationPipeline({
  filter = {},
  page,
  limit,
}: LicenseAggregationOptions) {
  const skip = Math.max(0, (page - 1) * limit)

  return [
    { $match: filter },
    { $sort: { createdAt: -1, created_at: -1, dateOfIssue: -1, date_of_issue: -1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $addFields: {
              __applicantId: numericValueFromFields('applicantId', 'applicant_id'),
              __applicantIdString: stringValueFromFields('applicantId', 'applicant_id'),
            },
          },
          {
            $lookup: {
              from: 'BusinessProfile',
              let: {
                applicantId: '$__applicantId',
                applicantIdString: '$__applicantIdString',
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $or: [
                        { $eq: ['$applicantId', '$$applicantId'] },
                        { $eq: ['$applicant_id', '$$applicantId'] },
                        { $eq: ['$applicant_id', '$$applicantIdString'] },
                        { $eq: ['$applicantIdString', '$$applicantIdString'] },
                      ],
                    },
                  },
                },
                { $limit: 1 },
              ],
              as: 'businessProfileDocs',
            },
          },
          {
            $addFields: {
              businessProfileDoc: { $first: '$businessProfileDocs' },
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
          {
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
          },
          {
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
          },
          {
            $addFields: {
              districtDoc: { $first: '$districtDocs' },
              tehsilDoc: { $first: '$tehsilDocs' },
            },
          },
        ],
        metadata: [{ $count: 'total' }],
      },
    },
  ]
}

export async function aggregateLicenseList(options: LicenseAggregationOptions) {
  const [result] = await LicenseModel.aggregate(buildLicenseListAggregationPipeline(options) as any[]).allowDiskUse(true)
  return {
    data: Array.isArray(result?.data) ? result.data : [],
    total: Number(result?.metadata?.[0]?.total || 0),
  }
}
