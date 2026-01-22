/**
 * Декларации типов для Vite-специфичных API
 */

/// <reference types="vite/client" />

interface ImportMeta {
    readonly env: ImportMetaEnv;

    /**
     * Vite glob import
     * @see https://vitejs.dev/guide/features.html#glob-import
     */
    glob<Module = { [key: string]: unknown }>(
        pattern: string | string[],
        options?: {
            eager?: boolean;
            import?: string;
            query?: string | Record<string, string>;
        }
    ): Record<string, () => Promise<Module>>;

    glob<Module = { [key: string]: unknown }>(
        pattern: string | string[],
        options: {
            eager: true;
            import?: string;
            query?: string | Record<string, string>;
        }
    ): Record<string, Module>;
}
