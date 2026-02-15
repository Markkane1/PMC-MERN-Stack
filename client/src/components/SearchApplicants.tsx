/**
 * Week 3: Debounced Search Component
 * Optimized search that waits 500ms after typing stops before making API request
 */

import { useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { useApplicantSearch } from '@/api/hooks'

export interface SearchApplicantsProps {
  onSelect?: (applicant: any) => void
  placeholder?: string
  debounceMs?: number
}

/**
 * Debounced search component
 * - User types
 * - Wait 500ms
 * - Only then make API request
 * - Avoids excessive API calls
 */
export function SearchApplicants({
  onSelect,
  placeholder = 'Search applicants by name or email...',
  debounceMs = 500,
}: SearchApplicantsProps) {
  const [inputValue, setInputValue] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounced function: wait N ms after typing stops
  const handleDebouncedSearch = useDebouncedCallback((query: string) => {
    setDebouncedQuery(query)
  }, debounceMs)

  // Fetch results based on debounced query
  const { results, isSearching, hasResults } = useApplicantSearch(debouncedQuery)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    handleDebouncedSearch(value)
  }

  const handleSelectResult = (applicant: any) => {
    setInputValue('')
    setDebouncedQuery('')
    onSelect?.(applicant)
  }

  return (
    <div className="search-applicants">
      <div className="search-input-wrapper">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="search-input"
        />
        {inputValue && isSearching && (
          <span className="search-loading">Searching...</span>
        )}
      </div>

      {hasResults && (
        <div className="search-results">
          {results.map((applicant) => (
            <div
              key={applicant.id}
              className="search-result-item"
              onClick={() => handleSelectResult(applicant)}
            >
              <div className="result-name">{applicant.name}</div>
              <div className="result-email">{applicant.email}</div>
              <div className="result-status">
                <span className={`badge badge-${applicant.status}`}>
                  {applicant.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {inputValue && !isSearching && !hasResults && debouncedQuery && (
        <div className="search-empty">No applicants found</div>
      )}

      <style jsx>{`
        .search-applicants {
          position: relative;
          width: 100%;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
        }

        .search-loading {
          position: absolute;
          right: 12px;
          font-size: 12px;
          color: #666;
        }

        .search-results {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 4px 4px;
          max-height: 400px;
          overflow-y: auto;
          z-index: 10;
        }

        .search-result-item {
          padding: 12px;
          border-bottom: 1px solid #eee;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .search-result-item:hover {
          background-color: #f5f5f5;
        }

        .search-result-item:last-child {
          border-bottom: none;
        }

        .result-name {
          font-weight: 500;
          color: #333;
        }

        .result-email {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }

        .result-status {
          margin-top: 8px;
        }

        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge-pending {
          background-color: #fff3cd;
          color: #856404;
        }

        .badge-approved {
          background-color: #d4edda;
          color: #155724;
        }

        .badge-rejected {
          background-color: #f8d7da;
          color: #721c24;
        }

        .search-empty {
          padding: 12px;
          color: #999;
          font-size: 13px;
          text-align: center;
        }
      `}</style>
    </div>
  )
}
