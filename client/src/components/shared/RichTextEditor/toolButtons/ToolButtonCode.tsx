import TablerIcon from '@/components/shared/TablerIcon'
import ToolButton from './ToolButton'
import type { BaseToolButtonProps } from './types'

type ToolButtonCodeProp = BaseToolButtonProps

const ToolButtonCode = ({ editor }: ToolButtonCodeProp) => {
    return (
        <ToolButton
            title="Code"
            disabled={!editor.can().chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
        >
            <TablerIcon name="code" />
        </ToolButton>
    )
}

export default ToolButtonCode
