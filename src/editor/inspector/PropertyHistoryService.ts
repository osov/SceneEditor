/**
 * PropertyHistoryService - сервис сохранения свойств в историю
 *
 * Централизует логику undo/redo для всех изменений свойств объектов.
 * Упрощает создание history записей для инспектора.
 */

import { Vector2, type Blending } from 'three';
import type { IBaseMeshAndThree } from '../../render_engine/types';
import { Services } from '@editor/core';
import { HistoryOwner } from '../../modules_editor/modules_editor_const';
import { Property } from '../../core/inspector/IInspectable';
import type {
    PositionEventData,
    RotationEventData,
    ScaleEventData,
    SizeEventData,
    PivotEventData,
    AnchorEventData,
    ColorEventData,
    AlphaEventData,
    TextureEventData,
    SliceEventData,
    NameEventData,
    ActiveEventData,
    VisibleEventData,
    TextEventData,
    FontEventData,
    TextAlignEventData,
    LineHeightEventData,
    BlendModeEventData,
    MaterialEventData,
    UVEventData,
} from '../../modules_editor/InspectorTypes';
import { deepClone } from '../../modules/utils';

/** Интерфейс для mesh с alpha */
interface IMeshWithAlpha {
    get_alpha(): number;
    set_alpha(alpha: number): void;
}

/** Интерфейс для mesh со slice */
interface IMeshWithSlice {
    get_slice(): Vector2;
    set_slice(x: number, y: number): void;
}

/** Тип записи истории */
export type HistoryType =
    | 'MESH_NAME'
    | 'MESH_ACTIVE'
    | 'MESH_VISIBLE'
    | 'MESH_TRANSLATE'
    | 'MESH_ROTATE'
    | 'MESH_SCALE'
    | 'MESH_SIZE'
    | 'MESH_PIVOT'
    | 'MESH_ANCHOR'
    | 'MESH_ANCHOR_PRESET'
    | 'MESH_COLOR'
    | 'MESH_ALPHA'
    | 'MESH_TEXTURE'
    | 'MESH_SLICE'
    | 'MESH_TEXT'
    | 'MESH_FONT'
    | 'MESH_FONT_SIZE'
    | 'MESH_TEXT_ALIGN'
    | 'MESH_LINE_HEIGHT'
    | 'MESH_BLEND_MODE'
    | 'MESH_ATLAS'
    | 'MESH_MATERIAL'
    | 'MESH_UV'
    | 'TEXTURE_MIN_FILTER'
    | 'TEXTURE_MAG_FILTER';

/** Интерфейс для получения mesh по id */
export interface IMeshResolver {
    /** Получить mesh по id */
    get_mesh(id: number): IBaseMeshAndThree | undefined;
}

/** Параметры сервиса */
export interface PropertyHistoryServiceParams {
    mesh_resolver: IMeshResolver;
}

/** Интерфейс сервиса истории свойств */
export interface IPropertyHistoryService {
    /** Сохранить позицию для undo */
    save_position(ids: number[]): void;
    /** Сохранить вращение для undo */
    save_rotation(ids: number[]): void;
    /** Сохранить масштаб для undo */
    save_scale(ids: number[]): void;
    /** Сохранить размер для undo */
    save_size(ids: number[]): void;
    /** Сохранить pivot для undo */
    save_pivot(ids: number[]): void;
    /** Сохранить anchor для undo */
    save_anchor(ids: number[]): void;
    /** Сохранить цвет для undo */
    save_color(ids: number[]): void;
    /** Сохранить прозрачность для undo */
    save_alpha(ids: number[]): void;
    /** Сохранить текстуру для undo */
    save_texture(ids: number[]): void;
    /** Сохранить slice для undo */
    save_slice(ids: number[]): void;
    /** Сохранить имя для undo */
    save_name(ids: number[]): void;
    /** Сохранить active для undo */
    save_active(ids: number[]): void;
    /** Сохранить visible для undo */
    save_visible(ids: number[]): void;
    /** Сохранить текст для undo */
    save_text(ids: number[]): void;
    /** Сохранить шрифт для undo */
    save_font(ids: number[]): void;
    /** Сохранить выравнивание текста для undo */
    save_text_align(ids: number[]): void;
    /** Сохранить высоту строки для undo */
    save_line_height(ids: number[]): void;
    /** Сохранить режим смешивания для undo */
    save_blend_mode(ids: number[]): void;
    /** Сохранить материал для undo */
    save_material(ids: number[]): void;
    /** Сохранить UV для undo */
    save_uv(ids: number[]): void;
    /** Сохранить свойство по ключу Property */
    save_by_property(property: Property, ids: number[]): void;
}

