# PMC MERN Stack - Architecture Documentation

## System Overview

The PMC (Plastic Management & Compliance) application is a comprehensive MERN stack solution for managing plastic waste, business compliance, and regulatory requirements. The system follows Domain-Driven Design (DDD) principles and layered architecture pattern.

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend Layer (React)                 │
│  - Components (Applicant, Business, Document, Inventory)│
│  - State Management                                      │
│  - API Integration                                       │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────────┐
│              API Gateway (Express.js)                    │
│  - Route Management                                      │
│  - Request/Response Handling                             │
│  - Authentication/Authorization                          │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│          Application Layer (Controllers)                 │
│  - ApplicationControllers.ts                             │
│  - InventoryWorkflowControllers.ts                       │
│  - Request Validation                                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│            Business Logic Layer (Services)               │
│  - ApplicantService                                      │
│  - BusinessService                                       │
│  - DocumentService                                       │
│  - InventoryService                                      │
│  - WorkflowService                                       │
│  - AnalyticsServices                                     │
│  - ReportGenerationService                              │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│         Data Access Layer (Repositories)                 │
│  - DocumentRepository                                    │
│  - BusinessProfileRepository                             │
│  - InventoryRepository                                   │
│  - WorkflowRepository                                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│         Persistence Layer (MongoDB)                      │
│  - Collections: Applicants, Businesses, Documents\      │
│                Inventory, Workflows, Alerts              │
└─────────────────────────────────────────────────────────┘
```

---

## Architecture Layers

### 1. Frontend Layer (React + TypeScript)

**Location:** `client/src/`

**Components:**
- **ApplicantComponents.tsx** - Applicant registration, verification, status tracking
- **BusinessComponents.tsx** - Business registration, listing, filtering
- **DocumentComponents.tsx** - Document upload, verification, expiry tracking
- **InventoryComponents.tsx** - Plastic catalog, inventory management
- **WorkflowComponents.tsx** - Assignment management, inspections, dashboards
- **AdvancedDashboards.tsx** - Analytics, KPI metrics, reporting
- **AdvancedSearch.tsx** - Full-text search, advanced filtering, saved filters

**Key Technologies:**
- React 18 with TypeScript
- Tailwind CSS for styling
- Vite for bundling
- Fetch API for HTTP requests

**State Management:**
- Local component state (React.useState)
- Context API for auth (AuthContext)
- Service hooks for data fetching

**Architecture Pattern:**
```
Component → useEffect (fetch) → setState → render
    ↓
  Form → onChange → state update → validate → POST/PUT → refresh
```

### 2. API Gateway (Express.js)

**Location:** `server/src/`

**Entry Point:** `app.ts` and `server.ts`

**Responsibilities:**
- HTTP request/response handling
- Route registration
- CORS configuration
- General error handling
- Security headers

**Middleware Stack:**
```
Request → Express → cors → bodyParser → auth → routes → response
                                           ↓
                                    Controllers
```

**Key Configuration:**
```typescript
// CORS configuration
app.use(cors({ origin: process.env.CORS_ORIGIN }))

// Body parser
app.use(express.json({ limit: '50mb' }))

