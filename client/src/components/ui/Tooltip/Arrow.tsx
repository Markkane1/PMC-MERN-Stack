import classNames from 'classnames'
import TablerIcon from '@/components/shared/TablerIcon'

export type ArrowPlacement =
    | 'top'
    | 'top-start'
    | 'top-end'
    | 'bottom'
    | 'bottom-start'
    | 'bottom-end'
    | 'right'
    | 'right-start'
    | 'right-end'
    | 'left'
    | 'left-start'
    | 'left-end'

interface ArrowProps {
    placement: ArrowPlacement
    color: string
}

const Arrow = ({ placement, color }: ArrowProps) => {
    const arrowDefaultClass = `absolute ${color}`

    const getArrow = () => {
        switch (placement) {
            case 'top':
                return (
                    <TablerIcon
                        name="caret-down-filled"
                        className={classNames(
                            arrowDefaultClass,
                            '-bottom-2 w-full left-0',
                        )}
                    />
                )
            case 'top-start':
                return (
                    <TablerIcon
                        name="caret-down-filled"
                        className={classNames(
                            arrowDefaultClass,
                            '-bottom-2 left-0 ml-3',
                        )}
                    />
                )
            case 'top-end':
                return (
                    <TablerIcon
                        name="caret-down-filled"
                        className={classNames(
                            arrowDefaultClass,
                            '-bottom-2 right-0 mr-3',
                        )}
                    />
                )
            case 'right':
                return (
                    <TablerIcon
                        name="caret-left-filled"
                        className={classNames(
                            arrowDefaultClass,
                            '-left-2 top-1/2 transform -translate-y-1/2',
                        )}
                    />
                )
            case 'right-start':
                return (
                    <TablerIcon
                        name="caret-left-filled"
                        className={classNames(
                            arrowDefaultClass,
                            '-left-2 top-2',
                        )}
                    />
                )
            case 'right-end':
                return (
                    <TablerIcon
                        name="caret-left-filled"
                        className={classNames(
                            arrowDefaultClass,
                            '-left-2 bottom-2',
                        )}
                    />
                )
            case 'bottom':
                return (
                    <TablerIcon
                        name="caret-up-filled"
                        className={classNames(
                            arrowDefaultClass,
                            '-top-2 w-full left-0',
                        )}
                    />
                )
            case 'bottom-start':
                return (
                    <TablerIcon
                        name="caret-up-filled"
                        className={classNames(
                            arrowDefaultClass,
                            '-top-2 left-0 ml-3',
                        )}
                    />
                )
            case 'bottom-end':
                return (
                    <TablerIcon
                        name="caret-up-filled"
                        className={classNames(
                            arrowDefaultClass,
                            '-top-2 right-0 mr-3',
                        )}
                    />
                )
            case 'left':
                return (
                    <TablerIcon
                        name="caret-right-filled"
                        className={classNames(
                            arrowDefaultClass,
                            '-right-2 top-1/2 transform -translate-y-1/2',
                        )}
                    />
                )
            case 'left-start':
                return (
                    <TablerIcon
                        name="caret-right-filled"
                        className={classNames(
                            arrowDefaultClass,
                            '-right-2 top-2',
                        )}
                    />
                )
            case 'left-end':
                return (
                    <TablerIcon
                        name="caret-right-filled"
                        className={classNames(
                            arrowDefaultClass,
                            '-right-2 bottom-2',
                        )}
                    />
                )
            default:
                break
        }
    }

    return <div>{getArrow()}</div>
}

export default Arrow
