# Implementation Plan for Missing Features
## PMC MERN Stack - Feature Completion Roadmap
**Created:** February 17, 2026  
**Scope:** Complete analysis-driven implementation strategy  
**Total Effort:** ~670+ hours | 4-6 months with 3-person team

---

## PHASE OVERVIEW

```
PHASE 1: Foundation (Weeks 1-4) → 140 hours
├── Database setup & location data
├── Authentication & authorization enhancement
└── Core API infrastructure

PHASE 2: Critical Workflow (Weeks 5-10) → 180 hours
├── 8-Stage workflow system
├── Application management
└── GIS integration (PostGIS)

PHASE 3: Payments & Finance (Weeks 11-14) → 120 hours
├── Payment gateway integration (PITB/PSID)
├── Bank chalan management
└── Receipt generation

PHASE 4: Advanced Features (Weeks 15-20) → 150 hours
├── Licensing system
├── Inspection system
├── Reporting & analytics

PHASE 5: Polish & Deploy (Weeks 21-24) → 80 hours
└── Testing, documentation, deployment
```

---

## PHASE 1: FOUNDATION (Weeks 1-4 | 140 Hours)

### **Week 1-2: Database Architecture & Setup (50 hours)**

#### Task 1.1: Migrate to PostgreSQL with PostGIS (15 hours)
**Status:** Not Started  
**Assignee:** Backend Lead  
**Subtasks:**
1. Install PostgreSQL 14+ with PostGIS extension
2. Configure Django for PostGIS
   - Set geometry field backend to `django.contrib.gis`
   - Install: `django-gis`, `psycopg2-binary`
3. Create new database with PostGIS enabled
4. Update `settings.py`:
   ```python
   INSTALLED_APPS += ['django.contrib.gis']
   DATABASES = {
       'default': {
           'ENGINE': 'django.contrib.gis.db.backends.postgis',
           'NAME': 'pmc_db',
       }
   }
   ```
5. Migrate existing data from current database
6. Write data validation script

**Testing:**
- Verify GIS queries work
- Test spatial indexes
- Performance testing

#### Task 1.2: Create Location Data Models (10 hours)
**Status:** Not Started  
**Assignee:** Backend  
**Models to Create:**
```
TblDivisions
├── division_id (PK)
├── division_name (char[254])
├── division_code (char[254])
└── geom (GeometryField, optional)

TblDistricts
├── district_id (PK)
├── division_fk (FK to TblDivisions)
├── district_name (char[254])
├── district_code (char[254])
├── short_name (char[3]) - for tracking numbers
├── pitb_district_id (int, nullable)
├── geom (GeometryField with spatial index)
└── indexes: district_code, short_name

TblTehsils
├── tehsil_id (PK)
├── district_fk (FK to TblDistricts)
├── division_fk (FK to TblDivisions)
├── tehsil_name (char[254])
├── tehsil_code (char[254], unique)
└── indexes: district_id, tehsil_code
```

**Implementation:**
- Create models in `server/src/domain/models/`
- Add migrations
- Create seeder data from reference JSON files
- Write unit tests

#### Task 1.3: Import Reference Location Data (10 hours)
**Status:** Not Started  
**Assignee:** Backend  
**Data Sources:**
- `pmc_be_django-main/data/idm_districts.sample.json` → District geometry
- `pmc_be_django-main/data/idm_clubs.sample.json` → Club/area data
- `pmc_be_django-main/data/tehsils.sample.json` → Tehsil data

**Process:**
1. Create data seeder script
2. Parse JSON and convert geometries to GeoJSON
3. Load into PostGIS with spatial validation
4. Create indexes:
   ```sql
   CREATE INDEX idx_districts_geom ON tbl_districts USING GIST(geom);
   CREATE INDEX idx_district_code ON tbl_districts(district_code);
   ```
5. Test with spatial queries

#### Task 1.4: Upgrade Authentication System (15 hours)
**Status:** In Progress  
**Assignee:** Backend  
**Current Gap:** Basic auth implemented, advanced RBAC needed

**Implementation Steps:**

1. Create User Group Model:
```typescript
interface UserGroup {
  id: string
  name: 'APPLICANT' | 'LSO' | 'PITB' | 'SSG' | 'ADMIN' | 'INSPECTOR'
  description: string
  permissions: Permission[]
  createdAt: Date
}

interface Permission {
  id: string
  name: string
  description: string
  module: string
  action: string
  resource: string
}
```

2. Create JWT Payload Model with Group Info:
```typescript
interface JWTPayload {
  userId: string
  email: string
  primaryGroup: UserGroup
  allGroups: UserGroup[]
  permissions: string[]
  expiresAt: Date
}
```

3. Create Permission Middleware:
```typescript
// Check route-level permissions
app.use(requirePermission('applicant.view'))

// Check object-level permissions
const checkOwnershipOrAdmin = (req, res, next) => {
  if (req.user.primaryGroup === 'ADMIN') return next()
  if (req.params.userId === req.user.id) return next()
  res.status(403).json({ error: 'Forbidden' })
}
```

4. Create Group Assignment Service:
```typescript
// When applicant submits → assign to LSO group automatically
const assignToGroup = async (applicant, groupName) => {
  await UserGroup.findOneAndUpdate(
    { name: groupName },
    { $addToSet: { users: applicant.userId } }
  )
}

// Workflow: APPLICANT → LSO → PITB → SSG → APPROVED
```

5. Add Permission Checking to API:
```typescript
router.get('/api/applications', 
  authenticate,
  authorize(['APPLICANT', 'LSO', 'PITB', 'ADMIN']),
  getApplications
)
```

6. Update Frontend Auth Context:
```typescript
interface AuthContext {
  user: User
  primaryGroup: UserGroup
  allGroups: UserGroup[]
  canAccess: (permission: string) => boolean
  isMemberOf: (group: string) => boolean
}
```

7. Create Permission Seeder:
```typescript
const permissions = [
  { name: 'applicant.view', module: 'applicant', action: 'view' },
  { name: 'applicant.submit', module: 'applicant', action: 'submit' },
  { name: 'application.review', module: 'application', action: 'review' },
  { name: 'license.issue', module: 'license', action: 'issue' },
  { name: 'report.view', module: 'report', action: 'view' },
]
```

**Testing:**
- JWT token parsing with groups
- Permission-based API access
- Group assignment workflow
- Permission inheritance

---

### **Week 2-3: Enhanced Application Models (40 hours)**

#### Task 1.5: Extend ApplicantDetail Model (15 hours)
**Status:** Not Started  
**Assignee:** Backend  
**Create:** `server/src/domain/models/ApplicantDetail.ts`

**Model Schema:**
```typescript
interface ApplicantDetail {
  // Identifiers
  id: string (UUID)
  registrationFor: enum('Individual' | 'Company' | 'Partnership' | 'Sole_Proprietor' | etc.)
  traits: {
    trackingNumber: string (generated: "LHR-IND-001")
    trackingHash: string (UUID for search)
    applicationStatus: enum('Created' | 'InProgress' | 'Submitted' | 'UnderReview' | 'Approved' | 'Rejected' | 'Appealed' | 'Closed')
    assignedGroup: enum('APPLICANT' | 'LSO' | 'PITB' | 'SSG' | 'ADMIN')
  }
  
  // Personal Information
  personal: {
    firstName: string (255)
    lastName: string (255)
    cnic: string (format: XXXXX-XXXXXXX-X) - UNIQUE
    gender: enum('Male' | 'Female' | 'Other')
    designation: string (255)
    dob: Date
  }
  
  // Contact Information
  contact: {
    email: string (email)
    mobileOperator: enum('Jazz' | 'Zong' | 'Ufone' | 'Warid' | 'Telenor')
    mobileNo: string (10 digits, format: 3001234567) - UNIQUE within applicant
    telephoneNo: string (format: 042-12345678)
  }
  
  // Timestamps & Audit
  audit: {
    createdAt: Date (auto)
    updatedAt: Date (auto)
    createdBy: User FK
    remarks: Text
  }
  
  // Relations
  businessProfile: OneToOne → BusinessProfile
  history: HistoricalRecords[]
}
```

**Implementation:**
1. Create TypeScript interface
2. Create MongoDB schema with validation
3. Add validation rules:
   - CNIC: /^\d{5}-\d{7}-\d{1}$/
   - Mobile: /^\d{10}$/
   - Email: valid email format
4. Create Mongoose pre-save hooks for:
   - Tracking number generation
   - Group assignment
   - Status validation
5. Add indexes:
   - CNIC (unique)
   - Email (sparse unique)
   - trackingNumber
   - assignedGroup + status

#### Task 1.6: Create BusinessProfile Model (15 hours)
**Status:** Not Started  
**Assignee:** Backend  
**Create:** `server/src/domain/models/BusinessProfile.ts`

