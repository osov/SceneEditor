import { Vector2 } from "three";
import { PositionEventData, RotationEventData, ScaleEventData, SizeEventData } from "./types";

declare global {
    const HistoryControl: ReturnType<typeof HistoryControlCreate>;
    type HistoryKeys = HistoryDataKeys;
}

export function register_history_control() {
    (window as any).HistoryControl = HistoryControlCreate();
}

type HistoryData = {
    MESH_TRANSLATE: PositionEventData
    MESH_ROTATE: RotationEventData
    MESH_SCALE: ScaleEventData
    MESH_SIZE: SizeEventData
    MESH_DELETE: { id_mesh: number }
    MESH_ADD: any
    MESH_PIVOT:{pivot:Vector2, id_mesh:number}
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

    function add<T extends HistoryDataKeys>(type: T, data_list: HistoryData[T][],) {
        const ctx_name = 'test';
        let ctx = context_data[ctx_name];
        if (ctx == undefined)
            context_data[ctx_name] = [];
        context_data[ctx_name].push({ type, data: data_list });
    }

    function undo() {
        const ctx_name = 'test';
        let ctx = context_data[ctx_name];
        if (!ctx || ctx.length == 0)
            return;
        const last = ctx.pop()!;
        const type = last.type;
        const list_mesh = [];
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
        else if (type == 'MESH_DELETE') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_DELETE'];
                SceneManager.remove(data.id_mesh)!;
            }
            // ---
        }
        else if (type == 'MESH_ADD') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_ADD'];
                const parent = data.pid == -1 ? RenderEngine.scene : SceneManager.get_mesh_by_id(data.pid);
                if (!parent) {
                    Log.error('parent is null', data);
                    return;
                }
                const m = SceneManager.deserialize_mesh(data, true, parent);
                parent.add(m);
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
        if (list_mesh.length > 0)
            SelectControl.set_selected_list(list_mesh, true);

    }

    init();
    return { add, undo };
}