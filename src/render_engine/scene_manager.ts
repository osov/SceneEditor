import { Object3D, Quaternion, Vector3 } from "three";
import { filter_list_base_mesh, is_base_mesh } from "./helpers/utils";
import { Slice9Mesh } from "./objects/slice9";
import { IBaseMeshData, IBaseMeshDataAndThree, IObjectTypes } from "./types";
import { TextMesh } from "./objects/text";
import { GoContainer } from "./objects/container";
import { deepClone } from "../modules/utils";
import { EntityContainer } from "./objects/entity_container";

declare global {
    const SceneManager: ReturnType<typeof SceneManagerModule>;
}

export function register_scene_manager() {
    (window as any).SceneManager = SceneManagerModule();
}

type IMeshTypes = {
    [IObjectTypes.EMPTY]: EntityContainer,
    [IObjectTypes.SLICE9_PLANE]: Slice9Mesh,
    [IObjectTypes.TEXT]: TextMesh,
    [IObjectTypes.GO_CONTAINER]: GoContainer,
    [IObjectTypes.GUI_CONTAINER]: GoContainer,
}

export function SceneManagerModule() {
    const scene = RenderEngine.scene;
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
        else if (type == IObjectTypes.GO_CONTAINER) {
            mesh = new GoContainer(params.width || 1, params.height || 1, params.slice_width || 0, params.slice_height || 0);
        }
        else if (type == IObjectTypes.GUI_CONTAINER) {
            mesh = new GoContainer(params.width || 1, params.height || 1, params.slice_width || 0, params.slice_height || 0);
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
        mesh.layers.enable(31);
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
            name: m.name,
            visible: m.visible,
            position: wp.toArray(),
            rotation: wr.toArray(),
            scale: ws.toArray(),
            size: m.get_size().toArray(),
            color: m.get_color(),
            pivot: m.get_pivot(),
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
        mesh.name = data.name;
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

    function clear_scene() {
        for (let i = scene.children.length - 1; i >= 0; i--) {
            const m = scene.children[i];
            if (is_base_mesh(m))
                scene.remove(m);
        }
    }

    function save_scene() {
        const list: IBaseMeshData[] = [];
        for (let i = 0; i < scene.children.length; i++) {
            const m = scene.children[i];
            if (is_base_mesh(m))
                list.push(serialize_mesh(m as IBaseMeshDataAndThree));
        }
        return list;
    }

    function load_scene(data: IBaseMeshData[], sub_name = '') {
        if (sub_name == '') {
            clear_scene();
            for (let i = 0; i < data.length; i++) {
                const it = data[i];
                const mesh = deserialize_mesh(it, true, scene);
                scene.add(mesh);
            }
        }
        else {
            const container = create(IObjectTypes.GO_CONTAINER, {});
            container.name = sub_name;
            const max = find_max_id(data, 0);
            if (id_counter <= max)
                id_counter = max + 1;
            const inc = get_unique_id();
            const tmp = deepClone(data);
            modify_id_pid_list(tmp, inc);
            for (let i = 0; i < tmp.length; i++) {
                const it = tmp[i];
                const mesh = deserialize_mesh(it, true, container);
                container.add(mesh);
            }
            scene.add(container);
        }
    }

    function find_max_id(list: IBaseMeshData[], max = 0) {
        for (let i = 0; i < list.length; i++) {
            const it = list[i];
            if (it.id > max)
                max = it.id;
            if (it.children)
                max = find_max_id(it.children, max);
        }
        return max;
    }

    function modify_id_pid_list(list: IBaseMeshData[], inc: number) {
        for (let i = 0; i < list.length; i++) {
            const it = list[i];
            if (it.id != -1)
                it.id += inc;
            if (it.pid != -1)
                it.pid += inc;
            if (it.children)
                modify_id_pid_list(it.children, inc);
        }
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

    function get_next_base_mesh_id(mesh: IBaseMeshDataAndThree) {
        const parent = mesh.parent ? mesh.parent : scene;
        const index = parent.children.indexOf(mesh);
        if (index == parent.children.length - 1)
            return -1;
        for (let i = index + 1; i < parent.children.length; i++) {
            const child = parent.children[i];
            if (is_base_mesh(child)) {
                return (child as any as IBaseMeshDataAndThree).mesh_data.id;
            }
        }
        return -1;
    }

    function find_next_id_mesh(mesh: IBaseMeshDataAndThree) {
        const parent = mesh.parent ? mesh.parent : scene;
        const index = parent.children.indexOf(mesh);

        if (index == parent.children.length - 1) {
            return -1;
        }
        return get_next_base_mesh_id(mesh);
    }

    function move_mesh(mesh: IBaseMeshDataAndThree, pid = -1, next_id = -1) {
        let pid_is_child = false;
        mesh.traverse((child) => {
            if (is_base_mesh(child) && (child as any).mesh_data.id == pid && pid != -1)
                pid_is_child = true;
        });
        if (pid_is_child)
            return Log.error('pid is child');
        move_mesh_to(mesh, pid, next_id);
    }

    function move_mesh_to(mesh: IBaseMeshDataAndThree, pid = -1, next_id = -1) {
        const has_old_parent = mesh.parent != null;
        const old_parent = mesh.parent ? mesh.parent : scene;
        const old_index = old_parent.children.indexOf(mesh);
        const new_parent = (pid == -1) ? scene : get_mesh_by_id(pid);
        if (!new_parent) return Log.error('new_parent is null');
        const old_pos = new Vector3();
        mesh.getWorldPosition(old_pos);
        const old_scale = new Vector3();
        mesh.getWorldScale(old_scale);
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
        if (has_old_parent) {
            const parent_scale = new Vector3();
            mesh.parent.getWorldScale(parent_scale);
            old_scale.divide(parent_scale);
            mesh.scale.copy(old_scale);
        }
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
        const list: { id: number, pid: number, name: string, visible: boolean, type: IObjectTypes }[] = [];
        scene.traverse((child) => {
            if (is_base_mesh(child)) {
                const it = child as any as IBaseMeshDataAndThree;
                let pid = -1;
                if (is_base_mesh(it.parent!))
                    pid = (it.parent as any as IBaseMeshDataAndThree).mesh_data.id;
                list.push({ id: it.mesh_data.id, pid: pid, name: it.name, visible: it.visible, type: it.type });
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

    function save_editor() {
        return { id_counter };
    }

    function load_editor(data: any) {
        id_counter = data.id_counter;
    }

    return { get_unique_id, create, add, remove, get_mesh_by_id, move_mesh, move_mesh_id, find_next_id_mesh, make_graph, debug_graph, save_editor, load_editor, serialize_mesh, deserialize_mesh, save_scene, load_scene };
}