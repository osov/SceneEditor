import { Object3D, Vector3 } from "three";
import { filter_list_base_mesh, is_base_mesh } from "./helpers/utils";
import { Slice9Mesh } from "./slice9";
import { IBaseMeshDataAndThree, IObjectTypes } from "./types";

declare global {
    const SceneManager: ReturnType<typeof SceneManagerModule>;
}

export function register_scene_manager() {
    (window as any).SceneManager = SceneManagerModule();
}


export function SceneManagerModule() {
    const scene = RenderEngine.scene;
    const scene_gui = RenderEngine.scene_gui;
    
    // todo Increment ID
    // при создании сцены может назначиться список ид последовательный, которые позже мы захотим использовать(например при откате ходов), 
    // поэтому брать последний свободный неправильно, тк потом он восстановится после отката, но будет занят. 
    function get_unique_id() {
        let max_id = 0;
        const list = get_scene_list();
        for (let i = 0; i < list.length; i++) {
            const m = list[i];
            const id = m.mesh_data.id;
            if (id > max_id)
                max_id = id;
        }
        return max_id + 1;
    }

    function create(type: IObjectTypes, params: any, id = -1) {
        let mesh: IBaseMeshDataAndThree;
        if (type == IObjectTypes.SLICE9_PLANE) {
            mesh = new Slice9Mesh(params.width || 1, params.height || 1, params.slice_width || 0, params.slice_height || 0);
        }
        else {
            Log.error('Unknown mesh type', type);
            mesh = new Slice9Mesh(32, 32);
            mesh.set_color('#f00');
        }
        if (id != -1) {
            const m = get_mesh_by_id(id);
            if (m) {
                const new_id = get_unique_id();
                Log.error('mesh with id already exists', id, 'generated new id', new_id);
                id = new_id;
            }
            mesh.mesh_data.id = id;
        }
        else {
            mesh.mesh_data.id = get_unique_id();
        }
        mesh.name = type + mesh.mesh_data.id;
        return mesh;
    }

    function get_mesh_list(mesh: Object3D) {
        const tmp: Object3D[] = [];
        mesh.traverse((child) => tmp.push(child));
        return filter_list_base_mesh(tmp);
    }

    function get_scene_list() {
        return get_mesh_list(scene);
    }

    function get_mesh_by_id(id: number) {
        const list = get_scene_list();
        for (let i = 0; i < list.length; i++) {
            if (list[i].mesh_data.id == id) {
                return list[i];
            }
        }
        return null;
    }

    function move_mesh_id(id: number, pid = -1, next_id = -1) {
        const mesh = get_mesh_by_id(id);
        if (mesh)
            move_mesh(mesh, pid, next_id);
        else
            Log.error('mesh is null');
    }

    function move_mesh(mesh: IBaseMeshDataAndThree, pid = -1, next_id = -1) {
        let pid_is_child = false;
        mesh.traverse((child) => {
            if (is_base_mesh(child) && (child as any).mesh_data.id == pid)
                pid_is_child = true;
        });
        if (pid_is_child)
            return Log.error('pid is child');
        move_mesh_to(mesh, pid, next_id);
    }

    function move_mesh_to(mesh: IBaseMeshDataAndThree, pid = -1, next_id = -1) {
        const old_parent = mesh.parent ? mesh.parent : scene;
        const old_index = old_parent.children.indexOf(mesh);
        const new_parent = (pid == -1) ? scene : get_mesh_by_id(pid);
        if (!new_parent) return Log.error('new_parent is null');
        const old_pos = new Vector3();
        mesh.getWorldPosition(old_pos);
        const new_before = get_mesh_by_id(next_id);
        let new_index = -1;
        if (new_before != null)
            new_index = new_parent.children.indexOf(new_before);
        else
            new_index = new_parent.children.length;
        if (old_parent === new_parent && new_index > old_index)
            new_index--;

        // перемещаем
        old_parent.remove(mesh);
        var children = new_parent.children;
        children.splice(new_index, 0, mesh);
        mesh.parent = new_parent;
        const lp = mesh.parent.worldToLocal(old_pos);
        mesh.position.copy(lp);
    }

    function add(mesh: IBaseMeshDataAndThree, id_parent = -1, id_before = -1) {
        move_mesh(mesh, id_parent, id_before);
    }

    function remove(id: number) {
        const mesh = get_mesh_by_id(id);
        if (mesh)
            mesh.parent!.remove(mesh);
    }

    function make_graph() {
        const list: any[] = [];
        scene.traverse((child) => {
            if (is_base_mesh(child)) {
                const it = child as any as IBaseMeshDataAndThree;
                let pid = -1;
                if (is_base_mesh(it.parent!))
                    pid = (it.parent as any as IBaseMeshDataAndThree).mesh_data.id;
                list.push({ id: it.mesh_data.id, pid: pid, name: it.name, visible: it.visible, icon: it.type });
            }
        });
        return list;
    }

    function debug_graph(mesh: Object3D, level = 0) {
        let graph = '';
        for (let i = 0; i < mesh.children.length; i++) {
            const child = mesh.children[i];
            if (is_base_mesh(child)) {
                graph += '\n' + '   '.repeat(level) + ' ' + (child.name);
                graph += debug_graph(child, level + 1);
            }
        }
        return graph;
    }



    return { create, add, remove, get_mesh_by_id, move_mesh, move_mesh_id, make_graph, debug_graph };
}