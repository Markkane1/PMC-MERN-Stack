/**
 * Week 3: Virtualized List Component
 * Only renders visible rows, dramatically improves performance for large lists
 * Can handle 10K+ items smoothly
 */

import { memo, useMemo } from 'react'
import type { CSSProperties } from 'react'
import { List } from 'react-window'
import { ApplicantRow } from './ApplicantRow'
import type { Applicant } from '@/api/hooks'

export interface VirtualizedApplicantListProps {
  applicants: Applicant[]
  height?: number
  itemSize?: number
  onSelect?: (applicant: Applicant) => void
  onDelete?: (id: string) => void
  selectedIds?: Set<string>
  isLoading?: boolean
}

/**
 * Row renderer for virtualized list
 */
interface VirtualizedRowProps {
  ariaAttributes: {
    'aria-posinset': number
    'aria-setsize': number
    role: 'listitem'
  }
  index: number
  style: CSSProperties
  applicants: Applicant[]
  onSelect?: (applicant: Applicant) => void
  onDelete?: (id: string) => void
  selectedIds: Set<string>
}

const Row = memo(
  ({ index, style, applicants, onSelect, onDelete, selectedIds, ariaAttributes }: VirtualizedRowProps) => {
    const applicant = applicants[index]

    if (!applicant) return null

    return (
      <div style={style} {...ariaAttributes}>
        <table style={{ width: '100%' }}>
          <tbody>
            <ApplicantRow
              applicant={applicant}
              onSelect={onSelect}
              onDelete={onDelete}
              isSelected={selectedIds?.has(applicant.id)}
            />
          </tbody>
        </table>
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Only re-render if data changed
    return (
      prevProps.data === nextProps.data &&
      prevProps.style === nextProps.style
    )
  }
)

Row.displayName = 'VirtualizedRow'

/**
 * Virtualized applicant list
 * Efficiently renders 10K+ items
 * Only DOM nodes for visible rows exist at once
 */
export const VirtualizedApplicantList = memo<VirtualizedApplicantListProps>(
  ({
    applicants,
    height = 600,
    itemSize = 50,
    onSelect,
    onDelete,
    selectedIds = new Set(),
    isLoading = false,
  }) => {
    // Memoize data object to avoid unnecessary re-renders
    const itemData = useMemo(
      () => ({
        applicants,
        onSelect,
        onDelete,
        selectedIds,
      }),
      [applicants, onSelect, onDelete, selectedIds]
    )

    let content: React.ReactNode

    if (isLoading) {
      content = (
        <div className="loading-container">
          <div className="spinner">Loading...</div>
        </div>
      )
    } else if (applicants.length === 0) {
      content = (
        <div className="empty-container">
          <div className="empty-message">No applicants found</div>
        </div>
      )
    } else {
      content = (
        <div className="virtualized-list-container">
          <div className="list-header">
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th className="checkbox-th">
                    <input type="checkbox" />
                  </th>
                  <th className="name-th">Name</th>
                  <th className="email-th">Email</th>
                  <th className="status-th">Status</th>
                  <th className="created-th">Created</th>
                  <th className="actions-th">Actions</th>
                </tr>
              </thead>
            </table>
          </div>
          <List
            defaultHeight={height}
            rowCount={applicants.length}
            rowHeight={itemSize}
            rowComponent={Row}
            rowProps={itemData}
            style={{ height, width: '100%' }}
          />
        </div>
      )
    }

    return (
      <>
        {content}
        <style>{`
          .virtualized-list-container {
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
          }

          .list-header {
            background: #f5f5f5;
            border-bottom: 1px solid #ddd;
            position: sticky;
            top: 0;
            z-index: 10;
          }

          .list-header table {
            width: 100%;
          }

          .list-header thead {
            background: #f5f5f5;
          }

          .list-header th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            color: #333;
            border-bottom: 1px solid #ddd;
          }

          .checkbox-th {
            width: 40px;
          }

          .name-th {
            flex: 1;
          }

          .email-th {
            flex: 1;
          }

          .status-th {
            width: 100px;
          }

          .created-th {
            width: 100px;
          }

          .actions-th {
            width: 150px;
            text-align: right;
            padding-right: 12px;
          }

          .loading-container {
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f9f9f9;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
          }

          .spinner {
            color: #999;
            font-size: 14px;
          }

          .empty-container {
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f9f9f9;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
          }

          .empty-message {
            color: #999;
            font-size: 14px;
          }
        `}</style>
      </>
    )
  }
)

VirtualizedApplicantList.displayName = 'VirtualizedApplicantList'