**Model Schema:**
```typescript
interface BusinessProfile {
  // Basic Info
  applicant: OneToOne → ApplicantDetail
  entityType: enum('Individual' | 'Company' | 'Corporation' | 'Partnership')
  trackingNumber: string (unique, inherited from applicant)
  
  // Business Details (depends on entityType)
  business: {
    // Individual
    name?: string
    ntnStrnPraIndividual?: string
    
    // Company/Corporation
    businessName?: string
    registrationType?: enum('PVT_LTD' | 'PUBLIC' | 'PRIVATE' | 'LISTED')
    registrationNo?: string
    ntnStrnPraCompany?: string
    
    // Shared
    workingDays?: number (5, 6, 7)
    commencementDate?: Date
    noOfWorkers?: number
  }
  
  // Location/Address
  location: {
    district: FK → TblDistricts (spatial)
    tehsil: FK → TblTehsils (spatial)
    city_town_village: string (256)
    postalAddress: Text
    postalCode: string (10)
    coordinates: {
      latitude: Decimal (9,6) [20.0 to 40.0]
      longitude: Decimal (9,6) [60.0 to 80.0]
      geom: Point geometry (auto-generated from lat/lon)
    }
  }
  
  // Contact Details
  contact: {
    email?: string (email)
    mobileOperator?: enum(...)
    mobileNo?: string (10 digits)
    phoneNo?: string (format: 042-12345678)
    website?: URL
  }
  
  // Audit
  updatedBy: User FK
  updatedAt: Date (auto)
  createdBy: User FK
  createdAt: Date (auto)
  history: HistoricalRecords[]
  
  // Auto-generated on save
  geom: Point (from latitude/longitude)
}
```

**Implementation:**
1. Create TypeScript interface
2. Create schema with pre-save hooks for:
   - Geometry generation from coordinates
   - Tracking number validation
3. Add spatial indexing:
   ```typescript
   schema.index({ geom: '2dsphere' })
   ```
4. Create validation:
   - Latitude: 20.0 to 40.0
   - Longitude: 60.0 to 80.0
   - URL format validation
5. Write helper methods:
   - `getDistanceFromPoint(lat, lon)`
   - `getCoordinatesString()`
   - `validateAddress()`

#### Task 1.7: Create Application Status Models (10 hours)
**Status:** Not Started  
**Assignee:** Backend  

**Models to Create:**
```typescript
// Track when application was submitted
interface ApplicationSubmitted {
  applicant: OneTToOne → ApplicantDetail
  submittedAt: Date (auto)
  submittedBy: User FK
  submissionData: JSON (snapshot of data at submission)
  ipAddress: string
}

// Track workflow state changes
interface ApplicationStatus {
  application: FK → ApplicantDetail
  status: enum(...)
  changedAt: Date (auto)
  changedBy: User FK
  reason: Text (for rejections)
  nextStatus?: enum(...)
}

// Track fees and payments
interface ApplicationFee {
  application: FK → ApplicantDetail
  feeType: enum('Registration' | 'Verification' | 'License' | 'Renewal' | 'Late')
  amount: Decimal
  dueDate: Date
  paidDate?: Date
  status: enum('Pending' | 'Paid' | 'Overdue' | 'Waived')
  bankChalan?: FK → BankChalan
}
```

**Implementation:**
1. Create schemas
2. Add database hooks:
   - When ApplicantDetail.status changes → create ApplicationStatus record
   - When fee is created → notify applicant
3. Create indexes on date/status combinations
4. Write query helper methods

---

### **Week 3-4: Core API Setup (30 hours)**

#### Task 1.8: Create Application Service Layer (10 hours)
**Status:** Not Started  
**Assignee:** Backend  
**Create:** `server/src/application/services/ApplicationService.ts`

**Core Methods:**
```typescript
class ApplicationService {
  // Create new application
  async createApplication(userId: string, data: CreateApplicationDTO): Promise<Application> {
    const applicant = new ApplicantDetail({...data, createdBy: userId})
    await applicant.save()
    
    const business = new BusinessProfile({applicant: applicant.id})
    await business.save()
    
    return applicant
  }
  
  // Submit application (transitions to submitted status)
  async submitApplication(applicationId: string, userId: string): Promise<Application> {
    const applicant = await ApplicantDetail.findById(applicationId)
    applicant.applicationStatus = 'Submitted'
    applicant.assignedGroup = 'LSO' // Auto-assign to LSO
    await applicant.save()
    
    // Create submission record
    await ApplicationSubmitted.create({
      applicant: applicationId,
      submittedBy: userId,
      submissionData: JSON.stringify(applicant)
    })
    
    return applicant
  }
  
  // Get applications for current user
  async getApplications(userId: string, filters: FilterDTO): Promise<Application[]> {
    const user = await User.findById(userId).populate('groups')
    const query = ApplicantDetail.find()
    
    // Apply group-based filtering
    if (!user.groups.some(g => g.name === 'ADMIN')) {
      query.where({ assignedGroup: { $in: user.groups.map(g => g.name) } })
    }
    
    // Apply other filters
    if (filters.status) query.where({ applicationStatus: filters.status })
    if (filters.district) query.where({ 'businessProfile.district': filters.district })
    
    return query.exec()
  }
  
  // Update application status
  async updateApplicationStatus(
    applicationId: string,
    newStatus: string,
    userId: string,
    reason?: string
  ): Promise<Application> {
    const applicant = await ApplicantDetail.findByIdAndUpdate(
      applicationId,
      { applicationStatus: newStatus },
      { new: true }
    )
    
    // Create status history record
    await ApplicationStatus.create({
      application: applicationId,
      status: newStatus,
      changedBy: userId,
      reason
    })
    
    return applicant
  }
  
  // Get application with full history
  async getApplicationWithHistory(applicationId: string): Promise<ApplicationDetail> {
    const applicant = await ApplicantDetail.findById(applicationId)
      .populate('businessProfile')
      .populate('createdBy', 'email name')
    
    const history = await ApplicationStatus.find({
      application: applicationId
    }).populate('changedBy', 'email name')
    
    const submitted = await ApplicationSubmitted.findOne({ applicant: applicationId })
    
    return {
      applicant,
      history,
      submitted,
      currentGroup: applicant.assignedGroup
    }
  }
}
```

#### Task 1.9: Create REST Controllers (10 hours)
**Status:** Not Started  
**Assignee:** Backend  
**Create:** `server/src/interfaces/controllers/ApplicationController.ts`

**Endpoints to Create:**
```typescript
// POST /api/applications/create
router.post('/create', authenticate, async (req, res) => {
  const service = new ApplicationService()
  const app = await service.createApplication(req.user.id, req.body)
  res.json(app)
})

// POST /api/applications/:id/submit
router.post('/:id/submit', authenticate, authorize(['APPLICANT']), async (req, res) => {
  const service = new ApplicationService()
  const app = await service.submitApplication(req.params.id, req.user.id)
  res.json(app)
})

// GET /api/applications
router.get('/', authenticate, async (req, res) => {
  const service = new ApplicationService()
  const apps = await service.getApplications(req.user.id, req.query)
  res.json(apps)
})

// GET /api/applications/:id
router.get('/:id', authenticate, async (req, res) => {
  const service = new ApplicationService()
  const app = await service.getApplicationWithHistory(req.params.id)
  res.json(app)
})

// PUT /api/applications/:id/status
router.put('/:id/status', authenticate, authorize(['LSO', 'PITB', 'SSG', 'ADMIN']), async (req, res) => {
  const service = new ApplicationService()
  const app = await service.updateApplicationStatus(
    req.params.id,
    req.body.status,
    req.user.id,
    req.body.reason
  )
  res.json(app)
})
```

#### Task 1.10: Create Data Transfer Objects (5 hours)
**Status:** Not Started  
**Assignee:** Backend  
**Create:** `server/src/interfaces/dto/`

**DTOs to Create:**
```typescript
// Requests
CreateApplicationDTO
UpdateApplicationDTO
SubmitApplicationDTO
UpdateApplicationStatusDTO {
  status: string
  reason?: string
}
FilterApplicationDTO {
  status?: string
  district?: string
  assignedGroup?: string
  createdFrom?: Date
  createdTo?: Date
  page?: number
  limit?: number
}

// Responses
ApplicationResponseDTO
ApplicationListResponseDTO
ApplicationHistoryResponseDTO
```

**Implementation:**
1. Use class-validator for validation decorators
2. Create factory methods for DTOs
3. Add example values in controller docs
4. Write unit tests for each DTO

---

## PHASE 2: CRITICAL WORKFLOW (Weeks 5-10 | 180 Hours)

### **Week 5-6: 8-Stage Workflow System (50 hours)**

#### Task 2.1: Design Workflow State Machine (10 hours)
**Status:** Not Started  
**Assignee:** Backend Architect  

