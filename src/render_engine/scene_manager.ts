import { Object3D, Quaternion, Vector3 } from "three";
import { filter_list_base_mesh, is_base_mesh } from "./helpers/utils";
import { Slice9Mesh } from "./slice9";
import { IBaseMeshData, IBaseMeshDataAndThree, IObjectTypes } from "./types";
import { TextMesh } from "./text";

declare global {
    const SceneManager: ReturnType<typeof SceneManagerModule>;
}

export function register_scene_manager() {
    (window as any).SceneManager = SceneManagerModule();
}

type IMeshTypes = {
    [IObjectTypes.SLICE9_PLANE]: Slice9Mesh,
    [IObjectTypes.TEXT]: TextMesh
}

export function SceneManagerModule() {
    const scene = RenderEngine.scene;
    //const scene_gui = RenderEngine.scene_gui;
    let id_counter = 0;

    function get_unique_id() {
        while (true) {
            id_counter++;
            if (!get_mesh_by_id(id_counter))
                return id_counter;
        }
    }

    function create<T extends IObjectTypes>(type: T, params: any, id = -1): IMeshTypes[T] {
        let mesh: IBaseMeshDataAndThree;
        if (type == IObjectTypes.SLICE9_PLANE) {
            mesh = new Slice9Mesh(params.width || 1, params.height || 1, params.slice_width || 0, params.slice_height || 0);
        }
        else if (type == IObjectTypes.TEXT) {
            mesh = new TextMesh(params.text || '', params.width || 1, params.height || 1);
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
        return mesh as IMeshTypes[T];
    }

    function serialize_mesh(m: IBaseMeshDataAndThree) {
        const wp = new Vector3();
        const ws = new Vector3();
        const wr = new Quaternion();
        m.getWorldPosition(wp);
        m.getWorldScale(ws);
        m.getWorldQuaternion(wr);
        const pid = m.parent ? (is_base_mesh(m.parent) ? (m.parent as IBaseMeshDataAndThree).mesh_data.id : -1) : -1;
        const data: IBaseMeshData = {
            id: m.mesh_data.id,
            pid,
            type: m.type,
            visible: m.visible,
            position: wp.toArray(),
            rotation: wr.toArray(),
            scale: ws.toArray(),
            size: m.get_size().toArray(),
            color: m.get_color(),
            pivot:m.get_pivot(),
            other_data: m.serialize(),
        };
        if (m.children.length > 0) {
            data.children = [];
            for (let i = 0; i < m.children.length; i++)
                if (is_base_mesh(m.children[i]))
                    data.children.push(serialize_mesh(m.children[i] as IBaseMeshDataAndThree));
        }
        return data;
    }

    function deserialize_mesh(data: IBaseMeshData, with_id = false, parent?: Object3D) {
        const mesh = create(data.type, data.other_data, with_id ? data.id : -1);
        if (parent) {
            const lp = parent.worldToLocal(new Vector3(data.position[0], data.position[1], data.position[2]));
            mesh.position.copy(lp);
            const ws = new Vector3();
            parent.getWorldScale(ws);
            mesh.scale.set(data.scale[0] / ws.x, data.scale[1] / ws.y, data.scale[2] / ws.z);
        }
        else {
            if (data.position)
                mesh.position.set(data.position[0], data.position[1], data.position[2]);
            if (data.rotation)
                mesh.quaternion.set(data.rotation[0], data.rotation[1], data.rotation[2], data.rotation[3]);
            if (data.scale)
                mesh.scale.set(data.scale[0], data.scale[1], data.scale[2]);
        }
        mesh.visible = data.visible;
        mesh.set_pivot(data.pivot.x, data.pivot.y, false);
        mesh.set_size(data.size[0], data.size[1]);
        mesh.set_color(data.color);
        mesh.deserialize(data.other_data);
        if (data.children) {
            for (let i = 0; i < data.children.length; i++)
                mesh.add(deserialize_mesh(data.children[i], with_id, mesh));
        }
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

    function save() {
        return { id_counter };
    }

    function load(data: any) {
        id_counter = data.id_counter;
    }

    return { create, add, remove, get_mesh_by_id, move_mesh, move_mesh_id, make_graph, debug_graph, save, load, serialize_mesh, deserialize_mesh };
}