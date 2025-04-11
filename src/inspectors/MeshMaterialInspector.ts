import { IUniform, ShaderMaterial, Texture } from "three";
import { Vector2 } from "three";
import { Color, Vector3, Vector4 } from "three";
import { BeforeChangeInfo, ChangeInfo, InspectorGroup, PropertyData, PropertyType, PropertyParams } from "../modules_editor/Inspector";
import { get_file_name, try_record_to_changed_uniforms } from "../render_engine/helpers/utils";
import { MaterialUniformParams, MaterialUniformType } from "../render_engine/resource_manager";
import { hexToRGB, rgbToHex } from "../modules/utils";
import { generateTextureOptions, update_option } from "./helpers";

declare global {
    const MeshMaterialInspector: ReturnType<typeof MeshMaterialInspectorCreate>;
}

export function register_mesh_material_inspector() {
    (window as any).MeshMaterialInspector = MeshMaterialInspectorCreate();
}

export enum MeshMaterialProperty {
    TRANSPARENT = 'mesh_material_transparent',
    UNIFORM_SAMPLER2D = 'mesh_material_uniform_sampler2d',
    UNIFORM_FLOAT = 'mesh_material_uniform_float',
    UNIFORM_RANGE = 'mesh_material_uniform_range',
    UNIFORM_VEC2 = 'mesh_material_uniform_vec2',
    UNIFORM_VEC3 = 'mesh_material_uniform_vec3',
    UNIFORM_VEC4 = 'mesh_material_uniform_vec4',
    UNIFORM_COLOR = 'mesh_material_uniform_color',
}