**Workflow States:**
```
Stage 1: APPLICANT - Initial Creation
  ├─ Created: Applicant creates profile
  ├─ InProgress: Applicant fills details
  ├─ ReadyToSubmit: All required fields entered
  └─ Action: Submit Application

Stage 2: LSO (Local Support Office) Review
  ├─ Submitted: Applicant submitted
  ├─ UnderReview: LSO reviewing documents
  ├─ DocumentsRequested: Extra docs needed
  ├─ DocumentsReceived: Received and validated
  └─ Actions: Approve/Request Docs/Reject

Stage 3: PITB (Punjab IT Board) Verification
  ├─ LSOApproved: Passed LSO review
  ├─ TechnicalReview: PITB technical assessment
  ├─ ComplianceCheck: Regulatory compliance
  └─ Actions: Approve/Request Changes/Reject

Stage 4: SSG (Social Security) Approval
  ├─ PITBApproved: Passed PITB verification
  ├─ WelfareReview: SSG welfare assessment
  ├─ BenefitEligibility: Benefit eligibility check
  └─ Actions: Approve/Reject

Stage 5: Payment Required
  ├─ SSGApproved: Application approved
  ├─ PaymentPending: Awaiting fee payment
  ├─ PaymentConfirmed: Fee received
  └─ Action: Pay Application Fee

Stage 6: License Issuance
  ├─ PaymentComplete: Fee verified
  ├─ LicenseGeneration: Generating license doc
  ├─ LicensePrinting: License being printed
  └─ Action: Collect License

Stage 7: Inspection Scheduled
  ├─ InspectionPending: Awaiting inspection
  ├─ InspectionBooked: Date scheduled
  ├─ InspectionCompleted: Field verification done
  └─ Action: Pass/Fail Inspection

Stage 8: Final Approval
  ├─ InspectionPassed: Passed field verification
  ├─ FinalDocuments: Final docs generated
  ├─ Approved: Final approval granted
  └─ Closed: Application fully processed

Rejected Path:
  └─ Rejected (any stage) → Can Appeal → Reopen
```

**State Transition Rules:**
```typescript
const WORKFLOW_TRANSITIONS = {
  'Created': ['InProgress'],
  'InProgress': ['ReadyToSubmit'],
  'ReadyToSubmit': ['Submitted'],
  'Submitted': ['UnderReview', 'DocumentsRequested'],
  'DocumentsRequested': ['DocumentsReceived', 'Rejected'],
  'DocumentsReceived': ['TechnicalReview', 'Rejected'],
  'UnderReview': ['TechnicalReview', 'Rejected'],
  'TechnicalReview': ['ComplianceCheck', 'Rejected'],
  'ComplianceCheck': ['WelfareReview', 'Rejected'],
  'LSOApproved': ['WelfareReview'],
  'WelfareReview': ['BenefitEligibility', 'Rejected'],
  'BenefitEligibility': ['PaymentPending', 'Rejected'],
  'PITBApproved': ['PaymentPending'],
  'SSGApproved': ['PaymentPending'],
  'PaymentPending': ['PaymentConfirmed'],
  'PaymentConfirmed': ['LicenseGeneration'],
  'LicenseGeneration': ['LicensePrinting', 'Rejected'],
  'LicensePrinting': ['InspectionPending'],
  'InspectionPending': ['InspectionBooked'],
  'InspectionBooked': ['InspectionCompleted', 'Rejected'],
  'InspectionCompleted': ['InspectionPassed', 'Rejected'],
  'InspectionPassed': ['FinalDocuments'],
  'FinalDocuments': ['Approved'],
  'Approved': ['Closed'],
  'Rejected': ['Appealed'],
  'Appealed': ['Submitted'],
}
```

**Implementation:**
1. Create state machine class
2. Define valid transitions
3. Add guards and preconditions
4. Create error handling for invalid transitions
5. Add logging for all state changes

#### Task 2.2: Implement Workflow Service (20 hours)
**Status:** Not Started  
**Assignee:** Backend  
**Create:** `server/src/application/services/WorkflowService.ts`

**Key Methods:**
```typescript
class WorkflowService {
  // Get current stage info
  async getCurrentStage(applicationId: string): Promise<StageInfo> {
    const app = await ApplicantDetail.findById(applicationId)
    return {
      stage: app.applicationStatus,
      group: app.assignedGroup,
      progress: this.getProgressPercentage(app.applicationStatus),
      nextStage: this.getNextStages(app.applicationStatus),
      requiredActions: this.getRequiredActions(app.applicationStatus),
      completedAt: null,
      estimatedTime: this.getEstimatedTime(app.applicationStatus)
    }
  }
  
  // Transition to next stage
  async transitionToNextStage(
    applicationId: string,
    nextStatus: string,
    userId: string,
    metadata?: any
  ): Promise<boolean> {
    const app = await ApplicantDetail.findById(applicationId)
    const currentStatus = app.applicationStatus
    
    // Validate transition
    if (!this.isValidTransition(currentStatus, nextStatus)) {
      throw new Error(`Invalid transition from ${currentStatus} to ${nextStatus}`)
    }
    
    // Check prerequisites
    if (!await this.checkPrerequisites(applicationId, nextStatus)) {
      throw new Error(`Prerequisites not met for ${nextStatus}`)
    }
    
    // Perform transition
    app.applicationStatus = nextStatus
    app.assignedGroup = this.getGroupForStatus(nextStatus)
    await app.save()
    
    // Record in history
    await ApplicationStatus.create({
      application: applicationId,
      status: nextStatus,
      changedFrom: currentStatus,
      changedBy: userId,
      metadata,
      timestamp: new Date()
    })
    
    // Trigger notifications
    await this.notifyStakeholders(applicationId, nextStatus)
    
    return true
  }
  
  // Get workflow timeline
  async getWorkflowTimeline(applicationId: string): Promise<TimelineEvent[]> {
    const events = await ApplicationStatus.find({ application: applicationId })
      .sort({ timestamp: 1 })
      .populate('changedBy', 'email name')
    
    return events.map(e => ({
      stage: e.status,
      timestamp: e.timestamp,
      duration: this.calculateDuration(e, events),
      changedBy: e.changedBy,
      reason: e.reason
    }))
  }
  
  // Get applicant dashboard
  async getApplicantDashboard(userId: string): Promise<DashboardData> {
    const apps = await ApplicantDetail.find({ createdBy: userId })
    
    return {
      total: apps.length,
      byStatus: this.groupByStatus(apps),
      byStage: this.groupByStage(apps),
      pendingActions: await this.getPendingActions(userId),
      timeline: await Promise.all(
        apps.map(a => this.getWorkflowTimeline(a.id))
      )
    }
  }
  
  private isValidTransition(from: string, to: string): boolean {
    return WORKFLOW_TRANSITIONS[from]?.includes(to) ?? false
  }
  
  private async checkPrerequisites(appId: string, status: string): Promise<boolean> {
    const app = await ApplicantDetail.findById(appId).populate('businessProfile')
    
    const prerequisites = {
      'Submitted': () => app.businessProfile && app.firstName && app.cnic,
      'PaymentPending': () => app.applicationStatus.includes('Approved'),
      'InspectionPending': () => app.paymentConfirmed === true,
      'Approved': () => app.inspectionPassed === true,
      // ... more rules
    }
    
    const check = prerequisites[status]
    return check ? check() : true
  }
  
  private getGroupForStatus(status: string): string {
    const mapping = {
      'Created': 'APPLICANT',
      'InProgress': 'APPLICANT',
      'ReadyToSubmit': 'APPLICANT',
      'Submitted': 'LSO',
      'UnderReview': 'LSO',
      'TechnicalReview': 'PITB',
      'ComplianceCheck': 'PITB',
      'WelfareReview': 'SSG',
      'BenefitEligibility': 'SSG',
      'PaymentPending': 'APPLICANT',
      'LicenseGeneration': 'ADMIN',
      'InspectionPending': 'APPLICANT',
      'InspectionCompleted': 'INSPECTOR',
      'Approved': 'ADMIN',
      'Closed': 'ADMIN'
    }
    return mapping[status] || 'APPLICANT'
  }
  
  // ... more helper methods
}
```

#### Task 2.3: Create Workflow Frontend Components (15 hours)
**Status:** Not Started  
**Assignee:** Frontend  
**Create:** `client/src/components/workflow/`

**Components to Build:**
1. **WorkflowProgressBar.tsx** (5 hours)
   - Visual 8-stage progress indicator
   - Current stage highlighting
   - Hover tooltips with stage info
   - Responsive design
   - Mobile-friendly stepper

2. **StagePanel.tsx** (5 hours)
   - Current stage details
   - Required actions list
   - Estimated completion time
   - Action buttons (Next, Review, Reject)
   - Documents required list

3. **WorkflowTimeline.tsx** (5 hours)
   - Vertical timeline of all stage transitions
   - Timestamps and duration
   - Changed by information
   - Status reasons/comments
   - Printable timeline

**Styling:**
- Stages with color codes
- Icons for each stage
- Hover and active states
- Mobile responsive
- Dark mode support

