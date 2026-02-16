import { useState } from 'react'
import { AlertPreferencesPanel } from '@/components'

type SettingsTab = 'notifications' | 'profile' | 'security' | 'privacy'

interface SettingTab {
    id: SettingsTab
    label: string
    icon: string
    description: string
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('notifications')

    const tabs: SettingTab[] = [
        {
            id: 'notifications',
            label: 'Notifications',
            icon: '🔔',
            description: 'Manage how you receive alerts and updates',
        },
        {
            id: 'profile',
            label: 'Profile',
            icon: '👤',
            description: 'Update your personal information',
        },
        {
            id: 'security',
            label: 'Security',
            icon: '🔐',
            description: 'Manage passwords and login security',
        },
        {
            id: 'privacy',
            label: 'Privacy',
            icon: '🛡️',
            description: 'Control your privacy settings',
        },
    ]

    return (
        <div className="space-y-8 py-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-gray-600 mt-2">Manage your account preferences and settings</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-md overflow-hidden sticky top-4">
                        <nav className="space-y-0">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full text-left px-6 py-4 transition-colors border-l-4 ${
                                        activeTab === tab.id
                                            ? 'bg-blue-50 border-l-blue-600 text-blue-600 font-semibold'
                                            : 'border-l-transparent hover:bg-gray-50 text-gray-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{tab.icon}</span>
                                        <span>{tab.label}</span>
                                    </div>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3">
                    {/* Tab Content Header */}
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            {tabs.find((t) => t.id === activeTab)?.icon}
                            {tabs.find((t) => t.id === activeTab)?.label}
                        </h2>
                        <p className="text-gray-600 mt-2">
                            {tabs.find((t) => t.id === activeTab)?.description}
                        </p>
                    </div>

                    {/* Tab Content */}
                    <div>
                        {activeTab === 'notifications' && (
                            <AlertPreferencesPanel />
                        )}

                        {activeTab === 'profile' && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-xl font-bold mb-6">Profile Information</h3>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">First Name</label>
                                            <input
                                                type="text"
                                                placeholder="Your first name"
                                                className="w-full px-3 py-2 border border-gray-300 rounded"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Last Name</label>
                                            <input
                                                type="text"
                                                placeholder="Your last name"
                                                className="w-full px-3 py-2 border border-gray-300 rounded"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Email Address</label>
                                        <input
                                            type="email"
                                            placeholder="your.email@example.com"
                                            className="w-full px-3 py-2 border border-gray-300 rounded"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Phone Number</label>
                                        <input
                                            type="tel"
                                            placeholder="+92 300 1234567"
                                            className="w-full px-3 py-2 border border-gray-300 rounded"
                                        />
                                    </div>

                                    <button className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-medium">
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-xl font-bold mb-6">Security Settings</h3>
                                <div className="space-y-6">
                                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                                        <p className="text-yellow-800 font-medium mb-2">🔒 Password</p>
                                        <p className="text-sm text-yellow-700 mb-3">
                                            Last changed 3 months ago
                                        </p>
                                        <button className="text-yellow-600 hover:text-yellow-800 font-semibold text-sm">
                                            Change Password
                                        </button>
                                    </div>

                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                                        <p className="text-blue-800 font-medium mb-2">✓ Two-Factor Authentication</p>
                                        <p className="text-sm text-blue-700 mb-3">Enabled for your account</p>
                                        <button className="text-blue-600 hover:text-blue-800 font-semibold text-sm">
                                            Manage 2FA
                                        </button>
                                    </div>

                                    <div className="p-4 bg-gray-50 border border-gray-200 rounded">
                                        <p className="text-gray-800 font-medium mb-2">📱 Active Sessions</p>
                                        <p className="text-sm text-gray-700 mb-3">
                                            You have 2 active sessions
                                        </p>
                                        <button className="text-gray-600 hover:text-gray-800 font-semibold text-sm">
                                            View Sessions
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'privacy' && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-xl font-bold mb-6">Privacy Settings</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded hover:bg-gray-50">
                                        <div>
                                            <p className="font-medium">Profile Visibility</p>
                                            <p className="text-sm text-gray-600">Control who can see your profile</p>
                                        </div>
                                        <select className="px-3 py-1 border border-gray-300 rounded">
                                            <option>Public</option>
                                            <option>Private</option>
                                            <option>Friends Only</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded hover:bg-gray-50">
                                        <div>
                                            <p className="font-medium">Activity Status</p>
                                            <p className="text-sm text-gray-600">Show when you''re online</p>
                                        </div>
                                        <input type="checkbox" defaultChecked className="w-5 h-5" />
                                    </div>

                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded hover:bg-gray-50">
                                        <div>
                                            <p className="font-medium">Search Indexing</p>
                                            <p className="text-sm text-gray-600">Allow search engines to index profile</p>
                                        </div>
                                        <input type="checkbox" defaultChecked className="w-5 h-5" />
                                    </div>

                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded hover:bg-gray-50">
                                        <div>
                                            <p className="font-medium">Data Collection</p>
                                            <p className="text-sm text-gray-600">Help us improve with usage data</p>
                                        </div>
                                        <input type="checkbox" defaultChecked className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
