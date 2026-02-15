/**
 * Advanced Search & Filtering Components
 * Full-text search, multi-criteria filtering, saved filters
 */

import React, { useState, useEffect } from 'react'

/**
 * AdvancedSearchPanel - Unified search across all entities
 */
export const AdvancedSearchPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('all')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const performSearch = async (query: string) => {
    if (!query.trim()) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&type=${searchType}`
      )
      const result = await response.json()
      if (result.success) {
        setResults(result.data)
        setRecentSearches(prev => [query, ...prev.slice(0, 4)])
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(searchQuery)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Advanced Search</h2>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search applicants, businesses, documents..."
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Types</option>
              <option value="applicants">Applicants</option>
              <option value="businesses">Businesses</option>
              <option value="documents">Documents</option>
              <option value="inventory">Inventory</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              Search
            </button>
          </div>
        </form>

        {recentSearches.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Recent:</span>
            {recentSearches.map((search, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSearchQuery(search)
                  performSearch(search)
                }}
                className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                {search}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="text-center py-8">Searching...</div>}

      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold mb-4">Results ({results.length})</h3>
          <div className="space-y-3">
            {results.map((item, idx) => (
              <SearchResult key={idx} item={item} />
            ))}
          </div>
        </div>
      )}

      {!loading && results.length === 0 && searchQuery && (
        <div className="text-center py-8 text-gray-500">No results found</div>
      )}
    </div>
  )
}

/**
 * SearchResult - Individual result display
 */
const SearchResult: React.FC<{ item: any }> = ({ item }) => {
  const icons: any = {
    applicant: '👤',
    business: '🏢',
    document: '📄',
    inventory: '📦'
  }

  return (
    <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icons[item.type] || '•'}</span>
        <div className="flex-1">
          <h4 className="font-bold">{item.name || item.title}</h4>
          <p className="text-sm text-gray-600">{item.description}</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              {item.type}
            </span>
            {item.status && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                {item.status}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * MultiCriteriaFilter - Complex filtering with multiple conditions
 */
export const MultiCriteriaFilter: React.FC<{ entityType: string }> = ({ entityType }) => {
  const [filters, setFilters] = useState<any[]>([{ field: '', operator: 'equals', value: '' }])
  const [results, setResults] = useState<any[]>([])
  const [hasApplied, setHasApplied] = useState(false)

  const fieldOptions: any = {
    applicants: ['CNIC', 'Status', 'District', 'Application Date', 'Verified'],
    businesses: ['Entity Type', 'Status', 'Registration Date', 'District', 'Industry'],
    inventory: ['Plastic Type', 'Category', 'Hazard Level', 'Recycling Rate', 'Date Added']
  }

  const operatorOptions = [
    'equals',
    'contains',
    'greater than',
    'less than',
    'between',
    'in list'
  ]

  const addFilter = () => {
    setFilters([...filters, { field: '', operator: 'equals', value: '' }])
  }

  const removeFilter = (idx: number) => {
    setFilters(filters.filter((_, i) => i !== idx))
  }

  const updateFilter = (idx: number, key: string, value: any) => {
    const updatedFilters = [...filters]
    updatedFilters[idx][key] = value
    setFilters(updatedFilters)
  }

  const applyFilters = async () => {
    try {
      const response = await fetch('/api/filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, filters: filters.filter(f => f.field) })
      })
      const result = await response.json()
      if (result.success) {
        setResults(result.data)
        setHasApplied(true)
      }
    } catch (error) {
      console.error('Filter error:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Advanced Filters</h2>

        <div className="space-y-4">
          {filters.map((filter, idx) => (
            <div key={idx} className="flex gap-3 p-4 border rounded-lg">
              <select
                value={filter.field}
                onChange={(e) => updateFilter(idx, 'field', e.target.value)}
                className="px-3 py-2 border rounded flex-1"
              >
                <option value="">Select field...</option>
                {fieldOptions[entityType as keyof typeof fieldOptions]?.map((field: string) => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>

              <select
                value={filter.operator}
                onChange={(e) => updateFilter(idx, 'operator', e.target.value)}
                className="px-3 py-2 border rounded"
              >
                {operatorOptions.map(op => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>

              <input
                type="text"
                value={filter.value}
                onChange={(e) => updateFilter(idx, 'value', e.target.value)}
                placeholder="Value..."
                className="px-3 py-2 border rounded flex-1"
              />

              {filters.length > 1 && (
                <button
                  onClick={() => removeFilter(idx)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={addFilter}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            + Add Filter
          </button>
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {hasApplied && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold mb-4">Results ({results.length})</h3>
          {results.length > 0 ? (
            <div className="space-y-2">
              {results.map((item, idx) => (
                <div key={idx} className="p-3 border rounded hover:bg-gray-50">
                  <p className="font-medium">{item.name || item.title}</p>
                  <p className="text-sm text-gray-600">{JSON.stringify(item, null, 2).substring(0, 100)}...</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No results match your filters</p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * SavedFilters - Manage and apply saved filter configurations
 */
export const SavedFilters: React.FC = () => {
  const [savedFilters, setSavedFilters] = useState<any[]>([])
  const [newFilterName, setNewFilterName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSavedFilters = async () => {
      try {
        const response = await fetch('/api/filters/saved')
        const result = await response.json()
        if (result.success) setSavedFilters(result.data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSavedFilters()
  }, [])

  const handleDelete = async (filterId: string) => {
    try {
      const response = await fetch(`/api/filters/saved/${filterId}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        setSavedFilters(savedFilters.filter(f => f.id !== filterId))
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  if (loading) return <div className="text-center py-8">Loading...</div>

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Saved Filters</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {savedFilters.map(filter => (
          <div key={filter.id} className="p-4 border rounded-lg hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold">{filter.name}</h3>
                <p className="text-sm text-gray-600">{filter.criteria} criteria</p>
                <p className="text-xs text-gray-500 mt-1">Created: {new Date(filter.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                  Apply
                </button>
                <button
                  onClick={() => handleDelete(filter.id)}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {savedFilters.length === 0 && (
        <p className="text-center text-gray-500 py-8">No saved filters yet</p>
      )}
    </div>
  )
}
