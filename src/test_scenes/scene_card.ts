import { Intersection, Object3D, Object3DEventMap, Vector2 } from "three";
import { SERVER_URL, PROJECT_NAME } from "../config";
import { run_debug_filemanager } from "../controls/AssetControl";
import { URL_PATHS } from "../modules_editor/modules_editor_const";
import { filter_list_base_mesh, make_ramk } from "../render_engine/helpers/utils";
import { IBaseMeshAndThree, IObjectTypes } from "../render_engine/types";

const card_width_orig = 195;
const card_height_orig = 289;
const dcMast = ['p', 'c', 'k', 'b'];
const dcNums = ['t', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'v', 'd', 'k'];

function get_intersect_list(tmp: Intersection<Object3D<Object3DEventMap>>[]) {
    let tmp_list = [];
    for (let i = 0; i < tmp.length; i++)
        tmp_list.push(tmp[i].object);
    return filter_list_base_mesh(tmp_list);
}

export async function run_scene_card() {
    ResourceManager.set_project_path(`${SERVER_URL}${URL_PATHS.ASSETS}`);
    await run_debug_filemanager(PROJECT_NAME);

    const click_point = new Vector2();
    let intersect_list: IBaseMeshAndThree[] = [];
    EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
        if (e.target != RenderEngine.renderer.domElement)
            return;
        if (e.button != 0)
            return;
        click_point.set(e.x, e.y);
        intersect_list = get_intersect_list(RenderEngine.raycast_scene(click_point));
        if (intersect_list.length > 0) {
            intersect_list[0].set_color('#f00');

        }
        log(intersect_list);
    });

    EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
        if (e.target != RenderEngine.renderer.domElement)
            return;
        if (e.button != 0)
            return;
        if (intersect_list.length > 0)
            intersect_list[0].set_color('#fff');
    });

    const ramk = make_ramk(540, 960);
    RenderEngine.scene.add(ramk);

    const scale = 0.25;
    const width = card_width_orig * scale;
    const height = card_height_orig * scale;

    for (let i = 0; i < dcMast.length; i++) {
        for (let j = 0; j < dcNums.length; j++) {
            const spr = SceneManager.create(IObjectTypes.GO_SPRITE_COMPONENT, { width, height });
            spr.set_texture(dcMast[i] + dcNums[j], '');
            spr.set_position(width / 2 + (width + 10) * i, -height / 2 - (height + 10) * j);
            SceneManager.add(spr);
        }
    }


    ControlManager.update_graph(true, 'cards');

}
