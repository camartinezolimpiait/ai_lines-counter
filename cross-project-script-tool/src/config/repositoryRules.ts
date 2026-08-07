export const DEFAULT_COUNTED_EXTENSIONS = new Set<string>();

export const REPOSITORY_COUNTED_EXTENSIONS: Record<string, Set<string>> = {
    'MiLicencia_ApiBack': new Set(['.cs', '.razor']),
    'MiLicencia_ApiBack2-0': new Set(['.cs', '.razor']),
    'MiLicencia_ApiBackAdminCentro': new Set(['.cs', '.razor']),
    'MiLicencia_ApiBackAdminCentro2-0': new Set(['.cs', '.razor']),
    'MiLicencia_ApiBackIntegrador': new Set(['.cs']),
    'MiLicencia_ApiBackIntegrador2-0': new Set(['.cs']),
    'MiLicencia_ApiFront': new Set(['.cs']),
    'MiLicencia_ApiFrontV1-5': new Set(['.cs']),
    'MiLicencia_FrontEndCentro': new Set(['.ts', '.tsx', '.html', '.htm']),
    'MiLicencia_PortalAdminCentro': new Set(['.cs', '.cshtml', '.razor', '.html', '.htm']),
    'MiLicencia_PortalAdminCentro2-0': new Set(['.ts', '.tsx', '.js', '.jsx', '.svelte', '.html', '.htm']),
    'MiLicencia_FrontEndCiudadano': new Set(['.ts', '.js', '.html', '.htm']),
    'MiLicencia_FrontEndCiudadano1-5': new Set(['.ts', '.html', '.htm'])
};

export const REPOSITORY_CLOC_INCLUDED_LANGUAGES: Record<string, string[]> = {
    'MiLicencia_ApiBack': ['C#', 'Razor'],
    'MiLicencia_ApiBack2-0': ['C#', 'Razor'],
    'MiLicencia_ApiBackAdminCentro': ['C#', 'Razor'],
    'MiLicencia_ApiBackAdminCentro2-0': ['C#', 'Razor'],
    'MiLicencia_ApiBackIntegrador': ['C#'],
    'MiLicencia_ApiBackIntegrador2-0': ['C#'],
    'MiLicencia_ApiFront': ['C#'],
    'MiLicencia_ApiFrontV1-5': ['C#'],
    'MiLicencia_FrontEndCentro': ['TypeScript', 'HTML'],
    'MiLicencia_PortalAdminCentro': ['C#', 'Razor', 'HTML'],
    'MiLicencia_PortalAdminCentro2-0': ['Svelte', 'TypeScript', 'HTML'],
    'MiLicencia_FrontEndCiudadano': ['TypeScript', 'HTML'],
    'MiLicencia_FrontEndCiudadano1-5': ['TypeScript', 'HTML']
};
