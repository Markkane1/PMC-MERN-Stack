import TablerIcon from '@/components/shared/TablerIcon'
import ToolButton from './ToolButton'
import type { BaseToolButtonProps } from './types'

type ToolButtonOrderedListProp = BaseToolButtonProps

const ToolButtonOrderedList = ({ editor }: ToolButtonOrderedListProp) => {
    return (
        <ToolButton
            title="Ordered List"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
            <TablerIcon name="list-numbers" />
        </ToolButton>
    )
}

export default ToolButtonOrderedList
