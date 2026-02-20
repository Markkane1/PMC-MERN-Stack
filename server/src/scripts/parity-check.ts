#!/usr/bin/env node
/**
 * PHASE 5A: Endpoint Parity Checker
 * Compares Django pmc_api/urls.py router definitions with Express pmc.routes.ts
 * Reports missing endpoints and incompatible definitions
 */

import fs from 'fs'
import path from 'path'

interface DjangoEndpoint {
  path: string
  methods: string[]
  view: string
}

interface ExpressRoute {
  path: string
  method: string
  handler: string
}

// Hardcoded Django endpoints (extracted from pmc_api/urls.py pattern)
const DJANGO_ENDPOINTS: DjangoEndpoint[] = [
  // Core Applicant
  { path: 'applicant-detail/', methods: ['GET', 'POST', 'PATCH', 'DELETE'], view: 'ApplicantDetailViewSet' },
  { path: 'applicant-detail/:id/', methods: ['GET', 'PATCH', 'DELETE'], view: 'ApplicantDetail.retrieve/update/destroy' },

  // Business Profiles
  { path: 'business-profiles/', methods: ['GET', 'POST'], view: 'BusinessProfileViewSet' },
  { path: 'business-profiles/:id/', methods: ['GET', 'PATCH', 'DELETE'], view: 'BusinessProfile.retrieve/update/destroy' },
  { path: 'business-profiles/by_applicant/', methods: ['GET'], view: 'BusinessProfile.by_applicant' },

  // Resources
  { path: 'plastic-items/', methods: ['GET', 'POST'], view: 'PlasticItemViewSet' },
  { path: 'plastic-items/:id/', methods: ['GET', 'PATCH', 'DELETE'], view: 'PlasticItem.retrieve/update/destroy' },
  { path: 'products/', methods: ['GET', 'POST'], view: 'ProductViewSet' },
  { path: 'products/:id/', methods: ['GET', 'PATCH', 'DELETE'], view: 'Product.retrieve/update/destroy' },
  { path: 'by-products/', methods: ['GET', 'POST'], view: 'ByProductViewSet' },
  { path: 'by-products/:id/', methods: ['GET', 'PATCH', 'DELETE'], view: 'ByProduct.retrieve/update/destroy' },
  { path: 'raw-materials/', methods: ['GET', 'POST'], view: 'RawMaterialViewSet' },
  { path: 'raw-materials/:id/', methods: ['GET', 'PATCH', 'DELETE'], view: 'RawMaterial.retrieve/update/destroy' },

  // Producers/Consumers/Collectors/Recyclers (Upsert)
  { path: 'producers/', methods: ['GET', 'POST'], view: 'ProducerViewSet' },
  { path: 'producers/:id/', methods: ['GET', 'PATCH', 'DELETE'], view: 'Producer.retrieve/update/destroy' },
  { path: 'consumers/', methods: ['GET', 'POST'], view: 'ConsumerViewSet' },
  { path: 'consumers/:id/', methods: ['GET', 'PATCH', 'DELETE'], view: 'Consumer.retrieve/update/destroy' },
  { path: 'collectors/', methods: ['GET', 'POST'], view: 'CollectorViewSet' },
  { path: 'collectors/:id/', methods: ['GET', 'PATCH', 'DELETE'], view: 'Collector.retrieve/update/destroy' },
  { path: 'recyclers/', methods: ['GET', 'POST'], view: 'RecyclerViewSet' },
  { path: 'recyclers/:id/', methods: ['GET', 'PATCH', 'DELETE'], view: 'Recycler.retrieve/update/destroy' },

  // Documents
  { path: 'applicant-documents/', methods: ['GET', 'POST'], view: 'ApplicantDocumentViewSet' },
  { path: 'applicant-documents/:id/', methods: ['GET', 'PATCH', 'DELETE'], view: 'ApplicantDocument.retrieve/update/destroy' },
  { path: 'district-documents/', methods: ['GET', 'POST'], view: 'DistrictDocumentViewSet' },
  { path: 'district-documents/:id/', methods: ['GET', 'PATCH', 'DELETE'], view: 'DistrictDocument.retrieve/update/destroy' },

  // Field Responses
  { path: 'field-responses/', methods: ['GET', 'POST'], view: 'ApplicantFieldResponseViewSet' },
  { path: 'field-responses/:id/', methods: ['GET', 'PATCH', 'DELETE'], view: 'FieldResponse.retrieve/update/destroy' },
  { path: 'manual-fields/', methods: ['GET', 'POST', 'PATCH'], view: 'ApplicantManualFieldsViewSet' },
  { path: 'manual-fields/:id/', methods: ['GET', 'PATCH', 'DELETE'], view: 'ManualFields.retrieve/update/destroy' },

  // Assignments
  { path: 'application-assignment/', methods: ['GET', 'POST'], view: 'ApplicationAssignmentViewSet' },
  { path: 'application-assignment/:id/', methods: ['GET', 'PATCH', 'DELETE'], view: 'Assignment.retrieve/update/destroy' },
  { path: 'application-assignment/by_applicant/', methods: ['GET'], view: 'Assignment.by_applicant' },

  // Inspection Reports
  { path: 'inspection-report/', methods: ['GET', 'POST', 'PATCH', 'DELETE'], view: 'InspectionReportViewSet' },
  { path: 'inspection-report/:id/', methods: ['GET', 'PATCH', 'DELETE'], view: 'InspectionReport.retrieve/update/destroy' },
  { path: 'inspection-report-cached/', methods: ['GET', 'POST', 'PATCH', 'DELETE'], view: 'CachedInspectionReportViewSet' },
  { path: 'inspection-report-cached/:id/', methods: ['GET', 'PATCH', 'DELETE'], view: 'CachedInspection.retrieve/update/destroy' },

  // Competition (Legacy prefix)
  { path: 'competition/register/', methods: ['GET', 'POST', 'PATCH', 'DELETE'], view: 'CompetitionRegistrationViewSet' },
  { path: 'competition/register/:id/', methods: ['GET', 'PATCH', 'DELETE'], view: 'Registration.retrieve/update/destroy' },

  // External Integrations
  { path: 'plmis-token/', methods: ['POST', 'GET'], view: 'PLMISTokenView' },
  { path: 'verify-chalan/', methods: ['POST'], view: 'VerifyChalanView' },
  { path: 'payment-intimation/', methods: ['POST'], view: 'PaymentIntimationView' },
]

