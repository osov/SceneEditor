import { Object3D } from "three";
import { IBaseMeshDataAndThree } from "../types";

export function is_base_mesh(mesh:Object3D){
    return (mesh as any).mesh_data != undefined;
}

export function filter_list_base_mesh(tmp:Object3D[]){
    const list:IBaseMeshDataAndThree[] = [];
    for (let i = 0; i < tmp.length; i++) {
        const it = tmp[i];
        if (is_base_mesh(it)) {
            list.push(it as any as IBaseMeshDataAndThree);
        }
    }
    return list;
}