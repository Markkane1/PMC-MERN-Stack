import React, { useEffect, useState } from 'react'
import { usePaymentAPI } from '../../api/pmc'

interface PaymentStatus {
  applicantId: string
  totalDue: number
  totalPaid: number
  remainingBalance: number
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE'
  paymentPercentage?: number
  lastPaymentDate?: string
  nextDueDate?: string
}

export const PaymentStatusComponent: React.FC<{ applicantId: string }> = ({ applicantId }) => {
  const { getPaymentStatus, generateChalan, verifyPayment, loading, error } = usePaymentAPI()
  const [payment, setPayment] = useState<PaymentStatus | null>(null)
  const [showVerifyForm, setShowVerifyForm] = useState(false)
  const [verifyData, setVerifyData] = useState({ amount: '', referenceNumber: '' })
  const [verifyLoading, setVerifyLoading] = useState(false)

  useEffect(() => {
    loadPaymentStatus()
  }, [applicantId])

  const loadPaymentStatus = async () => {
    try {
      const data = await getPaymentStatus(parseInt(applicantId, 10))
      setPayment(data)
    } catch (err) {
      console.error('Failed to load payment status:', err)
    }
  }

  const handleGenerateChalan = async () => {
    if (!payment) return

    try {
      const dueDate = payment.nextDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const amountDue = payment.remainingBalance > 0 ? payment.remainingBalance : payment.totalDue

      const blob = await generateChalan(parseInt(applicantId, 10), {
        amountDue,
        dueDate,
      })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `chalan-${applicantId}-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to generate chalan:', err)
    }
  }

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifyLoading(true)
    try {
      await verifyPayment(parseInt(applicantId, 10), parseFloat(verifyData.amount), verifyData.referenceNumber)
      setShowVerifyForm(false)
      setVerifyData({ amount: '', referenceNumber: '' })
      loadPaymentStatus()
    } catch (err) {
      console.error('Failed to verify payment:', err)
    } finally {
      setVerifyLoading(false)
    }
  }

  if (loading) return <div className="p-4 text-center">Loading payment status...</div>
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>
  if (!payment) return <div className="p-4 text-gray-500">No payment data available</div>

  const paymentPercentage = payment.paymentPercentage ?? (payment.totalDue > 0 ? (payment.totalPaid / payment.totalDue) * 100 : 0)

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Payment Status</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded">
          <p className="text-sm text-gray-600">Total Amount</p>
          <p className="text-2xl font-bold text-blue-600">Rs {payment.totalDue.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <p className="text-sm text-gray-600">Paid Amount</p>
          <p className="text-2xl font-bold text-green-600">Rs {payment.totalPaid.toLocaleString()}</p>
        </div>
        <div className={`p-4 rounded ${payment.remainingBalance === 0 ? 'bg-green-50' : 'bg-yellow-50'}`}>
          <p className="text-sm text-gray-600">Remaining</p>
          <p className={`text-2xl font-bold ${payment.remainingBalance === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
            Rs {payment.remainingBalance.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">Payment Progress</span>
          <span className="text-sm font-medium">{Math.round(paymentPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${paymentPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${paymentPercentage}%` }}
          />
        </div>
      </div>

      <div className="mb-6">
        <span
          className={`px-4 py-2 rounded-full text-sm font-semibold ${
            payment.status === 'PAID'
              ? 'bg-green-100 text-green-800'
              : payment.status === 'PENDING' || payment.status === 'PARTIAL'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
          }`}
        >
          Status: {payment.status}
        </span>
      </div>

      {payment.remainingBalance > 0 && (
        <div className="space-y-3">
          <button
            onClick={handleGenerateChalan}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            Generate and Download Chalan
          </button>

          <button
            onClick={() => setShowVerifyForm(!showVerifyForm)}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors"
          >
            Verify Payment
          </button>

          {showVerifyForm && (
            <form onSubmit={handleVerifyPayment} className="mt-4 p-4 bg-gray-50 rounded">
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Amount Paid</label>
                <input
                  type="number"
                  step="0.01"
                  value={verifyData.amount}
                  onChange={(e) => setVerifyData({ ...verifyData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Reference Number</label>
                <input
                  type="text"
                  value={verifyData.referenceNumber}
                  onChange={(e) => setVerifyData({ ...verifyData, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="Transaction ID or cheque number"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={verifyLoading}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {verifyLoading ? 'Verifying...' : 'Verify Payment'}
              </button>
            </form>
          )}
        </div>
      )}

      {payment.remainingBalance === 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded text-green-800">
          Payment completed successfully.
        </div>
      )}

      {payment.lastPaymentDate && (
        <p className="text-xs text-gray-500 mt-4">Last payment: {new Date(payment.lastPaymentDate).toLocaleString()}</p>
      )}
    </div>
  )
}
