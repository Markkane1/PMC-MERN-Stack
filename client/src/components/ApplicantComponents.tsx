/**
 * Applicant Components
 */
import React, { useState } from 'react'

export const ApplicantRegistration: React.FC = () => {
  const [formData, setFormData] = useState({
    applicantName: '',
    email: '',
    phone: '',
    cnic: '',
    district: 0
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'district' ? Number(value) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/applicants/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const result = await response.json()
      if (result.success) alert('Applicant registered!')
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Register Applicant</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" name="applicantName" placeholder="Name" value={formData.applicantName} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
        <input type="tel" name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
        <input type="text" name="cnic" placeholder="CNIC" value={formData.cnic} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
        <select name="district" value={formData.district} onChange={handleChange} className="w-full px-3 py-2 border rounded">
          <option value={0}>Select District</option>
          <option value={1}>Lahore</option>
          <option value={2}>Karachi</option>
        </select>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded">
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  )
}
