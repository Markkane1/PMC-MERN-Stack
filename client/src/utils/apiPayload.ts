export const unwrapListPayload = <T>(payload: unknown): T[] => {
    if (Array.isArray(payload)) {
        return payload as T[]
    }

    if (payload && typeof payload === 'object') {
        const data = (payload as { data?: unknown }).data
        if (Array.isArray(data)) {
            return data as T[]
        }

        const rows = (payload as { rows?: unknown }).rows
        if (Array.isArray(rows)) {
            return rows as T[]
        }
    }

    return []
}

export const filterWithGeom = <T extends { geom?: unknown }>(
    payload: unknown,
): T[] => unwrapListPayload<T>(payload).filter((item) => Boolean(item?.geom))
