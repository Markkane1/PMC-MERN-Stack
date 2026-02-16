import ExcelJS from 'exceljs'
import { Workbook } from 'exceljs'

/**
 * Excel Export Options Interface
 */
export interface ExportOptions {
  sheetName?: string
  title?: string
  creator?: string
  includeHeaders?: boolean
}

/**
 * Excel Export Service
 * Handles exporting various data types to Excel format
 */
export class ExcelExportService {
  private static async writeWorkbookBuffer(workbook: Workbook): Promise<Buffer> {
    const buffer: unknown = await workbook.xlsx.writeBuffer()

    if (Buffer.isBuffer(buffer)) {
      return buffer
    }

    if (buffer instanceof ArrayBuffer) {
      return Buffer.from(buffer)
    }

    if (ArrayBuffer.isView(buffer)) {
      const view = buffer as ArrayBufferView
      return Buffer.from(view.buffer, view.byteOffset, view.byteLength)
    }

    throw new Error('Unsupported workbook buffer type')
  }

  /**
   * Create a new workbook with standard styling
   */
  static createWorkbook(title?: string): Workbook {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'PMC MERN Stack'
    if (title) {
      workbook.title = title
    }
    return workbook
  }

  /**
   * Export applicants with payment status
   */
  static async exportApplicantsWithPayment(
    applicants: any[],
    payments: Map<number, any> = new Map(),
    options: ExportOptions = {}
  ): Promise<Buffer> {
    const workbook = this.createWorkbook('Applicants with Payment')
    const sheet = workbook.addWorksheet(options.sheetName || 'Applicants')

    sheet.columns = [
      { header: 'Tracking Number', key: 'trackingNumber', width: 18 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'CNIC', key: 'cnic', width: 15 },
      { header: 'Mobile', key: 'mobileNo', width: 15 },
      { header: 'District', key: 'district', width: 20 },
      { header: 'Status', key: 'applicationStatus', width: 15 },
      { header: 'Payment Status', key: 'paymentStatus', width: 15 },
      { header: 'Amount Due (PKR)', key: 'amountDue', width: 15 },
      { header: 'Amount Paid (PKR)', key: 'amountPaid', width: 15 },
    ]

    // Style header row
    this.styleHeaderRow(sheet)

    // Add data rows
    for (const applicant of applicants) {
      const paymentData = payments.get((applicant as any).numericId)
      sheet.addRow({
        trackingNumber: (applicant as any).trackingNumber,
        name: `${(applicant as any).firstName} ${(applicant as any).lastName || ''}`.trim(),
        cnic: (applicant as any).cnic,
        mobileNo: (applicant as any).mobileNo,
        district: (applicant as any).district || 'N/A',
        applicationStatus: (applicant as any).applicationStatus,
        paymentStatus: paymentData?.status || 'PENDING',
        amountDue: paymentData?.totalDue || 0,
        amountPaid: paymentData?.totalPaid || 0,
      })
    }

    // Format currency columns
    sheet.getColumn('amountDue').numFmt = '#,##0.00'
    sheet.getColumn('amountPaid').numFmt = '#,##0.00'

    // Auto-fit columns
    sheet.columns.forEach((column) => {
      column.alignment = { horizontal: 'left', vertical: 'middle' }
    })

    return this.writeWorkbookBuffer(workbook)
  }

