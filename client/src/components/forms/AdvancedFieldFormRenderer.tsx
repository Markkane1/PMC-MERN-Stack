import React, { useEffect, useState } from 'react'
import { useAdvancedFieldAPI } from '../../api/pmc'

interface FieldDefinition {
  _id: string
  fieldName: string
  fieldType: string
  label: string
  required: boolean
  section?: string
  options?: string[]
  validationRules?: Record<string, unknown>
  conditional?: {
    dependsOn: string
    operator: string
    value: string
  }
}

interface FormState {
  [key: string]: unknown
}

export const AdvancedFieldFormRenderer: React.FC<{ sectionId?: string; onSubmit?: (data: FormState) => void }> = ({
  sectionId,
  onSubmit,
}) => {
  const { getFieldDefinitions, validateField, saveResponses, getResponses, getCompletionStatus, loading, error } =
    useAdvancedFieldAPI()
  const [fields, setFields] = useState<FieldDefinition[]>([])
  const [formData, setFormData] = useState<FormState>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [completionStatus, setCompletionStatus] = useState({ totalFields: 0, completedFields: 0 })

  useEffect(() => {
    loadFields()
    loadResponses()
    loadCompletionStatus()
  }, [sectionId])

  const loadFields = async () => {
    try {
      const data = await getFieldDefinitions(sectionId)
      setFields(data || [])
    } catch (err) {
      console.error('Failed to load fields:', err)
    }
  }

  const loadResponses = async () => {
    try {
      const responses = await getResponses()
      if (responses) {
        setFormData(responses)
      }
    } catch (err) {
      console.error('Failed to load responses:', err)
    }
  }

  const loadCompletionStatus = async () => {
    try {
      const status = await getCompletionStatus()
      setCompletionStatus(status)
    } catch (err) {
      console.error('Failed to load completion status:', err)
    }
  }

  const handleFieldChange = async (fieldId: string, value: unknown) => {
    setFormData({ ...formData, [fieldId]: value })

    // Real-time validation
    try {
      await validateField(fieldId, value)
      setValidationErrors({ ...validationErrors, [fieldId]: '' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Validation failed'
      setValidationErrors({ ...validationErrors, [fieldId]: message })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await saveResponses(sectionId || '', Object.values(formData))
      onSubmit?.(formData)
      loadCompletionStatus()
    } catch (err) {
      console.error('Failed to save responses:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const shouldShowField = (field: FieldDefinition): boolean => {
    if (!field.conditional) return true
    const dependencyValue = formData[field.conditional.dependsOn]
    return dependencyValue === field.conditional.value
  }

  const renderFieldInput = (field: FieldDefinition) => {
    const value = formData[field._id] ?? ''
    const errorMessage = validationErrors[field._id]

    switch (field.fieldType) {
      case 'TEXT':
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => handleFieldChange(field._id, e.target.value)}
            className={`w-full px-3 py-2 border rounded ${errorMessage ? 'border-red-500' : 'border-gray-300'}`}
            maxLength={field.validationRules?.maxLength ? (field.validationRules.maxLength as number) : 255}
          />
        )

      case 'NUMBER':
        return (
          <input
            type="number"
            value={value as number}
            onChange={(e) => handleFieldChange(field._id, parseFloat(e.target.value))}
            className={`w-full px-3 py-2 border rounded ${errorMessage ? 'border-red-500' : 'border-gray-300'}`}
            min={field.validationRules?.min as number}
            max={field.validationRules?.max as number}
          />
        )

      case 'DATE':
        return (
          <input
            type="date"
            value={value as string}
            onChange={(e) => handleFieldChange(field._id, e.target.value)}
            className={`w-full px-3 py-2 border rounded ${errorMessage ? 'border-red-500' : 'border-gray-300'}`}
          />
        )

      case 'EMAIL':
        return (
          <input
            type="email"
            value={value as string}
            onChange={(e) => handleFieldChange(field._id, e.target.value)}
            className={`w-full px-3 py-2 border rounded ${errorMessage ? 'border-red-500' : 'border-gray-300'}`}
          />
        )

      case 'PHONE':
        return (
          <input
            type="tel"
            value={value as string}
            onChange={(e) => handleFieldChange(field._id, e.target.value)}
            className={`w-full px-3 py-2 border rounded ${errorMessage ? 'border-red-500' : 'border-gray-300'}`}
            pattern="[0-9-+().\s]{5,}"
          />
        )

      case 'TEXTAREA':
        return (
          <textarea
            value={value as string}
            onChange={(e) => handleFieldChange(field._id, e.target.value)}
            className={`w-full px-3 py-2 border rounded ${errorMessage ? 'border-red-500' : 'border-gray-300'}`}
            rows={4}
            maxLength={field.validationRules?.maxLength ? (field.validationRules.maxLength as number) : 1000}
          />
        )

      case 'SELECT':
        return (
          <select
            value={value as string}
            onChange={(e) => handleFieldChange(field._id, e.target.value)}
            className={`w-full px-3 py-2 border rounded ${errorMessage ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="">Select an option</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )

      case 'CHECKBOX':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value as boolean}
              onChange={(e) => handleFieldChange(field._id, e.target.checked)}
              className="w-4 h-4 border-gray-300 rounded"
            />
          </div>
        )

      case 'RADIO':
        return (
          <div className="space-y-2">
            {field.options?.map((opt) => (
              <label key={opt} className="flex items-center">
                <input
                  type="radio"
                  name={field._id}
                  value={opt}
                  checked={value === opt}
                  onChange={(e) => handleFieldChange(field._id, e.target.value)}
                  className="mr-2"
                />
                {opt}
              </label>
            ))}
          </div>
        )

      case 'MULTISELECT':
        return (
          <select
            multiple
            value={Array.isArray(value) ? (value as string[]) : []}
            onChange={(e) =>
              handleFieldChange(
                field._id,
                Array.from(e.target.selectedOptions, (o) => o.value)
              )
            }
            className={`w-full px-3 py-2 border rounded ${errorMessage ? 'border-red-500' : 'border-gray-300'}`}
          >
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )

      default:
        return <div>Unsupported field type: {field.fieldType}</div>
    }
  }

  if (loading) return <div className="p-4 text-center">Loading form fields...</div>
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>

  const visibleFields = fields.filter(shouldShowField)

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Application Form</h2>
        <div className="flex justify-between items-center">
          <p className="text-gray-600">
            {completionStatus.completedFields} of {completionStatus.totalFields} fields completed
          </p>
          <div className="w-32 bg-gray-200 rounded-full h-2">
            <div
              className="h-2 bg-blue-600 rounded-full transition-all"
              style={{
                width: `${completionStatus.totalFields > 0 ? (completionStatus.completedFields / completionStatus.totalFields) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {visibleFields.length === 0 && <p className="text-gray-500">No fields to display</p>}

      <div className="space-y-6">
        {visibleFields.map((field) => (
          <div key={field._id}>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {renderFieldInput(field)}

            {validationErrors[field._id] && (
              <p className="mt-1 text-sm text-red-600">{validationErrors[field._id]}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <button
          type="submit"
          disabled={submitting || Object.values(validationErrors).some((err) => err)}
          className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
        >
          {submitting ? 'Saving...' : 'Save & Continue'}
        </button>
      </div>
    </form>
  )
}
