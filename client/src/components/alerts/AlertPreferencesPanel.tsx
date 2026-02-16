import React, { useEffect, useState } from 'react'
import { useAlertAPI } from '../../api/pmc'

interface NotificationPreferences {
  emailNotifications?: boolean
  smsNotifications?: boolean
  inAppNotifications?: boolean
  pushNotifications?: boolean
  dailyDigest?: boolean
  criticalOnly?: boolean
  channels?: string[]
  frequency?: string
}

export const AlertPreferencesPanel: React.FC = () => {
  const { getPreferences, updatePreferences, loading, error } = useAlertAPI()
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    smsNotifications: false,
    inAppNotifications: true,
    pushNotifications: true,
    dailyDigest: false,
    criticalOnly: false,
    channels: ['inApp', 'email'],
    frequency: 'realtime',
  })
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const prefs = await getPreferences()
      if (prefs) {
        setPreferences(prefs)
      }
    } catch (err) {
      console.error('Failed to load preferences:', err)
    }
  }

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences({
      ...preferences,
      [key]: !preferences[key],
    })
  }

  const handleChannelToggle = (channel: string) => {
    const channels = preferences.channels || []
    if (channels.includes(channel)) {
      setPreferences({
        ...preferences,
        channels: channels.filter((c) => c !== channel),
      })
    } else {
      setPreferences({
        ...preferences,
        channels: [...channels, channel],
      })
    }
  }

  const handleFrequencyChange = (frequency: string) => {
    setPreferences({
      ...preferences,
      frequency,
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updatePreferences(preferences)
      setSavedMessage('Preferences saved successfully!')
      setIsEditing(false)
      setTimeout(() => setSavedMessage(''), 3000)
    } catch (err) {
      console.error('Failed to save preferences:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-4 text-center">Loading preferences...</div>
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Notification Preferences</h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            isEditing ? 'bg-gray-400 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {savedMessage && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{savedMessage}</div>}

      {/* Notification Channels */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📱 Notification Channels</span>
        </h3>

        <div className="space-y-3">
          {/* In-App Notifications */}
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50">
            <div>
              <h4 className="font-medium">In-App Notifications</h4>
              <p className="text-sm text-gray-600">Receive alerts within the application</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.inAppNotifications || false}
              onChange={() => {
                handleToggle('inAppNotifications')
                if (!isEditing) setIsEditing(true)
              }}
              disabled={!isEditing}
              className="w-5 h-5 cursor-pointer"
            />
          </div>

          {/* Email Notifications */}
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50">
            <div>
              <h4 className="font-medium">Email Notifications</h4>
              <p className="text-sm text-gray-600">Receive alerts via email</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailNotifications || false}
              onChange={() => {
                handleToggle('emailNotifications')
                if (!isEditing) setIsEditing(true)
              }}
              disabled={!isEditing}
              className="w-5 h-5 cursor-pointer"
            />
          </div>

          {/* SMS Notifications */}
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50">
            <div>
              <h4 className="font-medium">SMS Notifications</h4>
              <p className="text-sm text-gray-600">Receive alerts via text message</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.smsNotifications || false}
              onChange={() => {
                handleToggle('smsNotifications')
                if (!isEditing) setIsEditing(true)
              }}
              disabled={!isEditing}
              className="w-5 h-5 cursor-pointer"
            />
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50">
            <div>
              <h4 className="font-medium">Push Notifications</h4>
              <p className="text-sm text-gray-600">Receive browser push notifications</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.pushNotifications || false}
              onChange={() => {
                handleToggle('pushNotifications')
                if (!isEditing) setIsEditing(true)
              }}
              disabled={!isEditing}
              className="w-5 h-5 cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* Notification Frequency */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>⏱️ Notification Frequency</span>
        </h3>

        <div className="space-y-2">
          {['realtime', 'hourly', 'daily', 'weekly'].map((freq) => (
            <label key={freq} className="flex items-center p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="frequency"
                value={freq}
                checked={preferences.frequency === freq}
                onChange={(e) => {
                  handleFrequencyChange(e.target.value)
                  if (!isEditing) setIsEditing(true)
                }}
                disabled={!isEditing}
                className="w-4 h-4"
              />
              <span className="ml-3 capitalize font-medium">{freq}</span>
              <span className="ml-2 text-sm text-gray-600">
                {freq === 'realtime' && '- Get alerts immediately'}
                {freq === 'hourly' && '- Receive hourly digests'}
                {freq === 'daily' && '- Receive daily digests'}
                {freq === 'weekly' && '- Receive weekly digests'}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Alert Filtering */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>🎯 Alert Filtering</span>
        </h3>

        {/* Critical Only */}
        <div className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50">
          <div>
            <h4 className="font-medium">Critical Alerts Only</h4>
            <p className="text-sm text-gray-600">Only notify for critical priority alerts</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.criticalOnly || false}
            onChange={() => {
              handleToggle('criticalOnly')
              if (!isEditing) setIsEditing(true)
            }}
            disabled={!isEditing}
            className="w-5 h-5 cursor-pointer"
          />
        </div>

        {/* Daily Digest */}
        <div className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 mt-3">
          <div>
            <h4 className="font-medium">Daily Digest</h4>
            <p className="text-sm text-gray-600">Receive a summary of all alerts once a day</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.dailyDigest || false}
            onChange={() => {
              handleToggle('dailyDigest')
              if (!isEditing) setIsEditing(true)
            }}
            disabled={!isEditing}
            className="w-5 h-5 cursor-pointer"
          />
        </div>
      </section>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex gap-4 pt-6 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400 font-medium transition-colors"
          >
            {saving ? 'Saving...' : '✓ Save Preferences'}
          </button>
          <button
            onClick={() => {
              setIsEditing(false)
              loadPreferences()
            }}
            className="flex-1 bg-gray-400 text-white py-2 rounded hover:bg-gray-500 font-medium transition-colors"
          >
            ✕ Discard Changes
          </button>
        </div>
      )}
    </div>
  )
}
