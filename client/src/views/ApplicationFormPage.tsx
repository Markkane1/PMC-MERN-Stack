import { useState } from 'react'
import { AdvancedFieldFormRenderer, PaymentStatusComponent } from '@/components'
import { useParams } from 'react-router-dom'

type FormStep = 'personal' | 'details' | 'documents' | 'payment' | 'review'

interface StepConfig {
    id: FormStep
    label: string
    section: string
    icon: string
}

export default function ApplicationFormPage() {
    const { applicantId } = useParams<{ applicantId: string }>()
    const [currentStep, setCurrentStep] = useState<FormStep>('personal')
    const finalApplicantId = applicantId || localStorage.getItem('applicantId') || ''

    const steps: StepConfig[] = [
        { id: 'personal', label: 'Personal Info', section: 'personal-information', icon: '👤' },
        { id: 'details', label: 'Application Details', section: 'application-details', icon: '📋' },
        { id: 'documents', label: 'Documents', section: 'document-upload', icon: '📄' },
        { id: 'payment', label: 'Payment', section: 'payment-info', icon: '💳' },
        { id: 'review', label: 'Review & Submit', section: 'review', icon: '✓' },
    ]

    if (!finalApplicantId) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-4">Application Form</h1>
                    <p className="text-gray-600">
                        No applicant selected. Please go back and select an applicant.
                    </p>
                </div>
            </div>
        )
    }

    const handleStepComplete = () => {
        const currentIndex = steps.findIndex((s) => s.id === currentStep)
        if (currentIndex < steps.length - 1) {
            setCurrentStep(steps[currentIndex + 1].id)
        }
    }

    const getCurrentSection = (): string => {
        const step = steps.find((s) => s.id === currentStep)
        return step?.section || ''
    }

    const getCurrentIcon = (): string => {
        const step = steps.find((s) => s.id === currentStep)
        return step?.icon || ''
    }

    return (
        <div className="max-w-5xl mx-auto py-8 space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <span>{getCurrentIcon()}</span>
                    Application Form
                </h1>
                <p className="text-gray-600 mt-2">Complete your application step by step</p>
                <p className="text-sm text-gray-500 mt-1">Applicant ID: {finalApplicantId}</p>
            </div>

            {/* Step Indicator */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="mb-6">
                    {/* Visual Step Progress */}
                    <div className="flex justify-between items-center mb-4">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center flex-1">
                                {/* Step Circle */}
                                <div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all cursor-pointer ${
                                        step.id === currentStep
                                            ? 'bg-blue-600 text-white shadow-lg scale-110'
                                            : steps.findIndex((s) => s.id === currentStep) > index
                                              ? 'bg-green-500 text-white'
                                              : 'bg-gray-200 text-gray-600'
                                    }`}
                                    onClick={() => {
                                        const clickIndex = steps.findIndex((s) => s.id === step.id)
                                        const currentIndex = steps.findIndex((s) => s.id === currentStep)
                                        if (clickIndex <= currentIndex) {
                                            setCurrentStep(step.id)
                                        }
                                    }}
                                >
                                    {steps.findIndex((s) => s.id === currentStep) > index ? '✓' : index + 1}
                                </div>

                                {/* Connecting Line */}
                                {index < steps.length - 1 && (
                                    <div
                                        className={`flex-1 h-1 mx-2 transition-all ${
                                            steps.findIndex((s) => s.id === currentStep) > index
                                                ? 'bg-green-500'
                                                : 'bg-gray-200'
                                        }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Step Labels */}
                    <div className="flex justify-between text-sm">
                        {steps.map((step) => (
                            <span
                                key={step.id}
                                className={`text-center flex-1 ${
                                    step.id === currentStep
                                        ? 'font-bold text-blue-600'
                                        : 'text-gray-600'
                                }`}
                            >
                                {step.label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                    <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Overall Progress</span>
                        <span className="text-sm font-medium">
                            {Math.round((steps.findIndex((s) => s.id === currentStep) / steps.length) * 100)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                            style={{
                                width: `${(steps.findIndex((s) => s.id === currentStep) / steps.length) * 100}%`,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Form Content */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
                {currentStep === 'payment' ? (
                    <PaymentStatusComponent applicantId={finalApplicantId} />
                ) : currentStep === 'review' ? (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Review Your Application</h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded">
                                <p className="text-sm text-gray-600">
                                    Please review all information you have provided before submitting your application.
                                </p>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded p-4">
                                <p className="text-green-800">
                                    ✓ All required fields have been filled correctly.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <AdvancedFieldFormRenderer
                        sectionId={getCurrentSection()}
                        onSubmit={() => {
                            handleStepComplete()
                        }}
                    />
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-4">
                <button
                    onClick={() => {
                        const currentIndex = steps.findIndex((s) => s.id === currentStep)
                        if (currentIndex > 0) {
                            setCurrentStep(steps[currentIndex - 1].id)
                        }
                    }}
                    disabled={currentStep === 'personal'}
                    className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                    ← Previous Step
                </button>

                {currentStep !== 'review' && (
                    <button
                        onClick={handleStepComplete}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        Next Step →
                    </button>
                )}

                {currentStep === 'review' && (
                    <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                        Submit Application
                    </button>
                )}
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <p className="text-blue-900 font-semibold mb-2">Need Assistance?</p>
                <p className="text-blue-800 text-sm">
                    Contact our support team at{' '}
                    <a href="mailto:support@pmc.gov.pk" className="underline font-semibold">
                        support@pmc.gov.pk
                    </a>{' '}
                    or call <a href="tel:+923001234567" className="underline font-semibold">
                        +92 300 1234567
                    </a>
                </p>
            </div>
        </div>
    )
}
