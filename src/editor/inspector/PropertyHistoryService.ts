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
    MeshAtlasEventData,
    MeshModelNameEventData,
    ModelMaterialsEventData,
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
    | 'MESH_MODEL_NAME'
    | 'MESH_MODEL_MATERIALS'
    | 'MESH_SLOT_MATERIAL'
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
    /** Сохранить атлас меша для undo */
    save_atlas(ids: number[]): void;
    /** Сохранить имя 3D модели для undo */
    save_mesh_model_name(ids: number[]): void;
    /** Сохранить материалы 3D модели для undo */
    save_model_materials(ids: number[]): void;
    /** Сохранить материал слота для undo */
    save_slot_material(ids: number[], slot_index: number): void;
    /** Сохранить font size (через scale) для undo */
    save_font_size(ids: number[]): void;
    /** Сохранить свойство по ключу Property */
    save_by_property(property: Property, ids: number[], extra_data?: unknown): void;
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
        undo_items: T[],
        apply_fn: (items: T[]) => void,
        capture_fn: (items: T[]) => T[]
    ): void {
        Services.history.push({
            type,
            description,
            data: { undo_items, redo_items: [] as T[], owner: HistoryOwner.INSPECTOR_CONTROL },
            undo: (d) => {
                // Сохраняем текущие значения для redo перед восстановлением старых
                d.redo_items = capture_fn(d.undo_items as T[]);
                apply_fn(d.undo_items as T[]);
            },
            redo: (d) => {
                // Восстанавливаем новые значения (сохранённые при undo)
                if ((d.redo_items as T[]).length > 0) {
                    apply_fn(d.redo_items as T[]);
                }
            },
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

        push_history(
            'MESH_TRANSLATE',
            'Перемещение объектов',
            positions,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.position.copy(item.position);
                        m.transform_changed();
                    }
                }
                Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
                Services.ui.update_hierarchy();
            },
            (items) => {
                // Захватываем текущие позиции перед undo
                const current: PositionEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, position: deepClone(m.position) });
                    }
                }
                return current;
            }
        );
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

        push_history(
            'MESH_ROTATE',
            'Вращение объектов',
            rotations,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.rotation.copy(item.rotation);
                        m.transform_changed();
                    }
                }
                Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
                Services.ui.update_hierarchy();
            },
            (items) => {
                const current: RotationEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, rotation: deepClone(m.rotation) });
                    }
                }
                return current;
            }
        );
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

        push_history(
            'MESH_SCALE',
            'Масштабирование объектов',
            scales,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.scale.copy(item.scale);
                        m.transform_changed();
                    }
                }
                Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
                Services.ui.update_hierarchy();
            },
            (items) => {
                const current: ScaleEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, scale: deepClone(m.scale) });
                    }
                }
                return current;
            }
        );
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

        push_history(
            'MESH_SIZE',
            'Изменение размера',
            sizes,
            (items) => {
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
            },
            (items) => {
                const current: SizeEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, position: m.get_position(), size: m.get_size() });
                    }
                }
                return current;
            }
        );
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

        push_history(
            'MESH_PIVOT',
            'Изменение pivot',
            pivots,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.set_pivot(item.pivot.x, item.pivot.y, true);
                    }
                }
                Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
                Services.ui.update_hierarchy();
            },
            (items) => {
                const current: PivotEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, pivot: m.get_pivot() });
                    }
                }
                return current;
            }
        );
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

        push_history(
            'MESH_ANCHOR',
            'Изменение anchor',
            anchors,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.set_anchor(item.anchor.x, item.anchor.y);
                    }
                }
                Services.ui.update_hierarchy();
            },
            (items) => {
                const current: AnchorEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, anchor: m.get_anchor() });
                    }
                }
                return current;
            }
        );
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

        push_history(
            'MESH_NAME',
            'Изменение имени',
            names,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.name = item.name;
                    }
                }
                Services.ui.update_hierarchy();
            },
            (items) => {
                const current: NameEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, name: m.name });
                    }
                }
                return current;
            }
        );
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

        push_history(
            'MESH_ACTIVE',
            'Изменение активности',
            states,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.set_active(item.state);
                    }
                }
                Services.ui.update_hierarchy();
            },
            (items) => {
                const current: ActiveEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, state: m.get_active() });
                    }
                }
                return current;
            }
        );
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

        push_history(
            'MESH_VISIBLE',
            'Изменение видимости',
            states,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.set_visible(item.state);
                    }
                }
                Services.ui.update_hierarchy();
            },
            (items) => {
                const current: VisibleEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, state: m.get_visible() });
                    }
                }
                return current;
            }
        );
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

        push_history(
            'MESH_TEXT',
            'Изменение текста',
            texts,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { set_text?: (t: string) => void } | undefined;
                    if (m !== undefined && typeof m.set_text === 'function') {
                        m.set_text(item.text);
                    }
                }
            },
            (items) => {
                const current: TextEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { text?: string } | undefined;
                    if (m !== undefined && m.text !== undefined) {
                        current.push({ id_mesh: item.id_mesh, text: m.text });
                    }
                }
                return current;
            }
        );
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

        push_history(
            'MESH_FONT',
            'Изменение шрифта',
            fonts,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { set_font?: (f: string) => void } | undefined;
                    if (m !== undefined && typeof m.set_font === 'function') {
                        m.set_font(item.font);
                    }
                }
            },
            (items) => {
                const current: FontEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { parameters?: { font?: string } } | undefined;
                    if (m !== undefined && m.parameters?.font !== undefined) {
                        current.push({ id_mesh: item.id_mesh, font: m.parameters.font });
                    }
                }
                return current;
            }
        );
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

        push_history(
            'MESH_TEXT_ALIGN',
            'Изменение выравнивания',
            aligns,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { textAlign?: string } | undefined;
                    if (m !== undefined) {
                        m.textAlign = item.text_align;
                    }
                }
            },
            (items) => {
                const current: TextAlignEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { textAlign?: 'left' | 'right' | 'center' | 'justify' } | undefined;
                    if (m !== undefined && m.textAlign !== undefined) {
                        current.push({ id_mesh: item.id_mesh, text_align: m.textAlign });
                    }
                }
                return current;
            }
        );
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

        push_history(
            'MESH_LINE_HEIGHT',
            'Изменение высоты строки',
            heights,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { lineHeight?: number } | undefined;
                    if (m !== undefined) {
                        m.lineHeight = item.line_height;
                    }
                }
            },
            (items) => {
                const current: LineHeightEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { lineHeight?: number } | undefined;
                    if (m !== undefined && m.lineHeight !== undefined) {
                        current.push({ id_mesh: item.id_mesh, line_height: m.lineHeight });
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

        push_history(
            'MESH_MATERIAL',
            'Изменение материала',
            materials,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { set_material?: (name: string) => void } | undefined;
                    if (m !== undefined && typeof m.set_material === 'function') {
                        m.set_material(item.material);
                    }
                }
            },
            (items) => {
                const current: MaterialEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { get_material_name?: () => string } | undefined;
                    if (m !== undefined && typeof m.get_material_name === 'function') {
                        current.push({ id_mesh: item.id_mesh, material: m.get_material_name() });
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

    function save_mesh_model_name(ids: number[]): void {
        const mesh_names: MeshModelNameEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_mesh_model_name] Mesh not found for id:', id);
                continue;
            }
            const mesh_with_name = mesh as { get_mesh_name?: () => string };
            if (typeof mesh_with_name.get_mesh_name === 'function') {
                mesh_names.push({ id_mesh: id, mesh_name: mesh_with_name.get_mesh_name() });
            }
        }

        push_history(
            'MESH_MODEL_NAME',
            'Изменение 3D модели',
            mesh_names,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { set_mesh?: (name: string) => void } | undefined;
                    if (m !== undefined && typeof m.set_mesh === 'function') {
                        m.set_mesh(item.mesh_name);
                    }
                }
            },
            (items) => {
                const current: MeshModelNameEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { get_mesh_name?: () => string } | undefined;
                    if (m !== undefined && typeof m.get_mesh_name === 'function') {
                        current.push({ id_mesh: item.id_mesh, mesh_name: m.get_mesh_name() });
                    }
                }
                return current;
            }
        );
    }

    function save_model_materials(ids: number[]): void {
        const materials: ModelMaterialsEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_model_materials] Mesh not found for id:', id);
                continue;
            }
            const mesh_with_materials = mesh as { get_materials?: () => string[] };
            if (typeof mesh_with_materials.get_materials === 'function') {
                materials.push({ id_mesh: id, materials: [...mesh_with_materials.get_materials()] });
            }
        }

        push_history(
            'MESH_MODEL_MATERIALS',
            'Изменение материалов модели',
            materials,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { set_material?: (name: string, slot: number) => void } | undefined;
                    if (m !== undefined && typeof m.set_material === 'function') {
                        const set_material = m.set_material;
                        item.materials.forEach((name, index) => {
                            set_material(name, index);
                        });
                    }
                }
            },
            (items) => {
                const current: ModelMaterialsEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { get_materials?: () => string[] } | undefined;
                    if (m !== undefined && typeof m.get_materials === 'function') {
                        current.push({ id_mesh: item.id_mesh, materials: [...m.get_materials()] });
                    }
                }
                return current;
            }
        );
    }

    function save_slot_material(ids: number[], slot_index: number): void {
        const materials: (MaterialEventData & { slot_index: number })[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_slot_material] Mesh not found for id:', id);
                continue;
            }
            const mesh_with_materials = mesh as { get_materials?: () => string[] };
            if (typeof mesh_with_materials.get_materials === 'function') {
                const mats = mesh_with_materials.get_materials();
                if (slot_index < mats.length) {
                    materials.push({ id_mesh: id, material: mats[slot_index], slot_index });
                }
            }
        }

        push_history(
            'MESH_SLOT_MATERIAL',
            'Изменение материала слота',
            materials,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { set_material?: (name: string, slot: number) => void } | undefined;
                    if (m !== undefined && typeof m.set_material === 'function') {
                        m.set_material(item.material, item.slot_index);
                    }
                }
            },
            (items) => {
                const current: (MaterialEventData & { slot_index: number })[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { get_materials?: () => string[] } | undefined;
                    if (m !== undefined && typeof m.get_materials === 'function') {
                        const mats = m.get_materials();
                        if (item.slot_index < mats.length) {
                            current.push({ id_mesh: item.id_mesh, material: mats[item.slot_index], slot_index: item.slot_index });
                        }
                    }
                }
                return current;
            }
        );
    }

    function save_font_size(ids: number[]): void {
        const scales: ScaleEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_font_size] Mesh not found for id:', id);
                continue;
            }
            scales.push({ id_mesh: id, scale: deepClone(mesh.scale) });
        }

        push_history(
            'MESH_FONT_SIZE',
            'Изменение размера шрифта',
            scales,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        m.scale.copy(item.scale);
                        m.transform_changed();
                    }
                }
                Services.transform.set_proxy_in_average_point(Services.selection.selected as IBaseMeshAndThree[]);
            },
            (items) => {
                const current: ScaleEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree | undefined;
                    if (m !== undefined) {
                        current.push({ id_mesh: item.id_mesh, scale: deepClone(m.scale) });
                    }
                }
                return current;
            }
        );
    }

    function save_by_property(property: Property, ids: number[], extra_data?: unknown): void {
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
            case Property.ANCHOR_PRESET: save_anchor(ids); break; // Anchor preset использует тот же save что и anchor
            case Property.COLOR: save_color(ids); break;
            case Property.ALPHA: save_alpha(ids); break;
            case Property.TEXTURE: save_texture(ids); break;
            case Property.SLICE9: save_slice(ids); break;
            case Property.TEXT: save_text(ids); break;
            case Property.FONT: save_font(ids); break;
            case Property.FONT_SIZE: save_font_size(ids); break;
            case Property.TEXT_ALIGN: save_text_align(ids); break;
            case Property.LINE_HEIGHT: save_line_height(ids); break;
            case Property.BLEND_MODE: save_blend_mode(ids); break;
            case Property.ATLAS: save_atlas(ids); break;
            case Property.MATERIAL: save_material(ids); break;
            case Property.MESH_NAME: save_mesh_model_name(ids); break;
            case Property.MODEL_MATERIALS: save_model_materials(ids); break;
            case Property.SLOT_MATERIAL: {
                const slot_index = typeof extra_data === 'number' ? extra_data : 0;
                save_slot_material(ids, slot_index);
                break;
            }
            default:
                // Не логируем warning для свойств которые не требуют сохранения в историю
                // (например, кнопки воспроизведения аудио, uniform свойства обрабатываются отдельно)
                break;
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
        save_atlas,
        save_mesh_model_name,
        save_model_materials,
        save_slot_material,
        save_font_size,
        save_by_property,
    };
}
