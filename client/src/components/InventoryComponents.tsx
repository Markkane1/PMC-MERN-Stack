/**
 * Inventory Components
 */
import React, { useState } from 'react'

export const PlasticItemForm: React.FC = () => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    unit: 'KG',
    recyclingRate: 0,
    hazardLevel: 'LOW'
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: ['recyclingRate'].includes(name) ? parseFloat(value) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/inventory/plastic-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const result = await response.json()
      if (result.success) alert('Plastic item created!')
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Add Plastic Item</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" name="code" placeholder="Code" value={formData.code} onChange={handleChange} required className="w-full px-3 py-2 border rounded" />
        <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border rounded" />
        <input type="text" name="category" placeholder="Category" value={formData.category} onChange={handleChange} required className="w-full px-3 py-2 border rounded" />
        <select name="unit" value={formData.unit} onChange={handleChange} className="w-full px-3 py-2 border rounded">
          <option value="KG">Kilogram</option>
          <option value="TON">Metric Ton</option>
          <option value="LITER">Liter</option>
        </select>
        <div className="grid grid-cols-2 gap-4">
          <input type="number" name="recyclingRate" placeholder="Recycling Rate %" min="0" max="100" value={formData.recyclingRate} onChange={handleChange} className="px-3 py-2 border rounded" />
          <select name="hazardLevel" value={formData.hazardLevel} onChange={handleChange} className="px-3 py-2 border rounded">
            <option value="LOW">Low Hazard</option>
            <option value="MEDIUM">Medium Hazard</option>
            <option value="HIGH">High Hazard</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded">
          {loading ? 'Creating...' : 'Add to Catalog'}
        </button>
      </form>
    </div>
  )
}

export const InventoryDashboard: React.FC<{ businessId: string }> = ({ businessId }) => {
  const [inventory, setInventory] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  React.useEffect(() => {
    const fetch_ = async () => {
      try {
        const response = await fetch('/api/inventory/businesses/' + businessId)
        const result = await response.json()
        if (result.success) setInventory(result.data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [businessId])

  if (loading) return <div className="text-center py-4">Loading...</div>
  if (!inventory) return <div className="text-center py-4 text-red-600">Failed to load</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-blue-50 rounded-lg p-6">
        <p className="text-gray-600 text-sm">Total Products</p>
        <p className="text-3xl font-bold text-blue-600 mt-2">{inventory.products?.length || 0}</p>
      </div>
      <div className="bg-yellow-50 rounded-lg p-6">
        <p className="text-gray-600 text-sm">By-Products</p>
        <p className="text-3xl font-bold text-yellow-600 mt-2">{inventory.byProducts?.length || 0}</p>
      </div>
      <div className="bg-green-50 rounded-lg p-6">
        <p className="text-gray-600 text-sm">Raw Materials</p>
        <p className="text-3xl font-bold text-green-600 mt-2">{inventory.rawMaterials?.length || 0}</p>
      </div>
    </div>
  )
}
