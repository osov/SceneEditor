import { ActiveEventData, AlphaEventData, AnchorEventData, ColorEventData, FontEventData, FontSizeEventData, MeshMoveEventData, NameEventData, PivotEventData, PositionEventData, RotationEventData, ScaleEventData, SizeEventData, SliceEventData, TextAlignEventData, TextEventData, TextureEventData, VisibleEventData, LineHeightEventData, BlendModeEventData, MinFilterEventData, MagFilterEventData, UVEventData, MaterialEventData, MeshAtlasEventData, TextureAtlasEventData, MaterialVertexProgramEventData, MaterialFragmentProgramEventData, MaterialSampler2DEventData, MaterialFloatEventData, MaterialRangeEventData, MaterialVec2EventData, MaterialVec3EventData, MaterialVec4EventData, MaterialColorEventData } from "./types";
import { Slice9Mesh } from "../render_engine/objects/slice9";
import { GoSprite } from "../render_engine/objects/sub_types";
import { get_keys } from "../modules/utils";
import { IBaseMeshAndThree, IObjectTypes } from "../render_engine/types";
import { TextMesh } from "../render_engine/objects/text";
import { get_basename, get_file_name } from "../render_engine/helpers/utils";
import { MagnificationTextureFilter, MinificationTextureFilter, Color, Vector3 } from "three";

declare global {
    const HistoryControl: ReturnType<typeof HistoryControlCreate>;
}

export function register_history_control() {
    (window as any).HistoryControl = HistoryControlCreate();
}

export type HistoryData = {
    MESH_TRANSLATE: PositionEventData
    MESH_ROTATE: RotationEventData
    MESH_SCALE: ScaleEventData
    MESH_SIZE: SizeEventData
    MESH_SLICE: SliceEventData
    MESH_DELETE: { id_mesh: number }
    MESH_ADD: { mesh: any, next_id: number }
    MESH_PIVOT: PivotEventData
    MESH_ANCHOR: AnchorEventData
    MESH_MOVE: MeshMoveEventData
    MESH_NAME: NameEventData
    MESH_ACTIVE: ActiveEventData
    MESH_VISIBLE: VisibleEventData
    MESH_COLOR: ColorEventData
    MESH_ALPHA: AlphaEventData
    MESH_TEXTURE: TextureEventData
    MESH_TEXT: TextEventData
    MESH_FONT: FontEventData
    MESH_FONT_SIZE: FontSizeEventData
    MESH_TEXT_ALIGN: TextAlignEventData
    MESH_ATLAS: MeshAtlasEventData
    MESH_LINE_HEIGHT: LineHeightEventData
    MESH_BLEND_MODE: BlendModeEventData
    MESH_UV: UVEventData
    MESH_MATERIAL: MaterialEventData
    TEXTURE_MIN_FILTER: MinFilterEventData
    TEXTURE_MAG_FILTER: MagFilterEventData
    TEXTURE_ATLAS: TextureAtlasEventData
    MATERIAL_VERTEX_PROGRAM: MaterialVertexProgramEventData
    MATERIAL_FRAGMENT_PROGRAM: MaterialFragmentProgramEventData
    MATERIAL_SAMPLER2D: MaterialSampler2DEventData
    MATERIAL_FLOAT: MaterialFloatEventData
    MATERIAL_RANGE: MaterialRangeEventData
    MATERIAL_VEC2: MaterialVec2EventData
    MATERIAL_VEC3: MaterialVec3EventData
    MATERIAL_VEC4: MaterialVec4EventData
    MATERIAL_COLOR: MaterialColorEventData
}

type HistoryDataKeys = keyof HistoryData;

interface HistoryDataItem<T extends HistoryDataKeys> {
    type: T
    data: HistoryData[T][]
}