  /**
   * Export competition registrations
   */
  static async exportCompetitionRegistrations(
    registrations: any[],
    options: ExportOptions = {}
  ): Promise<Buffer> {
    const workbook = this.createWorkbook('Competition Registrations')
    const sheet = workbook.addWorksheet(options.sheetName || 'Registrations')

    sheet.columns = [
      { header: 'Competition Name', key: 'competitionName', width: 20 },
      { header: 'Participant Name', key: 'participantName', width: 25 },
      { header: 'Registration Date', key: 'registrationDate', width: 15 },
      { header: 'Entry Title', key: 'entryTitle', width: 25 },
      { header: 'Entry Type', key: 'entryType', width: 15 },
      { header: 'Submit Status', key: 'submissionStatus', width: 15 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Courier Status', key: 'courierStatus', width: 15 },
      { header: 'Tracking Number', key: 'trackingNumber', width: 18 },
    ]

    // Style header row
    this.styleHeaderRow(sheet)

    // Add data rows
    for (const registration of registrations) {
      sheet.addRow({
        competitionName: (registration as any).competitionName || 'Unknown',
        participantName: (registration as any).participantName,
        registrationDate: (registration as any).registrationDate
          ? new Date((registration as any).registrationDate).toLocaleDateString()
          : 'N/A',
        entryTitle: (registration as any).entryTitle || 'N/A',
        entryType: (registration as any).entryType || 'N/A',
        submissionStatus: (registration as any).submissionStatus || 'PENDING',
        score: (registration as any).score || '-',
        courierStatus: (registration as any).courierStatus || 'PENDING',
        trackingNumber: (registration as any).trackingNumber || 'N/A',
      })
    }

    // Auto-fit columns
    sheet.columns.forEach((column) => {
      column.alignment = { horizontal: 'left', vertical: 'middle' }
    })

    return this.writeWorkbookBuffer(workbook)
  }

  /**
   * Export payment transactions
   */
  static async exportPaymentTransactions(
    transactions: any[],
    options: ExportOptions = {}
  ): Promise<Buffer> {
    const workbook = this.createWorkbook('Payment Transactions')
    const sheet = workbook.addWorksheet(options.sheetName || 'Transactions')

    sheet.columns = [
      { header: 'Transaction ID', key: 'transactionId', width: 18 },
      { header: 'Applicant ID', key: 'applicantId', width: 12 },
      { header: 'Applicant Name', key: 'applicantName', width: 25 },
      { header: 'Amount (PKR)', key: 'amount', width: 15 },
      { header: 'Payment Method', key: 'paymentMethod', width: 15 },
      { header: 'Reference Number', key: 'referenceNumber', width: 18 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Transaction Date', key: 'transactionDate', width: 18 },
      { header: 'Verified Date', key: 'verifiedDate', width: 18 },
    ]

    // Style header row
    this.styleHeaderRow(sheet)

    // Add data rows
    for (const transaction of transactions) {
      sheet.addRow({
        transactionId: (transaction as any)._id?.toString() || (transaction as any).id,
        applicantId: (transaction as any).applicantId,
        applicantName: (transaction as any).applicantName || 'Unknown',
        amount: (transaction as any).amount,
        paymentMethod: (transaction as any).paymentMethod || 'CHALAN',
        referenceNumber: (transaction as any).referenceNumber,
        status: (transaction as any).status || 'PENDING',
        transactionDate: (transaction as any).transactionDate
          ? new Date((transaction as any).transactionDate).toLocaleString()
          : 'N/A',
        verifiedDate: (transaction as any).verifiedDate ? new Date((transaction as any).verifiedDate).toLocaleString() : '-',
      })
    }

    // Format currency column
    sheet.getColumn('amount').numFmt = '#,##0.00'

    // Auto-fit columns
    sheet.columns.forEach((column) => {
      column.alignment = { horizontal: 'left', vertical: 'middle' }
    })

    return this.writeWorkbookBuffer(workbook)
  }

  /**
   * Export PSID tracking data
   */
  static async exportPsidTracking(
    psidRecords: any[],
    options: ExportOptions = {}
  ): Promise<Buffer> {
    const workbook = this.createWorkbook('PSID Tracking')
    const sheet = workbook.addWorksheet(options.sheetName || 'PSID')

    sheet.columns = [
      { header: 'PSID Number', key: 'psidNumber', width: 18 },
      { header: 'Applicant ID', key: 'applicantId', width: 12 },
      { header: 'Amount (PKR)', key: 'amount', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Created Date', key: 'createdDate', width: 18 },
      { header: 'Verified Date', key: 'verifiedDate', width: 18 },
      { header: 'Expires Date', key: 'expiresDate', width: 18 },
      { header: 'Intimation Sent', key: 'intimationSent', width: 15 },
    ]

    // Style header row
    this.styleHeaderRow(sheet)

    // Add data rows
    for (const record of psidRecords) {
      sheet.addRow({
        psidNumber: (record as any).psidNumber || (record as any).consumerNumber,
        applicantId: (record as any).applicantId,
        amount: (record as any).amount,
        status: (record as any).status || 'GENERATED',
        createdDate: (record as any).createdDate ? new Date((record as any).createdDate).toLocaleString() : 'N/A',
        verifiedDate: (record as any).verifiedDate ? new Date((record as any).verifiedDate).toLocaleString() : '-',
        expiresDate: (record as any).expiresDate ? new Date((record as any).expiresDate).toLocaleDateString() : '-',
        intimationSent: (record as any).intimationSent ? 'Yes' : 'No',
      })
    }

    // Format currency column
    sheet.getColumn('amount').numFmt = '#,##0.00'

    // Auto-fit columns
    sheet.columns.forEach((column) => {
      column.alignment = { horizontal: 'left', vertical: 'middle' }
    })

    return this.writeWorkbookBuffer(workbook)
  }

  /**
   * Export courier labels
   */
  static async exportCourierLabels(
    labels: any[],
    options: ExportOptions = {}
  ): Promise<Buffer> {
    const workbook = this.createWorkbook('Courier Labels')
    const sheet = workbook.addWorksheet(options.sheetName || 'Labels')

    sheet.columns = [
      { header: 'Tracking Number', key: 'trackingNumber', width: 18 },
      { header: 'Registration ID', key: 'registrationId', width: 18 },
      { header: 'Recipient Name', key: 'recipientName', width: 25 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'Province', key: 'province', width: 15 },
      { header: 'Postal Code', key: 'postalCode', width: 12 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Courier Company', key: 'courierCompany', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Generated Date', key: 'generatedDate', width: 18 },
    ]

    // Style header row
    this.styleHeaderRow(sheet)

    // Add data rows
    for (const label of labels) {
      const shippingAddr = (label as any).shippingAddress || {}
      sheet.addRow({
        trackingNumber: (label as any).trackingNumber,
        registrationId: (label as any).registrationId,
        recipientName: shippingAddr.recipientName || 'Unknown',
        city: shippingAddr.city || 'N/A',
        province: shippingAddr.province || 'N/A',
        postalCode: shippingAddr.postalCode || 'N/A',
        phone: shippingAddr.phone || 'N/A',
        courierCompany: (label as any).courierCompany || 'TCS',
        status: (label as any).status || 'GENERATED',
        generatedDate: (label as any).generatedAt ? new Date((label as any).generatedAt).toLocaleString() : 'N/A',
      })
    }

    // Auto-fit columns
    sheet.columns.forEach((column) => {
      column.alignment = { horizontal: 'left', vertical: 'middle' }
    })

    return this.writeWorkbookBuffer(workbook)
  }

  /**
   * Create a multi-sheet workbook with summary data
   */
  static async exportSummaryReport(
    data: {
      applicants?: any[]
      competitions?: any[]
      payments?: any[]
      psidRecords?: any[]
      labels?: any[]
    },
    options: ExportOptions = {}
  ): Promise<Buffer> {
    const workbook = this.createWorkbook('PMC Summary Report')

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary')
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Count', key: 'count', width: 15 },
    ]

    this.styleHeaderRow(summarySheet)

    const metrics = [
      { metric: 'Total Applicants', count: data.applicants?.length || 0 },
      { metric: 'Total Competition Registrations', count: data.competitions?.length || 0 },
      { metric: 'Total Payment Transactions', count: data.payments?.length || 0 },
      { metric: 'Total PSID Records', count: data.psidRecords?.length || 0 },
      { metric: 'Total Courier Labels', count: data.labels?.length || 0 },
      {
        metric: 'Total Payment Amount (PKR)',
        count: (data.payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
      },
    ]

    metrics.forEach((m) => summarySheet.addRow(m))

    // Individual sheets
    if (data.applicants?.length) {
      const applicantSheet = workbook.addWorksheet('Applicants')
      applicantSheet.columns = [
        { header: 'Tracking Number', key: 'trackingNumber', width: 18 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'CNIC', key: 'cnic', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
      ]
      this.styleHeaderRow(applicantSheet)
      data.applicants.forEach((a) => {
        applicantSheet.addRow({
          trackingNumber: (a as any).trackingNumber,
          name: `${(a as any).firstName} ${(a as any).lastName || ''}`.trim(),
          cnic: (a as any).cnic,
          status: (a as any).applicationStatus,
        })
      })
    }

    if (data.competitions?.length) {
      const compSheet = workbook.addWorksheet('Competitions')
      compSheet.columns = [
        { header: 'Participant Name', key: 'participantName', width: 25 },
        { header: 'Entry Title', key: 'entryTitle', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
      ]
      this.styleHeaderRow(compSheet)
      data.competitions.forEach((c) => {
        compSheet.addRow({
          participantName: (c as any).participantName,
          entryTitle: (c as any).entryTitle || 'N/A',
          status: (c as any).submissionStatus || 'PENDING',
        })
      })
    }

    if (data.payments?.length) {
      const paymentSheet = workbook.addWorksheet('Payments')
      paymentSheet.columns = [
        { header: 'Reference Number', key: 'referenceNumber', width: 18 },
        { header: 'Amount (PKR)', key: 'amount', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Date', key: 'date', width: 18 },
      ]
      this.styleHeaderRow(paymentSheet)
      data.payments.forEach((p) => {
        paymentSheet.addRow({
          referenceNumber: (p as any).referenceNumber,
          amount: (p as any).amount,
          status: (p as any).status,
          date: (p as any).transactionDate ? new Date((p as any).transactionDate).toLocaleDateString() : 'N/A',
        })
      })
    }

    return this.writeWorkbookBuffer(workbook)
  }

  /**
   * Style header row with background color and bold text
   */
  private static styleHeaderRow(sheet: ExcelJS.Worksheet): void {
    const headerRow = sheet.getRow(1)
    if (headerRow) {
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } }
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
    }
  }
}
