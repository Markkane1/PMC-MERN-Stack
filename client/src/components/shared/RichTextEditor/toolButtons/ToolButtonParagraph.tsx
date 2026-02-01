import TablerIcon from '@/components/shared/TablerIcon'
import ToolButton from './ToolButton'
import type { BaseToolButtonProps } from './types'

type ToolButtonParagraphProp = BaseToolButtonProps

const ToolButtonParagraph = ({ editor }: ToolButtonParagraphProp) => {
    return (
        <ToolButton
            title="Paragraph"
            active={editor.isActive('paragraph')}
            onClick={() => editor.chain().focus().setParagraph().run()}
        >
            <TablerIcon name="pilcrow" />
        </ToolButton>
    )
}

export default ToolButtonParagraph
