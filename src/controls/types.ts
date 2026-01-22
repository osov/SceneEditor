export type MeshMoveEventData = {
    id_mesh: number;
    pid: number;
    next_id: number;
};

export interface MeshPropertyInfo<T> {
    mesh_id: number;
    index?: number;
    value: T;
}

export interface MeshMaterialPropertyInfo<T> {
    mesh_id: number;
    material_index: number;
    value: T;
}

export interface MeshMaterialUniformInfo<T> {
    mesh_id: number;
    material_index: number;
    uniform_name: string;
    value: T;
}

export interface AssetTextureInfo<T> {
    texture_path: string;
    value: T;
}

export interface AssetMaterialInfo<T> {
    material_path: string;
    name: string;
    value: T;
}

export interface AssetAudioInfo<T> {
    audio_path: string;
    audio_id: number;
    value: T;
}