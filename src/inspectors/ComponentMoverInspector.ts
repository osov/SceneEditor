import { ChangeInfo, ObjectData, PropertyData, PropertyType } from "../modules_editor/Inspector";
import { IBaseMeshAndThree } from "../render_engine/types";
import { get_selected_one_component } from "./ui_utils";
import { Component, ComponentType } from "../render_engine/components/container_component";

export function register_cmp_mover_inspector() {
    (window as any).MoverInspector = MoverInspectorCreate();
}

declare global {
    const MoverInspector: ReturnType<typeof MoverInspectorCreate>;
}

enum InspectorProperty {
    p1 = 'p1',
    p2 = 'p2',
    s = 's'
}
enum InspectorPropertyTitle {
    p1 = 'Начало XY',
    p2 = 'Конец XY',
    s = 'Скорость'
}



function MoverInspectorCreate() {
    let selected_cmp: IBaseMeshAndThree | undefined;

    function show(cmp: Component) {
        selected_cmp = cmp;
        const data: ObjectData[] = [{ id: 0, fields: [] as PropertyData<PropertyType>[] }];

        const fields: PropertyData<PropertyType>[] = [];
        fields.push({
            key: InspectorProperty.p1,
            title: InspectorPropertyTitle.p1,
            value: cmp.userData.p1,
            type: PropertyType.VECTOR_2,
            onChange: updateParams
        });
        fields.push({
            key: InspectorProperty.p2,
            title: InspectorPropertyTitle.p2,
            value: cmp.userData.p2,
            type: PropertyType.VECTOR_2,
            onChange: updateParams
        });
        fields.push({
            key: InspectorProperty.s,
            title: InspectorPropertyTitle.s,
            value: cmp.userData.s,
            type: PropertyType.SLIDER,
            params: { min: 0, max: 10, step: 0.01 },
            onChange: updateParams
        });

        data[0].fields.push({
            key: 'Компонент[Движение]',
            value: fields,
            type: PropertyType.FOLDER,
            params: { expanded: true }
        });



        Inspector.clear();
        Inspector.setData(data);
    }

    function updateParams(info: ChangeInfo) {
        (selected_cmp as any).userData[info.data.field.key] = info.data.event.value;
        // log('update:', info.data.field, info.data.event.value);
    }



    function subscribe() {
        EventBus.on('SYS_SELECTED_MESH_LIST', (e) => {
            selected_cmp = undefined;
            const cmp = get_selected_one_component();
            if (cmp) {
                if (cmp.sub_type == ComponentType.MOVER)
                    show(cmp);
               // else
                //    Inspector.clear();
            }
        });
    }



    function init() {
        subscribe();
    }

    init();
    return { show, };
}
