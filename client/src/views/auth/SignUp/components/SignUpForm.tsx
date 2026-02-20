import { useEffect, useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, Form } from '@/components/ui/Form'
import { useAuth } from '@/auth'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { CommonProps } from '@/@types/common'
import { useSessionUser, useToken } from '@/store/authStore'
import { useNavigate, useLocation } from 'react-router-dom' // Import useNavigate and useLocation
import AxiosBase from '../../../../services/axios/AxiosBase'
import axios from 'axios'

interface SignUpFormProps extends CommonProps {
    disableSubmit?: boolean
    setMessage?: (message: string) => void
}

type SignUpFormSchema = {
    password: string
    email: string
    confirmPassword: string
    captcha_input: string
    captcha_token: string
}

const validationSchema = z
    .object({
        email: z.string({ required_error: 'Please enter your email' }),
        // userName: z.string({ required_error: 'Please enter your name' }),
        password: z
            .string({ required_error: 'Password Required' })
            .min(8, 'Password must be at least 8 characters')
            .regex(/[a-z]/, 'Password must include a lowercase letter')
            .regex(/[A-Z]/, 'Password must include an uppercase letter')
            .regex(/\d/, 'Password must include a number'),
        confirmPassword: z.string({
            required_error: 'Confirm Password Required',
        }),
        captcha_input: z
            .string({ required_error: 'Please enter the CAPTCHA' })
            .min(1, { message: 'Please enter the CAPTCHA' }),
        captcha_token: z
            .string({ required_error: 'CAPTCHA token missing' })
            .min(1, { message: 'CAPTCHA token missing' }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Password not match',
        path: ['confirmPassword'],
    })

const SignUpForm = (props: SignUpFormProps) => {
    const { disableSubmit = false, className, setMessage } = props
    const setUser = useSessionUser((state) => state.setUser)
    const setSessionSignedIn = useSessionUser(
        (state) => state.setSessionSignedIn,
    )
    const { setToken } = useToken()
    const [isSubmitting, setSubmitting] = useState<boolean>(false)
    const [captchaImage, setCaptchaImage] = useState('')
    const [captchaToken, setCaptchaToken] = useState('')

    const loadCaptcha = async () => {
        try {
            if (navigator.onLine) {
                const response = await AxiosBase.get(
                    '/accounts/generate-captcha/',
                )
                const data = response.data
                setCaptchaImage(data.captcha_image)
                setCaptchaToken(data.captcha_token)
                setValue('captcha_token', data.captcha_token)
            } else {
                throw new Error('Application is offline. Cannot load CAPTCHA.')
            }
        } catch (error) {
            console.error('Error loading CAPTCHA:', error)
            setCaptchaImage('')
            setCaptchaToken('')
            setValue('captcha_token', '')
        }
    }

    useEffect(() => {
        loadCaptcha()
    }, [])
    const { signUp, signIn } = useAuth()

    const {
        handleSubmit,
        formState: { errors },
        control,
        register,
        setValue,
    } = useForm<SignUpFormSchema>({
        defaultValues: {
            email: '',
            password: '',
            confirmPassword: '',
            captcha_input: '',
            captcha_token: '',
        },
        resolver: zodResolver(validationSchema),
    })

    const navigate = useNavigate() // Initialize navigate
    const location = useLocation() // Access the current location

    // Extract redirectUrl from query parameters
    const searchParams = new URLSearchParams(location.search)
    const redirectUrl = searchParams.get('redirectUrl') || '/' // Fallback to a default path if not provided

    const onSignUp = async (values: SignUpFormSchema) => {
        const { password, email, captcha_input, captcha_token } = values

        if (!captchaToken) {
            await loadCaptcha()
            return
        }

        if (!disableSubmit) {
            setSubmitting(true)
            try {
                const result = await signUp({
                    username: email,
                    password,
                    email: '',
                    captcha_input,
                    captcha_token,
                })
                console.log(result)
                // Simulate successful signup
                if (result?.status === 'failed') {
                    if (result.message.includes('400')) {
                        throw new Error('Username Already Exist')
                    } else {
                        throw new Error(
                            'Technical Error! please try again after sometime or email at fdm@epd.punjab.gov.pk',
                        )
                    }
                    // throw new Error(result.message);
                } else {
                    setSessionSignedIn(false)
                    setToken('')
                    const result2 = await signIn({
                        username: email,
                        password,
                        captcha_input,
                        captcha_token,
                    })

                    if (result2?.status === 'failed') {
                        throw new Error(result2.message)
                    } else {
                        setUser({ email, userName: email.split('@')[0] })
                        navigate(redirectUrl)
                    }
                }
            } catch (error) {
                if (axios.isAxiosError(error) && error.response) {
                    // Axios Error: Extract detailed messages from response
                    const errorData = error.response.data

                    if (errorData?.error === 'Invalid captcha.') {
                        await loadCaptcha()
                        setValue('captcha_input', '')
                        setMessage?.('Invalid captcha. Please try again.')
                        return
                    }
if (errorData?.username) {
                        setMessage?.(`Username: ${errorData.username[0]}`) // Show username-specific error
                    } else if (errorData?.email) {
                        setMessage?.(`Email: ${errorData.email[0]}`) // Show email-specific error
                    } else {
                        setMessage?.('An unknown error occurred.')
                    }
                } else {
                    // General error
                    setMessage?.(
                        error instanceof Error
                            ? error.message
                            : 'An unknown error occurred.',
                    )
                }
            } finally {
                setSubmitting(false)
            }
        }
    }

    return (
        <div className={className}>
            <Form onSubmit={handleSubmit(onSignUp)}>
                {/* <FormItem
                    label="User name"
                    invalid={Boolean(errors.userName)}
                    errorMessage={errors.userName?.message}
                >
                    <Controller
                        name="userName"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="text"
                                placeholder="User Name"
                                autoComplete="off"
                                {...field}
                            />
                        )}
                    />
                </FormItem> */}
                <FormItem
                    label="Username"
                    invalid={Boolean(errors.email)}
                    errorMessage={errors.email?.message}
                >
                    <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="text"
                                placeholder="Username"
                                autoComplete="off"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label="Password"
                    invalid={Boolean(errors.password)}
                    errorMessage={errors.password?.message}
                >
                    <Controller
                        name="password"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="password"
                                autoComplete="off"
                                placeholder="Password"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label="Confirm Password"
                    invalid={Boolean(errors.confirmPassword)}
                    errorMessage={errors.confirmPassword?.message}
                >
                    <Controller
                        name="confirmPassword"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="password"
                                autoComplete="off"
                                placeholder="Confirm Password"
                                {...field}
                            />
                        )}
                    />
                </FormItem>

                <FormItem label="Enter Captcha">
                    <div className="flex items-center gap-2 mb-2">
                        <img
                            src={captchaImage}
                            alt="captcha"
                            className="h-16 w-auto rounded border shadow-sm"
                        />
                        <button
                            type="button"
                            onClick={loadCaptcha}
                            className="text-blue-600 hover:text-blue-800"
                            title="Refresh CAPTCHA"
                        >
                            Refresh
                        </button>
                    </div>
                    <Controller
                        name="captcha_input"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="text"
                                placeholder="Enter CAPTCHA text"
                                autoComplete="off"
                                {...field}
                            />
                        )}
                    />
                    <input
                        type="hidden"
                        value={captchaToken}
                        {...register('captcha_token')}
                    />
                </FormItem>

                <Button
                    block
                    loading={isSubmitting}
                    variant="solid"
                    type="submit"
                >
                    {isSubmitting ? 'Creating Account...' : 'Sign Up'}
                </Button>
            </Form>
        </div>
    )
}

export default SignUpForm