function HistoryControlCreate() {
    const context_data: { [k: string]: HistoryDataItem<HistoryDataKeys>[] } = {};
    function init() {
        EventBus.on('SYS_INPUT_UNDO', () => undo());
    }

    function clear(ctx_name?: string) {
        const current_scene_path = AssetControl.get_current_scene().path;
        const _ctx_name: string | undefined = (ctx_name) ? ctx_name : (current_scene_path) ? current_scene_path : undefined;
        if (_ctx_name && context_data[_ctx_name]) {
            context_data[_ctx_name].splice(0);
            console.log('HISTORY CLEARED: ', _ctx_name);
        }
    }

    function clear_all() {
        for (const key of get_keys(context_data)) {
            context_data[key].splice(0);
        }
    }

    function get_history(ctx_name?: string) {
        const current_scene_path = AssetControl.get_current_scene().path;
        const _ctx_name: string | undefined = (ctx_name) ? ctx_name : (current_scene_path) ? current_scene_path : undefined;
        if (_ctx_name && context_data[_ctx_name]) {
            return context_data[_ctx_name];
        }
        return [];
    }

    function add<T extends HistoryDataKeys>(type: T, data_list: HistoryData[T][],) {
        const current_scene_path = AssetControl.get_current_scene().path;
        const ctx_name = (current_scene_path) ? current_scene_path : 'test';
        let ctx = context_data[ctx_name];
        if (ctx == undefined)
            context_data[ctx_name] = [];
        context_data[ctx_name].push({ type, data: data_list });
        Log.log('WRITE: ', type, data_list);
    }

    function undo() {
        const current_scene_path = AssetControl.get_current_scene().path;
        const ctx_name = (current_scene_path) ? current_scene_path : 'test';
        let ctx = context_data[ctx_name];
        if (!ctx || ctx.length == 0)
            return;
        const last = ctx.pop()!;
        const type = last.type;
        const list_mesh: IBaseMeshAndThree[] = [];
        const list_textures: string[] = [];
        const list_materials: string[] = [];

        Log.log("UNDO: ", type, last);

        if (type == 'MESH_TRANSLATE') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_TRANSLATE'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                mesh.position.copy(data.position);
                list_mesh.push(mesh);
            }
        }
        else if (type == 'MESH_ROTATE') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_ROTATE'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                mesh.rotation.copy(data.rotation);
                list_mesh.push(mesh);
            }
        }
        else if (type == 'MESH_SCALE') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_SCALE'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                mesh.scale.copy(data.scale);
                list_mesh.push(mesh);
            }
        }
        else if (type == 'MESH_SIZE') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_SIZE'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                mesh.set_size(data.size.x, data.size.y);
                mesh.position.set(data.position.x, data.position.y, data.position.z);
                list_mesh.push(mesh);
            }
        }
        else if (type == 'MESH_SLICE') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_SLICE'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                if (mesh instanceof Slice9Mesh)
                    mesh.set_slice(data.slice.x, data.slice.y);
                list_mesh.push(mesh);
            }
        }
        else if (type == 'MESH_DELETE') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_DELETE'];
                SceneManager.remove(data.id_mesh)!;
            }
            // ---
            ControlManager.update_graph();
        }
        else if (type == 'MESH_ADD') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_ADD'];
                const mdata = data.mesh;
                const parent = mdata.pid == -1 ? RenderEngine.scene : SceneManager.get_mesh_by_id(mdata.pid);
                if (!parent) {
                    Log.error('parent is null', data);
                    return;
                }
                const m = SceneManager.deserialize_mesh(mdata, true, parent) as IBaseMeshAndThree;
                parent.add(m);
                SceneManager.move_mesh(m, mdata.pid, data.next_id);
                list_mesh.push(m);
            }
        }
        else if (type == 'MESH_PIVOT') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_PIVOT'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                mesh.set_pivot(data.pivot.x, data.pivot.y, true);
                list_mesh.push(mesh);
            }
        }
        else if (type == 'MESH_ANCHOR') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_ANCHOR'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                mesh.set_anchor(data.anchor.x, data.anchor.y);
                list_mesh.push(mesh);
            }
        }
        else if (type == 'MESH_MOVE') {
            for (let i = last.data.length - 1; i >= 0; i--) {
                const data = last.data[i] as HistoryData['MESH_MOVE'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                SceneManager.move_mesh(mesh, data.pid, data.next_id);
                list_mesh.push(mesh);
            }
        }
        else if (type == 'MESH_NAME') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_NAME'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                mesh.name = data.name;
                list_mesh.push(mesh);
            }
        } else if (type == 'MESH_VISIBLE') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_VISIBLE'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                mesh.set_visible(data.state);
                list_mesh.push(mesh);
            }
        } else if (type == 'MESH_ACTIVE') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_ACTIVE'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                mesh.set_active(data.state);
                list_mesh.push(mesh);
            }
        } else if (type == 'MESH_COLOR') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_COLOR'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                mesh.set_color(data.color);
                list_mesh.push(mesh);
            }
        } else if (type == 'MESH_ALPHA') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_ALPHA'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                if (mesh.type === IObjectTypes.TEXT || mesh.type === IObjectTypes.GUI_TEXT || mesh.type === IObjectTypes.GO_LABEL_COMPONENT) {
                    (mesh as TextMesh).fillOpacity = data.alpha;
                } else if (mesh.type === IObjectTypes.SLICE9_PLANE || mesh.type === IObjectTypes.GUI_BOX || mesh.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                    (mesh as Slice9Mesh).set_alpha(data.alpha);
                }
                list_mesh.push(mesh);
            }
        } else if (type == 'MESH_TEXTURE') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_TEXTURE'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                const atlas = mesh.get_texture()[1];
                const texture = data.texture;
                (mesh as Slice9Mesh).set_texture(texture, atlas);
                list_mesh.push(mesh);
            }
        } else if (type == 'MESH_TEXT') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_TEXT'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                (mesh as TextMesh).set_text(data.text);
                list_mesh.push(mesh);
            }
        } else if (type == 'MESH_FONT') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_FONT'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                (mesh as TextMesh).set_font(data.font);
                list_mesh.push(mesh);
            }
        } else if (type == 'MESH_FONT_SIZE') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_FONT_SIZE'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                mesh.scale.copy(data.scale);
                list_mesh.push(mesh);
            }
        } else if (type == 'MESH_TEXT_ALIGN') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_TEXT_ALIGN'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                (mesh as TextMesh).textAlign = data.text_align;
                list_mesh.push(mesh);
            }
        } else if (type == 'MESH_ATLAS') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_ATLAS'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                mesh.set_texture(data.texture, data.atlas);
                list_mesh.push(mesh);
            }
            ResourceManager.write_metadata();
        } else if (type == 'MESH_LINE_HEIGHT') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_LINE_HEIGHT'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                (mesh as TextMesh).lineHeight = data.line_height;
                list_mesh.push(mesh);
            }
        } else if (type == 'MESH_BLEND_MODE') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_BLEND_MODE'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                (mesh as any).material.blending = data.blend_mode;
                list_mesh.push(mesh);
            }
        } else if (type == 'TEXTURE_MIN_FILTER') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['TEXTURE_MIN_FILTER'];
                const texture_name = get_file_name(get_basename(data.texture_path));
                const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);
                if (atlas == null) {
                    Log.error('Not found atlas by texture: ', texture_name);
                    return;
                }

                const texture_data = ResourceManager.get_texture(texture_name, atlas);
                texture_data.texture.minFilter = data.filter as MinificationTextureFilter;
                list_textures.push(data.texture_path);
            }
            ResourceManager.write_metadata();
        } else if (type == 'TEXTURE_MAG_FILTER') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['TEXTURE_MAG_FILTER'];
                const texture_name = get_file_name(get_basename(data.texture_path));
                const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);
                if (atlas == null) {
                    Log.error('Not found atlas by texture: ', texture_name);
                    return;
                }

                const texture_data = ResourceManager.get_texture(texture_name, atlas);
                texture_data.texture.magFilter = data.filter as MagnificationTextureFilter;
                list_textures.push(data.texture_path);
            }
            ResourceManager.write_metadata();
        } else if (type == 'MESH_UV') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_UV'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                if (mesh instanceof GoSprite) {
                    mesh.geometry.attributes.uv.array.set(data.uv);
                    mesh.geometry.attributes.uv.needsUpdate = true;
                }
                list_mesh.push(mesh);
            }
        } else if (type == 'MESH_MATERIAL') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_MATERIAL'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                const material = ResourceManager.get_material(data.material);
                if (material == undefined) {
                    Log.error('Not found material: ', data.material);
                    continue;
                }
                (mesh as Slice9Mesh).set_material(material.data);
                list_mesh.push(mesh);
            }
        } else if (type == 'TEXTURE_ATLAS') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['TEXTURE_ATLAS'];
                const texture_name = get_file_name(get_basename(data.texture_path));
                const old_atlas = ResourceManager.get_atlas_by_texture_name(texture_name);
                ResourceManager.override_atlas_texture(old_atlas || '', data.atlas, texture_name);
                list_textures.push(data.texture_path);
            }
        } else if (type == 'MATERIAL_VERTEX_PROGRAM') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MATERIAL_VERTEX_PROGRAM'];
                const material = ResourceManager.get_material(get_file_name(get_basename(data.material_path)));
                if (material == undefined) {
                    Log.error('Not found material: ', data.material_path);
                    continue;
                }
                material.data.vertexShader = data.program;
                material.data.needsUpdate = true;
                list_materials.push(data.material_path);
            }
        } else if (type == 'MATERIAL_FRAGMENT_PROGRAM') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MATERIAL_FRAGMENT_PROGRAM'];
                const material = ResourceManager.get_material(get_file_name(get_basename(data.material_path)));
                if (material == undefined) {
                    Log.error('Not found material: ', data.material_path);
                    continue;
                }
                material.data.fragmentShader = data.program;
                material.data.needsUpdate = true;
                list_materials.push(data.material_path);
            }
        } else if (type == 'MATERIAL_SAMPLER2D') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MATERIAL_SAMPLER2D'];
                const material = ResourceManager.get_material(get_file_name(get_basename(data.material_path)));
                if (material == undefined) {
                    Log.error('Not found material: ', data.material_path);
                    continue;
                }
                material.data.uniforms[data.uniform_name].value = ResourceManager.get_texture(data.value, '').texture;
                material.data.needsUpdate = true;
                list_materials.push(data.material_path);
            }
        } else if (type == 'MATERIAL_FLOAT') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MATERIAL_FLOAT'];
                const material = ResourceManager.get_material(get_file_name(get_basename(data.material_path)));
                if (material == undefined) {
                    Log.error('Not found material: ', data.material_path);
                    continue;
                }
                material.data.uniforms[data.uniform_name].value = data.value;
                material.data.needsUpdate = true;
                list_materials.push(data.material_path);
            }
        } else if (type == 'MATERIAL_RANGE') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MATERIAL_RANGE'];
                const material = ResourceManager.get_material(get_file_name(get_basename(data.material_path)));
                if (material == undefined) {
                    Log.error('Not found material: ', data.material_path);
                    continue;
                }
                material.data.uniforms[data.uniform_name].value = data.value;
                material.data.needsUpdate = true;
                list_materials.push(data.material_path);
            }
        } else if (type == 'MATERIAL_VEC2') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MATERIAL_VEC2'];
                const material = ResourceManager.get_material(get_file_name(get_basename(data.material_path)));
                if (material == undefined) {
                    Log.error('Not found material: ', data.material_path);
                    continue;
                }
                material.data.uniforms[data.uniform_name].value = data.value;
                material.data.needsUpdate = true;
                list_materials.push(data.material_path);
            }
        } else if (type == 'MATERIAL_VEC3') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MATERIAL_VEC3'];
                const material = ResourceManager.get_material(get_file_name(get_basename(data.material_path)));
                if (material == undefined) {
                    Log.error('Not found material: ', data.material_path);
                    continue;
                }
                material.data.uniforms[data.uniform_name].value = data.value;
                material.data.needsUpdate = true;
                list_materials.push(data.material_path);
            }
        } else if (type == 'MATERIAL_VEC4') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MATERIAL_VEC4'];
                const material = ResourceManager.get_material(get_file_name(get_basename(data.material_path)));
                if (material == undefined) {
                    Log.error('Not found material: ', data.material_path);
                    continue;
                }
                material.data.uniforms[data.uniform_name].value = data.value;
                material.data.needsUpdate = true;
                list_materials.push(data.material_path);
            }
        } else if (type == 'MATERIAL_COLOR') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MATERIAL_COLOR'];
                const material = ResourceManager.get_material(get_file_name(get_basename(data.material_path)));
                if (material == undefined) {
                    Log.error('Not found material: ', data.material_path);
                    continue;
                }
                const color = new Color(data.value);
                material.data.uniforms[data.uniform_name].value = new Vector3(color.r, color.g, color.b);
                material.data.needsUpdate = true;
                list_materials.push(data.material_path);
            }
        }
        if (list_mesh.length > 0) {
            for (let i = 0; i < list_mesh.length; i++)
                list_mesh[i].transform_changed();
            SelectControl.set_selected_list(list_mesh);
            ControlManager.update_graph();
        }
        if (list_textures.length > 0) {
            AssetInspector.set_selected_textures(list_textures);
        }
        if (list_materials.length > 0) {
            AssetInspector.set_selected_materials(list_materials);
        }
    }

    init();
    return { add, undo, clear, clear_all, get_history };
}