import React, { useEffect, useRef, useState } from 'react'
import { Button, Card, Input, MessageBar, MessageBarBody, Text } from '@fluentui/react-components'
import { ArrowDownload20Regular, DocumentPdf20Regular, Eye20Regular, QrCode20Regular } from '@fluentui/react-icons'
import type { AxiosError } from 'axios'
import QRCode from 'qrcode'
import AxiosBase from '../services/axios/AxiosBase'

interface ChalanData {
  chalanNumber?: string
  applicantName: string
  applicantId: string | number
  amountDue: number
  dueDate: string
  description?: string
  bankName?: string
  accountNumber?: string
}

interface ChalanTracking {
  chalanNumber: string
  applicantId: string
  status: 'generated' | 'verified' | 'paid' | 'expired'
  createdAt: string
  pdfUrl?: string
  qrData?: string
  qrCode?: string
}

export default function GenerateReceiptPage() {
  const [formData, setFormData] = useState<ChalanData>({
    applicantName: '',
    applicantId: '',
    amountDue: 0,
    dueDate: '',
    description: 'Application Fee',
    bankName: 'State Bank of Pakistan',
    accountNumber: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [chalanTracking, setChalanTracking] = useState<ChalanTracking | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const qrModalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (chalanTracking?.pdfUrl) {
        window.URL.revokeObjectURL(chalanTracking.pdfUrl)
      }
    }
  }, [chalanTracking?.pdfUrl])

  const downloadBlob = (blobUrl: string, filename: string) => {
    const link = document.createElement('a')
    link.href = blobUrl
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Generate chalan
  const handleGenerateChalan = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await AxiosBase.post(
        '/pmc/chalan-pdf',
        {
          applicantId: Number(formData.applicantId),
          amountDue: formData.amountDue,
          dueDate: formData.dueDate,
          description: formData.description,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
        },
        { responseType: 'blob' },
      )

      const chalanNumber = String(response.headers['x-chalan-number'] || `CHN-${Date.now()}`)
      const qrData = JSON.stringify({
        type: 'CHALAN',
        chalanNo: chalanNumber,
        applicantId: String(formData.applicantId),
        amount: formData.amountDue,
        timestamp: new Date().toISOString(),
        version: '1.0',
      })
      const qrCode = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        width: 300,
        margin: 1,
      })
      const pdfBlob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' })
      const pdfUrl = window.URL.createObjectURL(pdfBlob)

      if (chalanTracking?.pdfUrl) {
        window.URL.revokeObjectURL(chalanTracking.pdfUrl)
      }

      // Show success message
      setSuccess(`Chalan generated successfully. Number: ${chalanNumber}`)

      // Track the chalan
      setChalanTracking({
        chalanNumber,
        applicantId: formData.applicantId.toString(),
        status: 'generated',
        createdAt: new Date().toISOString(),
        pdfUrl,
        qrData,
        qrCode,
      })

      // Auto-download PDF
      downloadBlob(pdfUrl, `Chalan-${chalanNumber}.pdf`)

      // Reset form
      setFormData({
        applicantName: '',
        applicantId: '',
        amountDue: 0,
        dueDate: '',
        description: 'Application Fee',
        bankName: 'State Bank of Pakistan',
        accountNumber: '',
      })
    } catch (err) {
      let errorMsg = err instanceof Error ? err.message : 'Failed to generate chalan'
      const axiosErr = err as AxiosError
      const blobData = axiosErr?.response?.data
      if (blobData instanceof Blob) {
        const text = await blobData.text()
        try {
          const parsed = JSON.parse(text)
          errorMsg = parsed?.message || errorMsg
        } catch {
          errorMsg = text || errorMsg
        }
      }
      setError(errorMsg)
      console.error('Chalan generation error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Verify chalan QR
  const handleVerifyChalan = async () => {
    if (!chalanTracking?.chalanNumber || !chalanTracking.qrData) {
      setError('No chalan to verify')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await AxiosBase.post<{ success: boolean; message?: string; data?: { status?: string } }>(
        '/pmc/verify-chalan-qr',
        {
          qrData: chalanTracking.qrData,
          chalanNumber: chalanTracking.chalanNumber,
        },
      )

      if (response.data.success) {
        setChalanTracking((prev) =>
          prev
            ? {
                ...prev,
                status: 'verified',
              }
            : null,
        )
        setSuccess(response.data.message || 'Chalan verified successfully')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to verify chalan'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // Download chalan PDF
  const handleDownloadChalan = async () => {
    if (!chalanTracking?.chalanNumber) {
      setError('No chalan number available')
      return
    }
    if (!chalanTracking.pdfUrl) {
      setError('Original chalan file is not available. Please generate it again.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      downloadBlob(chalanTracking.pdfUrl, `Chalan-${chalanTracking.chalanNumber}.pdf`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to download chalan'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof ChalanData, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <div className="generate-receipt-container" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1>Generate Bank Chalan</h1>
        <Text>Create and download bank payment chalans with QR codes for verification</Text>
      </div>

      {error && (
        <MessageBar intent="error" style={{ marginBottom: '16px' }}>
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      {success && (
        <MessageBar intent="success" style={{ marginBottom: '16px' }}>
          <MessageBarBody>{success}</MessageBarBody>
        </MessageBar>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Form Section */}
        <Card style={{ padding: '20px' }}>
          <h2>Generate New Chalan</h2>
          <form onSubmit={handleGenerateChalan}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>Applicant Name</label>
              <Input
                value={formData.applicantName}
                onChange={(e) => handleInputChange('applicantName', (e.target as HTMLInputElement).value)}
                placeholder="Enter applicant name"
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>Applicant ID</label>
              <Input
                value={formData.applicantId.toString()}
                onChange={(e) => handleInputChange('applicantId', (e.target as HTMLInputElement).value)}
                placeholder="Enter applicant ID"
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>Amount Due (PKR)</label>
              <Input
                type="number"
                value={formData.amountDue.toString()}
                onChange={(e) => handleInputChange('amountDue', parseInt((e.target as HTMLInputElement).value || '0', 10))}
                placeholder="Enter amount"
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>Due Date</label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', (e.target as HTMLInputElement).value)}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>Description</label>
              <Input
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', (e.target as HTMLInputElement).value)}
                placeholder="e.g., Application Fee"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>Bank Name</label>
              <Input
                value={formData.bankName || ''}
                onChange={(e) => handleInputChange('bankName', (e.target as HTMLInputElement).value)}
                placeholder="Enter bank name"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>Account Number</label>
              <Input
                value={formData.accountNumber || ''}
                onChange={(e) => handleInputChange('accountNumber', (e.target as HTMLInputElement).value)}
                placeholder="Enter account number"
              />
            </div>

            <Button
              appearance="primary"
              disabled={loading}
              type="submit"
              style={{ width: '100%' }}
              icon={<DocumentPdf20Regular />}
            >
              {loading ? 'Generating...' : 'Generate & Download Chalan'}
            </Button>
          </form>
        </Card>

        {/* Tracking Section */}
        <Card style={{ padding: '20px' }}>
          <h2>Chalan Tracking</h2>

          {chalanTracking ? (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <Text size={300} weight="bold">
                  Chalan Number
                </Text>
                <Text block size={400}>
                  {chalanTracking.chalanNumber}
                </Text>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <Text size={300} weight="bold">
                  Status
                </Text>
                <Text
                  block
                  size={400}
                  style={{
                    textTransform: 'uppercase',
                    color:
                      chalanTracking.status === 'paid'
                        ? '#107C10'
                        : chalanTracking.status === 'verified'
                          ? '#004B50'
                          : '#605E5C',
                  }}
                >
                  {chalanTracking.status}
                </Text>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <Text size={300} weight="bold">
                  Created Date
                </Text>
                <Text block size={400}>
                  {new Date(chalanTracking.createdAt).toLocaleDateString()}
                </Text>
              </div>

              {chalanTracking.qrCode && (
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f3f2f1', borderRadius: '4px' }}>
                  <Text size={300} weight="bold" block style={{ marginBottom: '8px' }}>
                    QR Code
                  </Text>
                  <img
                    src={chalanTracking.qrCode}
                    alt="Chalan QR Code"
                    style={{ width: '100px', height: '100px' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                <Button
                  onClick={() => setShowQrModal(true)}
                  appearance="secondary"
                  icon={<Eye20Regular />}
                  style={{ width: '100%' }}
                >
                  View QR
                </Button>
                <Button
                  onClick={handleVerifyChalan}
                  appearance="secondary"
                  disabled={loading}
                  icon={<QrCode20Regular />}
                  style={{ width: '100%' }}
                >
                  {loading ? 'Verifying...' : 'Verify Chalan'}
                </Button>
                <Button
                  onClick={handleDownloadChalan}
                  appearance="secondary"
                  disabled={loading}
                  icon={<ArrowDownload20Regular />}
                  style={{ width: '100%' }}
                >
                  {loading ? 'Downloading...' : 'Download PDF'}
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              <Text>Generate a chalan to see tracking information</Text>
            </div>
          )}
        </Card>
      </div>

      {/* QR Modal */}
      {showQrModal && chalanTracking?.qrCode && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowQrModal(false)}
        >
          <Card
            ref={qrModalRef}
            style={{
              padding: '20px',
              maxWidth: '400px',
              backgroundColor: 'white',
              borderRadius: '8px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center' }}>
              <h3>Chalan QR Code</h3>
              <img
                src={chalanTracking.qrCode}
                alt="Chalan QR Code"
                style={{ width: '300px', height: '300px', margin: '16px 0' }}
              />
              <p>Scan this QR code to verify payment</p>
              <Button
                onClick={() => setShowQrModal(false)}
                appearance="primary"
                style={{ width: '100%' }}
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