#### Task 2.4: Create Workflow Pages (5 hours)
**Status:** Not Started  
**Assignee:** Frontend  
**Create:** Pages for each stage

---

### **Week 7-8: GIS Integration (50 hours)**

#### Task 2.5: PostGIS Setup & Spatial Queries (15 hours)
**Status:** Not Started  
**Assignee:** Backend  

**Setup Steps:**
1. Verify PostGIS 3.0+ installed:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   SELECT postgis_version();
   ```

2. Create spatial index on districts:
   ```sql
   CREATE INDEX idx_districts_geom_gist ON tbl_districts USING GIST(geom);
   CREATE INDEX idx_districts_geom_brin ON tbl_districts USING BRIN(geom);
   ```

3. Create spatial index on businesses:
   ```sql
   CREATE INDEX idx_business_geom ON (ST_GeomFromText(
     'POINT(' || location_longitude || ' ' || location_latitude || ')',
     4326
   ));
   ```

**Spatial Query Methods:**
```typescript
class GeoService {
  // Find district by coordinates
  async findDistrictByCoordinates(lat: number, lon: number): Promise<District> {
    const point = `POINT(${lon} ${lat})` // Note: GIS uses lon,lat not lat,lon
    
    return District.findOne({
      geom: {
        $geoWithin: {
          $geometry: point
        }
      }
    })
  }
  
  // Find locations within distance
  async findLocationsNear(
    lat: number,
    lon: number,
    radiusKm: number
  ): Promise<BusinessProfile[]> {
    const point = `POINT(${lon} ${lat})`
    
    return BusinessProfile.find({
      geom: {
        $near: {
          $geometry: point,
          $maxDistance: radiusKm * 1000 // meters
        }
      }
    })
  }
  
  // District boundaries
  async getDistrictBoundary(districtId: string): Promise<GeoJSON.Feature> {
    const district = await District.findById(districtId).select('geom')
    
    return {
      type: 'Feature',
      geometry: district.geom,
      properties: { districtId }
    }
  }
  
  // All districts GeoJSON
  async getAllDistrictsGeo(): Promise<GeoJSON.FeatureCollection> {
    const districts = await District.find().select('district_id district_name geom')
    
    return {
      type: 'FeatureCollection',
      features: districts.map(d => ({
        type: 'Feature',
        geometry: d.geom,
        properties: { id: d.id, name: d.district_name }
      }))
    }
  }
  
  // Distance between two points
  async getDistance(lat1: number, lon1: number, lat2: number, lon2: number): Promise<number> {
    const result = await db.query(
      `SELECT ST_Distance(
        ST_GeomFromText('POINT(? ?)', 4326),
        ST_GeomFromText('POINT(? ?)', 4326)
      ) as distance_meters`,
      [lon1, lat1, lon2, lat2]
    )
    
    return result[0].distance_meters / 1000 // convert to km
  }
}
```

#### Task 2.6: Create GIS API Endpoints (10 hours)
**Status:** Not Started  
**Assignee:** Backend  

**Endpoints:**
```typescript
// GET /api/geo/district-by-coordinates?lat=31.5204&lon=74.3587
router.get('/district-by-coordinates', async (req, res) => {
  const { lat, lon } = req.query
  const service = new GeoService()
  const district = await service.findDistrictByCoordinates(lat, lon)
  res.json(district)
})

// GET /api/geo/near?lat=31.5204&lon=74.3587&radius=5
router.get('/near', async (req, res) => {
  const { lat, lon, radius = 10 } = req.query
  const service = new GeoService()
  const locations = await service.findLocationsNear(lat, lon, radius)
  res.json(locations)
})

// GET /api/geo/districts/geojson
router.get('/districts/geojson', async (req, res) => {
  const service = new GeoService()
  const geojson = await service.getAllDistrictsGeo()
  res.json(geojson)
})

// GET /api/geo/district/:id/boundary
router.get('/district/:id/boundary', async (req, res) => {
  const service = new GeoService()
  const boundary = await service.getDistrictBoundary(req.params.id)
  res.json(boundary)
})