/** Создать PropertyHistoryService */
export function create_property_history_service(params: PropertyHistoryServiceParams): IPropertyHistoryService {
    const { mesh_resolver } = params;

    function get_mesh(id: number): IBaseMeshAndThree | undefined {
        return mesh_resolver.get_mesh(id);
    }

    function push_history<T>(
        type: HistoryType,
        description: string,
        items: T[],
        undo_fn: (items: T[]) => void
    ): void {
        Services.history.push({
            type,
            description,
            data: { items, owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => undo_fn(d.items as T[]),
            redo: () => {},
        });
    }

    function save_position(ids: number[]): void {
        const positions: PositionEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_position] Mesh not found for id:', id);
                continue;
            }
            positions.push({ id_mesh: id, position: deepClone(mesh.position) });
        }

        push_history('MESH_TRANSLATE', 'Перемещение объектов', positions, (items) => {
            for (const item of items) {
                const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                if (m !== undefined) {
                    m.position.copy(item.position);
                    m.transform_changed();
                }
            }
            Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
            Services.ui.update_hierarchy();
        });
    }

    function save_rotation(ids: number[]): void {
        const rotations: RotationEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_rotation] Mesh not found for id:', id);
                continue;
            }
            rotations.push({ id_mesh: id, rotation: deepClone(mesh.rotation) });
        }

        push_history('MESH_ROTATE', 'Вращение объектов', rotations, (items) => {
            for (const item of items) {
                const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                if (m !== undefined) {
                    m.rotation.copy(item.rotation);
                    m.transform_changed();
                }
            }
            Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
            Services.ui.update_hierarchy();
        });
    }

    function save_scale(ids: number[]): void {
        const scales: ScaleEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_scale] Mesh not found for id:', id);
                continue;
            }
            scales.push({ id_mesh: id, scale: deepClone(mesh.scale) });
        }

        push_history('MESH_SCALE', 'Масштабирование объектов', scales, (items) => {
            for (const item of items) {
                const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                if (m !== undefined) {
                    m.scale.copy(item.scale);
                    m.transform_changed();
                }
            }
            Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
            Services.ui.update_hierarchy();
        });
    }

    function save_size(ids: number[]): void {
        const sizes: SizeEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_size] Mesh not found for id:', id);
                continue;
            }
            sizes.push({
                id_mesh: id,
                position: mesh.get_position(),
                size: mesh.get_size(),
            });
        }

        push_history('MESH_SIZE', 'Изменение размера', sizes, (items) => {
            for (const item of items) {
                const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                if (m !== undefined) {
                    m.position.copy(item.position);
                    m.set_size(item.size.x, item.size.y);
                    m.transform_changed();
                }
            }
            Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
            Services.ui.update_hierarchy();
        });
    }

    function save_pivot(ids: number[]): void {
        const pivots: PivotEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_pivot] Mesh not found for id:', id);
                continue;
            }
            pivots.push({ id_mesh: id, pivot: mesh.get_pivot() });
        }

        push_history('MESH_PIVOT', 'Изменение pivot', pivots, (items) => {
            for (const item of items) {
                const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                if (m !== undefined) {
                    m.set_pivot(item.pivot.x, item.pivot.y, true);
                }
            }
            Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
            Services.ui.update_hierarchy();
        });
    }

    function save_anchor(ids: number[]): void {
        const anchors: AnchorEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_anchor] Mesh not found for id:', id);
                continue;
            }
            anchors.push({ id_mesh: id, anchor: mesh.get_anchor() });
        }

        push_history('MESH_ANCHOR', 'Изменение anchor', anchors, (items) => {
            for (const item of items) {
                const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                if (m !== undefined) {
                    m.set_anchor(item.anchor.x, item.anchor.y);
                }
            }
            Services.ui.update_hierarchy();
        });
    }

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

        push_history('MESH_COLOR', 'Изменение цвета', colors, (items) => {
            for (const item of items) {
                const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                if (m !== undefined) {
                    m.set_color(item.color);
                }
            }
        });
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

        push_history('MESH_ALPHA', 'Изменение прозрачности', alphas, (items) => {
            for (const item of items) {
                const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                if (m !== undefined) {
                    (m as unknown as IMeshWithAlpha).set_alpha(item.alpha);
                }
            }
        });
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

        push_history('MESH_TEXTURE', 'Изменение текстуры', textures, (items) => {
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
        });
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

        push_history('MESH_SLICE', 'Изменение slice', slices, (items) => {
            for (const item of items) {
                const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { set_slice?: (x: number, y: number) => void } | undefined;
                if (m !== undefined && typeof m.set_slice === 'function') {
                    m.set_slice(item.slice.x, item.slice.y);
                }
            }
        });
    }

    function save_name(ids: number[]): void {
        const names: NameEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_name] Mesh not found for id:', id);
                continue;
            }
            names.push({ id_mesh: id, name: mesh.name });
        }

        push_history('MESH_NAME', 'Изменение имени', names, (items) => {
            for (const item of items) {
                const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                if (m !== undefined) {
                    m.name = item.name;
                }
            }
            Services.ui.update_hierarchy();
        });
    }

    function save_active(ids: number[]): void {
        const states: ActiveEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_active] Mesh not found for id:', id);
                continue;
            }
            states.push({ id_mesh: id, state: mesh.get_active() });
        }

        push_history('MESH_ACTIVE', 'Изменение активности', states, (items) => {
            for (const item of items) {
                const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                if (m !== undefined) {
                    m.set_active(item.state);
                }
            }
            Services.ui.update_hierarchy();
        });
    }

    function save_visible(ids: number[]): void {
        const states: VisibleEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_visible] Mesh not found for id:', id);
                continue;
            }
            states.push({ id_mesh: id, state: mesh.get_visible() });
        }

        push_history('MESH_VISIBLE', 'Изменение видимости', states, (items) => {
            for (const item of items) {
                const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                if (m !== undefined) {
                    m.set_visible(item.state);
                }
            }
            Services.ui.update_hierarchy();
        });
    }

    function save_text(ids: number[]): void {
        const texts: TextEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_text] Mesh not found for id:', id);
                continue;
            }
            const text_mesh = mesh as { text?: string };
            if (text_mesh.text !== undefined) {
                texts.push({ id_mesh: id, text: text_mesh.text });
            }
        }

        push_history('MESH_TEXT', 'Изменение текста', texts, (items) => {
            for (const item of items) {
                const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { set_text?: (t: string) => void } | undefined;
                if (m !== undefined && typeof m.set_text === 'function') {
                    m.set_text(item.text);
                }
            }
        });
    }

    function save_font(ids: number[]): void {
        const fonts: FontEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_font] Mesh not found for id:', id);
                continue;
            }
            const text_mesh = mesh as { parameters?: { font?: string } };
            if (text_mesh.parameters?.font !== undefined) {
                fonts.push({ id_mesh: id, font: text_mesh.parameters.font });
            }
        }

        push_history('MESH_FONT', 'Изменение шрифта', fonts, (items) => {
            for (const item of items) {
                const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { set_font?: (f: string) => void } | undefined;
                if (m !== undefined && typeof m.set_font === 'function') {
                    m.set_font(item.font);
                }
            }
        });
    }

    function save_text_align(ids: number[]): void {
        const aligns: TextAlignEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_text_align] Mesh not found for id:', id);
                continue;
            }
            const text_mesh = mesh as { textAlign?: 'left' | 'right' | 'center' | 'justify' };
            if (text_mesh.textAlign !== undefined) {
                aligns.push({ id_mesh: id, text_align: text_mesh.textAlign });
            }
        }

        push_history('MESH_TEXT_ALIGN', 'Изменение выравнивания', aligns, (items) => {
            for (const item of items) {
                const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { textAlign?: string } | undefined;
                if (m !== undefined) {
                    m.textAlign = item.text_align;
                }
            }
        });
    }

    function save_line_height(ids: number[]): void {
        const heights: LineHeightEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_line_height] Mesh not found for id:', id);
                continue;
            }
            const text_mesh = mesh as { lineHeight?: number };
            if (text_mesh.lineHeight !== undefined) {
                heights.push({ id_mesh: id, line_height: text_mesh.lineHeight });
            }
        }

        push_history('MESH_LINE_HEIGHT', 'Изменение высоты строки', heights, (items) => {
            for (const item of items) {
                const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { lineHeight?: number } | undefined;
                if (m !== undefined) {
                    m.lineHeight = item.line_height;
                }
            }
        });
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

        push_history('MESH_BLEND_MODE', 'Изменение режима смешивания', modes, (items) => {
            for (const item of items) {
                const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { material?: { blending?: Blending; needsUpdate?: boolean } } | undefined;
                if (m !== undefined && m.material !== undefined) {
                    m.material.blending = item.blend_mode;
                    m.material.needsUpdate = true;
                }
            }
        });
    }

    function save_material(ids: number[]): void {
        const materials: MaterialEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_material] Mesh not found for id:', id);
                continue;
            }
            const mesh_with_material = mesh as { get_material_name?: () => string };
            if (typeof mesh_with_material.get_material_name === 'function') {
                materials.push({ id_mesh: id, material: mesh_with_material.get_material_name() });
            }
        }

        push_history('MESH_MATERIAL', 'Изменение материала', materials, (items) => {
            for (const item of items) {
                const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { set_material?: (name: string) => void } | undefined;
                if (m !== undefined && typeof m.set_material === 'function') {
                    m.set_material(item.material);
                }
            }
        });
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

        push_history('MESH_UV', 'Изменение UV', uvs, (items) => {
            for (const item of items) {
                const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & {
                    geometry?: { attributes?: { uv?: { array?: Float32Array; needsUpdate?: boolean } } }
                } | undefined;
                if (m !== undefined && m.geometry?.attributes?.uv?.array !== undefined) {
                    m.geometry.attributes.uv.array.set(item.uv);
                    m.geometry.attributes.uv.needsUpdate = true;
                }
            }
        });
    }

    function save_by_property(property: Property, ids: number[]): void {
        switch (property) {
            case Property.NAME: save_name(ids); break;
            case Property.ACTIVE: save_active(ids); break;
            case Property.VISIBLE: save_visible(ids); break;
            case Property.POSITION: save_position(ids); break;
            case Property.ROTATION: save_rotation(ids); break;
            case Property.SCALE: save_scale(ids); break;
            case Property.SIZE: save_size(ids); break;
            case Property.PIVOT: save_pivot(ids); break;
            case Property.ANCHOR: save_anchor(ids); break;
            case Property.COLOR: save_color(ids); break;
            case Property.ALPHA: save_alpha(ids); break;
            case Property.TEXTURE: save_texture(ids); break;
            case Property.SLICE9: save_slice(ids); break;
            case Property.TEXT: save_text(ids); break;
            case Property.FONT: save_font(ids); break;
            case Property.TEXT_ALIGN: save_text_align(ids); break;
            case Property.LINE_HEIGHT: save_line_height(ids); break;
            case Property.BLEND_MODE: save_blend_mode(ids); break;
            case Property.MATERIAL: save_material(ids); break;
            default:
                Services.logger.warn(`[save_by_property] No handler for property: ${property}`);
        }
    }

    return {
        save_position,
        save_rotation,
        save_scale,
        save_size,
        save_pivot,
        save_anchor,
        save_color,
        save_alpha,
        save_texture,
        save_slice,
        save_name,
        save_active,
        save_visible,
        save_text,
        save_font,
        save_text_align,
        save_line_height,
        save_blend_mode,
        save_material,
        save_uv,
        save_by_property,
    };
}
