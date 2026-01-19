// Сервис управления шейдерами (vertex/fragment programs)

import { Services } from '@editor/core';
import { IS_LOGGING } from '@editor/config';
import { get_asset_control } from '@editor/controls/AssetControl';
import type { IShaderService } from './material_types';

/**
 * Создаёт сервис управления шейдерными программами
 */
export function ShaderServiceCreate(): IShaderService {
    const vertex_programs: { [path: string]: string } = {};
    const fragment_programs: { [path: string]: string } = {};

    function has_vertex_program(path: string): boolean {
        return vertex_programs[path] !== undefined;
    }

    function get_vertex_program(path: string): string | undefined {
        const vertex_program = vertex_programs[path];
        if (vertex_program === undefined) {
            Services.logger.error('vertex program not found', path);
            return;
        }
        return vertex_program;
    }

    async function preload_vertex_program(path: string): Promise<string | undefined> {
        if (has_vertex_program(path)) {
            IS_LOGGING && Services.logger.warn('vertex program exists', path);
            return;
        }
        const shader_program = await get_asset_control().get_file_data(path);
        if (shader_program === undefined || shader_program === null) {
            return;
        }
        vertex_programs[path] = shader_program;
        return shader_program;
    }

    function has_fragment_program(path: string): boolean {
        return fragment_programs[path] !== undefined;
    }

    function get_fragment_program(path: string): string | undefined {
        const fragment_program = fragment_programs[path];
        if (fragment_program === undefined) {
            Services.logger.error('fragment program not found', path);
            return;
        }
        return fragment_program;
    }

    async function preload_fragment_program(path: string): Promise<string | undefined> {
        if (has_fragment_program(path)) {
            IS_LOGGING && Services.logger.warn('fragment program exists', path);
            return;
        }
        const shader_program = await get_asset_control().get_file_data(path);
        if (shader_program === undefined || shader_program === null) {
            return;
        }
        fragment_programs[path] = shader_program;
        return shader_program;
    }

    function get_all_vertex_programs(): string[] {
        return Object.keys(vertex_programs);
    }

    function get_all_fragment_programs(): string[] {
        return Object.keys(fragment_programs);
    }

    return {
        preload_vertex_program,
        preload_fragment_program,
        get_vertex_program,
        get_fragment_program,
        has_vertex_program,
        has_fragment_program,
        get_all_vertex_programs,
        get_all_fragment_programs
    };
}
