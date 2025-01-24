import { PositionEventData, RotationEventData, ScaleEventData, SizeEventData } from "./types";

declare global {
    const HistoryControl: ReturnType<typeof HistoryControlModule>;
    type HistoryKeys = HistoryDataKeys;
}

export function register_history_control() {
    (window as any).HistoryControl = HistoryControlModule();
}

type HistoryData = {
    MESH_TRANSLATE: PositionEventData
    MESH_ROTATE: RotationEventData
    MESH_SCALE: ScaleEventData
    MESH_SIZE: SizeEventData
}
type HistoryDataKeys = keyof HistoryData;

interface HistoryDataItem<T extends HistoryDataKeys> {
    type: T
    data: HistoryData[T][]
}

function HistoryControlModule() {
    const context_data: { [k: string]: HistoryDataItem<HistoryDataKeys>[] } = {};
    function init() {
        window.addEventListener('keyup', (e) => {
            if (e.ctrlKey && e.key == 'z')
                undo();
        });
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
        if (type == 'MESH_TRANSLATE') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_TRANSLATE'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                mesh.position.copy(data.position);
            }
        }
        else if (type == 'MESH_ROTATE') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_ROTATE'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                mesh.rotation.copy(data.rotation);
            }
        }
        else if (type == 'MESH_SCALE') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_SCALE'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                mesh.scale.copy(data.scale);
            }
        }
        else if (type == 'MESH_SIZE') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_SIZE'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                mesh.set_size(data.size.x, data.size.y);
            }
        }

    }

    init();
    return { add, undo };
}