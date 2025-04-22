export type MeshMoveEventData = {
    id_mesh: number;
    pid: number;
    next_id: number;
};

export interface MeshPropertyInfo<T> {
    mesh_id: number;
    value: T;
}

export interface MeshMaterialUniformInfo<T> {
    mesh_id: number;
    uniform_name: string;
    value: T;
}

export interface AssetTextureInfo<T> {
    texture_path: string;
    value: T;
}

export interface AssetMaterialUniformInfo<T> {
    material_path: string;
    uniform_name: string;
    value: T;
}

export interface MaterialVertexProgramEventData {
    material_path: string;
    program: string;
}

export interface MaterialFragmentProgramEventData {
    material_path: string;
    program: string;
}

export interface MaterialTransparentEventData {
    material_path: string;
    value: boolean;
}