import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import NumericInput from '@/components/shared/NumericInput'
import { Controller, useWatch } from 'react-hook-form'
import type { FormSectionBaseProps } from './types'
import { useState } from 'react'
import CreatableSelect from 'react-select/creatable'
import Checkbox from '@/components/ui/Checkbox'
import type { SyntheticEvent } from 'react'
import { Autocomplete, TextField, Chip, Hidden, List } from '@mui/material'
import Group from '@/components/ui/Checkbox/Group'
import useFormStore from '../../../store/supid/supidStore'
import AxiosBase from '@/services/axios/AxiosBase'
import Button from '@/components/ui/Button'
import TablerIcon from '@/components/shared/TablerIcon'

type BusinessDetailSectionProps = FormSectionBaseProps & {
    readOnly?: boolean // Add this prop
}

const colourOptions = [
    { value: 'ocean', label: 'Ocean', color: '#00B8D9' },
    { value: 'blue', label: 'Blue', color: '#0052CC' },
    { value: 'purple', label: 'Purple', color: '#5243AA' },
    { value: 'red', label: 'Red', color: '#FF5630' },
    { value: 'orange', label: 'Orange', color: '#FF8B00' },
    { value: 'yellow', label: 'Yellow', color: '#FFC400' },
    { value: 'green', label: 'Green', color: '#36B37E' },
    { value: 'forest', label: 'Forest', color: '#00875A' },
    { value: 'slate', label: 'Slate', color: '#253858' },
    { value: 'silver', label: 'Silver', color: '#666666' },
]

const registrationTypes = [
    { value: 'Individual', label: 'Individual' },
    {
        value: 'Company / Corporation / Partnership',
        label: 'Company / Corporation / Partnership',
    },
]

const districts = [
    { value: 'Gujranwala', label: 'Gujranwala' },
    { value: 'Lahore', label: 'Lahore' },
    // Add other options as necessary
]

const tehsils = [
    { value: 'Aroop Town', label: 'Aroop Town' },
    // Add other options as necessary
]

const mobileOperators = [
    { value: 'Mobilink', label: 'Mobilink' },
    { value: 'Telenor', label: 'Telenor' },
    { value: 'Ufone', label: 'Ufone' },
    { value: 'Warid', label: 'Warid' },
]

