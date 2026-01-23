/**
 * SizeControl - контрол изменения размера объектов
 *
 * Позволяет визуально изменять размер, pivot, anchor и slice9 объектов.
 */

import { Vector3, Vector2, Scene } from "three";
import type { IBaseMeshAndThree } from "../../render_engine/types";
import { IObjectTypes } from "../../render_engine/types";
import { MeshProperty } from "@editor/shared";
import { Slice9Mesh } from "../../render_engine/objects/slice9";
import { is_base_mesh } from "../../render_engine/helpers/utils";
import { WORLD_SCALAR } from "../../config";
import { HistoryOwner } from "../../modules_editor/modules_editor_const";
import { Services } from '@editor/core';

import {
    DEBUG_BB_POINT_SIZE_MIN,
    DEBUG_BB_POINT_MAX_SIZE_PERCENT,
    DEBUG_BB_POINT_SIZE_MAX,
    type MeshPropertyInfo,
    type SizeHistoryData,
} from './types';

import {
    index_to_pivot,
    pivot_to_index,
    get_cursor_dir,
    get_bounds_from_meshes,
    calc_debug_sub_scalar,
} from './utils';

import {
    create_bb_points,
    create_pivot_points,
    create_anchor_mesh,
    create_slice_box_lines,
    create_debug_center,
} from './geometry';

/** Тип SizeControl */
export type SizeControlType = ReturnType<typeof SizeControlCreate>;

/** Модульный instance для использования через импорт */
let size_control_instance: SizeControlType | undefined;

/** Получить instance SizeControl */
export function get_size_control(): SizeControlType {
    if (size_control_instance === undefined) {
        throw new Error('SizeControl не инициализирован. Вызовите register_size_control() сначала.');
    }
    return size_control_instance;
}

/** Попробовать получить instance SizeControl (без ошибки если не инициализирован) */
export function try_get_size_control(): SizeControlType | undefined {
    return size_control_instance;
}

/** Регистрация SizeControl */
export function register_size_control() {
    size_control_instance = SizeControlCreate();
}

