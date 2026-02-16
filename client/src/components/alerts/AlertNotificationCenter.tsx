import React, { useEffect, useState } from 'react'
import { useAlertAPI } from '../../api/pmc'

interface Alert {
  _id: string
  title: string
  message: string
  type: string
  priority: string
  isRead: boolean
  createdAt: string
}

export const AlertNotificationCenter: React.FC = () => {
  const { getAlerts, getUnreadCount, markAsRead, deleteAlert, loading, error } = useAlertAPI()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [page, setPage] = useState(0)

  useEffect(() => {
    loadAlerts()
    loadUnreadCount()

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadUnreadCount()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const loadAlerts = async () => {
    try {
      const data = await getAlerts(10, page * 10)
      setAlerts(data || [])
    } catch (err) {
      console.error('Failed to load alerts:', err)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadCount()
      setUnreadCount(count)
    } catch (err) {
      console.error('Failed to load unread count:', err)
    }
  }

  const handleMarkAsRead = async (alertId: string) => {
    try {
      await markAsRead(alertId)
      setAlerts(alerts.map((a) => (a._id === alertId ? { ...a, isRead: true } : a)))
      setUnreadCount(Math.max(0, unreadCount - 1))
    } catch (err) {
      console.error('Failed to mark alert as read:', err)
    }
  }

  const handleDelete = async (alertId: string) => {
    try {
      await deleteAlert(alertId)
      setAlerts(alerts.filter((a) => a._id !== alertId))
    } catch (err) {
      console.error('Failed to delete alert:', err)
    }
  }

  const priorityColors: Record<string, string> = {
    CRITICAL: 'bg-red-100 border-red-400',
    HIGH: 'bg-orange-100 border-orange-400',
    MEDIUM: 'bg-yellow-100 border-yellow-400',
    LOW: 'bg-blue-100 border-blue-400',
  }

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Notifications</h3>
            {unreadCount > 0 && <p className="text-sm text-gray-600">{unreadCount} unread</p>}
          </div>

          {loading && <div className="p-4 text-center text-gray-500">Loading...</div>}

          {error && <div className="p-4 text-sm text-red-600">{error}</div>}

          {!loading && alerts.length === 0 && <div className="p-4 text-center text-gray-500">No notifications</div>}

          {!loading &&
            alerts.map((alert) => (
              <div
                key={alert._id}
                className={`p-3 border-l-4 border-b ${priorityColors[alert.priority] || 'bg-gray-50'} cursor-pointer hover:bg-opacity-75 transition-all`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1" onClick={() => !alert.isRead && handleMarkAsRead(alert._id)}>
                    <h4 className="font-semibold text-sm text-gray-900">{alert.title}</h4>
                    <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(alert.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(alert._id)}
                    className="ml-2 text-gray-400 hover:text-red-600 focus:outline-none"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

          {!loading && alerts.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button
                onClick={() => setPage(page + 1)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
