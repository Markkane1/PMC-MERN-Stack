import TablerIcon from '@/components/shared/TablerIcon'
import ToolButton from './ToolButton'
import type { BaseToolButtonProps } from './types'

type ToolButtonBulletListProp = BaseToolButtonProps

const ToolButtonBulletList = ({ editor }: ToolButtonBulletListProp) => {
    return (
        <ToolButton
            title="Bullet List"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
            <TablerIcon name="list" />
        </ToolButton>
    )
}

export default ToolButtonBulletList