/** Создание SizeControl */
function SizeControlCreate() {
    const scene = Services.render.scene;
    const editor_z = 0;
    const layer_control = Services.render.DC_LAYERS.CONTROLS_LAYER;
    const layer_config = {
        controls_layer: layer_control,
        raycast_layer: Services.render.DC_LAYERS.RAYCAST_LAYER,
    };

    // Создание геометрии
    const bb_points = create_bb_points(scene, layer_control);
    const pivot_points = create_pivot_points(scene, layer_config);
    const anchor_mesh = create_anchor_mesh(scene, layer_config, editor_z);
    const { slice_box, slice_box_range } = create_slice_box_lines(scene, layer_control, editor_z);
    const debug_center = create_debug_center(scene, layer_control);

    // Состояние
    const pointer = new Vector2();
    const click_point = new Vector2();
    const prev_point = new Vector2();
    let click_pos = new Vector3();
    let offset_move = 0;
    let selected_list: IBaseMeshAndThree[] = [];
    let is_down = false;
    let is_active = false;
    let is_selected_anchor = false;
    let old_size: MeshPropertyInfo<SizeHistoryData>[] = [];
    let old_pos: MeshPropertyInfo<Vector3>[] = [];
    let old_slice: MeshPropertyInfo<Vector2>[] = [];
    let old_anchor: MeshPropertyInfo<Vector2>[] = [];
    let is_changed_size = false;
    let is_changed_pos = false;
    let is_changed_slice = false;
    let is_changed_anchor = false;
    const dir: [number, number] = [0, 0];

    // Загрузка текстуры якоря
    Services.resources.preload_texture('img/target.png', 'editor').then(() => {
        anchor_mesh.material.map = Services.resources.get_texture('target', 'editor').texture;
        anchor_mesh.material.needsUpdate = true;
    });

    function get_bounds_from_list() {
        return get_bounds_from_meshes(selected_list);
    }

    function is_supported_pivot() {
        if (selected_list.length > 0)
            return (selected_list[0].type === IObjectTypes.GUI_BOX || selected_list[0].type === IObjectTypes.GUI_TEXT);
        return false;
    }

    function is_supported_anchor() {
        return is_supported_pivot();
    }

    function is_supported_size() {
        for (let i = 0; i < selected_list.length; i++) {
            const it = selected_list[i];
            if (![IObjectTypes.SLICE9_PLANE, IObjectTypes.GUI_TEXT, IObjectTypes.GUI_BOX,
                IObjectTypes.GO_SPRITE_COMPONENT, IObjectTypes.GO_LABEL_COMPONENT].includes(it.type))
                return false;
        }
        return true;
    }

    function set_bb_visible(visible: boolean) {
        bb_points.forEach(p => p.visible = visible);
        debug_center.visible = visible;
    }

    function set_pivot_visible(visible: boolean) {
        if (visible && selected_list.length !== 1) return;
        if (visible && !is_supported_pivot()) return;
        anchor_mesh.visible = visible;
        pivot_points.forEach(p => p.visible = visible);
    }

    function set_slice_visible(visible: boolean) {
        slice_box.visible = visible;
        slice_box_range.visible = visible;
    }

    // @ts-expect-error -- функция будет использоваться для ограничения перемещения якоря
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function get_parent_bb(mesh: IBaseMeshAndThree) {
        if (mesh.parent === null) return [0, 0, 0, 0];
        if (mesh.parent instanceof Scene) {
            return mesh.get_bounds();
        } else if (is_base_mesh(mesh.parent)) {
            const parent = mesh.parent as IBaseMeshAndThree;
            return parent.get_bounds();
        }
        return [0, 0, 0, 0];
    }

    function draw_anchor_point(is_set_pos = false) {
        if (selected_list.length !== 1) return;
        if (!is_supported_anchor()) return;

        const mesh = selected_list[0];
        const wp = new Vector3();
        mesh.getWorldPosition(wp);
        const mesh_bb = mesh.get_bounds();

        if (is_set_pos) {
            const cp = Services.camera.screen_to_world(pointer.x, pointer.y);
            if (cp.x < mesh_bb[0]) cp.x = mesh_bb[0];
            if (cp.x > mesh_bb[2]) cp.x = mesh_bb[2];
            if (cp.y > mesh_bb[1]) cp.y = mesh_bb[1];
            if (cp.y < mesh_bb[3]) cp.y = mesh_bb[3];
            anchor_mesh.position.x = cp.x;
            anchor_mesh.position.y = cp.y;

            const size_x = mesh_bb[2] - mesh_bb[0];
            const size_y = mesh_bb[1] - mesh_bb[3];
            const ax = size_x > 0 ? (cp.x - mesh_bb[0]) / size_x : 0.5;
            const ay = size_y > 0 ? (cp.y - mesh_bb[3]) / size_y : 0.5;
            is_changed_anchor = true;
            mesh.set_anchor(ax, ay);
            Services.inspector.refresh_fields([MeshProperty.ANCHOR]);
        } else {
            const anchor = mesh.get_anchor();
            if (anchor.x === -1 || anchor.y === -1) {
                anchor_mesh.position.x = wp.x;
                anchor_mesh.position.y = wp.y;
            } else {
                const target = new Vector2();
                const size_x = mesh_bb[2] - mesh_bb[0];
                const size_y = mesh_bb[1] - mesh_bb[3];
                target.x = anchor.x * size_x + mesh_bb[0];
                target.y = anchor.y * size_y + mesh_bb[3];
                anchor_mesh.position.x = target.x;
                anchor_mesh.position.y = target.y;
            }
        }
    }

    function draw_debug_bb(bb: number[]) {
        const SUB_SCALAR = calc_debug_sub_scalar(bb, bb_points[0].geometry.parameters.radius, {
            max_size_percent: DEBUG_BB_POINT_MAX_SIZE_PERCENT,
            size_max: DEBUG_BB_POINT_SIZE_MAX,
            size_min: DEBUG_BB_POINT_SIZE_MIN,
        });

        for (let i = 0; i < bb_points.length; i++) {
            bb_points[i].scale.setScalar(SUB_SCALAR);
        }
        for (let i = 0; i < pivot_points.length; i++) {
            pivot_points[i].scale.setScalar(SUB_SCALAR);
        }
        debug_center.scale.setScalar(SUB_SCALAR);

        bb_points[0].position.set(bb[0], bb[1], editor_z);
        bb_points[1].position.set(bb[2], bb[1], editor_z);
        bb_points[2].position.set(bb[2], bb[3], editor_z);
        bb_points[3].position.set(bb[0], bb[3], editor_z);

        for (let i = 0; i < pivot_points.length; i++)
            pivot_points[i].material.color.set(0xffffff);

        const offset = 0;
        pivot_points[0].position.set(bb[0] + offset, bb[1] - offset, editor_z);
        pivot_points[1].position.set(bb[2] - offset, bb[1] - offset, editor_z);
        pivot_points[2].position.set(bb[2] - offset, bb[3] + offset, editor_z);
        pivot_points[3].position.set(bb[0] + offset, bb[3] + offset, editor_z);
        pivot_points[4].position.set(bb[0] + offset, bb[1] - Math.abs(bb[3] - bb[1]) / 2, editor_z);
        pivot_points[5].position.set(bb[2] - offset, bb[1] - Math.abs(bb[3] - bb[1]) / 2, editor_z);
        pivot_points[6].position.set(bb[0] + Math.abs(bb[2] - bb[0]) / 2, bb[1] - offset, editor_z);
        pivot_points[7].position.set(bb[0] + Math.abs(bb[2] - bb[0]) / 2, bb[3] + offset, editor_z);
        pivot_points[8].position.set(bb[0] + Math.abs(bb[2] - bb[0]) / 2, bb[1] - Math.abs(bb[3] - bb[1]) / 2, editor_z);

        if (selected_list.length === 1) {
            const mesh = selected_list[0];
            const wp = new Vector3();
            mesh.getWorldPosition(wp);
            debug_center.position.x = wp.x;
            debug_center.position.y = wp.y;
            const pivot = mesh.get_pivot();
            pivot_points[pivot_to_index(pivot)].material.color.set(0xff0000);

            // slice box
            if (mesh instanceof Slice9Mesh && Services.input.is_alt()) {
                const slice = mesh.get_slice();
                const scale = mesh.get_size();
                const ws = new Vector3();
                mesh.getWorldScale(ws);
                scale.x *= ws.x;
                scale.y *= ws.y;
                slice_box.position.x = bb[0] + Math.abs(bb[2] - bb[0]) / 2;
                slice_box.position.y = bb[1] - Math.abs(bb[3] - bb[1]) / 2;
                slice_box.scale.set(scale.x, scale.y, 1);

                slice_box_range.position.copy(slice_box.position);
                slice_box_range.scale.copy(slice_box.scale);
                slice_box_range.scale.x -= slice.x * 2;
                slice_box_range.scale.y -= slice.y * 2;

                const cp = Services.camera.screen_to_world(pointer.x, pointer.y);
                const center_x = (bb[0] + bb[2]) / 2;
                const center_y = (bb[1] + bb[3]) / 2;

                if (is_down) {
                    if (dir[0] > 0 || dir[1] > 0) {
                        const current_slice = mesh.get_slice();

                        if (dir[0] > 0) {
                            if (cp.x >= center_x) {
                                current_slice.x = (bb[2] - cp.x) / ws.x;
                            } else {
                                current_slice.x = (cp.x - bb[0]) / ws.x;
                            }
                        }

                        if (dir[1] > 0) {
                            if (cp.y <= center_y) {
                                current_slice.y = (cp.y - bb[3]) / ws.y;
                            } else {
                                current_slice.y = (bb[1] - cp.y) / ws.y;
                            }
                        }

                        if (current_slice.x < 0) current_slice.x = 0;
                        if (current_slice.y < 0) current_slice.y = 0;
                        mesh.set_slice(current_slice.x, current_slice.y);
                        is_changed_slice = true;
                    }
                }
            }
        }

        set_bb_visible(true);
        if (selected_list.length !== 1) debug_center.visible = false;
        draw_anchor_point();
        if (selected_list.length === 0) set_bb_visible(false);
    }

    function draw() {
        if (!is_active) return;
        draw_debug_bb(get_bounds_from_list());
    }

    function detach() {
        selected_list = [];
        set_bb_visible(false);
        set_pivot_visible(false);
        set_slice_visible(false);
        document.body.style.cursor = 'default';
    }

    function set_selected_list(list: IBaseMeshAndThree[]) {
        if (!is_active) return;
        selected_list = list;
        draw();
    }

    function set_active(val: boolean) {
        is_active = val;
        if (!val) {
            set_bb_visible(false);
            set_pivot_visible(false);
            set_slice_visible(false);
        }
    }

    // === Обработчики событий ===

    Services.event_bus.on('input:key_down', (data) => {
        const e = data as { target: EventTarget };
        if (!is_active) return;
        if (e.target !== Services.render.renderer.domElement) return;

        if (Services.input.is_shift()) {
            document.body.style.cursor = 'default';
            set_pivot_visible(true);
            draw_anchor_point();
        }

        if (Services.input.is_alt() && selected_list.length === 1 && (selected_list[0] instanceof Slice9Mesh)) {
            if (!slice_box.visible) {
                set_slice_visible(true);
                draw();
            }
        }
    });

    Services.event_bus.on('input:key_up', () => {
        if (!is_active) return;
        if (!Services.input.is_shift()) {
            is_selected_anchor = false;
            set_pivot_visible(false);
        }
        if (!Services.input.is_alt()) set_slice_visible(false);
    });

    // Pivot/anchor click handler
    Services.event_bus.on('input:pointer_up', (data) => {
        const e = data as { button: number; x: number; y: number };
        if (!is_active) return;
        if (e.button !== 0) return;
        if (!Services.input.is_shift()) return;

        if (selected_list.length === 1) {
            const mesh = selected_list[0];
            if (is_selected_anchor) {
                is_selected_anchor = false;
            } else {
                if (is_supported_pivot()) {
                    for (let i = 0; i < pivot_points.length; i++) {
                        const pp = pivot_points[i];
                        if (Services.render.is_intersected_mesh(new Vector2(e.x, e.y), pp)) {
                            const pivot = index_to_pivot(i);
                            const pivot_data = [{ mesh_id: mesh.mesh_data.id, value: mesh.get_pivot() }];
                            Services.history.push({
                                type: 'MESH_PIVOT',
                                description: 'Изменение pivot',
                                data: { items: pivot_data, owner: HistoryOwner.SIZE_CONTROL },
                                undo: (d) => {
                                    for (const item of d.items) {
                                        const m = Services.scene.get_by_id(item.mesh_id) as IBaseMeshAndThree | undefined;
                                        if (m !== undefined) {
                                            m.set_pivot(item.value.x, item.value.y, true);
                                            m.transform_changed();
                                        }
                                    }
                                    Services.ui.update_hierarchy();
                                },
                                redo: () => {},
                            });
                            mesh.set_pivot(pivot.x, pivot.y, true);
                            Services.inspector.refresh_fields([MeshProperty.PIVOT]);

                            for (let j = 0; j < pivot_points.length; j++)
                                pivot_points[j].material.color.set(0xffffff);
                            pivot_points[i].material.color.set(0xff0000);

                            const wp = new Vector3();
                            mesh.getWorldPosition(wp);
                            debug_center.position.x = wp.x;
                            debug_center.position.y = wp.y;
                        }
                    }
                }
            }
        }
    });

    Services.event_bus.on('input:pointer_down', (data) => {
        const e = data as { target: EventTarget; button: number; x: number; y: number };
        if (e.target !== Services.render.renderer.domElement) return;
        if (!is_active) return;
        if (e.button !== 0) return;

        is_down = true;
        click_point.set(e.x, e.y);
        offset_move = 0;
        click_pos = Services.camera.screen_to_world(click_point.x, click_point.y);

        // Save state for undo
        old_pos = [];
        is_changed_pos = false;
        for (let i = 0; i < selected_list.length; i++) {
            const m = selected_list[i];
            old_pos.push({ mesh_id: m.mesh_data.id, value: m.position.clone() });
        }

        old_size = [];
        is_changed_size = false;
        for (let i = 0; i < selected_list.length; i++) {
            const m = selected_list[i];
            old_size.push({ mesh_id: m.mesh_data.id, value: { size: m.get_size(), pos: m.position.clone() } });
        }

        is_changed_slice = false;
        old_slice = [];
        for (let i = 0; i < selected_list.length; i++) {
            const m = selected_list[i];
            if (m instanceof Slice9Mesh) {
                old_slice.push({ mesh_id: m.mesh_data.id, value: m.get_slice() });
            }
        }

        is_changed_anchor = false;
        old_anchor = [];
        for (let i = 0; i < selected_list.length; i++) {
            const m = selected_list[i];
            old_anchor.push({ mesh_id: m.mesh_data.id, value: m.get_anchor() });
        }

        if (Services.render.is_intersected_mesh(new Vector2(pointer.x, pointer.y), anchor_mesh))
            is_selected_anchor = true;
    });

    Services.event_bus.on('input:pointer_up', (data) => {
        const e = data as { button: number };
        if (!is_active) return;
        if (e.button !== 0) return;

        is_down = false;

        if (is_changed_pos) {
            is_changed_pos = false;
            Services.history.push({
                type: 'MESH_TRANSLATE',
                description: 'Перемещение объектов',
                data: { items: old_pos.slice(), owner: HistoryOwner.SIZE_CONTROL },
                undo: (d) => {
                    for (const item of d.items) {
                        const m = Services.scene.get_by_id(item.mesh_id) as IBaseMeshAndThree | undefined;
                        if (m !== undefined) {
                            m.position.copy(item.value);
                            m.transform_changed();
                        }
                    }
                    Services.ui.update_hierarchy();
                },
                redo: () => {},
            });
        }

        if (is_changed_size) {
            is_changed_size = false;
            Services.history.push({
                type: 'MESH_SIZE',
                description: 'Изменение размера',
                data: { items: old_size.slice(), owner: HistoryOwner.SIZE_CONTROL },
                undo: (d) => {
                    for (const item of d.items) {
                        const m = Services.scene.get_by_id(item.mesh_id) as IBaseMeshAndThree | undefined;
                        if (m !== undefined) {
                            m.set_size(item.value.size.x, item.value.size.y);
                            m.position.copy(item.value.pos);
                            m.transform_changed();
                        }
                    }
                    Services.ui.update_hierarchy();
                },
                redo: () => {},
            });
        }

        if (is_changed_slice) {
            is_changed_slice = false;
            Services.history.push({
                type: 'MESH_SLICE',
                description: 'Изменение slice9',
                data: { items: old_slice.slice(), owner: HistoryOwner.SIZE_CONTROL },
                undo: (d) => {
                    for (const item of d.items) {
                        const m = Services.scene.get_by_id(item.mesh_id);
                        if (m !== undefined && m instanceof Slice9Mesh) {
                            m.set_slice(item.value.x, item.value.y);
                            m.transform_changed();
                        }
                    }
                },
                redo: () => {},
            });
        }

        if (is_changed_anchor) {
            is_changed_anchor = false;
            Services.history.push({
                type: 'MESH_ANCHOR',
                description: 'Изменение anchor',
                data: { items: old_anchor.slice(), owner: HistoryOwner.SIZE_CONTROL },
                undo: (d) => {
                    for (const item of d.items) {
                        const m = Services.scene.get_by_id(item.mesh_id) as IBaseMeshAndThree | undefined;
                        if (m !== undefined) {
                            m.set_anchor(item.value.x, item.value.y);
                            m.transform_changed();
                        }
                    }
                },
                redo: () => {},
            });
        }
    });

    Services.event_bus.on('input:pointer_move', (data) => {
        const event = data as { x: number; y: number };
        if (!is_active) return;

        prev_point.set(pointer.x, pointer.y);
        pointer.x = event.x;
        pointer.y = event.y;
        const wp = Services.camera.screen_to_world(pointer.x, pointer.y);
        const bounds = get_bounds_from_list();

        if (Services.input.is_shift() && is_selected_anchor) {
            draw_anchor_point(true);
        }

        // Slice logic
        if (Services.input.is_alt() && selected_list.length === 1 && (selected_list[0] instanceof Slice9Mesh)) {
            if (!is_down) {
                const size = selected_list[0].get_slice();
                const ws = new Vector3();
                selected_list[0].getWorldScale(ws);
                const dx = size.x / ws.x;
                const dy = size.y / ws.y;
                const bounds2 = get_bounds_from_list();
                bounds2[0] += dx * ws.x;
                bounds2[1] -= dy * ws.y;
                bounds2[2] -= dx * ws.x;
                bounds2[3] += dy * ws.y;
                if (is_supported_size()) {
                    const tmp = get_cursor_dir(wp, bounds2);
                    dir[0] = tmp[0];
                    dir[1] = tmp[1];
                }
            }
            draw_debug_bb(bounds);
            Services.inspector.refresh_fields([MeshProperty.SLICE9]);
            return;
        }

        if (Services.input.is_shift() || Services.input.is_alt()) return;
        if (selected_list.length === 0) return;

        if (!is_down) {
            if (is_supported_size()) {
                const tmp = get_cursor_dir(wp, bounds);
                dir[0] = tmp[0];
                dir[1] = tmp[1];
            }
        }

        if (is_down) {
            offset_move = click_pos.clone().sub(wp).length();
            const cp = Services.camera.screen_to_world(prev_point.x, prev_point.y);

            for (let i = 0; i < selected_list.length; i++) {
                const selected_go = selected_list[i];
                const ws = new Vector3();
                selected_go.getWorldScale(ws);
                const delta = wp.clone().sub(cp).divide(ws);
                const old_pos_vec = new Vector3();
                selected_go.getWorldPosition(old_pos_vec);

                if (dir[0] !== 0 || dir[1] !== 0) {
                    const current_size = selected_go.get_size();
                    const center_x = (bounds[0] + bounds[2]) / 2;
                    const center_y = (bounds[1] + bounds[3]) / 2;

                    const diff_size = new Vector2(0, 0);
                    const diff_pos = new Vector2(0, 0);
                    const pivot = selected_go.get_pivot();
                    const ax = pivot.x;
                    const ay = pivot.y;

                    if (dir[0] > 0) {
                        diff_pos.x = delta.x * ws.x * ax;
                        diff_size.x = delta.x;
                        if (wp.x < center_x) {
                            diff_size.x = -delta.x;
                            diff_pos.x = delta.x * ws.x * (1 - ax);
                        }
                    }
                    if (dir[1] > 0) {
                        diff_pos.y = delta.y * ws.y * (1 - ay);
                        diff_size.y = -delta.y;
                        if (wp.y > center_y) {
                            diff_size.y = delta.y;
                            diff_pos.y = delta.y * ws.y * ay;
                        }
                    }

                    selected_go.set_size(current_size.x + diff_size.x, current_size.y + diff_size.y);
                    let lp = new Vector3(old_pos_vec.x + diff_pos.x, old_pos_vec.y + diff_pos.y, 0);
                    if (selected_go.parent !== null)
                        lp = selected_go.parent.worldToLocal(new Vector3(old_pos_vec.x + diff_pos.x, old_pos_vec.y + diff_pos.y, 0));

                    selected_go.set_position(lp.x, lp.y);
                    is_changed_size = true;

                    Services.inspector.refresh_fields([MeshProperty.POSITION, MeshProperty.SIZE]);
                }
            }

            if (dir[0] === 0 && dir[1] === 0) {
                if (offset_move < 0.1 * WORLD_SCALAR) {
                    let is_select = false;
                    for (let i = 0; i < selected_list.length; i++) {
                        const selected_go = selected_list[i];
                        if (Services.render.is_intersected_mesh(pointer, selected_go)) {
                            is_select = true;
                            break;
                        }
                    }
                    if (!is_select) {
                        if (!Services.input.is_control())
                            Services.event_bus.emit('selection:cleared', {});
                        return;
                    }
                }

                for (let i = 0; i < selected_list.length; i++) {
                    const selected_go = selected_list[i];
                    const old_pos_vec = new Vector3();
                    selected_go.getWorldPosition(old_pos_vec);
                    const ws = new Vector3();
                    selected_go.getWorldScale(ws);
                    const delta = wp.clone().sub(cp).divide(ws);
                    let lp = new Vector3(old_pos_vec.x + delta.x * ws.x, old_pos_vec.y + delta.y * ws.y, old_pos_vec.z);
                    if (selected_go.parent !== null)
                        lp = selected_go.parent.worldToLocal(lp);
                    selected_go.set_position(lp.x, lp.y, lp.z);
                    is_changed_pos = true;
                }
            }

            draw_debug_bb(bounds);
            Services.transform.set_proxy_in_average_point(selected_list);
            Services.inspector.refresh_fields([MeshProperty.POSITION]);
        }
    });

    Services.event_bus.on('engine:update_end', () => {
        draw();
    });

    return { set_selected_list, detach, set_active, draw };
}
