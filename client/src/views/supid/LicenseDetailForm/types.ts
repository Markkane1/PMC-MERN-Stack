type LooseRecord = Record<string, any>

export type LicenseDetailFields = LooseRecord & {
    licenseType?: string
}

// ConsumerFields: Represents the data structure for consumers
export type LicenseDetailFieldsConsumer = LooseRecord

// CollectorFields: Represents the data structure for collectors
export type LicenseDetailFieldsCollector = LooseRecord

type ManufacturingType =
    | 'Carry bags'
    | 'Packaging except food'
    | 'Hospital Products'
type SingleUseSheet = 'Plain Plastic Sheets for food wrapping' | 'Other'

// ProducerFields: Represents the data structure for producers
export type LicenseDetailFieldsProducer = LooseRecord

// RecyclerFields: Represents the data structure for recyclers
export type LicenseDetailFieldsRecycler = LooseRecord

export type LicenseDetailFormSchema = LicenseDetailFields &
    LicenseDetailFieldsConsumer &
    LicenseDetailFieldsProducer &
    LicenseDetailFieldsRecycler &
    LicenseDetailFieldsCollector

export type FormSectionBaseProps = {
    control: any
    errors: any
}
