/**
 * PropertyHistoryService - сервис сохранения свойств в историю
 *
 * Централизует логику undo/redo для всех изменений свойств объектов.
 * Упрощает создание history записей для инспектора.
 */

import { Services } from '@editor/core';
import { HistoryOwner } from '../../../modules_editor/modules_editor_const';
import { Property } from '../../../core/inspector/IInspectable';
import type {
    HistoryType,
    PropertyHistoryServiceParams,
    IPropertyHistoryService,
    HistoryModuleDeps,
} from './types';

import { create_transform_history } from './transform_history';
import { create_visual_history } from './visual_history';
import { create_state_history } from './state_history';
import { create_text_history } from './text_history';
import { create_model_history } from './model_history';

/** Создать PropertyHistoryService */
export function create_property_history_service(params: PropertyHistoryServiceParams): IPropertyHistoryService {
    const { mesh_resolver } = params;

    function get_mesh(id: number) {
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

    // Создаём зависимости для модулей
    const deps: HistoryModuleDeps = { get_mesh, push_history };

    // Инициализируем модули
    const transform = create_transform_history(deps);
    const visual = create_visual_history(deps);
    const state = create_state_history(deps);
    const text = create_text_history(deps);
    const model = create_model_history(deps);

    function save_by_property(property: Property, ids: number[], extra_data?: unknown): void {
        switch (property) {
            case Property.NAME: state.save_name(ids); break;
            case Property.ACTIVE: state.save_active(ids); break;
            case Property.VISIBLE: state.save_visible(ids); break;
            case Property.POSITION: transform.save_position(ids); break;
            case Property.ROTATION: transform.save_rotation(ids); break;
            case Property.SCALE: transform.save_scale(ids); break;
            case Property.SIZE: transform.save_size(ids); break;
            case Property.PIVOT: transform.save_pivot(ids); break;
            case Property.ANCHOR: transform.save_anchor(ids); break;
            case Property.ANCHOR_PRESET: transform.save_anchor(ids); break;
            case Property.COLOR: visual.save_color(ids); break;
            case Property.ALPHA: visual.save_alpha(ids); break;
            case Property.TEXTURE: visual.save_texture(ids); break;
            case Property.SLICE9: visual.save_slice(ids); break;
            case Property.TEXT: text.save_text(ids); break;
            case Property.FONT: text.save_font(ids); break;
            case Property.FONT_SIZE: transform.save_font_size(ids); break;
            case Property.TEXT_ALIGN: text.save_text_align(ids); break;
            case Property.LINE_HEIGHT: text.save_line_height(ids); break;
            case Property.BLEND_MODE: visual.save_blend_mode(ids); break;
            case Property.ATLAS: visual.save_atlas(ids); break;
            case Property.MATERIAL: model.save_material(ids); break;
            case Property.MESH_NAME: model.save_mesh_model_name(ids); break;
            case Property.MODEL_MATERIALS: model.save_model_materials(ids); break;
            case Property.SLOT_MATERIAL: {
                const slot_index = typeof extra_data === 'number' ? extra_data : 0;
                model.save_slot_material(ids, slot_index);
                break;
            }
            default:
                // Не логируем warning для свойств которые не требуют сохранения в историю
                break;
        }
    }

    return {
        save_position: transform.save_position,
        save_rotation: transform.save_rotation,
        save_scale: transform.save_scale,
        save_size: transform.save_size,
        save_pivot: transform.save_pivot,
        save_anchor: transform.save_anchor,
        save_color: visual.save_color,
        save_alpha: visual.save_alpha,
        save_texture: visual.save_texture,
        save_slice: visual.save_slice,
        save_name: state.save_name,
        save_active: state.save_active,
        save_visible: state.save_visible,
        save_text: text.save_text,
        save_font: text.save_font,
        save_text_align: text.save_text_align,
        save_line_height: text.save_line_height,
        save_blend_mode: visual.save_blend_mode,
        save_material: model.save_material,
        save_uv: visual.save_uv,
        save_atlas: visual.save_atlas,
        save_mesh_model_name: model.save_mesh_model_name,
        save_model_materials: model.save_model_materials,
        save_slot_material: model.save_slot_material,
        save_font_size: transform.save_font_size,
        save_by_property,
    };
}
