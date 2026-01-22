// Менеджер шейдеров

import { ShaderChunk } from 'three';
import { Services } from '@editor/core/ServiceProvider';
import { IS_LOGGING } from '@editor/config';
import { get_asset_control } from '@editor/controls/AssetControl';

export interface ShaderManagerConfig {
    /** Колбэк при изменении vertex шейдера */
    on_vertex_shader_change?: (path: string, shader_code: string) => void;
    /** Колбэк при изменении fragment шейдера */
    on_fragment_shader_change?: (path: string, shader_code: string) => void;
}

/**
 * Менеджер шейдеров.
 * Отвечает за загрузку, компиляцию и управление шейдерами.
 */
export function create_shader_manager(config: ShaderManagerConfig = {}) {
    const vertex_programs: { [path: string]: string } = {};
    const fragment_programs: { [path: string]: string } = {};

    /**
     * Обрабатывает #include директивы в шейдерах, заменяя их на код из Three.js ShaderChunk.
     * Это необходимо для ShaderMaterial, который не обрабатывает includes автоматически.
     */
    function process_shader_includes(shader_source: string): string {
        const include_pattern = /^\s*#include\s+<(\w+)>/gm;
        return shader_source.replace(include_pattern, (_match, chunk_name: string) => {
            const chunk = (ShaderChunk as Record<string, string>)[chunk_name];
            if (chunk !== undefined) {
                // Рекурсивно обрабатываем вложенные includes
                return process_shader_includes(chunk);
            }
            Services.logger.warn('[process_shader_includes] Unknown shader chunk:', chunk_name);
            return `// Unknown chunk: ${chunk_name}`;
        });
    }

    /** Проверка загружен ли vertex шейдер */
    function has_vertex_program(path: string) {
        return vertex_programs[path] !== undefined;
    }

    /** Получение vertex шейдера */
    function get_vertex_program(path: string) {
        const vertex_program = vertex_programs[path];
        if (!vertex_program) {
            Services.logger.error('vertex program not found', path);
            return;
        }
        return vertex_program;
    }

    /** Предзагрузка vertex шейдера */
    async function preload_vertex_program(path: string) {
        Services.logger.info('[preload_vertex_program] Loading:', path);
        if (has_vertex_program(path)) {
            IS_LOGGING && Services.logger.warn('vertex program exists', path);
            return;
        }
        const shader_program = await get_asset_control().get_file_data(path);
        if (!shader_program) {
            Services.logger.error('[preload_vertex_program] Failed to load:', path);
            return;
        }
        vertex_programs[path] = shader_program;
        Services.logger.info('[preload_vertex_program] Loaded successfully:', path, 'length:', shader_program.length);
        return shader_program;
    }

    /** Проверка загружен ли fragment шейдер */
    function has_fragment_program(path: string) {
        return fragment_programs[path] !== undefined;
    }

    /** Получение fragment шейдера */
    function get_fragment_program(path: string) {
        const fragment_program = fragment_programs[path];
        if (!fragment_program) {
            Services.logger.error('fragment program not found', path);
            return;
        }
        return fragment_program;
    }

    /** Предзагрузка fragment шейдера */
    async function preload_fragment_program(path: string) {
        Services.logger.info('[preload_fragment_program] Loading:', path);
        if (has_fragment_program(path)) {
            IS_LOGGING && Services.logger.warn('fragment program exists', path);
            return;
        }
        const shader_program = await get_asset_control().get_file_data(path);
        if (!shader_program) {
            Services.logger.error('[preload_fragment_program] Failed to load:', path);
            return;
        }
        fragment_programs[path] = shader_program;
        Services.logger.info('[preload_fragment_program] Loaded successfully:', path, 'length:', shader_program.length);
        return shader_program;
    }

    /** Обработчик изменения vertex шейдера */
    async function on_vertex_shader_change(path: string) {
        const vertexShader = await get_asset_control().get_file_data(path);
        if (!vertexShader) return;

        vertex_programs[path] = vertexShader;

        if (config.on_vertex_shader_change) {
            config.on_vertex_shader_change(path, vertexShader);
        }
    }

    /** Обработчик изменения fragment шейдера */
    async function on_fragment_shader_change(path: string) {
        const fragmentShader = await get_asset_control().get_file_data(path);
        if (!fragmentShader) return;

        fragment_programs[path] = fragmentShader;

        if (config.on_fragment_shader_change) {
            config.on_fragment_shader_change(path, fragmentShader);
        }
    }

    /** Получение списка всех vertex программ */
    function get_all_vertex_programs() {
        return Object.keys(vertex_programs);
    }

    /** Получение списка всех fragment программ */
    function get_all_fragment_programs() {
        return Object.keys(fragment_programs);
    }

    return {
        process_shader_includes,
        has_vertex_program,
        get_vertex_program,
        preload_vertex_program,
        has_fragment_program,
        get_fragment_program,
        preload_fragment_program,
        on_vertex_shader_change,
        on_fragment_shader_change,
        get_all_vertex_programs,
        get_all_fragment_programs
    };
}

export type IShaderManager = ReturnType<typeof create_shader_manager>;
