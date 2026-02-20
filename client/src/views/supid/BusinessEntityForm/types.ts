type LooseRecord = Record<string, any>

export type BusinessEntityFields = LooseRecord & {
    businessEntityType?: string
}

export type BusinessDetailFields = LooseRecord

export type BusinessDetailIndividualFields = LooseRecord

export type BusinessEntityFormSchema = BusinessEntityFields &
    BusinessDetailFields &
    BusinessDetailIndividualFields

export type FormSectionBaseProps = {
    control: any
    errors: any
    readOnlyDistrict?: boolean
}
