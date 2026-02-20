import type {
    Control,
    FieldErrors,
    UseFormWatch,
} from 'react-hook-form'

export type CompetitionFormSchema = {
    fullName: string
    institute: string
    grade: string
    competitionType: string
    mobile: string
    studentCardFront: File
    studentCardBack?: File | null
    photoObject?: File | null
}

export type FormSectionBaseProps = {
    control: Control<CompetitionFormSchema>
    errors: FieldErrors<CompetitionFormSchema>
    watch: UseFormWatch<CompetitionFormSchema>
}