function MeshMaterialInspectorCreate() {
    const _config: InspectorGroup[] = [
        {
            name: 'base',
            title: '',
            property_list: [
                {
                    name: MeshMaterialProperty.TRANSPARENT,
                    title: 'Transparent',
                    type: PropertyType.BOOLEAN,
                    onSave: saveMaterialTransparent,
                    onUpdate: updateMaterialTransparent
                },
                {
                    name: MeshMaterialProperty.UNIFORM_SAMPLER2D,
                    title: 'Sampler2D',
                    type: PropertyType.LIST_TEXTURES,
                    params: () => generateTextureOptions(true),
                    onSave: saveUniformSampler2D,
                    onUpdate: updateUniformSampler2D
                },
                {
                    name: MeshMaterialProperty.UNIFORM_FLOAT,
                    title: 'Float',
                    type: PropertyType.NUMBER,
                    params: {
                        min: 0,
                        max: 1,
                        step: 0.01
                    },
                    onSave: saveUniformFloat,
                    onUpdate: updateUniformFloat
                },
                {
                    name: MeshMaterialProperty.UNIFORM_RANGE,
                    title: 'Range',
                    type: PropertyType.SLIDER,
                    params: {
                        min: 0,
                        max: 1,
                        step: 0.01
                    },
                    onSave: saveUniformRange,
                    onUpdate: updateUniformRange
                },
                {
                    name: MeshMaterialProperty.UNIFORM_VEC2,
                    title: 'Vec2',
                    type: PropertyType.VECTOR_2,
                    params: {
                        x: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        y: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) }
                    },
                    onSave: saveUniformVec2,
                    onUpdate: updateUniformVec2
                },
                {
                    name: MeshMaterialProperty.UNIFORM_VEC3,
                    title: 'Vec3',
                    type: PropertyType.VECTOR_3,
                    params: {
                        x: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        y: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        z: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) }
                    },
                    onSave: saveUniformVec3,
                    onUpdate: updateUniformVec3
                },
                {
                    name: MeshMaterialProperty.UNIFORM_VEC4,
                    title: 'Vec4',
                    type: PropertyType.VECTOR_4,
                    params: {
                        x: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        y: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        z: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        w: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) }
                    },
                    onSave: saveUniformVec4,
                    onUpdate: updateUniformVec4
                },
                {
                    name: MeshMaterialProperty.UNIFORM_COLOR,
                    title: 'Color',
                    type: PropertyType.COLOR,
                    onSave: saveUniformColor,
                    onUpdate: updateUniformColor
                }
            ]
        }
    ];

    let _selected_materials: ShaderMaterial[] = [];

    function init() {
        subscribe();
    }

    function subscribe() {

    }

    function set_selected_mesh_material(materials: ShaderMaterial[]) {
        _selected_materials = materials;

        // NOTE: обновляем конфиг текстур для sampler2d полeй
        update_option(_config, MeshMaterialProperty.UNIFORM_SAMPLER2D, () => generateTextureOptions(true));

        const data = _selected_materials.map((material, id) => {
            const result = { id, data: [] as PropertyData<PropertyType>[] };

            result.data.push({ name: MeshMaterialProperty.TRANSPARENT, data: material.transparent });

            const original_material = ResourceManager.get_material(material.name);

            Object.entries(material.uniforms).forEach(([key, uniform]) => {
                const uniformInfo = original_material.uniforms[key];
                if (!uniformInfo) return;

                switch (uniformInfo.type) {
                    case MaterialUniformType.SAMPLER2D:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == MeshMaterialProperty.UNIFORM_SAMPLER2D);
                            if (!property) return;
                            const newProperty = { ...property };
                            newProperty.name = key;
                            newProperty.title = key;
                            newProperty.readonly = uniformInfo.readonly;
                            group.property_list.push(newProperty);
                        });
                        const texture = uniform as IUniform<Texture>;
                        const texture_name = texture.value ? get_file_name((texture.value as any).path || '') : '';
                        const atlas = ResourceManager.get_atlas_by_texture_name(texture_name) || '';
                        result.data.push({ name: key, data: `${atlas}/${texture_name}` });
                        break;
                    case MaterialUniformType.FLOAT:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == MeshMaterialProperty.UNIFORM_FLOAT);
                            if (!property) return;
                            const newProperty = { ...property };
                            newProperty.name = key;
                            newProperty.title = key;
                            newProperty.readonly = uniformInfo.readonly;
                            const params = uniformInfo.params as MaterialUniformParams[MaterialUniformType.FLOAT];
                            newProperty.params = {
                                min: params.min,
                                max: params.max,
                                step: params.step
                            };
                            group.property_list.push(newProperty);
                        });
                        const data = uniform as IUniform<number>;
                        result.data.push({ name: key, data: data.value });
                        break;
                    case MaterialUniformType.RANGE:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == MeshMaterialProperty.UNIFORM_RANGE);
                            if (!property) return;
                            const newProperty = { ...property };
                            newProperty.name = key;
                            newProperty.title = key;
                            newProperty.readonly = uniformInfo.readonly;
                            const params = uniformInfo.params as MaterialUniformParams[MaterialUniformType.RANGE];
                            newProperty.params = {
                                min: params.min,
                                max: params.max,
                                step: params.step
                            };
                            group.property_list.push(newProperty);
                        });
                        const range = uniform as IUniform<number>;
                        result.data.push({ name: key, data: range.value });
                        break;
                    case MaterialUniformType.VEC2:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == MeshMaterialProperty.UNIFORM_VEC2);
                            if (!property) return;
                            const newProperty = { ...property };
                            newProperty.name = key;
                            newProperty.title = key;
                            newProperty.readonly = uniformInfo.readonly;
                            const params = uniformInfo.params as MaterialUniformParams[MaterialUniformType.VEC2];
                            const defaultParams = property.params as PropertyParams[PropertyType.VECTOR_2];
                            newProperty.params = {
                                x: {
                                    min: params?.x?.min ?? defaultParams?.x?.min,
                                    max: params?.x?.max ?? defaultParams?.x?.max,
                                    step: params?.x?.step ?? defaultParams?.x?.step
                                },
                                y: {
                                    min: params?.y?.min ?? defaultParams?.y?.min,
                                    max: params?.y?.max ?? defaultParams?.y?.max,
                                    step: params?.y?.step ?? defaultParams?.y?.step
                                }
                            };
                            group.property_list.push(newProperty);
                        });
                        const vec2 = uniform as IUniform<Vector2>;
                        result.data.push({ name: key, data: vec2.value });
                        break;
                    case MaterialUniformType.VEC3:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == MeshMaterialProperty.UNIFORM_VEC3);
                            if (!property) return;
                            const newProperty = { ...property };
                            newProperty.name = key;
                            newProperty.title = key;
                            newProperty.readonly = uniformInfo.readonly;
                            const params = uniformInfo.params as MaterialUniformParams[MaterialUniformType.VEC3];
                            const defaultParams = property.params as PropertyParams[PropertyType.VECTOR_3];
                            newProperty.params = {
                                x: {
                                    min: params?.x?.min ?? defaultParams?.x?.min,
                                    max: params?.x?.max ?? defaultParams?.x?.max,
                                    step: params?.x?.step ?? defaultParams?.x?.step
                                },
                                y: {
                                    min: params?.y?.min ?? defaultParams?.y?.min,
                                    max: params?.y?.max ?? defaultParams?.y?.max,
                                    step: params?.y?.step ?? defaultParams?.y?.step
                                },
                                z: {
                                    min: params?.z?.min ?? defaultParams?.z?.min,
                                    max: params?.z?.max ?? defaultParams?.z?.max,
                                    step: params?.z?.step ?? defaultParams?.z?.step
                                }
                            };
                            group.property_list.push(newProperty);
                        });
                        const vec3 = uniform as IUniform<Vector3>;
                        result.data.push({ name: key, data: vec3.value });
                        break;
                    case MaterialUniformType.VEC4:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == MeshMaterialProperty.UNIFORM_VEC4);
                            if (!property) return;
                            const newProperty = { ...property };
                            newProperty.name = key;
                            newProperty.title = key;
                            newProperty.readonly = uniformInfo.readonly;
                            const params = uniformInfo.params as MaterialUniformParams[MaterialUniformType.VEC4];
                            const defaultParams = property.params as PropertyParams[PropertyType.VECTOR_4];
                            newProperty.params = {
                                x: {
                                    min: params?.x?.min ?? defaultParams?.x?.min,
                                    max: params?.x?.max ?? defaultParams?.x?.max,
                                    step: params?.x?.step ?? defaultParams?.x?.step
                                },
                                y: {
                                    min: params?.y?.min ?? defaultParams?.y?.min,
                                    max: params?.y?.max ?? defaultParams?.y?.max,
                                    step: params?.y?.step ?? defaultParams?.y?.step
                                },
                                z: {
                                    min: params?.z?.min ?? defaultParams?.z?.min,
                                    max: params?.z?.max ?? defaultParams?.z?.max,
                                    step: params?.z?.step ?? defaultParams?.z?.step
                                },
                                w: {
                                    min: params?.w?.min ?? defaultParams?.w?.min,
                                    max: params?.w?.max ?? defaultParams?.w?.max,
                                    step: params?.w?.step ?? defaultParams?.w?.step
                                }
                            };
                            group.property_list.push(newProperty);
                        });
                        const vec4 = uniform as IUniform<Vector4>;
                        result.data.push({ name: key, data: vec4.value });
                        break;
                    case MaterialUniformType.COLOR:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == MeshMaterialProperty.UNIFORM_COLOR);
                            if (!property) return;
                            const newProperty = { ...property };
                            newProperty.name = key;
                            newProperty.title = key;
                            newProperty.readonly = uniformInfo.readonly;
                            group.property_list.push(newProperty);
                        });
                        const color = uniform as IUniform<Vector3>;
                        result.data.push({ name: key, data: rgbToHex(color.value) });
                        break;
                }
            });

            return result;
        });

        Inspector.clear();
        Inspector.setData(data, _config);
    }

    function saveUniformSampler2D(info: BeforeChangeInfo) {
        const sampler2Ds: { material_path: string, uniform_name: string, value: string }[] = [];
        info.ids.forEach((id) => {
            const material = _selected_materials[id];
            if (!material) return;
            const uniform = material.uniforms[info.field.name];
            if (uniform) {
                sampler2Ds.push({
                    material_path: material.name,
                    uniform_name: info.field.name,
                    value: uniform.value?.image?.src || ''
                });
            }
        });
        HistoryControl.add('MATERIAL_SAMPLER2D', sampler2Ds);
    }

    function updateUniformSampler2D(info: ChangeInfo) {
        info.ids.forEach(async (id) => {
            const material = _selected_materials[id];
            if (!material) return;

            const atlas = (info.data.event.value as string).split('/')[0];
            const texture = (info.data.event.value as string).split('/')[1];
            const texture_value = ResourceManager.get_texture(texture || '', atlas || '').texture;

            try_record_to_changed_uniforms(material, info.data.field.name);

            material.uniforms[info.data.field.name].value = texture_value;
            material.needsUpdate = true;

            EventBus.trigger('MATERIAL_COPY_CHANGED', {
                material_name: material.name,
                is_uniform: true,
                property: info.data.field.name,
                value: texture_value
            });
        });
    }

    function saveUniformFloat(info: BeforeChangeInfo) {
        const floats: { material_path: string, uniform_name: string, value: number }[] = [];
        info.ids.forEach((id) => {
            const material = _selected_materials[id];
            if (!material) return;
            const uniform = material.uniforms[info.field.name];
            if (uniform) {
                floats.push({
                    material_path: material.name,
                    uniform_name: info.field.name,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MATERIAL_FLOAT', floats);
    }

    function updateUniformFloat(info: ChangeInfo) {
        info.ids.forEach(async (id) => {
            const material = _selected_materials[id];
            if (!material) return;

            try_record_to_changed_uniforms(material, info.data.field.name);

            material.uniforms[info.data.field.name].value = info.data.event.value as number;
            material.needsUpdate = true;

            EventBus.trigger('MATERIAL_COPY_CHANGED', {
                material_name: material.name,
                is_uniform: true,
                property: info.data.field.name,
                value: info.data.event.value
            });
        });
    }

    function saveUniformRange(info: BeforeChangeInfo) {
        const ranges: { material_path: string, uniform_name: string, value: number }[] = [];
        info.ids.forEach((id) => {
            const material = _selected_materials[id];
            if (!material) return;
            const uniform = material.uniforms[info.field.name];
            if (uniform) {
                ranges.push({
                    material_path: material.name,
                    uniform_name: info.field.name,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MATERIAL_RANGE', ranges);
    }

    function updateUniformRange(info: ChangeInfo) {
        info.ids.forEach(async (id) => {
            const material = _selected_materials[id];
            if (!material) return;

            try_record_to_changed_uniforms(material, info.data.field.name);

            material.uniforms[info.data.field.name].value = info.data.event.value;
            material.needsUpdate = true;

            EventBus.trigger('MATERIAL_COPY_CHANGED', {
                material_name: material.name,
                is_uniform: true,
                property: info.data.field.name,
                value: info.data.event.value
            });
        });
    }

    function saveUniformVec2(info: BeforeChangeInfo) {
        const vec2s: { material_path: string, uniform_name: string, value: Vector2 }[] = [];
        info.ids.forEach((id) => {
            const material = _selected_materials[id];
            if (!material) return;
            const uniform = material.uniforms[info.field.name];
            if (uniform) {
                vec2s.push({
                    material_path: material.name,
                    uniform_name: info.field.name,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MATERIAL_VEC2', vec2s);
    }

    function updateUniformVec2(info: ChangeInfo) {
        info.ids.forEach(async (id) => {
            const material = _selected_materials[id];
            if (!material) return;

            try_record_to_changed_uniforms(material, info.data.field.name);

            material.uniforms[info.data.field.name].value = info.data.event.value;
            material.needsUpdate = true;

            EventBus.trigger('MATERIAL_COPY_CHANGED', {
                material_name: material.name,
                is_uniform: true,
                property: info.data.field.name,
                value: info.data.event.value
            });
        });
    }

    function saveUniformVec3(info: BeforeChangeInfo) {
        const vec3s: { material_path: string, uniform_name: string, value: Vector3 }[] = [];
        info.ids.forEach((id) => {
            const material = _selected_materials[id];
            if (!material) return;
            const uniform = material.uniforms[info.field.name];
            if (uniform) {
                vec3s.push({
                    material_path: material.name,
                    uniform_name: info.field.name,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MATERIAL_VEC3', vec3s);
    }

    function updateUniformVec3(info: ChangeInfo) {
        info.ids.forEach(async (id) => {
            const material = _selected_materials[id];
            if (!material) return;

            try_record_to_changed_uniforms(material, info.data.field.name);

            material.uniforms[info.data.field.name].value = info.data.event.value;
            material.needsUpdate = true;

            EventBus.trigger('MATERIAL_COPY_CHANGED', {
                material_name: material.name,
                is_uniform: true,
                property: info.data.field.name,
                value: info.data.event.value
            });
        });
    }

    function saveUniformVec4(info: BeforeChangeInfo) {
        const vec4s: { material_path: string, uniform_name: string, value: Vector4 }[] = [];
        info.ids.forEach((id) => {
            const material = _selected_materials[id];
            if (!material) return;
            const uniform = material.uniforms[info.field.name];
            if (uniform) {
                vec4s.push({
                    material_path: material.name,
                    uniform_name: info.field.name,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MATERIAL_VEC4', vec4s);
    }

    function updateUniformVec4(info: ChangeInfo) {
        info.ids.forEach(async (id) => {
            const material = _selected_materials[id];
            if (!material) return;

            try_record_to_changed_uniforms(material, info.data.field.name);

            material.uniforms[info.data.field.name].value = info.data.event.value;
            material.needsUpdate = true;

            EventBus.trigger('MATERIAL_COPY_CHANGED', {
                material_name: material.name,
                is_uniform: true,
                property: info.data.field.name,
                value: info.data.event.value
            });
        });
    }

    function saveUniformColor(info: BeforeChangeInfo) {
        const colors: { material_path: string, uniform_name: string, value: string }[] = [];
        info.ids.forEach((id) => {
            const material = _selected_materials[id];
            if (!material) return;
            const uniform = material.uniforms[info.field.name];
            if (uniform) {
                const color = new Color();
                color.setRGB(uniform.value.x, uniform.value.y, uniform.value.z);
                colors.push({
                    material_path: material.name,
                    uniform_name: info.field.name,
                    value: color.getHexString()
                });
            }
        });
        HistoryControl.add('MATERIAL_COLOR', colors);
    }

    function updateUniformColor(info: ChangeInfo) {
        const color = new Color(info.data.event.value as string);
        const rgb = hexToRGB(color.getHexString());

        info.ids.forEach(async (id) => {
            const material = _selected_materials[id];
            if (!material) return;

            try_record_to_changed_uniforms(material, info.data.field.name);

            material.uniforms[info.data.field.name].value = rgb;
            material.needsUpdate = true;

            EventBus.trigger('MATERIAL_COPY_CHANGED', {
                material_name: material.name,
                is_uniform: true,
                property: info.data.field.name,
                value: rgb
            });
        });
    }

    function saveMaterialTransparent(info: BeforeChangeInfo) {
        const transparents: { material_path: string, value: boolean }[] = [];
        info.ids.forEach((id) => {
            const material = _selected_materials[id];
            if (!material) return;
            transparents.push({
                material_path: material.name,
                value: material.transparent
            });
        });
        HistoryControl.add('MATERIAL_TRANSPARENT', transparents);
    }

    function updateMaterialTransparent(info: ChangeInfo) {
        const transparent = info.data.event.value as boolean;
        info.ids.forEach(async (id) => {
            const material = _selected_materials[id];
            if (!material) return;

            try_record_to_changed_uniforms(material, 'transparent');

            material.transparent = transparent;
            material.needsUpdate = true;

            EventBus.trigger('MATERIAL_COPY_CHANGED', {
                material_name: material.name,
                is_uniform: false,
                property: 'transparent',
                value: transparent
            });
        });
    }

    init();
    return { set_selected_mesh_material };
}