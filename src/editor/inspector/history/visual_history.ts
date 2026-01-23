/**
 * История визуальных свойств: color, alpha, texture, slice, atlas, blend_mode, uv
 */

import type { Blending } from 'three';
import { Services } from '@editor/core';
import type { IBaseMeshAndThree } from '../../../render_engine/types';
import type {
    ColorEventData,
    AlphaEventData,
    TextureEventData,
    SliceEventData,
    BlendModeEventData,
    MeshAtlasEventData,
    UVEventData,
} from '../../../modules_editor/InspectorTypes';
import type { HistoryModuleDeps, IMeshWithAlpha, IMeshWithSlice } from './types';

/** Создать функции истории визуальных свойств */
export function create_visual_history(deps: HistoryModuleDeps) {
    const { get_mesh, push_history } = deps;

    function save_color(ids: number[]): void {
        const colors: ColorEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_color] Mesh not found for id:', id);
                continue;
            }
            colors.push({ id_mesh: id, color: mesh.get_color() });
        }

        push_history(
            'MESH_COLOR',
            'Изменение цвета',
            colors,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.set_color(item.color);
                    }
                }
            },
            (items) => {
                const current: ColorEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, color: m.get_color() });
                    }
                }
                return current;
            }
        );
    }

    function save_alpha(ids: number[]): void {
        const alphas: AlphaEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_alpha] Mesh not found for id:', id);
                continue;
            }
            alphas.push({ id_mesh: id, alpha: (mesh as unknown as IMeshWithAlpha).get_alpha() });
        }

        push_history(
            'MESH_ALPHA',
            'Изменение прозрачности',
            alphas,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        (m as unknown as IMeshWithAlpha).set_alpha(item.alpha);
                    }
                }
            },
            (items) => {
                const current: AlphaEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, alpha: (m as unknown as IMeshWithAlpha).get_alpha() });
                    }
                }
                return current;
            }
        );
    }

    function save_texture(ids: number[]): void {
        const textures: TextureEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_texture] Mesh not found for id:', id);
                continue;
            }
            const [texture_name, atlas_name] = mesh.get_texture();
            const texture_path = atlas_name !== '' ? `${atlas_name}/${texture_name}` : texture_name;
            textures.push({ id_mesh: id, texture: texture_path });
        }

        push_history(
            'MESH_TEXTURE',
            'Изменение текстуры',
            textures,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        const parts = item.texture.split('/');
                        if (parts.length === 2) {
                            m.set_texture(parts[1], parts[0]);
                        } else {
                            m.set_texture(parts[0], '');
                        }
                    }
                }
            },
            (items) => {
                const current: TextureEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        const [texture_name, atlas_name] = m.get_texture();
                        const texture_path = atlas_name !== '' ? `${atlas_name}/${texture_name}` : texture_name;
                        current.push({ id_mesh: item.id_mesh, texture: texture_path });
                    }
                }
                return current;
            }
        );
    }

    function save_slice(ids: number[]): void {
        const slices: SliceEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_slice] Mesh not found for id:', id);
                continue;
            }
            const mesh_with_slice = mesh as unknown as IMeshWithSlice | undefined;
            if (mesh_with_slice !== undefined && typeof mesh_with_slice.get_slice === 'function') {
                slices.push({ id_mesh: id, slice: mesh_with_slice.get_slice() });
            }
        }

        push_history(
            'MESH_SLICE',
            'Изменение slice',
            slices,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { set_slice?: (x: number, y: number) => void } | undefined;
                    if (m !== undefined && typeof m.set_slice === 'function') {
                        m.set_slice(item.slice.x, item.slice.y);
                    }
                }
            },
            (items) => {
                const current: SliceEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as unknown as IMeshWithSlice | undefined;
                    if (m !== undefined && typeof m.get_slice === 'function') {
                        current.push({ id_mesh: item.id_mesh, slice: m.get_slice() });
                    }
                }
                return current;
            }
        );
    }

    function save_atlas(ids: number[]): void {
        const atlases: MeshAtlasEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_atlas] Mesh not found for id:', id);
                continue;
            }
            const [texture, atlas] = mesh.get_texture();
            atlases.push({ id_mesh: id, atlas, texture });
        }

        push_history(
            'MESH_ATLAS',
            'Изменение атласа меша',
            atlases,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.set_texture(item.texture, item.atlas);
                    }
                }
            },
            (items) => {
                const current: MeshAtlasEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        const [texture, atlas] = m.get_texture();
                        current.push({ id_mesh: item.id_mesh, atlas, texture });
                    }
                }
                return current;
            }
        );
    }

    function save_blend_mode(ids: number[]): void {
        const modes: BlendModeEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_blend_mode] Mesh not found for id:', id);
                continue;
            }
            const mesh_with_material = mesh as { material?: { blending?: Blending } };
            if (mesh_with_material.material?.blending !== undefined) {
                modes.push({ id_mesh: id, blend_mode: mesh_with_material.material.blending });
            }
        }

        push_history(
            'MESH_BLEND_MODE',
            'Изменение режима смешивания',
            modes,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { material?: { blending?: Blending; needsUpdate?: boolean } } | undefined;
                    if (m !== undefined && m.material !== undefined) {
                        m.material.blending = item.blend_mode;
                        m.material.needsUpdate = true;
                    }
                }
            },
            (items) => {
                const current: BlendModeEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { material?: { blending?: Blending } } | undefined;
                    if (m !== undefined && m.material?.blending !== undefined) {
                        current.push({ id_mesh: item.id_mesh, blend_mode: m.material.blending });
                    }
                }
                return current;
            }
        );
    }

    function save_uv(ids: number[]): void {
        const uvs: UVEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_uv] Mesh not found for id:', id);
                continue;
            }
            const mesh_with_uv = mesh as { geometry?: { attributes?: { uv?: { array?: Float32Array } } } };
            if (mesh_with_uv.geometry?.attributes?.uv?.array !== undefined) {
                uvs.push({ id_mesh: id, uv: mesh_with_uv.geometry.attributes.uv.array.slice() as Float32Array });
            }
        }

        push_history(
            'MESH_UV',
            'Изменение UV',
            uvs,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & {
                        geometry?: { attributes?: { uv?: { array?: Float32Array; needsUpdate?: boolean } } }
                    } | undefined;
                    if (m !== undefined && m.geometry?.attributes?.uv?.array !== undefined) {
                        m.geometry.attributes.uv.array.set(item.uv);
                        m.geometry.attributes.uv.needsUpdate = true;
                    }
                }
            },
            (items) => {
                const current: UVEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & {
                        geometry?: { attributes?: { uv?: { array?: Float32Array } } }
                    } | undefined;
                    if (m !== undefined && m.geometry?.attributes?.uv?.array !== undefined) {
                        current.push({ id_mesh: item.id_mesh, uv: m.geometry.attributes.uv.array.slice() as Float32Array });
                    }
                }
                return current;
            }
        );
    }

    return {
        save_color,
        save_alpha,
        save_texture,
        save_slice,
        save_atlas,
        save_blend_mode,
        save_uv,
    };
}
