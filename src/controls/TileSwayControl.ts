import { Vector2 } from "three";
import { Slice9Mesh } from "../render_engine/objects/slice9";
import { filter_intersect_list } from "../render_engine/helpers/utils";
import { createTileSwayManager } from "../utils/tile_sway_manager";
import { get_hash_by_mesh, get_selected_one_slice9 } from "../inspectors/ui_utils";

declare global {
    const TileSwayControl: ReturnType<typeof TileSwayControlCreate>;
}

// Единый исключающий слой: тайлы с этим слоем не получают покачивание ни от одного конфига
export const EXCLUDE_SWAY_LAYER = 'no_slay';

export interface NameSwayConfig {
    names: string[];       // список имён тайлов для автоприменения шейдера
    material: string;      // название материала шейдера покачивания
    frequency?: number;
    speed?: number;
    max_amplitude?: number;
    effect_time?: number;
}

export function register_tile_sway_control() {
    const ctrl = TileSwayControlCreate();
    (window as any).TileSwayControl = ctrl;
}

function is_sway_excluded(mesh: any): boolean {
    const layer_names = ResourceManager.get_layers_names_by_mask(mesh.layers.mask);
    return layer_names.includes(EXCLUDE_SWAY_LAYER);
}

function TileSwayControlCreate() {
    let sway_managers: { cfg: NameSwayConfig, manager: ReturnType<typeof createTileSwayManager> }[] = [];

    const mesh_list: { [k: string]: boolean } = {};
    let selected_mesh: Slice9Mesh | undefined;

    function init(configs: NameSwayConfig[]) {
        sway_managers = configs.map(cfg => ({
            cfg,
            manager: createTileSwayManager(cfg),
        }));

        EventBus.on('SYS_VIEW_INPUT_KEY_DOWN', (e) => {
            if (Input.is_shift()) {
                if (e.key == 'R' || e.key == 'К') {
                    const mesh = get_selected_one_slice9();
                    if (mesh)
                        activate(mesh);
                }
                else if (e.key == 'G' || e.key == 'П') {
                    if (selected_mesh)
                        deactivate(selected_mesh);
                }
            }
        });

        EventBus.on('SYS_SELECTED_MESH_LIST', (e) => {
            if (Input.is_shift())
                return;
            selected_mesh = get_selected_one_slice9();
        });

        let is_pointer_down = false;
        EventBus.on('SYS_INPUT_POINTER_DOWN', (e) => {
            if (e.button == 0) {
                if (!selected_mesh)
                    return;
                is_pointer_down = true;
            }
        });

        EventBus.on('SYS_INPUT_POINTER_UP', (e) => {
            if (e.button == 0)
                is_pointer_down = false;
        });

        EventBus.on('SYS_INPUT_POINTER_MOVE', (e) => {
            if (Input.is_shift()) {
                const tmp = filter_intersect_list(RenderEngine.raycast_scene(new Vector2(e.x, e.y)));
                for (const { cfg, manager } of sway_managers) {
                    const matched = tmp.filter((m) =>
                        cfg.names.includes(m.get_texture()[0]) &&
                        !is_sway_excluded(m)
                    );
                    for (const mesh of matched)
                        manager.activate(mesh as any);
                }
            }

            if (Input.is_shift() && is_pointer_down) {
                if (!selected_mesh)
                    return;
                const key = get_hash_by_mesh(selected_mesh);
                if (!mesh_list[key])
                    return;
            }
        });

        EventBus.on('SYS_ON_UPDATE', (e) => {
            for (const { manager } of sway_managers)
                manager.update(e.dt);
        });
    }

    async function activate(mesh: Slice9Mesh) {
        const key = get_hash_by_mesh(mesh);
        selected_mesh = mesh;
        if (mesh_list[key])
            return;
        const tex_atlas = mesh.get_texture();
        mesh.set_material('move_vert');
        mesh.set_texture(tex_atlas[0], tex_atlas[1]);
        mesh_list[key] = true;
    }

    async function deactivate(mesh: Slice9Mesh) {
        const key = get_hash_by_mesh(mesh);
        if (!mesh_list[key])
            return;
        const tex_atlas = mesh.get_texture();
        mesh.set_material('slice9');
        mesh.set_texture(tex_atlas[0], tex_atlas[1]);
        selected_mesh = undefined;
        delete mesh_list[key];
    }

    return { init };
}
