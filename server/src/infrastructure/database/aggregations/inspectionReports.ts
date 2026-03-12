import { InspectionReportModel } from '../models/pmc/InspectionReport'

type InspectionReportAggregationOptions = {
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

export function buildInspectionReportListAggregationPipeline({
  filter = {},
  page,
  limit,
}: InspectionReportAggregationOptions) {
  const skip = Math.max(0, (page - 1) * limit)

  return [
    { $match: filter },
    { $sort: { inspectionDate: -1, inspection_date: -1, createdAt: -1, created_at: -1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $addFields: {
              __districtId: numericValueFromFields('districtId', 'district_id'),
              __districtIdString: stringValueFromFields('districtId', 'district_id'),
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
            $addFields: {
              districtDoc: { $first: '$districtDocs' },
              districtName: {
                $ifNull: [{ $first: '$districtDocs.districtName' }, { $first: '$districtDocs.district_name' }],
              },
            },
          },
        ],
        metadata: [{ $count: 'total' }],
      },
    },
  ]
}

export async function aggregateInspectionReportList(options: InspectionReportAggregationOptions) {
  const [result] = await InspectionReportModel.aggregate(
    buildInspectionReportListAggregationPipeline(options) as any[]
  ).allowDiskUse(true)
  return {
    data: Array.isArray(result?.data) ? result.data : [],
    total: Number(result?.metadata?.[0]?.total || 0),
  }
}
