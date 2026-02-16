/**
 * Week 3: Memoized ApplicantRow Component
 * Prevents re-renders when parent updates but props haven't changed
 * Used in large lists to improve performance
 */

import { memo, useCallback } from 'react'
import type { Applicant } from '@/api/hooks'

export interface ApplicantRowProps {
  applicant: Applicant
  onSelect?: (applicant: Applicant) => void
  onDelete?: (id: string) => void
  isSelected?: boolean
}

/**
 * Memoized applicant row
 * Only re-renders if applicant, onSelect, or onDelete props change
 * Significantly improves list performance
 */
export const ApplicantRow = memo<ApplicantRowProps>(
  ({ applicant, onSelect, onDelete, isSelected }) => {
    const handleSelect = useCallback(() => {
      onSelect?.(applicant)
    }, [applicant, onSelect])

    const handleDelete = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onDelete?.(applicant.id)
      },
      [applicant.id, onDelete]
    )

    return (
      <tr className={`applicant-row ${isSelected ? 'selected' : ''}`}>
        <td className="checkbox-cell">
          <input
            type="checkbox"
            checked={isSelected || false}
            onChange={handleSelect}
          />
        </td>
        <td className="name-cell" onClick={handleSelect}>
          <span className="applicant-name">{applicant.name}</span>
        </td>
        <td className="email-cell">{applicant.email}</td>
        <td className="status-cell">
          <span className={`status-badge status-${applicant.status}`}>
            {applicant.status}
          </span>
        </td>
        <td className="created-cell">
          {new Date(applicant.createdAt).toLocaleDateString()}
        </td>
        <td className="actions-cell">
          <button className="btn-action btn-view" onClick={handleSelect}>
            View
          </button>
          <button className="btn-action btn-delete" onClick={handleDelete}>
            Delete
          </button>
        </td>
      </tr>
    )
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if essential props change
    return (
      prevProps.applicant.id === nextProps.applicant.id &&
      prevProps.applicant.status === nextProps.applicant.status &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.onSelect === nextProps.onSelect &&
      prevProps.onDelete === nextProps.onDelete
    )
  }
)

ApplicantRow.displayName = 'ApplicantRow'