// Routes
app.use(setupRoutes(router))
```

### 3. Application Layer (Controllers)

**Location:** `server/src/interfaces/controllers/`

**Files:**
- `ApplicationControllers.ts` - 12 endpoints
- `InventoryWorkflowControllers.ts` - 16 endpoints
- `routes.ts` - Route registration

**Design Pattern:** MVC (Model-View-Controller)

**Response Format:**
```typescript
interface ApiResponse<T> {
  success: boolean
  message: string
  data: T | null
}
```

**Responsibilities:**
- Parse and validate request data
- Call appropriate service methods
- Format responses consistently
- Handle HTTP status codes
- Log requests/responses

**Example Controller Method:**
```typescript
async registerApplicant(req, res) {
  try {
    // 1. Validate input
    const { cnic, fullName, email } = req.body
    if (!cnic || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        data: null
      })
    }

    // 2. Call service
    const service = new ApplicantService()
    const result = await service.registerApplicant({...})

    // 3. Return response
    res.status(result.success ? 201 : 400).json({
      success: result.success,
      message: result.message,
      data: result.data
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: null
    })
  }
}
```

### 4. Business Logic Layer (Services)

**Location:** `server/src/application/`

**Services:**
1. **ApplicantService** - Applicant registration, verification, status
2. **BusinessService** - Business registration, compliance, activation
3. **DocumentService** - Document upload, verification, expiry management
4. **InventoryService** - Plastic items, products, by-products, raw materials
5. **WorkflowService** - Assignments, inspections, alerts, workflow management
6. **AnalyticsServices** - Metrics, KPIs, trend analysis
7. **ReportGenerationService** - PDF, Excel, CSV, HTML reports

**Design Pattern:** Service Layer with Repository Pattern

**Responsibilities:**
- Implement business logic
- Validate domain rules
- Coordinate between repositories
- Handle transactions
- Implement caching strategies

**Example Service Method:**
```typescript
async registerApplicant(data: ApplicantData): Promise<Result> {
  // 1. Validate business rules
  if (!this.validateCNIC(data.cnic)) {
    return { success: false, message: 'Invalid CNIC' }
  }

  // 2. Check duplicates
  const existing = await this.repository.findByCNIC(data.cnic)
  if (existing) {
    return { success: false, message: 'Applicant already exists' }
  }

  // 3. Create and save
  const applicant = new Applicant(data)
  const saved = await this.repository.save(applicant)

  // 4. Return result
  return {
    success: true,
    message: 'Applicant registered successfully',
    data: saved
  }
}
```

**Service Composition:**
```typescript
class ApplicantService {
  private documentRepository: DocumentRepository
  private workflowRepository: WorkflowRepository

  async verifyApplicant(applicantId: string) {
    // 1. Get applicant documents
    const docs = await this.documentRepository.findByApplicant(applicantId)

    // 2. Check verification status
    const allVerified = docs.every(d => d.status === 'VERIFIED')

    // 3. Create workflow if needed
    if (allVerified) {
      await this.workflowRepository.createVerifiedAlert(applicantId)
    }

    return { success: true }
  }
}
```

### 5. Data Access Layer (Repositories)

**Location:** `server/src/infrastructure/repositories/`

**Repositories:**
1. **DocumentRepository** - Document CRUD and queries
2. **BusinessProfileRepository** - Business CRUD operations
3. **InventoryRepository** - Inventory item management
4. **WorkflowRepository** - Workflow and assignment management

**Design Pattern:** Repository Pattern (Data Mapper)

**Responsibilities:**
- Abstract database access
- Implement custom queries
- Handle transactions
- Implement caching
- Manage indexes

**Example Repository:**
```typescript
class ApplicantRepository {
  async save(applicant: ApplicantDocument): Promise<ApplicantDocument> {
    return await ApplicantModel.create(applicant)
  }

  async findById(id: string): Promise<ApplicantDocument | null> {
    return await ApplicantModel.findById(id).lean()
  }

  async findByDistrict(district: string): Promise<ApplicantDocument[]> {
    return await ApplicantModel.find({ district }).lean()
  }

  async findVerificationPending(): Promise<ApplicantDocument[]> {
    return await ApplicantModel.find({ status: 'PENDING' }).lean()
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await ApplicantModel.updateOne({ _id: id }, { status })
  }
}
```

**Query Optimization:**
```typescript
// Indexed queries
db.applicants.createIndex({ cnic: 1, status: 1 })
db.businesses.createIndex({ registrationNumber: 1 })
db.documents.createIndex({ businessId: 1, createdAt: -1 })

// Pagination pattern
async findPaginated(page: number, limit: number) {
  const skip = (page - 1) * limit
  return await ApplicantModel.find()
    .skip(skip)
    .limit(limit)
    .lean()
}
```

### 6. Domain Layer (Entities & Models)

**Location:** `server/src/domain/` and `server/src/infrastructure/models/`

**Domain Entities:**
1. **ApplicantDocument** - Applicant entity with CNIC, contact, status
2. **BusinessProfile** - Business entity with type, location, compliance
3. **PlasticInventory** - Plastic items with hazard levels, recycling rates
4. **WorkflowAssignment** - Task assignments with priority, due date
5. **InspectionReport** - Inspection findings with compliance scores

**Models (MongoDB):**
```typescript
interface ApplicantDocument {
  _id: ObjectId
  cnic: string // Unique, indexed
  fullName: string
  email: string
  phone: string
  district: string
  address: string
  status: 'PENDING' | 'VERIFIED' | 'REJECTED'
  documentsIds: ObjectId[]
  createdAt: Date
  updatedAt: Date
}

