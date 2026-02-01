import { useState, useCallback, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Tooltip from '@/components/ui/Tooltip'
import Spinner from '@/components/ui/Spinner'
import TablerIcon from '@/components/shared/TablerIcon'
import CodeBox from './CodeBox'
import mdDynamicImporter from '@/mdDynamicImporter'

export interface CardFooterProps {
    mdPath: string
    mdName: string
    mdPrefixPath?: string
}

const CardFooter = (props: CardFooterProps) => {
    const { mdPath, mdName, mdPrefixPath = 'ui-components' } = props

    const [expand, setExpand] = useState(false)
    const [markdown, setMarkdown] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [loadingMd, setLoadingMd] = useState(false)

    const onExpand = useCallback(() => {
        setExpand(!expand)
    }, [expand])

    const fetchMd = async () => {
        setLoadingMd(true)
        const file = await mdDynamicImporter(mdPath, mdName, mdPrefixPath)
        const response = await fetch(file.default)
        const md = await response.text()
        setMarkdown(md)
        setLoadingMd(false)
    }

    useEffect(() => {
        if (expand && !markdown) {
            fetchMd()
        }
        if (copied && markdown) {
            navigator.clipboard.writeText(markdown.replace(/```jsx|```/g, ''))
            if (copied) {
                const copyFeedbackInterval = setTimeout(
                    () => setCopied(false),
                    3000,
                )

                return () => {
                    clearTimeout(copyFeedbackInterval)
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mdPath, expand, copied])

    const onCodeCopy = async () => {
        if (!markdown) {
            await fetchMd()
        }
        setCopied(true)
    }

    return (
        <div>
            <div className="flex items-center justify-between">
                <div>{loadingMd && <Spinner />}</div>
                <div>
                    <Tooltip
                        title={copied ? 'Copied' : 'Copy Code'}
                        wrapperClass="mr-1"
                    >
                        <Button
                            variant="plain"
                            shape="circle"
                            size="xs"
                            icon={
                                copied ? (
                                    <TablerIcon
                                        name="check"
                                        className="text-emerald-500"
                                    />
                                ) : (
                                    <TablerIcon name="copy" />
                                )
                            }
                            onClick={onCodeCopy}
                        />
                    </Tooltip>
                    <Tooltip title={expand ? 'Hide Code' : 'Show Code'}>
                        <Button
                            variant="plain"
                            shape="circle"
                            size="xs"
                            icon={
                                expand ? (
                                    <TablerIcon name="code" />
                                ) : (
                                    <TablerIcon name="code-off" />
                                )
                            }
                            onClick={() => onExpand()}
                        />
                    </Tooltip>
                </div>
            </div>
            <div className={expand ? 'block' : 'hidden'}>
                <CodeBox markdown={markdown as string} />
            </div>
        </div>
    )
}

export default CardFooter
