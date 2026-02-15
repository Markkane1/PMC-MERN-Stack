# PMC MERN Stack - Complete API Documentation

## Overview

The PMC (Plastic Management & Compliance) application provides a comprehensive REST API for managing plastic waste, business compliance, and regulatory requirements.

**Base URL:** `http://localhost:5000/api`

## Response Format

All API responses follow this standard format:

```json
{
  "success": boolean,
  "message": string,
  "data": any
}
```

---

## 1. Applicant Management APIs

### 1.1 Register Applicant
**Endpoint:** `POST /applicants/register`

**Request Body:**
```json
{
  "cnic": "12345-6789012-3",
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+923001234567",
  "district": "Lahore",
  "address": "123 Main St"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Applicant registered successfully",
  "data": {
    "applicantId": "APP001",
    "cnic": "12345-6789012-3",
    "fullName": "John Doe",
    "status": "PENDING",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### 1.2 Verify Applicant
**Endpoint:** `POST /applicants/:id/verify`

**Request Body:**
```json
{
  "documents": [
    { "type": "INCORPORATION", "documentId": "DOC001", "verified": true },
    { "type": "TAX_CERTIFICATE", "documentId": "DOC002", "verified": true }
  ],
  "verificationNotes": "All documents verified successfully"
}
```

### 1.3 Get Applicant Status
**Endpoint:** `GET /applicants/:id/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "applicantId": "APP001",
    "status": "VERIFIED",
    "documentsVerified": 2,
    "documentsTotal": 2,
    "verificationDate": "2024-01-20T14:22:00Z"
  }
}
```

### 1.4 List Applicants
**Endpoint:** `GET /applicants?page=1&limit=10&status=VERIFIED`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Filter by status (PENDING, VERIFIED, REJECTED)
- `district`: Filter by district

### 1.5 Get Pending Applicants
**Endpoint:** `GET /applicants/pending`

### 1.6 Get Applicant Details
**Endpoint:** `GET /applicants/:id`

---

## 2. Business Profile APIs

### 2.1 Register Business
**Endpoint:** `POST /businesses/register`

**Request Body:**
```json
{
  "name": "Eco Plastics Ltd",
  "entityType": "PRODUCER",
  "registrationNumber": "BR-123456",
  "district": "Lahore",
  "coordinates": {
    "latitude": 31.5204,
    "longitude": 74.3587
  },
  "contactEmail": "info@ecoplastics.com",
  "contactPhone": "+923001234567"
}
```

**Entity Types:** `PRODUCER`, `CONSUMER`, `COLLECTOR`, `RECYCLER`

### 2.2 Business Verification Checklist
**Endpoint:** `GET /businesses/:id/checklist`

**Response:**
```json
{
  "success": true,
  "data": {
    "businessId": "BUS001",
    "items": [
      { "item": "Environmental Clearance", "status": "PENDING", "dueDate": "2024-02-15" },
      { "item": "Tax Certificate", "status": "VERIFIED", "verificationDate": "2024-01-20" }
    ]
  }
}
```

### 2.3 Activate Business
**Endpoint:** `POST /businesses/:id/activate`

### 2.4 Business Dashboard
**Endpoint:** `GET /businesses/:id/dashboard`

**Response includes:**
- Compliance score (0-100)
- Total plastic handled (tons)
- Documents verified (%)
- Recent assignments
- Alert count

### 2.5 List Businesses
**Endpoint:** `GET /businesses?entityType=PRODUCER&district=Lahore`

### 2.6 Get Business Details
**Endpoint:** `GET /businesses/:id`

---

## 3. Document Management APIs

### 3.1 Upload Document
**Endpoint:** `POST /documents/upload`

**Request Type:** `multipart/form-data`

**Form Fields:**
- `documentType` (required): Document type (INCORPORATION, TAX_CERTIFICATE, etc.)
- `businessId` (required): Business ID
- `file` (required): File (max 50MB)
- `notes` (optional): Additional notes

**Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "DOC001",
    "filename": "incorporation.pdf",
    "status": "PENDING_VERIFICATION",
    "uploadDate": "2024-01-15T10:30:00Z"
  }
}
```

