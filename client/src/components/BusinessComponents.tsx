/**
 * Business Components
 */
import React, { useState } from 'react'

export const BusinessRegistration: React.FC = () => {
  const [formData, setFormData] = useState({
    businessName: '',
    entityType: 'PRODUCER',
    registrationNumber: '',
    phone: '',
    email: '',
    latitude: 0,
    longitude: 0
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'latitude' || name === 'longitude' ? parseFloat(value) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/businesses/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const result = await response.json()
      if (result.success) alert('Business registered!')
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Register Business</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" name="businessName" placeholder="Business Name" value={formData.businessName} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
        <select name="entityType" value={formData.entityType} onChange={handleChange} className="w-full px-3 py-2 border rounded">
          <option value="PRODUCER">Producer</option>
          <option value="CONSUMER">Consumer</option>
          <option value="COLLECTOR">Collector</option>
          <option value="RECYCLER">Recycler</option>
        </select>
        <input type="text" name="registrationNumber" placeholder="Registration Number" value={formData.registrationNumber} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
        <input type="tel" name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
        <div className="grid grid-cols-2 gap-4">
          <input type="number" name="latitude" placeholder="Latitude" value={formData.latitude} onChange={handleChange} step="0.000001" className="px-3 py-2 border rounded" />
          <input type="number" name="longitude" placeholder="Longitude" value={formData.longitude} onChange={handleChange} step="0.000001" className="px-3 py-2 border rounded" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded">
          {loading ? 'Registering...' : 'Register Business'}
        </button>
      </form>
    </div>
  )
}

export const BusinessList: React.FC = () => {
  const [businesses, setBusinesses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  React.useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const response = await fetch('/api/businesses')
        const result = await response.json()
        if (result.success) setBusinesses(result.data || [])
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchBusinesses()
  }, [])

  if (loading) return <div className="text-center py-4">Loading...</div>

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-medium">Business Name</th>
            <th className="px-6 py-3 text-left text-sm font-medium">Type</th>
            <th className="px-6 py-3 text-left text-sm font-medium">Email</th>
          </tr>
        </thead>
        <tbody>
          {businesses.map(b => (
            <tr key={b.businessId} className="border-t hover:bg-gray-50">
              <td className="px-6 py-4 text-sm">{b.businessName}</td>
              <td className="px-6 py-4 text-sm">{b.entityType}</td>
              <td className="px-6 py-4 text-sm">{b.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
