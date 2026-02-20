type LooseRecord = Record<string, any>

export type ApplicantDetailFields = LooseRecord & {
    firstName?: string
    lastName?: string
    applicantDesignation?: string
    gender?: string
    cnic?: string
    email?: string
    mobileOperator?: string
    phoneNumber?: string
    id?: number
}

export type ApplicantDetailFormSchema = ApplicantDetailFields

export type FormSectionBaseProps = {
    control: any
    errors: any
}