### 3.2 Verify Document
**Endpoint:** `POST /documents/:id/verify`

**Request Body:**
```json
{
  "verified": true,
  "notes": "Document authenticity confirmed",
  "expiryDate": "2026-01-15"
}
```

### 3.3 Get Expiring Documents
**Endpoint:** `GET /documents/expiring?businessId=BUS001&days=30`

**Returns documents expiring within specified days**

### 3.4 Document Statistics
**Endpoint:** `GET /documents/statistics?businessId=BUS001`

---

## 4. Inventory Management APIs

### 4.1 Add Plastic Item
**Endpoint:** `POST /inventory/plastic-items`

**Request Body:**
```json
{
  "name": "PET Bottles",
  "category": "PRODUCT",
  "hazardLevel": "LOW",
  "recyclingRate": 85,
  "unit": "KG",
  "description": "Clear PET bottles for recycling"
}
```

**Hazard Levels:** `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
**Units:** `KG`, `TON`, `LITER`, `PIECE`

### 4.2 Add Product
**Endpoint:** `POST /inventory/products`

```json
{
  "name": "Plastic Bags",
  "quantity": 5000,
  "unit": "PIECE",
  "location": "Warehouse A",
  "businessId": "BUS001"
}
```

### 4.3 Add By-Product
**Endpoint:** `POST /inventory/by-products`

### 4.4 Add Raw Material
**Endpoint:** `POST /inventory/raw-materials`

### 4.5 Get Business Inventory
**Endpoint:** `GET /inventory/businesses/:id`

Returns summary with:
- Total items
- Items by category
- Hazard distribution
- Recycling rate average

### 4.6 Get Hazardous Materials
**Endpoint:** `GET /inventory/hazardous`

---

## 5. Workflow Management APIs

### 5.1 Create Assignment
**Endpoint:** `POST /workflow/assignments`

**Request Body:**
```json
{
  "type": "INSPECTION",
  "businessId": "BUS001",
  "priority": "HIGH",
  "dueDate": "2024-02-15",
  "description": "Quarterly compliance inspection",
  "assignedTo": "USER001"
}
```

**Types:** `INSPECTION`, `DOCUMENT_VERIFICATION`, `FOLLOW_UP`, `REMEDIATION`
**Priorities:** `LOW`, `MEDIUM`, `HIGH`, `URGENT`

### 5.2 Get Assignments
**Endpoint:** `GET /workflow/assignments?userId=USER001&status=PENDING`

**Query Parameters:**
- `userId`: Filter by assigned user
- `status`: PENDING, IN_PROGRESS, COMPLETED, CANCELLED
- `businessId`: Filter by business
- `priority`: Filter by priority

### 5.3 Update Assignment
**Endpoint:** `PUT /workflow/assignments/:id`

```json
{
  "status": "IN_PROGRESS",
  "notes": "Inspection started"
}
```

### 5.4 Record Inspection
**Endpoint:** `POST /workflow/inspections`

**Request Body:**
```json
{
  "assignmentId": "ASS001",
  "complianceScore": 85,
  "findings": "Minor storage issues observed",
  "photographyIds": ["PHOTO001", "PHOTO002"],
  "hazardousItems": [
    {
      "itemId": "ITEM001",
      "level": "HIGH",
      "location": "Storage area 3",
      "action": "CONTAINMENT_REQUIRED"
    }
  ]
}
```

### 5.5 Get Inspection Details
**Endpoint:** `GET /workflow/inspections/:id`

### 5.6 Create Alert
**Endpoint:** `POST /workflow/alerts`

```json
{
  "businessId": "BUS001",
  "level": "CRITICAL",
  "title": "Hazardous Material Found",
  "description": "Critical level hazardous waste detected",
  "actionRequired": true
}
```

### 5.7 Get Business Alerts
**Endpoint:** `GET /workflow/alerts?businessId=BUS001`

### 5.8 Workflow Dashboard
**Endpoint:** `GET /workflow/dashboard?userId=USER001`

**Response:**
```json
{
  "data": {
    "pendingAssignments": 5,
    "inProgressAssignments": 3,
    "completedAssignments": 42,
    "openAlerts": 2,
    "recentActivity": [...],
    "performanceMetrics": {
      "completionRate": 0.94,
      "avgComplianceScore": 87
    }
  }
}
```

---

## 6. Analytics APIs (Chunk 8)

### 6.1 System Analytics Summary
**Endpoint:** `GET /analytics/summary?start=2024-01-01&end=2024-01-31`

**Response:**
```json
{
  "data": {
    "totalApplicants": 1250,
    "activeBusinesses": 340,
    "documentsVerified": 2456,
    "avgCompliance": 87,
    "applicationStatus": {...},
    "verificationTrend": [...],
    "businessEntities": {...}
  }
}
```

### 6.2 Recycling Analytics
**Endpoint:** `GET /analytics/recycling`

**Response:**
```json
{
  "data": {
    "totalPlastic": 1250,
    "recyclingRate": 78,
    "safeDisposal": 92,
    "hazardousCount": 34,
    "disposalMethods": {...},
    "plasticCategories": {...}
  }
}
```

### 6.3 Compliance Metrics
**Endpoint:** `GET /analytics/compliance`

### 6.4 Generate Report
**Endpoint:** `POST /reports/generate`

**Request Body:**
```json
{
  "name": "Monthly Compliance Report",
  "metrics": [
    "Applicant Count",
    "Compliance Score",
    "Documents Verified"
  ],
  "format": "pdf",
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  }
}
```

---

## 7. Search APIs (Chunk 8)

### 7.1 Full-Text Search
**Endpoint:** `GET /search?q=lahore&type=all`

**Query Parameters:**
- `q`: Search query (name, email, address, etc.)
- `type`: all, applicants, businesses, documents, inventory

### 7.2 Advanced Filter
**Endpoint:** `POST /filter`

**Request Body:**
```json
{
  "entityType": "applicants",
  "filters": [
    {
      "field": "district",
      "operator": "equals",
      "value": "Lahore"
    },
    {
      "field": "status",
      "operator": "equals",
      "value": "VERIFIED"
    }
  ]
}
```

---

## Error Handling

### Standard Error Responses

**Validation Error (400):**
```json
{
  "success": false,
  "message": "Validation error: CNIC format is invalid",
  "data": { "field": "cnic", "error": "INVALID_FORMAT" }
}
```

**Not Found (404):**
```json
{
  "success": false,
  "message": "Applicant not found",
  "data": null
}
```

**Server Error (500):**
```json
{
  "success": false,
  "message": "Internal server error",
  "data": null
}
```

---

## Authentication

**Note:** Add Authorization header in production:
```
Authorization: Bearer <token>
```

---

## Rate Limiting

- **Default:** 100 requests per minute
- **Search:** 50 requests per minute
- **Report Generation:** 10 requests per hour

---

## Pagination

Default page size: 10 items
Maximum page size: 100 items

**Example:**
```
GET /businesses?page=2&limit=20
```

---

## Date Format

All dates use ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`

---

## Common Filter Operators

- `equals`: Exact match
- `contains`: Substring match (case-insensitive)
- `greater_than`: Numeric or date comparison
- `less_than`: Numeric or date comparison
- `between`: Range check
- `in_list`: Match any value in provided list

---

## Examples

### Example 1: Complete Registration Flow

```bash
# 1. Register Applicant
curl -X POST http://localhost:5000/api/applicants/register \
  -H "Content-Type: application/json" \
  -d '{"cnic":"12345-6789012-3","fullName":"John Doe","email":"john@example.com"}'

# 2. Register Business
curl -X POST http://localhost:5000/api/businesses/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Eco Ltd","entityType":"PRODUCER","registrationNumber":"BR-123"}'

# 3. Upload Document
curl -X POST http://localhost:5000/api/documents/upload \
  -F "documentType=INCORPORATION" \
  -F "businessId=BUS001" \
  -F "file=@incorporation.pdf"

# 4. Request Verification
curl -X POST http://localhost:5000/api/applicants/APP001/verify \
  -H "Content-Type: application/json" \
  -d '{"documents":[]}'
```

---

## Support

For API issues or questions, contact: api-support@pmc.gov.pk
