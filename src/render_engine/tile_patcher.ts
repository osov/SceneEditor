import { TDictionary, TILES_INFO_EXT } from "@editor/modules_editor/modules_editor_const";
import { get_file_name, is_tile } from "./helpers/utils";
import { SpriteTileInfoDict } from "./tile_loader";
import { Blending, Texture } from "three";
import { GoSprite } from "./objects/sub_types";
import { Slice9Mesh } from "./objects/slice9";
import { MaterialUniformType } from "./resource_manager";
import { get_hash_by_mesh } from "@editor/inspectors/ui_utils";
import { convertThreeJSBlendingToBlendMode, convertBlendModeToThreeJS } from "@editor/inspectors/helpers";
import { BlendMode } from "@editor/inspectors/MeshInspector";

export type TilesInfo =
    TDictionary<{
        texture?: string,
        layers_mask?: number,
        material_name?: string,
        blending?: Blending,
        color?: string,
        uniforms?: TDictionary<any>,
        z?: number,
        linked_objects?: { id?: number, url?: string, name?: string }[]
    }>;

const WATER_SEA_MATERIAL = 'water_sea';
const WATER_SEA_TEXTURES = ['WavesOfShore', 'WavesOfShore_A', 'WavesOfShore_A_2', 'WaveDock'];
const WATER_SIMPLE_MATERIAL = 'water_simple';
const WATER_SIMPLE_TEXTURES = [
    'Lake_05', 'Lake_06', 'Lake_07', 'Lake_08',
    'Lake_12', 'Lake_13', 'Lake_14',
    'Lake_17', 'Lake_18', 'Lake_19',
    'Lake_20', 'Lake_21', 'Lake_22', 'Lake_23', 'Lake_24',
    'Lake_25', 'Lake_26', 'Lake_27', 'Lake_28', 'Lake_29', 'Lake_30',
    '1_01A', '2_01A', '3_01A', '4_01A', '5_01A',
    '6_01A', '7_01A', '8_01A', '9_01A'
];
const WATER_SIMPLE_UNIFORMS = {
    u_speed: 0.15,
    u_normal_scale: 0.8,
};

function is_water_sea_tile(texture_name: string) {
    return WATER_SEA_TEXTURES.includes(texture_name);
}

function is_water_simple_tile(texture_name: string) {
    return WATER_SIMPLE_TEXTURES.includes(texture_name);
}

function get_auto_material_name(texture_name: string) {
    if (is_water_sea_tile(texture_name))
        return WATER_SEA_MATERIAL;
    if (is_water_simple_tile(texture_name))
        return WATER_SIMPLE_MATERIAL;
}

function apply_auto_tile_material(sprite: GoSprite) {
    delete sprite.userData.auto_material_name;

    const texture_data = sprite.get_texture();
    const texture_name = texture_data[0];
    const atlas = texture_data[1];
    const material_name = get_auto_material_name(texture_name);
    if (!material_name)
        return;

    const material_info = ResourceManager.get_material_info(material_name);
    if (!material_info || !material_info.uniforms.u_texture)
        return;

    if (!ResourceManager.has_texture_name(texture_name, atlas)) {
        Log.warn(`Auto water material skipped: texture "${texture_name}" not found in atlas "${atlas}"`);
        return;
    }

    const water_texture = ResourceManager.get_texture(texture_name, atlas);
    sprite.set_material(material_name);
    if (sprite.material.name != material_name)
        return;

    ResourceManager.set_material_uniform_for_mesh(sprite as Slice9Mesh, 'u_texture', water_texture.texture);
    if (material_name == WATER_SIMPLE_MATERIAL) {
        Object.entries(WATER_SIMPLE_UNIFORMS).forEach(([uniform_name, uniform_value]) => {
            if (material_info.uniforms[uniform_name] == undefined)
                return;
            ResourceManager.set_material_uniform_for_mesh(sprite as Slice9Mesh, uniform_name, uniform_value);
        });
    }
    sprite.userData.auto_material_name = material_name;
}


