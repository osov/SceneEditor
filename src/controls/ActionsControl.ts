import { format_list_without_children } from "../render_engine/helpers/utils";
import { IBaseMeshAndThree, IObjectTypes } from '../render_engine/types';
import { TreeItem } from "../modules_editor/TreeControl";
import { DEFOLD_LIMITS, WORLD_SCALAR } from "../config";
import { Vector2 } from "three";
import { ComponentType } from "../render_engine/components/container_component";
import { Services } from '@editor/core';

declare global {
    const ActionsControl: ReturnType<typeof ActionsControlCreate>;
}

export function register_actions_control() {
    (window as any).ActionsControl = ActionsControlCreate();
}

export enum NodeAction {
    CTRL_X,
    CTRL_C,
    CTRL_V,
    CTRL_B,
    CTRL_D,
    rename,
    remove,
    add_gui_container,
    add_gui_box,
    add_gui_text,
    add_go_container,
    add_go_sprite_component,
    add_go_label_component,
    add_go_model_component,
    add_go_animated_model_component,
    add_go_audio_component,
    add_component_spline,
    add_component_mover,
    refresh,
    open_in_explorer,
    download,
    new_folder,
    new_scene,
    material_base,
    scene_save,
    scene_save_as,
}

export const NodeActionGui: number[] = [
    NodeAction.add_gui_container,
    NodeAction.add_gui_box,
    NodeAction.add_gui_text
];

export const NodeActionGo: number[] = [
    NodeAction.add_go_container,
    NodeAction.add_go_sprite_component,
    NodeAction.add_go_label_component,
    NodeAction.add_go_model_component,
    NodeAction.add_go_animated_model_component,
    NodeAction.add_go_audio_component
];

export const worldGo: string[] = [
    IObjectTypes.GO_CONTAINER,
    IObjectTypes.GO_MODEL_COMPONENT,
    IObjectTypes.GO_ANIMATED_MODEL_COMPONENT,
    IObjectTypes.GO_SPRITE_COMPONENT,
    IObjectTypes.GO_LABEL_COMPONENT,
    IObjectTypes.GO_AUDIO_COMPONENT
];

export const componentsGo: string[] = [
    IObjectTypes.GO_MODEL_COMPONENT,
    IObjectTypes.GO_ANIMATED_MODEL_COMPONENT,
    IObjectTypes.GO_SPRITE_COMPONENT,
    IObjectTypes.GO_LABEL_COMPONENT,
    IObjectTypes.GO_AUDIO_COMPONENT
];

export const worldGui: string[] = [
    IObjectTypes.GUI_CONTAINER,
    IObjectTypes.GUI_BOX,
    IObjectTypes.GUI_TEXT
];

type ParamsPidPos = {
    pid: number,
    pos: Vector2
};

export type paramsTexture = {
    texture: string,
    atlas: string,
    size: { w: number, h: number },
} & ParamsPidPos;

