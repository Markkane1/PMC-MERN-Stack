import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import AxiosBase from '../services/axios/AxiosBase'
import axios from 'axios'
import type { TypeAttributes } from '@/components/ui/@types/common'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'

const TrackApplication = () => {
    const [trackingNumber, setTrackingNumber] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useTimeOutMessage()
    const [messageType, setMessageType] =
        useState<TypeAttributes.Status>('info')
    const [trackingResult, setTrackingResult] = useState<string | null>(null)

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            setTrackingNumber(formatTrackingNumber(trackingNumber, true))
        }
    }

    const formatTrackingNumber = (value: string, isBackspace: boolean) => {
        const rawValue = value.replace(/[^a-zA-Z0-9]/g, '')

        const segment1 = rawValue
            .slice(0, 3)
            .toUpperCase()
            .replace(/[^A-Z]/g, '')
        const segment2 = rawValue
            .slice(3, 6)
            .toUpperCase()
            .replace(/[^A-Z]/g, '')
        const segment3 = rawValue.slice(6).replace(/[^0-9]/g, '')

        if (isBackspace) {
            return [segment1, segment2, segment3].filter(Boolean).join('-')
        }

        let formattedValue = ''
        if (segment1)
            formattedValue += segment1 + (segment1.length === 3 ? '-' : '')
        if (segment2)
            formattedValue += segment2 + (segment2.length === 3 ? '-' : '')
        if (segment3) formattedValue += segment3

        return formattedValue
    }

    const fetchTrackingInfo = async () => {
        if (!trackingNumber) {
            setMessage('Please enter a valid tracking number.')
            setMessageType('danger')
            return
        }

        setLoading(true)
        setMessage('')
        setTrackingResult(null)

        try {
            const response = await AxiosBase.get('/pmc/track-application/', {
                headers: { 'Content-Type': 'application/json' },
                params: { tracking_number: trackingNumber },
            })

            setTrackingResult(response.data.message || 'No additional details')
            setMessageType('success')
        } catch (error) {
            setTrackingResult(null)
            if (axios.isAxiosError(error)) {
                setMessage(
                    (error.response?.data as { message?: string })?.message ||
                        'Error tracking application.',
                )
            } else {
                setMessage('Error tracking application.')
            }
            setMessageType('danger')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-fit">
            <div className="w-full max-w-lg p-6 bg-white shadow-2xl rounded-lg">
                <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold mb-2">
                        Track Your Application
                    </h2>
                    <p className="text-gray-600">
                        Enter your tracking number to get details
                    </p>
                </div>

                {message && (
                    <Alert showIcon className="mb-4" type={messageType}>
                        {message}
                    </Alert>
                )}

                <div className="mb-4">
                    <Input
                        value={trackingNumber}
                        placeholder="e.g., LHR-PRO-001"
                        title="Tracking Number (e.g., LHR-PRO-001)"
                        onChange={(e) =>
                            setTrackingNumber(
                                formatTrackingNumber(e.target.value, false),
                            )
                        }
                        onKeyDown={handleKeyDown}
                    />
                </div>

                <div className="flex justify-end">
                    <Button
                        loading={loading}
                        variant="solid"
                        onClick={fetchTrackingInfo}
                    >
                        Track
                    </Button>
                </div>

                {trackingResult && (
                    <div className="mt-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                        <h3 className="font-bold mb-2">Tracking Details:</h3>
                        <p>{trackingResult}</p>
                    </div>
                )}

                <div className="mt-6 text-center">
                    <Link to="/" className="text-blue-600 hover:underline">
                        Back to My Applications
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default TrackApplication
