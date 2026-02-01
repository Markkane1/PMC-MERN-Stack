type MdModule = { default: string }

const mdDynamicImporter = async (
    _mdPath: string,
    _mdName: string,
    _mdPrefixPath: string,
): Promise<MdModule> => {
    // No markdown assets are shipped in this repo; return empty content.
    return { default: 'data:text/plain,' }
}

export default mdDynamicImporter