function extractExpressRoutes(routesFile: string): ExpressRoute[] {
  const routes: ExpressRoute[] = []
  const lines = routesFile.split('\n')

  for (const line of lines) {
    // Match patterns like: pmcRouter.get('/path/', ..., handler)
    const match = line.match(/pmcRouter\.(get|post|patch|put|delete|options|head|all)\s*\(\s*['"]([^'"]+)['"]/i)
    if (match) {
      const method = match[1].toUpperCase()
      const path = match[2].replace(/\/api\/pmc/, '') // Remove /api/pmc prefix
      routes.push({
        path,
        method,
        handler: line.trim(),
      })
    }
  }

  return routes
}

function compareEndpoints(django: DjangoEndpoint[], express: ExpressRoute[]): any {
  const report = {
    total_django: django.length,
    total_express_unique: new Set(express.map((r) => r.path)).size,
    missing_from_express: [] as string[],
    improperly_implemented: [] as any[],
    coverage_percentage: 0,
  }

  for (const endpoint of django) {
    const expressMatches = express.filter((r) => r.path === endpoint.path)

    if (expressMatches.length === 0) {
      report.missing_from_express.push(`${endpoint.path} (methods: ${endpoint.methods.join(', ')})`)
    } else {
      const implementedMethods = expressMatches.map((m) => m.method)
      const missing = endpoint.methods.filter((m) => !implementedMethods.includes(m))

      if (missing.length > 0) {
        report.improperly_implemented.push({
          path: endpoint.path,
          expected: endpoint.methods,
          implemented: implementedMethods,
          missing: missing,
        })
      }
    }
  }

  report.coverage_percentage = Math.round(((django.length - report.missing_from_express.length) / django.length) * 100)

  return report
}

async function main() {
  const routesPath = path.join(__dirname, '../interfaces/http/routes/pmc.routes.ts')

  if (!fs.existsSync(routesPath)) {
    console.error(`❌ Routes file not found at ${routesPath}`)
    process.exit(1)
  }

  const routesContent = fs.readFileSync(routesPath, 'utf-8')
  const expressRoutes = extractExpressRoutes(routesContent)
  const report = compareEndpoints(DJANGO_ENDPOINTS, expressRoutes)

  console.log('\n📊 ENDPOINT PARITY REPORT')
  console.log('=' .repeat(60))
  console.log(`Django Total Endpoints: ${report.total_django}`)
  console.log(`Express Implemented: ${report.total_express_unique}`)
  console.log(`Coverage: ${report.coverage_percentage}%`)

  if (report.missing_from_express.length > 0) {
    console.log('\n❌ Missing from Express:')
    report.missing_from_express.forEach((m: string) => console.log(`   - ${m}`))
  }

  if (report.improperly_implemented.length > 0) {
    console.log('\n⚠️  Improperly Implemented (missing methods):')
    report.improperly_implemented.forEach((impl: any) => {
      console.log(`   - ${impl.path}`)
      console.log(`     Expected: ${impl.expected.join(', ')}`)
      console.log(`     Missing: ${impl.missing.join(', ')}`)
    })
  }

  if (report.coverage_percentage === 100 && report.improperly_implemented.length === 0) {
    console.log('\n✅ All endpoints properly implemented!')
  }

  console.log('=' .repeat(60) + '\n')

  // Exit with error code if coverage < 100%
  if (report.coverage_percentage < 100) {
    process.exit(1)
  }
}

main().catch(console.error)