const LicenseDetailProducerSection = ({
    control,
    errors,
    readOnly = false,
}: BusinessDetailSectionProps) => {
    const [entityType, setEntityType] = useState('')

    const [checkboxList, setCheckboxList] = useState<string[]>([])

    const [unitOptions, setUnitOptions] = useState([
        'Kg Per Day',
        'Liters Per Day',
        'Tons Per Month',
    ])
    const [selectedUnit, setSelectedUnit] = useState('')

    const [wasteUnitOptions, setWasteUnitOptions] = useState([
        'Kg Per Day',
        'Liters Per Day',
        'Tons Per Month',
    ])
    const [selectedWasteUnit, setSelectedWasteUnit] = useState('')

    const [productOptions, setProductOptions] = useState([
        'Product A',
        'Product B',
        'Product C',
    ])
    const [selectedProducts, setSelectedProducts] = useState([])

    const [byProductOptions, setByProductOptions] = useState([
        'By-product X',
        'By-product Y',
    ])
    const [selectedByProducts, setSelectedByProducts] = useState([])

    const handleProductsChange = (event, newValue) => {
        setSelectedProducts(newValue)
        const newOptions = newValue.filter(
            (option) => !productOptions.includes(option),
        )
        if (newOptions.length > 0) {
            setProductOptions((prev) => [...prev, ...newOptions])
        }
    }

    const handleByProductsChange = (event, newValue) => {
        setSelectedByProducts(newValue)
        const newOptions = newValue.filter(
            (option) => !byProductOptions.includes(option),
        )
        if (newOptions.length > 0) {
            setByProductOptions((prev) => [...prev, ...newOptions])
        }
    }

    const [options, setOptions] = useState([])
    const [selectedOptions, setSelectedOptions] = useState([])

    const handleChangeSP = (event, newValue) => {
        setSelectedOptions(newValue)

        // Add new options to the list
        const newOptions = newValue.filter(
            (option) => !options.includes(option),
        )
        if (newOptions.length > 0) {
            setOptions((prevOptions) => [...prevOptions, ...newOptions])
        }
    }
    const formatDate = (date) => {
        if (!date) return ''
        const [year, month, day] = date.split('-') // Convert yyyy-MM-dd to dd/MM/yyyy
        return `${day}/${month}/${year}`
    }

    const parseDate = (dateString) => {
        const [day, month, year] = dateString.split('/') // Convert dd/MM/yyyy to yyyy-MM-dd
        return `${year}-${month}-${day}`
    }

    const {
        applicantDetail,
        updateApplicantDetail,
        resetApplicantDetail,
        businessDetail,
        updateBusinessDetail,
        resetBusinessDetail,
        businessDetailIndividual,
        updateBusinessDetailIndividual,
        resetBusinessDetailIndividual,
        businessEntity,
        updateBusinessEntity,
        resetBusinessEntity,
        resetAll,
        completedSections,
        getValuesFromStateBusinessEntity,
        markSectionAsCompleted,
    } = useFormStore()

    console.log('has_identity_document')
    console.log('has_identity_document', applicantDetail.has_identity_document)

    const downloadLatestDocument = async (description: string) => {
        try {
            const response = await AxiosBase.get(
                `/pmc/download_latest_document/?document_description=${encodeURIComponent(
                    description,
                )}`,
                { responseType: 'blob' },
            )
            const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = blobUrl
            link.setAttribute(
                'download',
                `${description.replace(/\s+/g, '_')}.pdf`,
            )
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (error) {
            console.error(
                'Failed to download latest document:',
                error?.response || error?.message || error,
            )
            alert('Unable to download the latest document.')
        }
    }

    return (
        <Card>
            <h4 className="mb-6">Document</h4>
            <div className="grid md:grid-cols-2 gap-4">
                {/* Business Name and Registration Type */}

                <FormItem
                    label="CNIC (Front side + Back side) / Utiility Bills / Passport / Driving License (Any document indicating name & address)*"
                    invalid={Boolean(errors.flow_diagram)}
                    errorMessage={errors.flow_diagram?.message}
                >
                    <Controller
                        name="flow_diagram"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg" // Allow only specific file types
                                disabled={readOnly} // Apply the read-only prop
                                onChange={(e) =>
                                    field.onChange(e.target.files[0] || null)
                                } // Correctly set the file without using 'value'
                            />
                        )}
                    />
                </FormItem>
                <div></div>
                <label>
                    If both front side and back side of CNIC are not uploaded,
                    then please upload Back Side of CNIC as well
                </label>
                <div></div>
                <FormItem
                    label="CNIC (Back side)"
                    invalid={Boolean(errors.flow_diagram)}
                    errorMessage={errors.flow_diagram?.message}
                >
                    <Controller
                        name="flow_diagram2"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg" // Allow only specific file types
                                disabled={readOnly} // Apply the read-only prop
                                onChange={(e) =>
                                    field.onChange(e.target.files[0] || null)
                                } // Correctly set the file without using 'value'
                            />
                        )}
                    />
                </FormItem>
            </div>

            <div>
                {applicantDetail.has_identity_document && (
                    <div className="flex flex-col gap-2">
                        <label>Identity Document is already Uploaded!</label>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="solid"
                                icon={<TablerIcon name="download" />}
                                onClick={() =>
                                    downloadLatestDocument('Identity Document')
                                }
                            >
                                Download Latest Identity Document
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="solid"
                                icon={<TablerIcon name="download" />}
                                onClick={() =>
                                    downloadLatestDocument(
                                        'Identity Document - 2',
                                    )
                                }
                            >
                                Download Latest Identity Document (Back Side)
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}

export default LicenseDetailProducerSection
