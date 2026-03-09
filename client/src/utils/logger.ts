/* eslint-disable no-console */

type LogArgs = unknown[]

const shouldEmitLogs =
    import.meta.env.DEV && import.meta.env.MODE !== 'test'

function emit(method: 'log' | 'warn' | 'error', args: LogArgs) {
    if (!shouldEmitLogs) {
        return
    }

    console[method](...args)
}

export const logger = {
    debug: (...args: LogArgs) => emit('log', args),
    warn: (...args: LogArgs) => emit('warn', args),
    error: (...args: LogArgs) => emit('error', args),
}

export type Logger = typeof logger
