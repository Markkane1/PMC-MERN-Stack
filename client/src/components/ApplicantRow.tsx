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

<style jsx>{`
  .applicant-row {
    border-bottom: 1px solid #e0e0e0;
    transition: background-color 0.2s;
  }

  .applicant-row:hover {
    background-color: #f8f9fa;
  }

  .applicant-row.selected {
    background-color: #e3f2fd;
  }

  .checkbox-cell {
    width: 40px;
    text-align: center;
  }

  .name-cell {
    cursor: pointer;
    font-weight: 500;
  }

  .applicant-name {
    color: #1976d2;
    text-decoration: none;
  }

  .applicant-name:hover {
    text-decoration: underline;
  }

  .email-cell {
    color: #666;
    font-size: 13px;
  }

  .status-cell {
    text-align: center;
  }

  .status-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-pending {
    background-color: #fff3cd;
    color: #856404;
  }

  .status-approved {
    background-color: #d4edda;
    color: #155724;
  }

  .status-rejected {
    background-color: #f8d7da;
    color: #721c24;
  }

  .created-cell {
    color: #999;
    font-size: 13px;
  }

  .actions-cell {
    text-align: right;
    padding-right: 12px;
  }

  .btn-action {
    margin-left: 8px;
    padding: 4px 8px;
    border: 1px solid #ddd;
    background: white;
    border-radius: 3px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-action:hover {
    border-color: #999;
    background: #f5f5f5;
  }

  .btn-view {
    color: #1976d2;
    border-color: #1976d2;
  }

  .btn-view:hover {
    background: #e3f2fd;
  }

  .btn-delete {
    color: #d32f2f;
    border-color: #d32f2f;
  }

  .btn-delete:hover {
    background: #ffebee;
  }
`}</style>
