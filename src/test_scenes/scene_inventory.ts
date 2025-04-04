import { Intersection, Object3D, Object3DEventMap, Vector2, Vector3 } from "three";
import { SERVER_URL, PROJECT_NAME } from "../config";
import { run_debug_filemanager } from "../controls/AssetControl";
import { URL_PATHS } from "../modules_editor/modules_editor_const";
import { filter_list_base_mesh, make_ramk } from "../render_engine/helpers/utils";
import { IBaseMeshAndThree, IObjectTypes } from "../render_engine/types";

//  отфильтровать только реальные объекты(чтобы отладочных не было)
function get_intersect_list(tmp: Intersection<Object3D<Object3DEventMap>>[]) {
    let tmp_list = [];
    for (let i = 0; i < tmp.length; i++)
        tmp_list.push(tmp[i].object);
    return filter_list_base_mesh(tmp_list);
}

const list_slots: IBaseMeshAndThree[] = [];

export async function run_scene_inventory() {
    ResourceManager.set_project_path(`${SERVER_URL}${URL_PATHS.ASSETS}`);
    await run_debug_filemanager(PROJECT_NAME);

    const click_point = new Vector2();
    let world_offset = new Vector3();
    let dragged_item: IBaseMeshAndThree | null;
    // событие нажатия мыши
    EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
        // клик по экрану
        if (e.target != RenderEngine.renderer.domElement)
            return;
        // клик левой
        if (e.button != 0)
            return;
        click_point.set(e.x, e.y);
        let intersect_list = get_intersect_list(RenderEngine.raycast_scene(click_point));

        if (intersect_list.length > 0 && !list_slots.includes(intersect_list[0]))
            dragged_item = intersect_list[0];

        if (dragged_item) {
            dragged_item.set_color('#f00');
            const wp = Camera.screen_to_world(click_point.x, click_point.y);
            world_offset.set(wp.x - dragged_item.position.x, wp.y - dragged_item.position.y, 0);
        }

        log(intersect_list);
    });

    // событие перемещения мыши
    EventBus.on('SYS_INPUT_POINTER_MOVE', (e) => {
        if (dragged_item) {
            const pos = Camera.screen_to_world(e.x, e.y);
            dragged_item.set_color('#ff0');
            dragged_item.set_position(pos.x - world_offset.x, pos.y - world_offset.y);
        }
    });

    // событие отпускания мыши
    EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
        if (dragged_item) {
            dragged_item.set_color('#fff');
            dragged_item = null;
        }
    });

    const ramk = make_ramk(540, 960);
    RenderEngine.scene.add(ramk);
    const size = 32;
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            const spr = SceneManager.create(IObjectTypes.GO_SPRITE_COMPONENT, { width: size, height: size });
            spr.set_texture('f1');
            spr.set_position((i + 0.5) * size, -(j + 0.5) * size);
            SceneManager.add(spr);
            list_slots.push(spr);
        }
    }

    // книжка
    const spr = SceneManager.create(IObjectTypes.GO_SPRITE_COMPONENT, { width: 20, height: 20 });
    spr.set_texture('2');
    spr.set_position((2 + 0.5) * size, -(3 + 0.5) * size, 0.1);
    SceneManager.add(spr);

    // щит
    const spr2 = SceneManager.create(IObjectTypes.GO_SPRITE_COMPONENT, { width: 20, height: 20 });
    spr2.set_texture('7');
    spr2.set_position((4 + 0.5) * size, -(1 + 0.5) * size, 0.1);
    SceneManager.add(spr2);


    ControlManager.update_graph(true, 'inventory');
}
