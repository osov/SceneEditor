import { ActiveEventData, AnchorEventData, ColorEventData, FontEventData, FontSizeEventData, MeshMoveEventData, NameEventData, PivotEventData, PositionEventData, RotationEventData, ScaleEventData, SizeEventData, SliceEventData, TextAlignEventData, TextEventData, TextureEventData, VisibleEventData } from "./types";
import { Slice9Mesh } from "../render_engine/objects/slice9";
import { IBaseMeshAndThree } from "../render_engine/types";
import { TextMesh } from "../render_engine/objects/text";

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
    MESH_TEXTURE: TextureEventData
    MESH_TEXT: TextEventData
    MESH_FONT: FontEventData
    MESH_FONT_SIZE: FontSizeEventData
    MESH_TEXT_ALIGN: TextAlignEventData
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
        console.log('WRITE: ', type, data_list);
    }

    function undo() {
        const ctx_name = 'test';
        let ctx = context_data[ctx_name];
        if (!ctx || ctx.length == 0)
            return;
        const last = ctx.pop()!;
        const type = last.type;
        const list_mesh: IBaseMeshAndThree[] = [];

        console.log("UNDO: ", type, last);

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
                const m = SceneManager.deserialize_mesh(mdata, true, parent);
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
        } else if (type == 'MESH_TEXTURE') {
            for (let i = 0; i < last.data.length; i++) {
                const data = last.data[i] as HistoryData['MESH_TEXTURE'];
                const mesh = SceneManager.get_mesh_by_id(data.id_mesh)!;
                const atlas = data.texture.split('/')[0];
                const texture = data.texture.split('/')[1];
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
        }
        if (list_mesh.length > 0) {
            for (let i = 0; i < list_mesh.length; i++)
                list_mesh[i].transform_changed();
            SelectControl.set_selected_list(list_mesh);
            ControlManager.update_graph();
        }

    }

    init();
    return { add, undo };
}