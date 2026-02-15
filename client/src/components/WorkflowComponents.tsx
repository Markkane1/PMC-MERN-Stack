/**
 * Workflow Components
 */
import React, { useState } from 'react'

export const AssignmentForm: React.FC = () => {
  const [formData, setFormData] = useState({
    applicantId: '',
    assignedTo: '',
    taskDescription: '',
    priority: 'MEDIUM',
    dueDate: ''
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/workflow/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const result = await response.json()
      if (result.success) alert('Assignment created!')
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Create Assignment</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" name="applicantId" placeholder="Applicant ID" value={formData.applicantId} onChange={handleChange} required className="w-full px-3 py-2 border rounded" />
        <input type="text" name="assignedTo" placeholder="Assign To" value={formData.assignedTo} onChange={handleChange} required className="w-full px-3 py-2 border rounded" />
        <textarea name="taskDescription" placeholder="Task Description" value={formData.taskDescription} onChange={handleChange} required rows={4} className="w-full px-3 py-2 border rounded"></textarea>
        <div className="grid grid-cols-2 gap-4">
          <select name="priority" value={formData.priority} onChange={handleChange} className="px-3 py-2 border rounded">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
          <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} required className="px-3 py-2 border rounded" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded">
          {loading ? 'Creating...' : 'Create Assignment'}
        </button>
      </form>
    </div>
  )
}

export const AssignmentList: React.FC = ({ userId }: { userId: string }) => {
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  React.useEffect(() => {
    const fetch_ = async () => {
      try {
        const response = await fetch('/api/workflow/assignments/user/' + userId)
        const result = await response.json()
        if (result.success) setAssignments(result.data || [])
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [userId])

  if (loading) return <div className="text-center py-4">Loading...</div>

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="divide-y">
        {assignments.map(a => (
          <div key={a.assignmentId} className="p-4 hover:bg-gray-50">
            <h4 className="font-bold">{a.taskDescription}</h4>
            <p className="text-sm text-gray-600">Priority: {a.priority}</p>
            <p className="text-sm text-gray-600">Status: {a.status}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export const InspectionForm: React.FC = ({ applicantId }: { applicantId: string }) => {
  const [formData, setFormData] = useState({
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectionType: 'SCHEDULED',
    findings: '',
    overallCompliance: 50
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: ['overallCompliance'].includes(name) ? parseInt(value) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/workflow/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, applicantId })
      })
      const result = await response.json()
      if (result.success) alert('Inspection created!')
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Create Inspection Report</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="date" name="inspectionDate" value={formData.inspectionDate} onChange={handleChange} required className="w-full px-3 py-2 border rounded" />
        <select name="inspectionType" value={formData.inspectionType} onChange={handleChange} className="w-full px-3 py-2 border rounded">
          <option value="SCHEDULED">Scheduled</option>
          <option value="UNSCHEDULED">Unscheduled</option>
          <option value="FOLLOW_UP">Follow-up</option>
        </select>
        <textarea name="findings" placeholder="Findings" value={formData.findings} onChange={handleChange} required rows={4} className="w-full px-3 py-2 border rounded"></textarea>
        <div>
          <label>Overall Compliance: {formData.overallCompliance}%</label>
          <input type="range" name="overallCompliance" min="0" max="100" value={formData.overallCompliance} onChange={handleChange} className="w-full" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded">
          {loading ? 'Creating...' : 'Create Inspection Report'}
        </button>
      </form>
    </div>
  )
}

export const WorkflowDashboard: React.FC = ({ userId }: { userId: string }) => {
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  React.useEffect(() => {
    const fetch_ = async () => {
      try {
        const response = await fetch('/api/workflow/dashboard?userId=' + userId)
        const result = await response.json()
        if (result.success) setDashboard(result.data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [userId])

  if (loading) return <div className="text-center py-4">Loading...</div>
  if (!dashboard) return <div className="text-center py-4">No data</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-blue-50 rounded-lg p-6">
        <p className="text-gray-600 text-sm">Pending</p>
        <p className="text-3xl font-bold text-blue-600">{dashboard.pendingAssignments || 0}</p>
      </div>
      <div className="bg-yellow-50 rounded-lg p-6">
        <p className="text-gray-600 text-sm">In Progress</p>
        <p className="text-3xl font-bold text-yellow-600">{dashboard.inProgressAssignments || 0}</p>
      </div>
      <div className="bg-green-50 rounded-lg p-6">
        <p className="text-gray-600 text-sm">Completed</p>
        <p className="text-3xl font-bold text-green-600">{dashboard.completedAssignments || 0}</p>
      </div>
      <div className="bg-red-50 rounded-lg p-6">
        <p className="text-gray-600 text-sm">Open Alerts</p>
        <p className="text-3xl font-bold text-red-600">{dashboard.openAlerts || 0}</p>
      </div>
    </div>
  )
}
