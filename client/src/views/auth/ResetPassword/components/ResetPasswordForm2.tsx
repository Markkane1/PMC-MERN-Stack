import { useState } from 'react'
import { FormItem, Form } from '@/components/ui/Form'
import PasswordInput from '@/components/shared/PasswordInput'
import Button from '@/components/ui/Button'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AxiosBase from '../../../../services/axios/AxiosBase'
import axios from 'axios'

type ResetPasswordFormProps = {
    disableSubmit?: boolean
    setMessage?: (message: string) => void
}

type ResetPasswordFormSchema = {
    currentPassword: string
    newPassword: string
    confirmPassword: string
}

const validationSchema = z
    .object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/[a-z]/, 'Password must include a lowercase letter')
            .regex(/[A-Z]/, 'Password must include an uppercase letter')
            .regex(/\d/, 'Password must include a number'),
        confirmPassword: z
            .string()
            .min(8, 'Password must be at least 8 characters'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    })

const ResetPasswordForm = ({
    disableSubmit = false,
    setMessage,
}: ResetPasswordFormProps) => {
    const [isSubmitting, setSubmitting] = useState(false)

    const {
        handleSubmit,
        formState: { errors },
        control,
    } = useForm<ResetPasswordFormSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    })

    const onSubmit = async (data: ResetPasswordFormSchema) => {
        if (disableSubmit) return

        setSubmitting(true)
        setMessage?.('')

        try {
            // Use AxiosBase for the API call
            const response = await AxiosBase.post(
                '/accounts/reset-password2/',
                {
                    current_password: data.currentPassword,
                    new_password: data.newPassword,
                },
            )

            // Handle success
            setMessage?.(
                response.data.message || 'Password reset successfully.',
            )
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.log(
                    (error.response?.data as { detail?: string })?.detail,
                )
                setMessage?.(
                    (error.response?.data as { detail?: string })?.detail ||
                        'An error occurred.',
                )
            } else {
                setMessage?.('An error occurred.')
            }
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Form onSubmit={handleSubmit(onSubmit)}>
            <FormItem
                label="Current Password"
                invalid={!!errors.currentPassword}
                errorMessage={errors.currentPassword?.message}
            >
                <Controller
                    name="currentPassword"
                    control={control}
                    render={({ field }) => (
                        <PasswordInput
                            {...field}
                            placeholder="Current Password"
                        />
                    )}
                />
            </FormItem>
            <FormItem
                label="New Password"
                invalid={!!errors.newPassword}
                errorMessage={errors.newPassword?.message}
            >
                <Controller
                    name="newPassword"
                    control={control}
                    render={({ field }) => (
                        <PasswordInput {...field} placeholder="New Password" />
                    )}
                />
            </FormItem>
            <FormItem
                label="Confirm Password"
                invalid={!!errors.confirmPassword}
                errorMessage={errors.confirmPassword?.message}
            >
                <Controller
                    name="confirmPassword"
                    control={control}
                    render={({ field }) => (
                        <PasswordInput
                            {...field}
                            placeholder="Confirm Password"
                        />
                    )}
                />
            </FormItem>
            <Button
                block
                type="submit"
                loading={isSubmitting}
                disabled={isSubmitting}
                variant="solid"
            >
                {isSubmitting ? 'Updating...' : 'Reset Password'}
            </Button>
        </Form>
    )
}

export default ResetPasswordForm
