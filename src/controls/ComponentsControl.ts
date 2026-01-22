import { get_hash_by_mesh, get_mesh_by_hash } from "../inspectors/ui_utils";
import { IBaseEntityAndThree, IBaseMeshAndThree, IObjectTypes } from "../render_engine/types";

declare global {
    const ComponentsControl: ReturnType<typeof ComponentsControlCreate>;
}

export function register_components_control() {
    (window as any).ComponentsControl = ComponentsControlCreate();
}

interface ComponentInfo {
    t: number;
    data: any;
}

type FileData = { [id: string]: ComponentInfo[] };



function ComponentsControlCreate() {
    const dir_path = '/';

    async function load_data() {
        const data = await ClientAPI.get_data(dir_path + 'components.txt');
        let result: FileData = {};
        if (data.result == 1 && data.data)
            result = JSON.parse(data.data) as FileData;
        return result;
    }

    function init() {
        EventBus.on('SYS_VIEW_INPUT_KEY_DOWN', (e) => {
            if (Input.is_shift()) {
                if (e.key == 'W' || e.key == 'Ц') {
               //     save();
                }
                if (e.key == 'Q' || e.key == 'Й') {

                }

            }
        });

    }

    async function load() {
        const data = await load_data();
        for (const id in data) {
            const components = data[id];
            const mesh = get_mesh_by_hash(id);
            if (mesh) {
                for (const component of components) {
                    const cmp = SceneManager.create(IObjectTypes.COMPONENT,{type:component.t});
                    cmp.deserialize(component);
                    SceneManager.add(cmp, mesh.mesh_data.id);
                }
            }
            else {
                Log.error('[Компонент] меш не найден:' + id);
            }
        }
    }


    async function save() {
        const data: FileData = {};
        const list = SceneManager.get_scene_list();
        for (let i = 0; i < list.length; i++) {
            const m = list[i];
            if (m.type == IObjectTypes.COMPONENT) {
                const parent = m.parent as IBaseMeshAndThree;
                const id_parent = get_hash_by_mesh(parent);
                if (!data[id_parent])
                    data[id_parent] = [];
                data[id_parent].push(m.serialize());
            }
        }
        await ClientAPI.save_data(dir_path + 'components.txt', JSON.stringify(data));
        Popups.toast.success('Компоненты сохранены');
    }

    init();
    return {  load, save }
}