function ActionsControlCreate() {
    let copy_mesh_list: any[] = [];
    let is_cut: boolean = false;

    function cut() {
        copy();
        if (copy_mesh_list.length > 0) {
            TreeControl.setCutList();
            is_cut = true;
        }
    }

    function copy() {
        const list = format_list_without_children(Services.selection.selected);
        if (list.length == 0) return;
        const canCopy = from_the_same_world(list);
        if (!canCopy) {
            showToast('Нельзя одновременно копировать/вырезать/дублировать элементы из GUI и GO!');
            return;
        }

        copy_mesh_list = [];
        for (let i = 0; i < list.length; i++) {
            copy_mesh_list.push(Services.scene.serialize_object(list[i] as any));
        }

    }

    function paste(asChild: boolean = false, isDuplication: boolean = false) {
        if (copy_mesh_list.length == 0) {
            showToast('Нечего вставлять!');
            return;
        }
        const selected = Services.selection.selected;
        const preTarget = selected.length ? selected : [Services.render.scene];
        if (!selected.length && !isDuplication) {
            showToast('Некуда вставлять!');
            return;
        }

        // ctrl_b or ctrl_v
        let target: any = {};
        if (preTarget[0]?.type == "Scene") target = preTarget[0];
        else target = asChild ? preTarget[0] : preTarget[0].parent;

        if (!is_valid_action(target, copy_mesh_list, asChild, false, true)) return;

        if (is_cut) {
            const id_mlist: number[] = [];
            copy_mesh_list.forEach(i => id_mlist.push(i.id));
            TreeControl.setCutList(true);
            is_cut = false;
            copy_mesh_list.length = 0;
            Services.event_bus.emit("SYS_GRAPH_MOVED_TO", { pid: target.mesh_data?.id || -1, next_id: -1, id_mesh_list: id_mlist });
            return;
        }

        const mesh_list: IBaseMeshAndThree[] = [];
        const created_mesh_data: { mesh: ReturnType<typeof Services.scene.serialize_object>; next_id: number; parent_id: number }[] = [];
        const target_id = target.mesh_data?.id ?? -1;

        for (let i = 0; i < copy_mesh_list.length; i++) {
            const m = Services.scene.deserialize_object(copy_mesh_list[i], false);
            m.position.x += 5;
            m.position.y -= 5;
            target.add(m);
            mesh_list.push(m as any);
            created_mesh_data.push({
                mesh: Services.scene.serialize_object(m),
                next_id: Services.scene.find_next_sibling_id(m),
                parent_id: target_id
            });
        }
        setUniqueNameMeshList(Services.hierarchy.get_tree() as any);

        const mesh_ids = mesh_list.map(m => m.mesh_data.id);
        Services.history.push({
            type: 'paste',
            description: 'Вставка объектов',
            data: { mesh_ids, created_mesh_data },
            undo: (data) => {
                for (const id of data.mesh_ids) {
                    Services.scene.remove_by_id(id);
                }
                Services.transform.detach();
                Services.selection.clear();
                Services.ui.update_hierarchy();
            },
            redo: (data) => {
                const restored: IBaseMeshAndThree[] = [];
                for (const item of data.created_mesh_data) {
                    const parent = item.parent_id === -1
                        ? Services.render.scene
                        : Services.scene.get_by_id(item.parent_id);
                    if (parent) {
                        const m = Services.scene.deserialize_object(item.mesh, true);
                        parent.add(m);
                        Services.scene.move(m, item.parent_id, item.next_id);
                        restored.push(m as any);
                    }
                }
                Services.selection.set_selected(restored);
                Services.ui.update_hierarchy();
            }
        });
        Services.selection.set_selected(mesh_list);
    }

    function duplication() {
        copy();
        paste(false, true);
        copy_mesh_list = [];
    }

    function remove() {
        const list = format_list_without_children(Services.selection.selected);
        if (list.length == 0) return;

        const mesh_data: { mesh: ReturnType<typeof Services.scene.serialize_object>; next_id: number }[] = [];
        const mesh_ids: number[] = [];

        for (let i = 0; i < list.length; i++) {
            const m = list[i];
            mesh_ids.push(m.mesh_data.id);
            if (!(m.ignore_history?.includes('MESH_ADD'))) {
                mesh_data.push({
                    mesh: Services.scene.serialize_object(m as any),
                    next_id: Services.scene.find_next_sibling_id(m as any)
                });
            }
            Services.scene.remove_by_id(m.mesh_data.id);
        }

        if (mesh_data.length > 0) {
            Services.history.push({
                type: 'remove',
                description: 'Удаление объектов',
                data: { mesh_data, mesh_ids },
                undo: (data) => {
                    const restored: IBaseMeshAndThree[] = [];
                    for (const item of data.mesh_data) {
                        const parent = item.mesh.pid === -1
                            ? Services.render.scene
                            : Services.scene.get_by_id(item.mesh.pid as number);
                        if (parent) {
                            const m = Services.scene.deserialize_object(item.mesh, true);
                            parent.add(m);
                            Services.scene.move(m, item.mesh.pid as number, item.next_id);
                            restored.push(m as any);
                        }
                    }
                    Services.selection.set_selected(restored);
                    Services.ui.update_hierarchy();
                },
                redo: (data) => {
                    for (const id of data.mesh_ids) {
                        Services.scene.remove_by_id(id);
                    }
                    Services.transform.detach();
                    Services.selection.clear();
                    Services.ui.update_hierarchy();
                }
            });
        }
        Services.selection.clear();
    }

    function add_gui_container(data: ParamsPidPos) {
        const container = Services.scene.create(IObjectTypes.GUI_CONTAINER as any) as any;
        if (!container) return;
        container.set_position(data.pos.x, data.pos.y);
        sceneAddItem(container, data.pid);
    }

    function add_gui_box(data: paramsTexture) {
        const box = Services.scene.create(IObjectTypes.GUI_BOX as any, { width: data.size.w, height: data.size.h }) as any;
        if (!box) return;
        box.set_position(data.pos.x, data.pos.y);
        Services.scene.move(box, data.pid);
        box.scale.setScalar(1);
        box.set_color('#0f0')
        box.set_texture(data.texture, data.atlas);
        box.set_slice(8, 8);
        sceneAddItem(box, data.pid);
    }

    function add_gui_text(data: ParamsPidPos) {
        const txt = Services.scene.create(IObjectTypes.GUI_TEXT as any, { text: 'Text', width: 128, height: 40 }) as any;
        if (!txt) return;
        txt.set_position(data.pos.x, data.pos.y);
        txt.set_color('#0f0');
        txt.scale.setScalar(1);
        txt.set_font('ShantellSans-Light11');
        sceneAddItem(txt, data.pid);
    }

    function add_go_container(data: ParamsPidPos) {
        const container = Services.scene.create(IObjectTypes.GO_CONTAINER as any) as any;
        if (!container) return;
        container.set_position(data.pos.x, data.pos.y);
        sceneAddItem(container, data.pid);
    }

    function add_go_sprite_component(data: paramsTexture) {
        const sprite = Services.scene.create(IObjectTypes.GO_SPRITE_COMPONENT as any, { width: data.size.w * WORLD_SCALAR, height: data.size.h * WORLD_SCALAR }) as any;
        if (!sprite) return;
        sprite.set_position(data.pos.x, data.pos.y);
        sprite.set_texture(data.texture, data.atlas);
        sceneAddItem(sprite, data.pid);
    }

    function add_go_label_component(data: ParamsPidPos) {
        const label = Services.scene.create(IObjectTypes.GO_LABEL_COMPONENT as any, { text: 'label' }) as any;
        if (!label) return;
        label.set_position(data.pos.x, data.pos.y);
        label.set_font('ShantellSans-Light11');
        sceneAddItem(label, data.pid);
    }

    function add_go_model_component(data: ParamsPidPos) {
        const model = Services.scene.create(IObjectTypes.GO_MODEL_COMPONENT as any, { width: 50 * WORLD_SCALAR, height: 50 * WORLD_SCALAR }) as any;
        if (!model) return;
        model.set_position(data.pos.x, data.pos.y);
        sceneAddItem(model, data.pid);
    }

    function add_go_animated_model_component(data: ParamsPidPos) {
        const model = Services.scene.create(IObjectTypes.GO_ANIMATED_MODEL_COMPONENT as any, { width: 50 * WORLD_SCALAR, height: 50 * WORLD_SCALAR }) as any;
        if (!model) return;
        model.set_position(data.pos.x, data.pos.y);
        sceneAddItem(model, data.pid);
    }

    function add_go_audio_component(data: ParamsPidPos) {
        const audio = Services.scene.create(IObjectTypes.GO_AUDIO_COMPONENT as any) as any;
        if (!audio) return;
        audio.set_position(data.pos.x, data.pos.y);
        sceneAddItem(audio, data.pid);
    }

    function add_component(data: ParamsPidPos, type: ComponentType) {
        const cmp = Services.scene.create(IObjectTypes.COMPONENT as any, { type }) as any;
        cmp.set_position(data.pos.x, data.pos.y);
        sceneAddItem(cmp, data.pid);
    }

    function sceneAddItem(item: IBaseMeshAndThree, pid: number = -1) {
        if (!item) return;

        const parent = Services.scene.get_by_id(pid);
        parent ? parent.add(item) : Services.scene.add(item as any, pid);

        const mesh_id = item.mesh_data.id;
        const mesh_data = Services.scene.serialize_object(item as any);
        const next_id = Services.scene.find_next_sibling_id(item as any);

        Services.history.push({
            type: 'create',
            description: 'Создание объекта',
            data: { mesh_id, mesh_data, next_id, pid },
            undo: (data) => {
                Services.scene.remove_by_id(data.mesh_id);
                Services.transform.detach();
                Services.selection.clear();
                Services.ui.update_hierarchy();
            },
            redo: (data) => {
                const parent = data.pid === -1
                    ? Services.render.scene
                    : Services.scene.get_by_id(data.pid);
                if (parent) {
                    const m = Services.scene.deserialize_object(data.mesh_data, true);
                    parent.add(m);
                    Services.scene.move(m, data.pid, data.next_id);
                    Services.selection.set_selected([m as any]);
                    Services.ui.update_hierarchy();
                }
            }
        });
        Services.selection.set_selected([item]);
    }

    function add_go_with_sprite_component(data: paramsTexture) {
        const go = Services.scene.create(IObjectTypes.GO_CONTAINER as any) as any;
        const spr = Services.scene.create(IObjectTypes.GO_SPRITE_COMPONENT as any, { width: (data.size.w || 32) * WORLD_SCALAR, height: (data.size.h || 32) * WORLD_SCALAR }) as any;
        if (!spr || !go) return;
        go.set_position(data.pos.x, data.pos.y);
        Services.scene.move(go, data.pid);
        go.position.z = 0;
        spr.set_position(0, 0);
        spr.set_texture(data.texture, data.atlas);
        go.add(spr);
        sceneAddItem(go, data.pid);
    }

    function setUniqueNameMeshList(list: TreeItem[]): void {
        if (!list.length) return;

        const namesMap: { [key: string]: number } = {};

        list.forEach(item => {
            const match = item.name.match(/^(.+?)\s*\(\d+\)$/);
            const baseName = match ? match[1] : item.name;

            if (namesMap[baseName]) {
                namesMap[baseName]++;
                const mesh = Services.scene.get_by_id(item.id);
                if (mesh) {
                    Services.scene.set_name(mesh, baseName + ` (${namesMap[baseName] - 1})`);
                }
            } else {
                namesMap[baseName] = 1;
            }
        });
    }

    function getWorldName(type: string): string {
        if (!type) return '';
        if (['scene', 'Scene'].includes(type)) return 'scene';
        if (worldGo.includes(type)) return 'go';
        if (worldGui.includes(type)) return 'gui';
        if (type.indexOf('component') > -1) return 'component';
        return '';
    }

    function from_the_same_world(listS: any, treeList: TreeItem[] = []) {
        if (listS.length <= 1) return true;

        const worldMap: any = [];

        for (let i = 0; i < listS.length; i++) {
            if (treeList.length) {
                const item = treeList.filter((e: any) => e.id == listS[i]);
                const icon = item.length ? item[0]?.icon : '';
                worldMap.push(getWorldName(icon));
            }
            else {
                worldMap.push(getWorldName(listS[i]?.type));
            }

            if (worldMap.length > 1) {
                if (worldMap[i] != worldMap[i - 1]) return false;
            }
        }

        return true;
    }

    function showToast(msg: string) {
        Popups.toast.open({
            type: 'info',
            message: msg
        });
    }

    function checkPasteScene(list: any): boolean {
        if (!DEFOLD_LIMITS) return true;
        if (list.length == 0) return false;
        for (let i = 0; i < list.length; i++) {
            const type = list[i]?.type ? list[i]?.type : list[i].icon ? list[i].icon : '';
            if ([IObjectTypes.GO_CONTAINER, IObjectTypes.GUI_CONTAINER].includes(type) == false) {
                return false;
            }
        }
        return true;
    }

    function is_valid_action(itemWhere: any, selected: any = copy_mesh_list, asChild: boolean = false, isMove: boolean = false, msg: boolean = false) {
        const icon = itemWhere?.type ? itemWhere?.type : itemWhere?.icon ? itemWhere?.icon : '';
        const worldIW = getWorldName(icon);

        const listWhat = selected?.length ? selected : [];
        if (!listWhat.length) {
            if (msg) showToast('Ничего не выбрано!');
            return false;
        }

        const type = listWhat[0]?.type ? listWhat[0]?.type : listWhat[0]?.icon ? listWhat[0]?.icon : '';
        const worldS = getWorldName(type);
        if (!worldS) {
            if (msg) showToast('Не найдены объекты для вставки!');
            return false;
        }

        if (!worldIW) {
            if (msg) showToast('Не выбрано место для вставки!');
            return false;
        }

        if (!DEFOLD_LIMITS) return true;

        // внутрь sprite\label\model ничего добавлять нельзя
        if (asChild && componentsGo.includes(icon)) {
            if (msg) showToast(`У ${componentsGo[0]} / ${componentsGo[1]} / ${componentsGo[2]} не может быть дочерних элементов!`);
            return false;
        }

        // при вставке gui в worldGui
        const gui = IObjectTypes.GUI_CONTAINER;
        const guiC = selected.filter((e: any) => e?.type == gui || e?.icon == gui)
        if (!isMove && worldIW == gui && guiC.length) {
            if (msg) showToast('Нельзя GUI контейнер вкладывать в GUI объекты!');
            return false;
        }

        // при перетаскивании gui в worldGui
        if (isMove && worldIW == gui && guiC.length) {
            if (msg) showToast('Нельзя GUI контейнер перемещать в GUI объекты!');
            return false;
        }

        // в корне можно создать\вставить только  GO_CONTAINER \ GUI_CONTAINER
        if (worldIW == 'scene' && !checkPasteScene(selected)) {
            if (msg) showToast('В корне могут быть только контейнеры Go и GUI!');
            return false;
        }

        if (worldIW == 'scene' && checkPasteScene(selected)) {
            return true;
        }

        // нельзя Go в Gui || Gui в Go
        const result = worldS == worldIW;
        if (!result) {
            if (msg) showToast('Нельзя объекты из GUI и GO вкладывать друг в друга!');
            return result;
        }

        return result;
    }

    return {
        copy_mesh_list,
        from_the_same_world,
        is_valid_action,
        cut, copy, paste, duplication, remove,
        add_gui_container,
        add_gui_box,
        add_gui_text,
        add_go_container,
        add_go_sprite_component,
        add_go_label_component,
        add_go_model_component,
        add_go_animated_model_component,
        add_go_audio_component,
        add_go_with_sprite_component,
        add_component,
    };
}