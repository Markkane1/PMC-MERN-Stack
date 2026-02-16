import { PaymentStatusComponent } from '@/components'
import { useParams } from 'react-router-dom'

export default function PaymentDashboard() {
    const { applicantId = '' } = useParams<{ applicantId?: string }>()
    const finalApplicantId = applicantId || localStorage.getItem('applicantId') || ''

    if (!finalApplicantId) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-4">Payment Information</h1>
                    <p className="text-gray-600">
                        No applicant selected. Please go back and select an applicant.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Payment Management</h1>
                <p className="text-gray-600 mt-2">View and manage your payment status</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <PaymentStatusComponent applicantId={finalApplicantId} />
                </div>

                {/* Payment Information Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-bold mb-4">Payment Information</h2>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-gray-600">Applicant ID</p>
                                <p className="font-semibold">{finalApplicantId}</p>
                            </div>
                            <hr />
                            <div>
                                <p className="text-gray-600 mb-2">Payment Methods Accepted</p>
                                <ul className="text-gray-700 space-y-1">
                                    <li>✓ Bank Transfer</li>
                                    <li>✓ Online Payment (PLMIS)</li>
                                    <li>✓ Cheque</li>
                                    <li>✓ Cash Counter</li>
                                </ul>
                            </div>
                            <hr />
                            <div>
                                <p className="text-gray-600 mb-2">Payment Deadline</p>
                                <p className="font-semibold text-orange-600">
                                    {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Help Section */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-md p-6 mt-6">
                        <h3 className="font-bold text-blue-900 mb-3">Need Help?</h3>
                        <p className="text-sm text-blue-800 mb-4">
                            If you have any questions about your payment, please contact our support team.
                        </p>
                        <a
                            href="mailto:support@pmc.gov.pk"
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                            📧 support@pmc.gov.pk
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
