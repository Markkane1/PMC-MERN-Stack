import TablerIcon from '@/components/shared/TablerIcon'
import ToolButton from './ToolButton'
import type { BaseToolButtonProps } from './types'

type ToolButtonItalicProp = BaseToolButtonProps

const ToolButtonItalic = ({ editor }: ToolButtonItalicProp) => {
    return (
        <ToolButton
            title="Italic"
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
        >
            <TablerIcon name="italic" />
        </ToolButton>
    )
}

export default ToolButtonItalic
