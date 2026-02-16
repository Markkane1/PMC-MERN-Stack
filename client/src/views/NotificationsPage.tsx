import { useState } from 'react'
import { AlertNotificationCenter } from '@/components'

interface NotificationTab {
    id: 'all' | 'unread' | 'archived'
    label: string
}

export default function NotificationsPage() {
    const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archived'>('all')

    const tabs: NotificationTab[] = [
        { id: 'all', label: 'All Notifications' },
        { id: 'unread', label: 'Unread' },
        { id: 'archived', label: 'Archived' },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Notifications</h1>
                <p className="text-gray-600 mt-2">Stay updated with important alerts and messages</p>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex gap-4 border-b border-gray-200">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 font-medium transition-colors ${
                                activeTab === tab.id
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="mt-6">
                    {activeTab === 'all' && (
                        <div>
                            <p className="text-gray-600 mb-4">All your notifications</p>
                            <AlertNotificationCenter />
                        </div>
                    )}

                    {activeTab === 'unread' && (
                        <div className="text-center py-12">
                            <div className="text-4xl mb-4">📬</div>
                            <p className="text-gray-600">Check your unread notifications</p>
                            <AlertNotificationCenter />
                        </div>
                    )}

                    {activeTab === 'archived' && (
                        <div className="text-center py-12">
                            <div className="text-4xl mb-4">📦</div>
                            <p className="text-gray-600">Your archived notifications appear here</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-md p-4">
                    <div className="text-2xl mb-2">🔔</div>
                    <h3 className="font-bold mb-1">Real-time Alerts</h3>
                    <p className="text-sm text-gray-600">Get instant notifications for important events</p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4">
                    <div className="text-2xl mb-2">📱</div>
                    <h3 className="font-bold mb-1">Multiple Channels</h3>
                    <p className="text-sm text-gray-600">Email, SMS, Push, and in-app notifications</p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4">
                    <div className="text-2xl mb-2">⚙️</div>
                    <h3 className="font-bold mb-1">Customizable</h3>
                    <p className="text-sm text-gray-600">Manage your preferences in settings</p>
                </div>
            </div>
        </div>
    )
}
