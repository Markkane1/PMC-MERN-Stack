/**
 * Document Components
 */
import React, { useState } from 'react'

export const DocumentUpload: React.FC = () => {
  const [formData, setFormData] = useState({
    documentType: 'REGISTRATION',
    expiryDate: ''
  })
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0])
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('file', file)
      formDataToSend.append('documentType', formData.documentType)
      formDataToSend.append('expiryDate', formData.expiryDate)
      
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formDataToSend
      })
      const result = await response.json()
      if (result.success) alert('Document uploaded!')
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Upload Document</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <select name="documentType" value={formData.documentType} onChange={handleChange} className="w-full px-3 py-2 border rounded">
          <option value="REGISTRATION">Registration</option>
          <option value="TAX">Tax Certificate</option>
          <option value="LICENSE">License</option>
          <option value="INSURANCE">Insurance</option>
        </select>
        <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
        <input type="file" onChange={handleFileChange} className="w-full" />
        <button type="submit" disabled={loading || !file} className="w-full bg-blue-600 text-white py-2 rounded">
          {loading ? 'Uploading...' : 'Upload Document'}
        </button>
      </form>
    </div>
  )
}

export const DocumentExpiryList: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  React.useEffect(() => {
    const fetch_ = async () => {
      try {
        const response = await fetch('/api/documents/expiring?days=30')
        const result = await response.json()
        if (result.success) setDocuments(result.data || [])
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [])

  if (loading) return <div className="text-center py-4">Loading...</div>

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4">Expiring Documents</h3>
      <div className="space-y-3">
        {documents.map(doc => (
          <div key={doc.documentId} className="p-4 border-l-4 border-yellow-500 bg-yellow-50 rounded">
            <p className="font-medium">{doc.documentType}</p>
            <p className="text-sm text-gray-600">Expires in 30 days</p>
          </div>
        ))}
      </div>
    </div>
  )
}