interface BusinessProfile {
  _id: ObjectId
  name: string
  entityType: 'PRODUCER' | 'CONSUMER' | 'COLLECTOR' | 'RECYCLER'
  registrationNumber: string
  district: string
  coordinates: { latitude: number; longitude: number }
  complianceScore: number // 0-100
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED'
  createdAt: Date
  updatedAt: Date
}
```

### 7. Persistence Layer (MongoDB)

**Collections:**
1. **applicants** - 1,000+ documents
2. **businesses** - 300+ documents
3. **documents** - 2,500+ documents
4. **inventory** - Plastic items, products, by-products
5. **workflows** - Assignments and inspections
6. **alerts** - System and compliance alerts

**Indexing Strategy:**
```javascript
// Applicants Collection
db.applicants.createIndex({ cnic: 1 })
db.applicants.createIndex({ status: 1 })
db.applicants.createIndex({ district: 1 })
db.applicants.createIndex({ createdAt: -1 })

// Businesses Collection
db.businesses.createIndex({ registrationNumber: 1 })
db.businesses.createIndex({ entityType: 1, status: 1 })
db.businesses.createIndex({ complianceScore: -1 })

// Documents Collection
db.documents.createIndex({ businessId: 1, createdAt: -1 })
db.documents.createIndex({ status: 1 })
db.documents.createIndex({ expiryDate: 1 })

// Workflows Collection
db.workflows.createIndex({ businessId: 1, status: 1 })
db.workflows.createIndex({ assignedTo: 1, status: 1 })
db.workflows.createIndex({ priority: 1, dueDate: 1 })
```

---

## Data Flow Examples

### Example 1: Applicant Registration Flow

```
Frontend (React)
  ↓
  ApplicantRegistration.tsx (form input)
  ↓
  POST /api/applicants/register (JSON)
  ↓
Backend (Express)
  ↓
  ApplicantController.registerApplicant()
  ↓
  ApplicantService.registerApplicant()
  ↓
  Validate CNIC format
  ↓
  Check duplicate in ApplicantRepository.findByCNIC()
  ↓
  ApplicantModel.create() (MongoDB)
  ↓
  Return result to controller
  ↓
  Format response {success, message, data}
  ↓
Frontend (React)
  ↓
  setState(result.data)
  ↓
  Redirect to verification page
```

### Example 2: Business Compliance Check Flow

```
Frontend Dashboard Click
  ↓
GET /api/businesses/:id/dashboard
  ↓
BusinessController.getDashboard()
  ↓
BusinessService.getComplianceMetrics()
  ↓
  Query DocumentRepository.findByBusiness()
  ↓
  Get documents from MongoDB: {"businessId": id}
  ↓
  Calculate verification % = (verified / total) * 100
  ↓
  Query WorkflowRepository.getRecentAssignments()
  ↓
  Aggregate inspection findings
  ↓
  Query InventoryRepository.getHazardItems()
  ↓
  Return aggregated metrics
  ↓
Frontend (React)
  ↓
  ComprehensiveAnalyticsDashboard renders tiles
  ↓
  User sees compliance score, document status, alert count
```

### Example 3: Document Verification Workflow

```
Frontend DocumentUpload
  ↓
POST /api/documents/upload (multipart/form-data)
  ↓
DocumentController.uploadDocument()
  ↓
Validate file size (max 50MB)
  ↓
DocumentService.uploadDocument()
  ↓
Save file to disk (/uploads)
  ↓
Create document record
  ↓
DocumentRepository.save() → MongoDB
  ↓
Return {documentId, status: "PENDING_VERIFICATION"}
  ↓
Frontend shows "Document Uploaded"
  ↓
Admin Portal
  ↓
GET /api/documents/pending
  ↓
DocumentRepository.findByStatus("PENDING_VERIFICATION")
  ↓
Admin verifies document
  ↓
