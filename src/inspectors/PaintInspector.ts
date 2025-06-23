import { Slice9Mesh } from "@editor/render_engine/objects/slice9";
import { ChangeInfo, ObjectData, PropertyData, PropertyType } from "../modules_editor/Inspector";
import { AllowedMeshType, PAINT_MODE, PaintProperty } from "@editor/controls/PaintControl";
import { MultipleMaterialMesh } from "@editor/render_engine/objects/multiple_material_mesh";


export function register_paint_inspector() {
    (window as any).PaintInspector = PaintInspectorCreate();
}

declare global {
    const PaintInspector: ReturnType<typeof PaintInspectorCreate>;
}

export enum PaintPropertyTitle {
    BRUSH = 'Кисть',
    CREATE_SIZE = 'Увеличить размер',
    CREATE_BTN = 'Создать',
    SAVE_BTN = 'Сохранить',
    DEL_BTN = 'Удалить',
    VAL_SIZE = 'Размер',
    VAL_COLOR = 'Цвет',
    MODE = 'Режим'
}

function PaintInspectorCreate() {
    let selected_mesh: AllowedMeshType;

    function show(mesh: AllowedMeshType) {
        selected_mesh = mesh;

        const data: ObjectData[] = [{ id: 0, fields: [] as PropertyData<PropertyType>[] }];
        const fields: PropertyData<PropertyType>[] = data[0].fields;

        if (has_both_uniforms(mesh)) generatePickModeField(fields);
        else if (has_u_mask(mesh)) PaintControl.state[PaintProperty.MODE] = PAINT_MODE.COLOR;
        else if (has_u_flowMap(mesh)) PaintControl.state[PaintProperty.MODE] = PAINT_MODE.NORMAL;
        else {
            Popups.toast.error('Нет u_mask или u_flowMap');
            return;
        }

        switch (PaintControl.state[PaintProperty.MODE]) {
            case PAINT_MODE.COLOR:
                if (mesh instanceof Slice9Mesh) {
                    if (mesh.material.uniforms.u_mask) {
                        if (mesh.material.uniforms.u_mask.value.name != 'null') {
                            generateDrawFields(fields);
                            generateSaveDeleteButtons(fields, mesh);
                        } else {
                            generateDrawCreateFields(fields, mesh);
                        }
                    } else Popups.toast.error('Нет u_mask');
                } else if (mesh instanceof MultipleMaterialMesh) {
                    let has_u_mask = true;
                    for (const material of mesh.get_materials()) {
                        has_u_mask = material.uniforms.u_mask == undefined;
                        if (!has_u_mask) break;
                    }
                    if (has_u_mask) {
                        const firstMaterial = mesh.get_materials()[0];
                        if (firstMaterial.uniforms.u_mask.value.name != 'null') {
                            generateDrawFields(fields);
                            generateSaveDeleteButtons(fields, mesh);
                        }
                        generateDrawCreateFields(fields, mesh);
                    }
                } else Popups.toast.error('Нет u_mask');
                break;
            case PAINT_MODE.NORMAL:
                if (mesh instanceof Slice9Mesh) {
                    if (mesh.material.uniforms.u_flowMap) {
                        if (mesh.material.uniforms.u_flowMap.value.name != 'null') {
                            generateDrawFields(fields);
                            generateSaveDeleteButtons(fields, mesh);
                        } else {
                            generateDrawCreateFields(fields, mesh);
                        }
                    } else Popups.toast.error('Нет u_flowMap');
                } else if (mesh instanceof MultipleMaterialMesh) {
                    let has_u_flowMap = true;
                    for (const material of mesh.get_materials()) {
                        has_u_flowMap = material.uniforms.u_flowMap == undefined;
                        if (!has_u_flowMap) break;
                    }
                    if (has_u_flowMap) {
                        const firstMaterial = mesh.get_materials()[0];
                        if (firstMaterial.uniforms.u_flowMap.value.name != 'null') {
                            generateDrawFields(fields);
                            generateSaveDeleteButtons(fields, mesh);
                        }
                        generateDrawCreateFields(fields, mesh);
                    }
                } else Popups.toast.error('Нет u_flowMap');
                break;
        }

        Inspector.clear();
        Inspector.setData(data);
    }

    function has_both_uniforms(mesh: AllowedMeshType) {
        if (mesh instanceof Slice9Mesh) {
            return mesh.material.uniforms.u_mask && mesh.material.uniforms.u_flowMap;
        } else if (mesh instanceof MultipleMaterialMesh) {
            return mesh.get_materials().every(material => material.uniforms.u_mask && material.uniforms.u_flowMap);
        }
        return false;
    }

    function has_u_mask(mesh: AllowedMeshType) {
        if (mesh instanceof Slice9Mesh) {
            return mesh.material.uniforms.u_mask;
        } else if (mesh instanceof MultipleMaterialMesh) {
            return mesh.get_materials().every(material => material.uniforms.u_mask);
        }
        return false;
    }

    function has_u_flowMap(mesh: AllowedMeshType) {
        if (mesh instanceof Slice9Mesh) {
            return mesh.material.uniforms.u_flowMap;
        } else if (mesh instanceof MultipleMaterialMesh) {
            return mesh.get_materials().every(material => material.uniforms.u_flowMap);
        }
        return false;
    }

    function generateDrawCreateFields(fields: PropertyData<PropertyType>[], mesh: AllowedMeshType) {
        fields.push({
            key: PaintProperty.CREATE_SIZE,
            title: PaintPropertyTitle.CREATE_SIZE,
            value: PaintControl.state[PaintProperty.CREATE_SIZE],
            type: PropertyType.SLIDER,
            params: { min: 1, max: 100, step: 1 },
            onChange: updateParams
        });

        fields.push({
            key: PaintProperty.CREATE_BTN,
            title: PaintPropertyTitle.CREATE_BTN,
            value: () => PaintControl.activate(mesh),
            type: PropertyType.BUTTON,
        });
    }

    function generatePickModeField(fields: PropertyData<PropertyType>[]) {
        fields.push({
            key: PaintProperty.MODE,
            title: PaintPropertyTitle.MODE,
            value: PaintControl.state[PaintProperty.MODE],
            type: PropertyType.LIST_TEXT,
            params: {
                'Цвет': PAINT_MODE.COLOR,
                'Нормаль': PAINT_MODE.NORMAL,
            },
            onChange: updateParams
        });
    }

    function generateDrawFields(fields: PropertyData<PropertyType>[]) {
        const draw_fields: PropertyData<PropertyType>[] = [];
        draw_fields.push({
            key: PaintProperty.VAL_SIZE,
            title: PaintPropertyTitle.VAL_SIZE,
            value: PaintControl.state[PaintProperty.VAL_SIZE],
            type: PropertyType.SLIDER,
            params: { min: 0, max: 1000, step: 1 },
            onChange: updateParams
        });
        draw_fields.push({
            key: PaintProperty.VAL_COLOR,
            title: PaintPropertyTitle.VAL_COLOR,
            value: PaintControl.state[PaintProperty.VAL_COLOR],
            type: PropertyType.COLOR,
            onChange: updateParams
        });

        fields.push({
            key: PaintPropertyTitle.BRUSH,
            value: draw_fields,
            type: PropertyType.FOLDER,
            params: { expanded: true }
        });
    }

    function generateSaveDeleteButtons(fields: PropertyData<PropertyType>[], mesh: AllowedMeshType) {
        fields.push({
            key: PaintProperty.SAVE_BTN,
            title: PaintPropertyTitle.SAVE_BTN,
            value: () => PaintControl.save(mesh),
            type: PropertyType.BUTTON,
        });
        fields.push({
            key: PaintProperty.DEL_BTN,
            title: PaintPropertyTitle.DEL_BTN,
            value: () => {
                if (confirm('Удалить?'))
                    PaintControl.deactivate(mesh);
            },
            type: PropertyType.BUTTON,
        });
    }

    function updateParams(info: ChangeInfo) {
        Object.entries(PaintControl.state).forEach(([key, _]) => {
            if (key == info.data.field.key) {
                (PaintControl.state as any)[key] = info.data.event.value;
            }
        });

        if (info.data.field.key == PaintProperty.MODE) {
            setTimeout(() => show(selected_mesh));
        }
    }

    return { show };
}