export function TilePatcher(tilemap_path: string) {
    const tilemap_name = get_file_name(tilemap_path);
    ResourceManager.set_tilemap_path(tilemap_name, tilemap_path);

    EventBus.on('SYS_VIEW_INPUT_KEY_DOWN', (e) => {
        if (Input.is_control() && (e.key == 'l' || e.key == 'д')) {
            save_tilesinfo(true);
        }
    });

    async function save_tilesinfo(optimized = false) {
        const dir = tilemap_path.replace(/^\//, '').replace(new RegExp(`/${tilemap_name}.*$`), '');
        const path = `${dir}/${tilemap_name}.${TILES_INFO_EXT}`

        const filename = get_file_name(path);
        const tiles_data: TilesInfo = {};
        SceneManager.get_scene_list().forEach(mesh => {
            if (!is_tile(mesh)) return;

            const hash = get_hash_by_mesh(mesh);

            const current_texture = `${mesh.get_texture()[1]}/${mesh.get_texture()[0]}`;
            if (ResourceManager.get_tile_info(filename, hash) != current_texture) {
                tiles_data[hash] = {
                    texture: current_texture
                };
            }

            // 0, 31, 32
            if (mesh.layers.mask != -2147483647) {
                if (!tiles_data[hash]) tiles_data[hash] = {};
                tiles_data[hash].layers_mask = mesh.layers.mask;
            }

            const material = (mesh as Slice9Mesh).material;
            if (!material) {
                Log.warn(`Material not found for tile ${mesh.name}`);
                return;
            }

            const default_material_name = 'slice9';
            const auto_material_name = (mesh as Slice9Mesh).userData.auto_material_name;
            if (material.name != default_material_name && material.name != auto_material_name) {
                if (!tiles_data[hash]) tiles_data[hash] = {};
                tiles_data[hash].material_name = material.name;
            }

            const default_blend_mode = BlendMode.NORMAL;
            const current_blend_mode = convertThreeJSBlendingToBlendMode(material.blending);
            const is_not_equal_blend_mode = current_blend_mode != default_blend_mode;
            if (is_not_equal_blend_mode) {
                if (!tiles_data[hash]) tiles_data[hash] = {};
                tiles_data[hash].blending = convertBlendModeToThreeJS(current_blend_mode);
            }

            const default_color = '#fff';
            const current_color = mesh.get_color();
            const is_not_equal_color = current_color != default_color;
            if (is_not_equal_color) {
                if (!tiles_data[hash]) tiles_data[hash] = {};
                tiles_data[hash].color = current_color;
            }

            const material_info = ResourceManager.get_material_info(material.name);

            let uniforms: { [key: string]: any } = {};
            if (optimized && material.name != auto_material_name) uniforms = ResourceManager.get_changed_uniforms_for_mesh(mesh as Slice9Mesh) || {};
            else if (material.name != default_material_name && material.name != auto_material_name) {
                Object.entries(material.uniforms).forEach(([key, value]) => {
                    uniforms[key] = value.value;
                });
            }

            // NOTE: alpha всегда сохраняем в uniforms (в том числе для дефолтного материала)
            if (uniforms['alpha'] === undefined) {
                const alpha_val = (mesh as Slice9Mesh).get_alpha();
                if (alpha_val !== 1) uniforms['alpha'] = alpha_val;
            }

            if (material_info && uniforms) {
                Object.keys(uniforms).forEach((key) => {
                    if (!material_info.uniforms[key].readonly) return;
                    delete uniforms[key];
                });
                Object.keys(uniforms).forEach((key) => {
                    if (key != 'u_texture') return;
                    delete uniforms[key];
                });
                if (Object.keys(uniforms).length > 0) {
                    if (!tiles_data[hash]) tiles_data[hash] = {};
                    Object.entries(uniforms).forEach(([key, value]) => {
                        if (value instanceof Texture) {
                            const texture_name = get_file_name((value as any).path);
                            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);
                            uniforms[key] = `${atlas}/${texture_name}`;
                        }
                    });
                    tiles_data[hash].uniforms = uniforms;
                }
            }

            if ((mesh as any).tile_z != undefined) {
                const src_z = (mesh as any).tile_z as number;
                if (math.abs(src_z - mesh.position.z) > 0.0001) {
                    if (!tiles_data[hash]) tiles_data[hash] = {};
                    tiles_data[hash].z = mesh.position.z;
                }
            }
        });

        const r = await ClientAPI.save_data(path, JSON.stringify(tiles_data));
        if (r && r.result) {
            await AssetControl.go_to_dir(dir, true);
            return Popups.toast.success(`Тайлы сохранены, путь: ${path}`);
        }
        else return Popups.toast.error(`Не удалось сохранить тайлы, путь: ${path}: ${r.message}`);
    }

    async function patch(tiles: SpriteTileInfoDict) {
        Object.entries(tiles).forEach(([id, tile]) => {
            ResourceManager.set_tile_info(tilemap_name, id, `${tile.tile_info.atlas}/${tile.tile_info.name}`);
        });

        const dir = tilemap_path.replace(new RegExp(`${tilemap_name}.*$`), '');
        const tilesinfo_path = `${dir}${tilemap_name}.tilesinfo`;
        let tilesinfo: TilesInfo = {};

        try {
            tilesinfo = await ResourceManager.load_asset(tilesinfo_path) as TilesInfo;
        } catch (e) {
            Log.log(`No tilesinfo file found for tilemap ${tilemap_name}`);
        }

        if (!tilesinfo) {
            Log.log(`No tilesinfo file found for tilemap ${tilemap_name}`);
            tilesinfo = {};
        }

        Object.entries(tiles).forEach(([id, tile]) => {
            const info = tilesinfo[id] ?? {};

            const sprite = tile._hash as GoSprite;

            if (info.layers_mask != undefined) {
                sprite.layers.mask = info.layers_mask;
            }

            if (info.material_name) {
                const texture_data = sprite.get_texture();
                sprite.set_material(info.material_name);
                sprite.set_texture(texture_data[0], texture_data[1]);
                delete sprite.userData.auto_material_name;
            }

            if (info.blending != undefined) {
                sprite.material.blending = info.blending;
            }

            if (info.color) {
                sprite.set_color(info.color);
            }

            if (info.texture) {
                const texture_info = info.texture.split('/');
                sprite.set_texture(texture_info[1], texture_info[0]);
            }

            if (!info.material_name) {
                apply_auto_tile_material(sprite);
            }

            if (info.uniforms) {
                const material_info = ResourceManager.get_material_info(sprite.material.name);
                if (material_info) {
                    Object.entries(info.uniforms).forEach(([uniform_name, uniform_value]) => {
                        if (material_info.uniforms[uniform_name] == undefined) {
                            Log.warn(`Uniform "${uniform_name}" not found for material "${sprite.material.name}" on tile ${sprite.name}`);
                            return;
                        }
                        // NOTE: для текстур отдельно вызываем set_texture
                        if (material_info.uniforms[uniform_name].type == MaterialUniformType.SAMPLER2D) {
                            const texture_info = uniform_value.split('/');
                            sprite.set_texture(texture_info[1], texture_info[0], uniform_name);
                            return;
                        }
                        ResourceManager.set_material_uniform_for_mesh(sprite as Slice9Mesh, uniform_name, uniform_value);
                    });
                }
            }

            if (info.z != undefined) {
                sprite.position.z = info.z;
                //sprite.set_color('#f00');
                log('other Z', sprite.name);
            }

            if (Array.isArray(info.linked_objects) && info.linked_objects.length > 0) {
                sprite.userData.linked_objects = info.linked_objects.map(item => ({
                    id: item.id,
                    url: item.url ?? '',
                    name: item.name ?? '',
                }));
            } else {
                delete sprite.userData.linked_objects;
            }
        });

        SceneManager.apply_scene_links_to_scene();
    }

    return { patch, save_tilesinfo };
}