POST /api/documents/:id/verify
  ↓
DocumentService.verifyDocument()
  ↓
Update status → "VERIFIED"
  ↓
Trigger WorkflowService.createComplianceEvent()
  ↓
Create alert if needed
```

---

## Design Patterns

### 1. Repository Pattern
- Abstracts database access
- Enables easy testing with mock repositories
- Centralizes query logic

### 2. Service Layer Pattern
- Encapsulates business logic
- Enables service composition
- Separates concerns

### 3. Factory Pattern
- ServiceFactory creates service instances
- Dependency injection for repositories

### 4. Singleton Pattern
- Database connection pooling
- Logger instances

### 5. Strategy Pattern
- Different validation strategies
- Multiple export formats (PDF, Excel, CSV)

### 6. Observer Pattern
- Alert system notifications
- Event-driven workflow completion

---

## Security Architecture

### Authentication
```
Frontend (Store JWT)
  ↓
POST /auth/login
  ↓
Backend validates credentials
  ↓
Generate JWT Token
  ↓
Frontend stores in localStorage/memory
  ↓
All subsequent requests include Authorization header
  ↓
Backend validates token in middleware
```

### Authorization
```
Request with JWT
  ↓
AuthMiddleware extracts token
  ↓
Verify token signature
  ↓
Extract user role from payload
  ↓
Check route-role mapping
  ↓
Allow or deny access
```

### Data Validation
```
Frontend
  Form validation (client-side)
  ↓
Backend
  ├─ Input validation (schema)
  ├─ Business rule validation
  ├─ Database constraint validation
  └─ Return error response
```

---

## Performance Optimization

### 1. Database Optimization
- Indexed queries for common searches
- Pagination for large result sets
- Lean queries (MongoDB) to exclude unnecessary fields
- Connection pooling

### 2. Frontend Optimization
- Component code splitting with dynamic imports
- Lazy loading for routes
- Image optimization
- Gzip compression
- Browser caching

### 3. Caching Strategy
```
Request
  ↓
Check cache (Redis/Memory)
  ↓
If hit → Return cached response
  ↓
If miss → Query database
        → Store in cache
        → Return response
```

### 4. API Optimization
- Field selection (only return needed fields)
- Aggregation pipelines (MongoDB)
- Request batching where applicable

---

## Error Handling Strategy

### Error Types
1. **Validation Errors** (400) - Bad input
2. **Authentication Errors** (401) - Invalid token
3. **Authorization Errors** (403) - Insufficient permissions
4. **Not Found** (404) - Resource doesn't exist
5. **Conflict** (409) - Duplicate resource
6. **Server Errors** (500) - Internal error

### Error Response Format
```json
{
  "success": false,
  "message": "Human-readable error message",
  "data": {
    "field": "fieldName",
    "error": "ERROR_CODE",
    "details": "Additional error context"
  }
}
```

---

## Testing Strategy

### Unit Tests
- Service methods with mocked repositories
- Utility functions
- Validators

### Integration Tests
- Controller → Service → Repository flow
- Database operations
- External API calls

### End-to-End Tests
- Complete user workflows
- Multi-step processes
- UI interactions

---

## Deployment Architecture

```
Development
  ↓
Git Repository (GitHub)
  ↓
CI/CD Pipeline (GitHub Actions)
  ├─ Run tests
  ├─ Build frontend
  ├─ Build backend
  └─ Run linting
  ↓
Staging Environment
  ├─ Frontend: S3 + CloudFront
  ├─ Backend: EC2/Heroku
  └─ Database: MongoDB Atlas
  ↓
Production Environment
  ├─ Frontend: S3 + CloudFront
  ├─ Backend: EC2/Nginx/PM2
  └─ Database: MongoDB Atlas
```

---

## Future Enhancements

1. **Microservices** - Split into document, workflow, analytics services
2. **Event-Driven Architecture** - RabbitMQ/Kafka for async processing
3. **GraphQL API** - Alternative to REST
4. **Real-time Updates** - WebSocket for live dashboards
5. **Machine Learning** - Compliance prediction, anomaly detection
6. **Blockchain** - Immutable compliance records

---

**Last Updated:** 2024-01-20
**Architecture Version:** 1.0