// GET /api/geo/distance?lat1=31.5&lon1=74.3&lat2=32.0&lon2=74.5
router.get('/distance', async (req, res) => {
  const { lat1, lon1, lat2, lon2 } = req.query
  const service = new GeoService()
  const distance = await service.getDistance(lat1, lon1, lat2, lon2)
  res.json({ distance_km: distance })
})
```

#### Task 2.7: Create GIS Map Viewer Component (15 hours)
**Status:** Not Started  
**Assignee:** Frontend  
**Create:** `client/src/components/GISMapViewer.tsx`

**Features:**
1. **Map Display** (5 hours)
   - Leaflet integration with OpenStreetMap
   - District boundaries layer
   - Zoom to Pakistan (4-12x)
   - Layer toggle control
   - Full screen mode

2. **Markers** (5 hours)
   - Business location markers
   - Custom marker icons by type
   - Marker clustering for performance
   - Popup on click with business info
   - Marker drag for location picking

3. **Tools** (5 hours)
   - Location picker (click to get coordinates)
   - Search by district name
   - Distance measurement tool
   - Area selection tool
   - Print map functionality

**Component Code Example:**
```typescript
// GISMapViewer.tsx
import { MapContainer, TileLayer, GeoJSON, useMap, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

const GISMapViewer = ({ onLocationSelected }) => {
  const mapRef = useRef(null)
  const [districtGeoJSON, setDistrictGeoJSON] = useState(null)
  const [markers, setMarkers] = useState([])
  
  // Load districts on mount
  useEffect(() => {
    fetchDistrictGeoJSON()
  }, [])
  
  const fetchDistrictGeoJSON = async () => {
    const response = await fetch('/api/geo/districts/geojson')
    const data = await response.json()
    setDistrictGeoJSON(data)
  }
  
  // Add marker on map click
  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng
    onLocationSelected({ latitude: lat, longitude: lng })
    setMarkers([...markers, { lat, lng }])
  }
  
  return (
    <MapContainer
      center={[31.5204, 74.3587]} // Pakistan center
      zoom={6}
      className="h-96"
      ref={mapRef}
      onClick={handleMapClick}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {districtGeoJSON && (
        <GeoJSON data={districtGeoJSON} style={districtStyle} />
      )}
      
      {markers.map((marker, idx) => (
        <Marker key={idx} position={[marker.lat, marker.lng]}>
          <Popup>Lat: {marker.lat}, Lon: {marker.lng}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
```

#### Task 2.8: Create Location Selection Forms (10 hours)
**Status:** Not Started  
**Assignee:** Frontend  

**Components:**
1. DistrictSelector.tsx - dropdown + map
2. TehsilSelector.tsx - dynamic based on district
3. CoordinatePicker.tsx - map-based + manual entry
4. LocationValidator.tsx - validates lat/lon ranges

---

### **Week 9-10: Application Status & Workflow UI (40 hours)**

#### Task 2.9: Create Application Status Tracking UI (20 hours)
**Status:** Not Started  
**Assignee:** Frontend  

**Pages:**
1. **ApplicationList.tsx** (8 hours)
   - Table with columns: ID, Status, District, Progress, Last Updated
   - Filters: Status, Group, District, Date Range
   - Sort: By status, by date, by district
   - Search by tracking number
   - Actions: View, Edit, Download, Share

2. **ApplicationDetail.tsx** (12 hours)
   - Full application view
   - Workflow progress visualization
   - Timeline of all changes
   - Current stage details
   - Action buttons (based on user group)
   - Documents section
   - Comments/notes section
   - Print application

#### Task 2.10: Create Role-Based Dashboard (15 hours)
**Status:** Not Started  
**Assignee:** Frontend  

**Dashboards:**

1. **ApplicantDashboard.tsx**
   - My applications (with status)
   - Pending actions for me
   - Payments due
   - Recent updates
   - Download documents

2. **LSODashboard.tsx**
   - Applications for review (assigned to LSO)
   - Pending document requests
   - Approved/Rejected count
   - Average review time
   - Bulk actions

3. **PITBDashboard.tsx**
   - Technical review queue
   - Inspection scheduled
   - Reports
   - Compliance metrics

4. **AdminDashboard.tsx**
   - System metrics
   - User management
   - Data imports/exports
   - System logs
   - Configuration

---

## PHASE 3: PAYMENTS & FINANCE (Weeks 11-14 | 120 Hours)

### **Week 11-12: Payment Integration (60 hours)**

#### Task 3.1: Payment Model & Database (10 hours)

**Models:**
```typescript
interface PaymentTransaction {
  id: string (UUID)
  application: FK → ApplicantDetail
  transactionId: string
  amount: Decimal
  currency: 'PKR'
  gateway: enum('PITB' | 'PSID' | 'BANK')
  status: enum('Initiated' | 'Pending' | 'Completed' | 'Failed' | 'Refunded')
  requestData: JSON
  responseData: JSON
  bankChalan?: string
  receiptNumber?: string
  paidAt?: Date
  failureReason?: Text
  retryCount: number (default 0)
  createdAt: Date
  updatedAt: Date
}

interface BankChalan {
  id: string (UUID)
  application: FK → ApplicantDetail
  chalanNumber: string (unique)
  amount: Decimal
  dueDate: Date
  bankCode: string
  bankName: string
  accountTitle: string
  accountNumber: string
  status: enum('Active' | 'Paid' | 'Expired' | 'Cancelled')
  generatedAt: Date
  paidAt?: Date
  paymentTransaction?: FK → PaymentTransaction
  qrCode: string (embedded QR)
  barCode: string (embedded barcode)
}

interface ApplicationFee {
  id: string
  application: FK → ApplicantDetail
  feeType: enum('Registration' | 'Verification' | 'License_Issuance' | 'Inspection' | 'Renewal' | 'Penalty')
  amount: Decimal
  dueDate: Date
  paidDate?: Date
  status: enum('Pending' | 'Paid' | 'Waived' | 'Overdue')
  paymentTransaction?: FK → PaymentTransaction
  createdAt: Date
}
```

#### Task 3.2: Bank Chalan Generation (15 hours)

**Service:**
```typescript
class BankChalanService {
  async generateChalan(applicationId: string, feeAmount: number): Promise<BankChalan> {
    const app = await ApplicantDetail.findById(applicationId)
    
    // Calculate due date (30 days from now)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)
    
    // Generate unique chalan number
    const chalanNumber = this.generateChalanNumber(app.district?.short_name)
    
    // Create bank chalan
    const chalan = new BankChalan({
      application: applicationId,
      chalanNumber,
      amount: feeAmount,
      dueDate,
      bankCode: 'ALLIED', // or configured bank
      bankName: 'Allied Bank Limited',
      accountTitle: 'PMC Registration Account',
      accountNumber: '1234567890',
      status: 'Active'
    })
    
    // Generate QR code
    chalan.qrCode = await this.generateQRCode(chalanNumber, feeAmount)
    
    // Generate barcode
    chalan.barCode = await this.generateBarcode(chalanNumber)
    
    await chalan.save()
    
    // Create fee record
    await ApplicationFee.create({
      application: applicationId,
      feeType: 'Registration',
      amount: feeAmount,
      dueDate,
      status: 'Pending'
    })
    
    return chalan
  }
  
  private generateChalanNumber(districtCode: string): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const sequence = Math.floor(Math.random() * 10000)
    
    return `${districtCode}-${year}${month}${day}-${String(sequence).padStart(4, '0')}`
  }
  
  private async generateQRCode(chalanNumber: string, amount: number): Promise<string> {
    const qrData = {
      chalanNumber,
      amount,
      date: new Date(),
      bank: 'ALLIED'
    }
    
    const qrCode = await qrcode.toDataURL(JSON.stringify(qrData))
    return qrCode
  }
  
  private async generateBarcode(chalanNumber: string): Promise<string> {
    // Use bwip-js or similar library
    const barcode = await bwipjs.toSVG({
      bcid: 'code128',
      text: chalanNumber,
      scale: 3,
      height: 10,
      includetext: true
    })
    return barcode
  }
}
```

#### Task 3.3: Payment Gateway Integration (20 hours)

**PITB Integration:**
```typescript
class PITBPaymentGateway implements PaymentGateway {
  private merchantId: string
  private apiKey: string
  private apiSecret: string
  
  constructor(config: PaymentConfig) {
    this.merchantId = config.pitbMerchantId
    this.apiKey = config.pitbApiKey
    this.apiSecret = config.pitbApiSecret
  }
  
  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    const payload = {
      merchant_id: this.merchantId,
      transaction_id: request.transactionId,
      amount: request.amount,
      currency: 'PKR',
      description: `Application Fee - ${request.applicationId}`,
      return_url: `${env.appUrl}/payments/success`,
      cancel_url: `${env.appUrl}/payments/cancel`,
      timestamp: new Date().toISOString()
    }
    
    // Sign payload
    const signature = this.signPayload(payload)
    payload.signature = signature
    
    try {
      const response = await axios.post(
        'https://gateway.pitb.gov.pk/api/payments/initiate',
        payload,
        { headers: { 'X-API-Key': this.apiKey } }
      )
      
      return {
        success: true,
        redirectUrl: response.data.redirect_url,
        transactionId: response.data.transaction_id,
        timestamp: new Date()
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      }
    }
  }
  
  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    const signature = this.signPayload({ transaction_id: transactionId })
    
    try {
      const response = await axios.get(
        `https://gateway.pitb.gov.pk/api/payments/verify/${transactionId}`,
        {
          headers: {
            'X-API-Key': this.apiKey,
            'X-Signature': signature
          }
        }
      )
      
      return {
        verified: response.data.status === 'COMPLETED',
        transactionId,
        amount: response.data.amount,
        timestamp: response.data.timestamp,
        reference: response.data.reference_number
      }
    } catch (error) {
      return {
        verified: false,
        error: error.message
      }
    }
  }
  
  private signPayload(data: any): string {
    const message = JSON.stringify(data)
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex')
  }
}
```

**Webhook Handler:**
```typescript
// POST /api/payments/webhooks/pitb
router.post('/webhooks/pitb', async (req, res) => {
  const { transaction_id, status, amount, reference_number } = req.body
  
  try {
    // Verify signature
    if (!verifyWebhookSignature(req)) {
      return res.status(401).json({ error: 'Invalid signature' })
    }
    
    // Update transaction
    const transaction = await PaymentTransaction.findOne({ transactionId: transaction_id })
    
    if (status === 'COMPLETED') {
      transaction.status = 'Completed'
      transaction.responseData = req.body
      await transaction.save()
      
      // Update application
      const app = await ApplicantDetail.findById(transaction.application)
      app.paymentConfirmed = true
      app.applicationStatus = 'PaymentConfirmed'
      await app.save()
      
      // Send confirmation email
      await emailService.sendPaymentConfirmation(app)
    } else if (status === 'FAILED') {
      transaction.status = 'Failed'
      await transaction.save()
      // Notify applicant
    }
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

#### Task 3.4: Payment API Endpoints (10 hours)

**Endpoints:**
```typescript
// POST /api/payments/initiate
router.post('/initiate', authenticate, async (req, res) => {
  const { applicationId, amount } = req.body
  const service = new PaymentService()
  const payment = await service.initiatePayment(applicationId, amount)
  res.json(payment)
})

// GET /api/payments/:transactionId/status
router.get('/:transactionId/status', async (req, res) => {
  const service = new PaymentService()
  const status = await service.getPaymentStatus(req.params.transactionId)
  res.json(status)
})

// GET /api/payments/chalan/:applicationId
router.get('/chalan/:applicationId', async (req, res) => {
  const service = new BankChalanService()
  const chalan = await service.getChalan(req.params.applicationId)
  res.json(chalan)
})

// POST /api/payments/chalan/:applicationId/regenerate
router.post('/chalan/:applicationId/regenerate', authenticate, authorize(['ADMIN']), async (req, res) => {
  const service = new BankChalanService()
  const chalan = await service.regenerateChalan(req.params.applicationId)
  res.json(chalan)
})

// GET /api/payments/:applicationId/history
router.get('/:applicationId/history', authenticate, async (req, res) => {
  const service = new PaymentService()
  const history = await service.getPaymentHistory(req.params.applicationId)
  res.json(history)
})
```

#### Task 3.5: Payment UI (15 hours)

**Components:**
1. **PaymentForm.tsx** (8 hours)
   - Display bank chalan info
   - Button to initiate payment
   - Payment status tracking
   - Receipt download

2. **PaymentStatus.tsx** (5 hours)
   - Real-time payment status
   - Polling for confirmation
   - Success/failure views

3. **ChalanPrintable.tsx** (2 hours)
   - Print-friendly chalan format
   - QR code + barcode
   - Bank details

---

## PHASE 4: ADVANCED FEATURES (Weeks 15-20 | 150 Hours)

### **Week 15-16: License Management System (40 hours)**

#### Task 4.1: License Models & Database (8 hours)

**Models:**
```typescript
interface License {
  id: string (UUID)
  application: FK → ApplicantDetail
  licenseNumber: string (unique)
  licenseType: FK → LicenseType
  status: enum('Issued' | 'Active' | 'Expired' | 'Suspended' | 'Revoked')
  issueDate: Date
  expiryDate: Date
  issueAuthority: string
  certificateNumber: string
  documentPath: string (path to PDF)
  qrCode: string
  termsAndConditions: Text
  renewalEligibleFrom?: Date
  renewalEligibleUntil?: Date
  suspensionReasons?: Text[]
  revocationReasons?: Text[]
  createdAt: Date
  updatedAt: Date
}

interface LicenseType {
  id: string
  name: enum('Registration' | 'Operation' | 'Special' | 'Temporary')
  validityDays: number
  renewalValidityDays: number
  fee: Decimal
  requirements: Text[]
  createdAt: Date
}

interface LicenseRenewal {
  id: string
  license: FK → License
  newLicense: FK → License
  renewalDate: Date
  renewalFee: Decimal
  renewalReason: enum('Expiry' | 'Change' | 'Upgrade')
  approvedBy: User FK
  approvedDate: Date
  referenceDocument?: string
}
```

#### Task 4.2: License Service (15 hours)

```typescript
class LicenseService {
  async issueLicense(applicationId: string, licenseTypeId: string): Promise<License> {
    const app = await ApplicantDetail.findById(applicationId)
    const type = await LicenseType.findById(licenseTypeId)
    
    // Calculate dates
    const issueDate = new Date()
    const expiryDate = new Date(issueDate)
    expiryDate.setDate(expiryDate.getDate() + type.validityDays)
    
    // Generate license number
    const licenseNumber = this.generateLicenseNumber(app, type)
    
    // Create license
    const license = new License({
      application: applicationId,
      licenseNumber,
      licenseType: licenseTypeId,
      status: 'Issued',
      issueDate,
      expiryDate,
      issueAuthority: 'Punjab Ministry of Commerce',
      certificateNumber: this.generateCertificateNumber()
    })
    
    // Generate certificate PDF
    license.documentPath = await this.generateLicenseCertificate(license, app)
    license.qrCode = await this.generateQRCode(license)
    
    await license.save()
    
    // Update application status
    app.applicationStatus = 'LicenseIssued'
    app.hasActiveLicense = true
    await app.save()
    
    // Send notification
    await emailService.sendLicenseIssuanceNotification(app, license)
    
    return license
  }
  
  async renewLicense(licenseId: string, userId: string): Promise<License> {
    const oldLicense = await License.findById(licenseId)
    const licenseType = await LicenseType.findById(oldLicense.licenseType)
    
    // Check renewal eligibility
    if (new Date() < oldLicense.renewalEligibleFrom) {
      throw new Error('License renewal not yet eligible')
    }
    
    // Create new license
    const newLicense = await this.issueLicense(oldLicense.application, licenseType.id)
    
    // Create renewal record
    await LicenseRenewal.create({
      license: licenseId,
      newLicense: newLicense.id,
      renewalDate: new Date(),
      renewedBy: userId,
      renewalFee: licenseType.fee
    })
    
    // Update old license status
    oldLicense.status = 'Renewed'
    await oldLicense.save()
    
    return newLicense
  }
  
  async checkLicenseValidity(applicationId: string): Promise<LicenseValidityStatus> {
    const license = await License.findOne({
      application: applicationId,
      status: { $in: ['Active', 'Issued'] }
    })
    
    if (!license) {
      return { valid: false, reason: 'No active license' }
    }
    
    const today = new Date()
    if (today > license.expiryDate) {
      return { valid: false, reason: 'License expired' }
    }
    
    if (license.status === 'Suspended' || license.status === 'Revoked') {
      return { valid: false, reason: license.status }
    }
    
    // Check renewal eligibility
    const daysUntilExpiry = Math.floor((license.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const renewalEligible = daysUntilExpiry <= 30
    
    return {
      valid: true,
      valid,
      licenseNumber: license.licenseNumber,
      expiryDate: license.expiryDate,
      daysRemaining: daysUntilExpiry,
      renewalEligible
    }
  }
  
  async getLicenseHistory(applicationId: string): Promise<License[]> {
    return License.find({ application: applicationId })
      .sort({ issueDate: -1 })
      .populate('licenseType')
  }
  
  private generateLicenseNumber(app: ApplicantDetail, type: LicenseType): string {
    const year = new Date().getFullYear()
    const typeCode = type.name.substring(0, 3).toUpperCase()
    const sequence = Math.floor(Math.random() * 100000)
    
    return `PMC-${year}-${typeCode}-${String(sequence).padStart(5, '0')}`
  }
  
  private generateCertificateNumber(): string {
    return `CERT-${Date.now()}-${Math.random().toString(36).substring(7)}`
  }
  
  private async generateLicenseCertificate(license: License, app: ApplicantDetail): Promise<string> {
    // Use HTML to PDF conversion (similar to bank chalan)
    // Return path to saved PDF
  }
  
  private async generateQRCode(license: License): Promise<string> {
    const qrData = {
      licenseNumber: license.licenseNumber,
      certificateNumber: license.certificateNumber,
      expiryDate: license.expiryDate,
      verifyUrl: `${env.appUrl}/verify/license/${license.id}`
    }
    
    return await qrcode.toDataURL(JSON.stringify(qrData))
  }
}
```

#### Task 4.3: License API Endpoints (8 hours)

```typescript
// POST /api/licenses/issue
router.post('/issue', authenticate, authorize(['SSG', 'ADMIN']), async (req, res) => {
  const { applicationId, licenseTypeId } = req.body
  const service = new LicenseService()
  const license = await service.issueLicense(applicationId, licenseTypeId)
  res.json(license)
})

// PUT /api/licenses/:id/renew
router.put('/:id/renew', authenticate, authorize(['APPLICANT', 'ADMIN']), async (req, res) => {
  const service = new LicenseService()
  const newLicense = await service.renewLicense(req.params.id, req.user.id)
  res.json(newLicense)
})

// GET /api/licenses/:applicationId/validity
router.get('/:applicationId/validity', async (req, res) => {
  const service = new LicenseService()
  const validity = await service.checkLicenseValidity(req.params.applicationId)
  res.json(validity)
})

// GET /api/licenses/:applicationId/history
router.get('/:applicationId/history', authenticate, async (req, res) => {
  const service = new LicenseService()
  const history = await service.getLicenseHistory(req.params.applicationId)
  res.json(history)
})

// GET /api/licenses/verify/:id
router.get('/verify/:id', async (req, res) => {
  const license = await License.findById(req.params.id)
    .populate('application', 'firstName lastName cnic')
    .populate('licenseType')
  
  res.json({
    verified: !!license,
    license: license ? {
      licenseNumber: license.licenseNumber,
      applicant: `${license.application.firstName} ${license.application.lastName}`,
      cnic: license.application.cnic,
      type: license.licenseType.name,
      issueDate: license.issueDate,
      expiryDate: license.expiryDate,
      status: license.status
    } : null
  })
})
```

#### Task 4.4: License Frontend Components (9 hours)

**Components:**
1. **LicenseIssueForm.tsx** - Form to issue license
2. **LicenseRenewalForm.tsx** - Renewal interface
3. **LicenseViewer.tsx** - Display license details and PDF
4. **LicenseValidator.tsx** - Public license verification
5. **LicenseHistory.tsx** - Timeline of all licenses

---

### **Week 17-18: Inspection System (40 hours)**

#### Task 4.5: Inspection Models (8 hours)

```typescript
interface Inspection {
  id: string
  application: FK → ApplicantDetail
  inspector: FK → User
  scheduledDate: Date
  completedDate?: Date
  location: {
    latitude: Decimal
    longitude: Decimal
    address: Text
  }
  status: enum('Scheduled' | 'InProgress' | 'Completed' | 'Passed' | 'Failed' | 'Rescheduled')
  inspectionType: enum('Initial' | 'Revisit' | 'Final' | 'Random')
  report: Text
  passedStatus?: boolean
  failureReasons?: Text[]
  photos: InspectionPhoto[]
  comments: Comment[]
  createdAt: Date
}

interface InspectionPhoto {
  id: string
  inspection: FK → Inspection
  url: string
  caption: Text
  uploadedAt: Date
  gpsCoordinates?: {
    latitude: Decimal
    longitude: Decimal
    timestamp: Date
  }
}

interface InspectionChecklistItem {
  id: string
  inspectionType: enum(...)
  itemName: string
  description: Text
  required: boolean
  order: number
}

interface InspectionResponse {
  id: string
  inspection: FK → Inspection
  checklistItem: FK → InspectionChecklistItem
  response: enum('Yes' | 'No' | 'N/A' | 'Partial')
  remarks: Text
  photosRequired: boolean
  photos?: InspectionPhoto[]
}
```

#### Task 4.6: Inspection Service (15 hours)

```typescript
class InspectionService {
  async scheduleInspection(
    applicationId: string,
    inspectorId: string,
    date: Date
  ): Promise<Inspection> {
    const app = await ApplicantDetail.findById(applicationId)
      .populate('businessProfile')
    
    if (app.applicationStatus !== 'InspectionPending') {
      throw new Error('Application not in inspection pending stage')
    }
    
    const inspection = new Inspection({
      application: applicationId,
      inspector: inspectorId,
      scheduledDate: date,
      status: 'Scheduled',
      location: {
        latitude: app.businessProfile.location.latitude,
        longitude: app.businessProfile.location.longitude,
        address: app.businessProfile.location.postalAddress
      }
    })
    
    await inspection.save()
    
    // Send notification to inspector
    await emailService.sendInspectionScheduled(inspectorId, inspection)
    
    // Send notification to applicant
    await emailService.sendInspectionScheduledToApplicant(applicationId, inspection)
    
    return inspection
  }
  
  async startInspection(inspectionId: string): Promise<Inspection> {
    const inspection = await Inspection.findByIdAndUpdate(
      inspectionId,
      {
        status: 'InProgress',
        actualStartTime: new Date()
      },
      { new: true }
    )
    
    return inspection
  }
  
  async completeInspection(
    inspectionId: string,
    passed: boolean,
    report: Text,
    failureReasons?: string[]
  ): Promise<Inspection> {
    const inspection = await Inspection.findById(inspectionId)
    
    inspection.status = passed ? 'Passed' : 'Failed'
    inspection.passedStatus = passed
    inspection.completedDate = new Date()
    inspection.report = report
    
    if (!passed) {
      inspection.failureReasons = failureReasons
    }
    
    await inspection.save()
    
    // Update application status
    const app = await ApplicantDetail.findById(inspection.application)
    app.applicationStatus = passed ? 'InspectionPassed' : 'InspectionFailed'
    
    if (passed) {
      app.applicationStatus = 'FinalDocuments'
    } else {
      app.applicationStatus = 'Rejected'
    }
    
    await app.save()
    
    // Send notifications
    await emailService.sendInspectionResult(inspection)
    
    return inspection
  }
  
  async uploadInspectionPhoto(
    inspectionId: string,
    file: Express.Multer.File,
    caption: string,
    gpsCoordinates?: { latitude: number; longitude: number }
  ): Promise<InspectionPhoto> {
    // Upload file to storage
    const url = await storage.uploadFile(file, `inspections/${inspectionId}/`)
    
    const photo = new InspectionPhoto({
      inspection: inspectionId,
      url,
      caption,
      gpsCoordinates: {
        ...gpsCoordinates,
        timestamp: new Date()
      }
    })
    
    await photo.save()
    return photo
  }
  
  async getChecklistForType(inspectionType: string): Promise<InspectionChecklistItem[]> {
    return InspectionChecklistItem.find({ inspectionType })
      .sort({ order: 1 })
  }
  
  async submitChecklistResponse(
    inspectionId: string,
    responses: InspectionResponseDTO[]
  ): Promise<InspectionResponse[]> {
    const saved = await InspectionResponse.insertMany(
      responses.map(r => ({
        inspection: inspectionId,
        checklistItem: r.checklistItemId,
        response: r.response,
        remarks: r.remarks,
        photosRequired: r.photosRequired
      }))
    )
    
    return saved
  }
}
```

#### Task 4.7: Inspection API Endpoints (8 hours)

```typescript
// POST /api/inspections/schedule
router.post('/schedule', authenticate, authorize(['ADMIN', 'LSO']), async (req, res) => {
  const { applicationId, inspectorId, date } = req.body
  const service = new InspectionService()
  const inspection = await service.scheduleInspection(applicationId, inspectorId, date)
  res.json(inspection)
})

// POST /api/inspections/:id/start
router.post('/:id/start', authenticate, authorize(['INSPECTOR']), async (req, res) => {
  const service = new InspectionService()
  const inspection = await service.startInspection(req.params.id)
  res.json(inspection)
})

// POST /api/inspections/:id/complete
router.post('/:id/complete', authenticate, authorize(['INSPECTOR']), async (req, res) => {
  const { passed, report, failureReasons } = req.body
  const service = new InspectionService()
  const inspection = await service.completeInspection(
    req.params.id,
    passed,
    report,
    failureReasons
  )
  res.json(inspection)
})

// POST /api/inspections/:id/photos
router.post('/:id/photos', authenticate, upload.single('photo'), async (req, res) => {
  const service = new InspectionService()
  const photo = await service.uploadInspectionPhoto(
    req.params.id,
    req.file,
    req.body.caption,
    req.body.coordinates ? JSON.parse(req.body.coordinates) : undefined
  )
  res.json(photo)
})

// GET /api/inspections/:id/checklist
router.get('/:id/checklist', authenticate, async (req, res) => {
  const inspection = await Inspection.findById(req.params.id)
  const service = new InspectionService()
  const checklist = await service.getChecklistForType(inspection.inspectionType)
  res.json(checklist)
})

// POST /api/inspections/:id/checklist-response
router.post('/:id/checklist-response', authenticate, async (req, res) => {
  const service = new InspectionService()
  const responses = await service.submitChecklistResponse(req.params.id, req.body.responses)
  res.json(responses)
})

// GET /api/inspections?status=Pending&district=LHR
router.get('/', authenticate, async (req, res) => {
  const query = Inspection.find()
  
  if (req.query.status) query.where({ status: req.query.status })
  if (req.query.district) {
    // Filter by district through application relationship
    const apps = await ApplicantDetail.find({
      'businessProfile.district': req.query.district
    })
    query.where({ application: { $in: apps.map(a => a.id) } })
  }
  
  const inspections = await query.populate('application').populate('inspector')
  res.json(inspections)
})
```

#### Task 4.8: Inspection Mobile/Offline Forms (9 hours)

**Features:**
- Offline-capable inspection forms
- GPS tracking during inspection
- Photo upload from mobile camera
- Timestamp for each entry
- Signature capture
- Sync when network available

---

### **Week 19-20: Reporting & Analytics (40 hours)**

#### Task 4.9: Report Models & Generation (15 hours)

```typescript
interface Report {
  id: string
  reportType: enum('ApplicationStatus' | 'PaymentSummary' | 'LicenseIssued' | etc.)
  generatedBy: User FK
  filters: FilterConfig (JSON)
  dataRange: {
    fromDate: Date
    toDate: Date
  }
  resultCount: number
  generatedAt: Date
  expiresAt: Date
  filePath: string (path to generated PDF/Excel)
  status: enum('Generating' | 'Ready' | 'Failed')
  downloadCount: number
}

interface ReportTemplate {
  id: string
  name: string
  description: Text
  reportType: enum(...)
  fields: string[]
  groupBy?: string
  orderBy?: string
  aggregations?: Aggregation[]
  chartConfigs?: ChartConfig[]
}

interface SavedReportView {
  id: string
  name: string
  user: FK → User
  reportTemplate: FK → ReportTemplate
  filters: JSON
  defaultGrouping: string
  defaultChart?: enum(...)
  isPublic: boolean
  createdAt: Date
}
```

#### Task 4.10: Analytics Service (20 hours)

```typescript
class AnalyticsService {
  async generateApplicationStatusReport(
    filters: ReportFilterDTO
  ): Promise<Report> {
    // Query applications with filters
    const query = ApplicantDetail.find()
    
    if (filters.status) query.where({ applicationStatus: filters.status })
    if (filters.district) query.where({ 'businessProfile.district': filters.district })
    if (filters.fromDate || filters.toDate) {
      query.where({
        createdAt: {
          ...(filters.fromDate && { $gte: filters.fromDate }),
          ...(filters.toDate && { $lte: filters.toDate })
        }
      })
    }
    
    const applications = await query.exec()
    
    // Group by status
    const groupedByStatus = this.groupBy(applications, 'applicationStatus')
    const grouped ByDistrict = this.groupBy(applications, 'businessProfile.district')
    
    // Generate statistics
    const stats = {
      total: applications.length,
      byStatus: this.summarizeGroups(groupedByStatus),
      byDistrict: this.summarizeGroups(groupedByDistrict),
      averageProcessingTime: this.calculateAverageProcessingTime(applications),
      conversionRate: this.calculateConversionRate(applications),
      pendingCount: applications.filter(a => a.applicationStatus.includes('Pending')).length
    }
    
    // Generate PDF report
    const pdfPath = await this.generatePDF({
      title: 'Application Status Report',
      data: stats,
      charts: [
        { type: 'pie', data: stats.byStatus, title: 'Applications by Status' },
        { type: 'bar', data: stats.byDistrict, title: 'Applications by District' }
      ]
    })
    
    // Create report record
    const report = new Report({
      reportType: 'ApplicationStatus',
      generatedBy: userId,
      filters,
      resultCount: applications.length,
      filePath: pdfPath,
      status: 'Ready'
    })
    
    await report.save()
    return report
  }
  
  async generatePaymentSummaryReport(filters: ReportFilterDTO): Promise<Report> {
    // Query payments
    const payments = await PaymentTransaction.find()
      .where({
        createdAt: {
          ...(filters.fromDate && { $gte: filters.fromDate }),
          ...(filters.toDate && { $lte: filters.toDate })
        }
      })
      .populate('application')
    
    // Calculate summaries
    const stats = {
      total_amount: payments.reduce((sum, p) => sum + p.amount, 0),
      total_transactions: payments.length,
      successful: payments.filter(p => p.status === 'Completed').length,
      failed: payments.filter(p => p.status === 'Failed').length,
      pending: payments.filter(p => p.status === 'Pending').length,
      byGateway: this.groupBy(payments, 'gateway'),
      byStatus: this.groupBy(payments, 'status')
    }
    
    // Generate visualization
    // ... similar to above
  }
  
  async generateLicenseIssuanceReport(filters: ReportFilterDTO): Promise<Report> {
    const licenses = await License.find()
      .where({
        issueDate: {
          ...(filters.fromDate && { $gte: filters.fromDate }),
          ...(filters.toDate && { $lte: filters.toDate })
        }
      })
      .populate('application', 'businessProfile.district')
      .populate('licenseType')
    
    // Group and aggregate
    const stats = {
      total_issued: licenses.length,
      active: licenses.filter(l => l.status === 'Active').length,
      expired: licenses.filter(l => l.status === 'Expired').length,
      byType: this.groupBy(licenses, 'licenseType.name'),
      byDistrict: this.groupBy(licenses, 'application.businessProfile.district')
    }
    
    // Generate PDF with charts
    // ...
  }
  
  async getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
    const user = await User.findById(userId).populate('groups')
    const userGroups = user.groups.map(g => g.name)
    
    // Get applications for user's groups
    let applicationQuery = ApplicantDetail.find()
    if (!userGroups.includes('ADMIN')) {
      applicationQuery.where({ assignedGroup: { $in: userGroups } })
    }
    const applications = await applicationQuery.exec()
    
    return {
      applications: {
        total: applications.length,
        pending: applications.filter(a => a.applicationStatus.includes('Pending')).length,
        byStatus: this.groupByCount(applications, 'applicationStatus')
      },
      payments: {
        total_amount: await this.getTotalPayments(userGroups),
        pending_amount: await this.getPendingPaymentsAmount(userGroups),
        success_rate: await this.getPaymentSuccessRate(userGroups)
      },
      licenses: {
        issued_this_month: await this.getLicensesIssuedThisMonth(userGroups),
        active: await this.getActiveLicensesCount(userGroups)
      },
      timeline: {
        average_processing_days: this.calculateAverageProcessingTime(applications),
        slowest_stage: this.findSlowestStage(applications),
        fastest_stage: this.findFastestStage(applications)
      }
    }
  }
}
```

#### Task 4.11: Reporting API & Export (5 hours)

```typescript
// POST /api/reports/application-status
router.post('/application-status', authenticate, async (req, res) => {
  const service = new AnalyticsService()
  const report = await service.generateApplicationStatusReport(req.body.filters)
  res.json(report)
})

// POST /api/reports/payment-summary
router.post('/payment-summary', authenticate, async (req, res) => {
  const service = new AnalyticsService()
  const report = await service.generatePaymentSummaryReport(req.body.filters)
  res.json(report)
})

// GET /api/reports/:id/download
router.get('/:id/download', authenticate, async (req, res) => {
  const report = await Report.findById(req.params.id)
  
  // Check permissions
  if (req.user.id !== report.generatedBy && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  res.download(report.filePath)
  
  // Update download count
  report.downloadCount += 1
  await report.save()
})

// GET /api/dashboard/metrics
router.get('/dashboard/metrics', authenticate, async (req, res) => {
  const service = new AnalyticsService()
  const metrics = await service.getDashboardMetrics(req.user.id)
  res.json(metrics)
})

// POST /api/reports/export-excel
router.post('/export-excel', authenticate, async (req, res) => {
  const { reportType, filters } = req.body
  // Generate and send Excel file
})

// POST /api/reports/export-csv
router.post('/export-csv', authenticate, async (req, res) => {
  const { reportType, filters } = req.body
  // Generate and send CSV file
})
```

---

## PHASE 5: POLISH & DEPLOYMENT (Weeks 21-24 | 80 Hours)

### **Week 21: Testing (20 hours)**

#### Task 5.1: Unit Tests
- API endpoint tests
- Service layer tests
- Utility function tests

#### Task 5.2: Integration Tests
- Workflow transitions
- Payment gateway integration
- Email notifications
- File uploads

#### Task 5.3: End-to-End Tests
- Complete application workflow
- Payment flow
- License issuance
- Inspection process

### **Week 22: Documentation (20 hours)**

#### Task 5.4: API Documentation
- OpenAPI/Swagger specs
- Endpoint descriptions
- Request/response examples
- Error handling

#### Task 5.5: User Documentation
- Administrator guide
- User manuals per role
- Video tutorials
- FAQ

### **Week 23: Performance & Security (20 hours)**

#### Task 5.6: Performance Optimization
- Database query optimization
- Caching strategy
- Frontend bundle optimization
- Image optimization

#### Task 5.7: Security Hardening
- Permission verification
- Input validation
- SQL injection prevention
- XSS protection

### **Week 24: Deployment Preparation (20 hours)**

#### Task 5.8: Environment Setup
- Production database setup
- Backup strategy
- Monitoring setup
- Logging configuration

#### Task 5.9: Deployment & Training
- Deploy to production
- Data migration
- User training sessions
- Go-live support

---

## IMPLEMENTATION PRIORITIES

### MUST-HAVE (Critical Path - Do First)
1. Database migration to PostgreSQL + PostGIS (Week 1-2)
2. Location data models + seeding (Week 1-2)
3. Advanced RBAC system (Week 1-3)
4. 8-Stage workflow system (Week 5-6)
5. Application models + services (Week 1-3)
6. Payment integration (Week 11-12)
7. Testing suite (Week 21)

### SHOULD-HAVE (High Value)
1. GIS integration (Week 7-8)
2. License management (Week 15-16)
3. Inspection system (Week 17-18)
4. Reporting/Analytics (Week 19-20)
5. Frontend workflow UI (Week 9-10)

### NICE-TO-HAVE (Enhancements)
1. Advanced analytics dashboards
2. Mobile app
3. Multi-language support enhancements
4. PDF generation improvements
5. Custom report builder

---

## RESOURCE REQUIREMENTS

### Team Composition (Recommended)
- **Backend Lead** (1 person): Architecture, APIs, databases
- **Frontend Lead** (1 person): UI/UX, components, forms
- **DevOps/Database** (0.5-1 person): Infrastructure, PostGIS, deployment
- **QA Engineer** (0.5-1 person): Testing, documentation
- **Project Manager** (0.5 person): Tracking, coordination

### Tools & Technologies Required
- **Database:** PostgreSQL 14+ with PostGIS
- **Backend:** Node.js/Express + TypeScript
- **Frontend:** React + TypeScript
- **Mapping:** Leaflet + OpenStreetMap
- **Reports:** ReportLab/WeasyPrint or similar
- **Testing:** Jest, Cypress, Supertest
- **CI/CD:** GitHub Actions or similar
- **Deployment:** Docker, Kubernetes (optional)

### Dependencies to Install
```bash
# Backend
npm install postgis pg geojson qrcode pdfkit cors helmet compression morgan

# Frontend
npm install leaflet react-leaflet chart.js react-chartjs-2 axios

# Development
npm install --save-dev typescript jest @testing-library/react cypress
```

---

## SUCCESS METRICS

- ✅ All 47 missing features implemented
- ✅ 90%+ test coverage
- ✅ API response time < 200ms (p95)
- ✅ Database performance optimized (indexes, queries)
- ✅ Zero critical security vulnerabilities
- ✅ All users can complete workflows without issues
- ✅ Payment gateway integration working flawlessly
- ✅ GIS functionality fully operational
- ✅ Reporting system generating accurate data
- ✅ User training completed
- ✅ Documentation comprehensive and current

---

## RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| PostGIS migration data loss | Low | Critical | Backup current DB, test migration scripts, rollback plan |
| Payment gateway delays | Medium | High | Start PITB integration early, have alternate gateway ready |
| GIS performance issues | Medium | Medium | Optimize spatial indexes, consider caching layer |
| Scope creep | High | High | Lock requirements early, use change control process |
| Resource unavailability | Medium | Medium | Cross-train team members, document processes |
| Testing delays | Medium | Medium | Start testing in parallel, use automated testing heavily |

---

## NEXT STEPS

1. **Finalize Team & Schedule** (Week 0)
   - Assign developers to phases
   - Set up development environment
   - Create Jira/GitHub issues for each task

2. **Begin Phase 1** (Week 1)
   - Start database migration
   - Set up PostGIS environment
   - Create initial models

3. **Establish Code Standards**
   - TypeScript configuration
   - Naming conventions
   - Git workflow
   - Code review process

4. **Weekly Status Meetings**
   - Progress tracking
   - Blocker resolution
   - Risk management

---

**Document Generated:** February 17, 2026  
**Total Estimated Effort:** 670+ hours  
**Recommended Timeline:** 4-6 months with 3-person team  
**Team Cost (est.):** $50-70k (development) + $10-20k (infrastructure/tools)  
