import { Euler, MagnificationTextureFilter, MinificationTextureFilter, Quaternion, Vector2, Vector3, Vector4, Wrapping } from "three";
import { get_keys } from "../modules/utils";
import { MeshMoveEventData, MeshMaterialUniformInfo, MeshPropertyInfo, AssetTextureInfo, AssetMaterialInfo, AssetAudioInfo, MeshMaterialPropertyInfo } from "./types";
import { BlendMode } from "../inspectors/MeshInspector";
import { TDictionary } from "@editor/modules_editor/modules_editor_const";


declare global {
    const HistoryControl: ReturnType<typeof HistoryControlCreate>;
}

export function register_history_control() {
    (window as any).HistoryControl = HistoryControlCreate();
}

export type HistoryData = {
    MESH_TRANSLATE: MeshPropertyInfo<Vector3>
    MESH_ROTATE: MeshPropertyInfo<Quaternion>
    MESH_SCALE: MeshPropertyInfo<Vector3>
    MESH_MODEL_SCALE: MeshPropertyInfo<number>
    MESH_SIZE: MeshPropertyInfo<{ size: Vector2, pos: Vector3 }>
    MESH_SLICE: MeshPropertyInfo<Vector2>
    MESH_DELETE: { id_mesh: number }
    MESH_ADD: { mesh: any, next_id: number }
    MESH_PIVOT: MeshPropertyInfo<Vector2>
    MESH_ANCHOR: MeshPropertyInfo<Vector2>
    MESH_MOVE: MeshMoveEventData
    MESH_NAME: MeshPropertyInfo<string>
    MESH_ACTIVE: MeshPropertyInfo<boolean>
    MESH_VISIBLE: MeshPropertyInfo<boolean>
    MESH_COLOR: MeshPropertyInfo<string>
    MESH_CLIPPING: MeshPropertyInfo<boolean>
    MESH_INVERTED_CLIPPING: MeshPropertyInfo<boolean>
    MESH_CLIPPING_VISIBLE: MeshPropertyInfo<boolean>
    MESH_UI_ALPHA: MeshMaterialUniformInfo<number>
    MESH_TEXT_ALPHA: MeshPropertyInfo<number>
    MESH_INHERITED_ALPHA: MeshPropertyInfo<boolean>
    MESH_TEXT: MeshPropertyInfo<string>
    MESH_FONT: MeshPropertyInfo<string>
    MESH_FONT_SIZE: MeshPropertyInfo<Vector3>
    MESH_TEXT_ALIGN: MeshPropertyInfo<'left' | 'right' | 'center' | 'justify'>
    MESH_LINE_HEIGHT: MeshPropertyInfo<number | 'normal'>
    MESH_MODEL: MeshPropertyInfo<{ mesh_name: string, scale: number }>
    MESH_ANIMATED_MODEL: MeshPropertyInfo<{ mesh_name: string, scale: number, animations: string[], current_animation: string }>
    MESH_ANIMATION_LIST: MeshPropertyInfo<string[]>
    MESH_ACTIVE_MODEL_ANIMATION: MeshPropertyInfo<string>
    MESH_BLEND_MODE: MeshMaterialPropertyInfo<BlendMode>
    MESH_UV: MeshPropertyInfo<Float32Array>
    MESH_MATERIAL: MeshPropertyInfo<{ name: string, uniforms?: TDictionary<any> }>
    MESH_MATERIAL_SAMPLER2D: MeshMaterialUniformInfo<string>
    MESH_MATERIAL_FLOAT: MeshMaterialUniformInfo<number>
    MESH_MATERIAL_RANGE: MeshMaterialUniformInfo<number>
    MESH_MATERIAL_VEC2: MeshMaterialUniformInfo<Vector2>
    MESH_MATERIAL_VEC3: MeshMaterialUniformInfo<Vector3>
    MESH_MATERIAL_VEC4: MeshMaterialUniformInfo<Vector4>
    MESH_MATERIAL_COLOR: MeshMaterialUniformInfo<string>
    MESH_MATERIAL_TRANSPARENT: MeshMaterialUniformInfo<boolean>
    MATERIAL_VERTEX_PROGRAM: AssetMaterialInfo<string>
    MATERIAL_FRAGMENT_PROGRAM: AssetMaterialInfo<string>
    MATERIAL_SAMPLER2D: AssetMaterialInfo<string>
    MATERIAL_FLOAT: AssetMaterialInfo<number>
    MATERIAL_RANGE: AssetMaterialInfo<number>
    MATERIAL_VEC2: AssetMaterialInfo<Vector2>
    MATERIAL_VEC3: AssetMaterialInfo<Vector3>
    MATERIAL_VEC4: AssetMaterialInfo<Vector4>
    MATERIAL_COLOR: AssetMaterialInfo<string>
    MATERIAL_TRANSPARENT: AssetMaterialInfo<boolean>
    TEXTURE_MIN_FILTER: AssetTextureInfo<MinificationTextureFilter>
    TEXTURE_MAG_FILTER: AssetTextureInfo<MagnificationTextureFilter>
    TEXTURE_WRAP_S: AssetTextureInfo<Wrapping>
    TEXTURE_WRAP_T: AssetTextureInfo<Wrapping>
    TEXTURE_ATLAS: AssetTextureInfo<string>
    SPLINE_STATE: MeshPropertyInfo<Vector3>[]
    MESH_SOUND: MeshPropertyInfo<string>
    MESH_SOUND_LOOP: MeshPropertyInfo<boolean>
    MESH_SOUND_VOLUME: MeshPropertyInfo<number>
    MESH_SOUND_SPEED: MeshPropertyInfo<number>
    MESH_SOUND_RADIUS: MeshPropertyInfo<number>
    MESH_MAX_VOLUME_RADIUS: MeshPropertyInfo<number>
    MESH_PAN_NORMALIZATION_DISTANCE: MeshPropertyInfo<number>
    MESH_SOUND_FUNCTION: MeshPropertyInfo<string>
    MESH_SOUND_FUNCTION_TYPE: MeshPropertyInfo<string>
    MESH_SOUND_RECTANGLE_WIDTH: MeshPropertyInfo<number>
    MESH_SOUND_RECTANGLE_HEIGHT: MeshPropertyInfo<number>
    MESH_SOUND_RECTANGLE_MAX_VOLUME_WIDTH: MeshPropertyInfo<number>
    MESH_SOUND_RECTANGLE_MAX_VOLUME_HEIGHT: MeshPropertyInfo<number>
    MESH_SOUND_ZONE_TYPE: MeshPropertyInfo<string>
    AUDIO_LOOP: AssetAudioInfo<boolean>
    AUDIO_VOLUME: AssetAudioInfo<number>
    AUDIO_SPEED: AssetAudioInfo<number>
    AUDIO_PAN: AssetAudioInfo<number>
    MESH_LAYERS: MeshPropertyInfo<number>
}

export type HistoryDataKeys = keyof HistoryData;

interface HistoryDataItem<T extends HistoryDataKeys> {
    type: T
    data: HistoryData[T][]
    owner: number
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

    function add<T extends HistoryDataKeys>(type: T, data_list: HistoryData[T][], owner: number) {
        const current_scene_path = AssetControl.get_current_scene().path;
        const ctx_name = (current_scene_path) ? current_scene_path : 'test';
        let ctx = context_data[ctx_name];
        if (ctx == undefined)
            context_data[ctx_name] = [];
        context_data[ctx_name].push({ type, data: data_list, owner });
    }

    async function undo() {
        const current_scene_path = AssetControl.get_current_scene().path;
        const ctx_name = (current_scene_path) ? current_scene_path : 'test';
        let ctx = context_data[ctx_name];
        if (!ctx || ctx.length == 0)
            return;
        const last = ctx.pop()!;
        const type = last.type;
        const owner = last.owner;
        const data = last.data;
        EventBus.trigger('SYS_HISTORY_UNDO', { type, data, owner });
    }

    init();
    return { add, undo, clear, clear_all, get_history };
}