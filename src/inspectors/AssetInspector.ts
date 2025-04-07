import { Vector2, Vector3, Vector4, MinificationTextureFilter, MagnificationTextureFilter, Color, NearestFilter, LinearFilter, IUniform, Texture } from "three";
import { get_file_name, get_basename } from "../render_engine/helpers/utils";
import { MaterialUniformParams, MaterialUniformType } from "../render_engine/resource_manager";
import { IObjectTypes, IBaseMesh } from "../render_engine/types";
import { InspectorGroup, update_option, PropertyData, PropertyType, generateTextureOptions, ChangeInfo, BeforeChangeInfo } from "../modules_editor/Inspector";
import { TextureAtlasEventData, MinFilterEventData, MagFilterEventData } from "../controls/types";
import { generateAtlasOptions } from "./ObjectInspector";

declare global {
    const AssetInspector: ReturnType<typeof AssetInspectorCreate>;
}

export function register_asset_inspector() {
    (window as any).AssetInspector = AssetInspectorCreate();
}

export enum AssetProperty {
    ASSET_ATLAS = 'asset_atlas',
    ATLAS_BUTTON = 'atlas_button',
    MIN_FILTER = 'min_filter',
    MAG_FILTER = 'mag_filter',
    MATERIAL = 'material',
    TRANSPARENT = 'transparent',
    VERTEX_PROGRAM = 'vertex_program',
    FRAGMENT_PROGRAM = 'fragment_program',
    UNIFORM_SAMPLER2D = 'uniform_sampler2d',
    UNIFORM_FLOAT = 'uniform_float',
    UNIFORM_RANGE = 'uniform_range',
    UNIFORM_VEC2 = 'uniform_vec2',
    UNIFORM_VEC3 = 'uniform_vec3',
    UNIFORM_VEC4 = 'uniform_vec4',
    UNIFORM_COLOR = 'uniform_color',
}

export enum FilterMode {
    NEAREST = 'nearest',
    LINEAR = 'linear',
}

function AssetInspectorCreate() {
    const _config: InspectorGroup[] = [
        {
            name: 'base',
            title: '',
            property_list: [
                {
                    name: AssetProperty.ASSET_ATLAS, 
                    title: 'Атлас', 
                    type: PropertyType.LIST_TEXT, 
                    params: generateAtlasOptions(),
                    onSave: saveAssetAtlas,
                    onUpdate: updateAssetAtlas
                },
                { 
                    name: AssetProperty.ATLAS_BUTTON, 
                    title: 'Атлас менеджер', 
                    type: PropertyType.BUTTON 
                },
                {
                    name: AssetProperty.MIN_FILTER, 
                    title: 'Фильтр уменьшения', 
                    type: PropertyType.LIST_TEXT, 
                    params: {
                        'nearest': FilterMode.NEAREST,
                        'linear': FilterMode.LINEAR
                    },
                    onSave: saveMinFilter,
                    onUpdate: updateMinFilter
                },
                {
                    name: AssetProperty.MAG_FILTER, 
                    title: 'Фильтр увеличения', 
                    type: PropertyType.LIST_TEXT, 
                    params: {
                        'nearest': FilterMode.NEAREST,
                        'linear': FilterMode.LINEAR
                    },
                    onSave: saveMagFilter,
                    onUpdate: updateMagFilter
                },
                {
                    name: AssetProperty.VERTEX_PROGRAM, 
                    title: 'Vertex Program', 
                    type: PropertyType.LIST_TEXT, 
                    params: {},
                    onSave: saveMaterialVertexProgram,
                    onUpdate: updateMaterialVertexProgram
                },
                {
                    name: AssetProperty.FRAGMENT_PROGRAM, 
                    title: 'Fragment Program', 
                    type: PropertyType.LIST_TEXT, 
                    params: {},
                    onSave: saveMaterialFragmentProgram,
                    onUpdate: updateMaterialFragmentProgram
                }, 
                {
                    name: AssetProperty.TRANSPARENT,
                    title: 'Transparent',
                    type: PropertyType.BOOLEAN
                }
            ]
        },
        {
            name: 'uniforms',
            title: 'Uniforms',
            property_list: [
                {
                    name: AssetProperty.UNIFORM_SAMPLER2D,
                    title: 'Sampler2D',
                    type: PropertyType.LIST_TEXTURES,
                    params: generateTextureOptions(),
                    onSave: saveUniformSampler2D,
                    onUpdate: updateUniformSampler2D
                },
                {
                    name: AssetProperty.UNIFORM_FLOAT,
                    title: 'Float',
                    type: PropertyType.NUMBER,
                    params: {
                        min: 0,
                        max: 1,
                        step: 0.01
                    },
                    onSave: (info: BeforeChangeInfo) => saveUniformFloat(info),
                    onUpdate: updateUniformFloat
                },
                {
                    name: AssetProperty.UNIFORM_RANGE,
                    title: 'Range',
                    type: PropertyType.SLIDER,
                    params: {
                        min: 0,
                        max: 1,
                        step: 0.01
                    },
                    onSave: (info: BeforeChangeInfo) => saveUniformRange(info),
                    onUpdate: updateUniformRange
                },
                {
                    name: AssetProperty.UNIFORM_VEC2,
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
                    name: AssetProperty.UNIFORM_VEC3,
                    title: 'Vec3',
                    type: PropertyType.VECTOR_3,
                    params: {
                        x: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        y: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        z: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) }
                    },
                    onSave: (info: BeforeChangeInfo) => saveUniformVec3(info),
                    onUpdate: updateUniformVec3
                },
                {
                    name: AssetProperty.UNIFORM_VEC4,
                    title: 'Vec4',
                    type: PropertyType.VECTOR_4,
                    params: {
                        x: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        y: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        z: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        w: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) }
                    },
                    onSave: (info: BeforeChangeInfo) => saveUniformVec4(info),
                    onUpdate: updateUniformVec4
                },
                {
                    name: AssetProperty.UNIFORM_COLOR,
                    title: 'Color',
                    type: PropertyType.COLOR,
                    onSave: saveUniformColor,
                    onUpdate: updateUniformColor
                }
            ]
        }
    ];
    let _selected_textures: string[] = [];
    let _selected_materials: string[] = [];
    
    function init() {
        subscribe();
    }

    function subscribe() {
        EventBus.on('SYS_ASSETS_SELECTED_TEXTURES', (data: { paths: string[] }) => {
            set_selected_textures(data.paths);
        });

        EventBus.on('SYS_ASSETS_SELECTED_MATERIALS', (data: { paths: string[] }) => {
            set_selected_materials(data.paths);
        });

        EventBus.on('SYS_ASSETS_CLEAR_SELECTED', () => {
            Inspector.clear();
        });

        EventBus.on('SYS_CHANGED_ATLAS_DATA', () => {
            if (_selected_textures.length > 0) {
                // NOTE: пока просто пересоздаем поля занаво, так как нет возможности обновить параметры биндинга
                set_selected_textures(_selected_textures);
            }
        });
    }

    // NOTE: возможно лучше принимать имена текстур вместо путей
    function set_selected_textures(textures_paths: string[]) {
        _selected_textures = textures_paths;

        // NOTE: обновляем конфиг атласов
        update_option(_config, AssetProperty.ASSET_ATLAS, generateAtlasOptions);

        const data = _selected_textures.map((path, id) => {
            const result = { id, data: [] as PropertyData<PropertyType>[] };

            const texture_name = get_file_name(get_basename(path));
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);

            if (atlas == null) {
                Log.error(`[set_selected_textures] Atlas for texture ${texture_name} not found`);
                return { id, data: [] };
            }

            result.data.push({ name: AssetProperty.ASSET_ATLAS, data: atlas });
            result.data.push({
                name: AssetProperty.ATLAS_BUTTON, data: () => {
                    ControlManager.open_atlas_manager();
                }
            });

            const min_filter = convertThreeJSFilterToFilterMode(ResourceManager.get_texture(texture_name, atlas).texture.minFilter);
            const mag_filter = convertThreeJSFilterToFilterMode(ResourceManager.get_texture(texture_name, atlas).texture.magFilter);

            result.data.push({ name: AssetProperty.MIN_FILTER, data: min_filter });
            result.data.push({ name: AssetProperty.MAG_FILTER, data: mag_filter });

            return result;
        });

        Inspector.clear();
        Inspector.setData(data, _config);
    }
    
    function set_selected_materials(materials_paths: string[]) {
        _selected_materials = materials_paths;
        
        // NOTE: обновляем конфиг текстур для sampler2d полeй
        update_option(_config, AssetProperty.UNIFORM_SAMPLER2D, generateTextureOptions);

        const data = _selected_materials.map((path, id) => {
            const result = {id, data: [] as PropertyData<PropertyType>[]}; 

            const material_name = get_file_name(get_basename(path));
            const material = ResourceManager.get_material(material_name);

            result.data.push({ name: AssetProperty.VERTEX_PROGRAM, data: material.data.vertexShader });
            result.data.push({ name: AssetProperty.FRAGMENT_PROGRAM, data: material.data.fragmentShader });
            result.data.push({ name: AssetProperty.TRANSPARENT, data: material.data.transparent });

            Object.entries(material.uniforms).forEach(([key, value]) => {
                switch (value.type) {
                    case MaterialUniformType.SAMPLER2D:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == AssetProperty.UNIFORM_SAMPLER2D);
                            if (!property) return;
                            property.title = key;
                            property.readonly = value.readonly;
                        });
                        const texture = material.data.uniforms[key] as IUniform<Texture>;
                        const texture_name = get_file_name(get_basename((texture.value as any).path || ''));
                        result.data.push({ name: AssetProperty.UNIFORM_SAMPLER2D, data: texture_name });
                        break;
                    case MaterialUniformType.FLOAT:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == AssetProperty.UNIFORM_FLOAT);
                            if (!property) return;
                            // NOTE: создаем новую проперти с теми же параметрами, но с другим именем
                            const newProperty = { ...property };
                            newProperty.name = key;
                            newProperty.title = key;
                            newProperty.readonly = value.readonly;
                            const params = material.uniforms[key].params as MaterialUniformParams[MaterialUniformType.FLOAT];
                            newProperty.params = {
                                min: params.min,
                                max: params.max,
                                step: params.step
                            };
                            group.property_list.push(newProperty);
                        });
                        const data = material.data.uniforms[key] as IUniform<number>;
                        result.data.push({ name: key, data: data.value });
                        break;
                    case MaterialUniformType.RANGE:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == AssetProperty.UNIFORM_RANGE);
                            if (!property) return;
                            // NOTE: создаем новую проперти с теми же параметрами, но с другим именем
                            const newProperty = { ...property };
                            newProperty.name = key;
                            newProperty.title = key;
                            newProperty.readonly = value.readonly;
                            const params = material.uniforms[key].params as MaterialUniformParams[MaterialUniformType.RANGE];
                            newProperty.params = {
                                min: params.min,
                                max: params.max,
                                step: params.step
                            };
                            group.property_list.push(newProperty);
                        });
                        const range = material.data.uniforms[key] as IUniform<number>;
                        result.data.push({ name: key, data: range.value });
                        break;
                    case MaterialUniformType.VEC2:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == AssetProperty.UNIFORM_VEC2);
                            if (!property) return;
                            // NOTE: создаем новую проперти с теми же параметрами, но с другим именем
                            const newProperty = { ...property };
                            newProperty.name = key;
                            newProperty.title = key;
                            newProperty.readonly = value.readonly;
                            const params = material.uniforms[key].params as MaterialUniformParams[MaterialUniformType.VEC2];
                            newProperty.params = {
                                x: {
                                    min: params.x.min,
                                    max: params.x.max,
                                    step: params.x.step
                                },
                                y: {
                                    min: params.y.min,
                                    max: params.y.max,
                                    step: params.y.step
                                }
                            };
                            group.property_list.push(newProperty);
                        });
                        const vec2 = material.data.uniforms[key] as IUniform<Vector2>;
                        result.data.push({ name: key, data: vec2.value });
                        break;
                    case MaterialUniformType.VEC3:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == AssetProperty.UNIFORM_VEC3);
                            if (!property) return;
                            // NOTE: создаем новую проперти с теми же параметрами, но с другим именем
                            const newProperty = { ...property };
                            newProperty.name = key;
                            newProperty.title = key;
                            newProperty.readonly = value.readonly;
                            const params = material.uniforms[key].params as MaterialUniformParams[MaterialUniformType.VEC3];
                            newProperty.params = {
                                x: {
                                    min: params.x.min,
                                    max: params.x.max,
                                    step: params.x.step
                                },
                                y: {
                                    min: params.y.min,
                                    max: params.y.max,
                                    step: params.y.step
                                },
                                z: {
                                    min: params.z.min,
                                    max: params.z.max,
                                    step: params.z.step
                                }
                            };
                            group.property_list.push(newProperty);
                        });
                        const vec3 = material.data.uniforms[key] as IUniform<Vector3>;
                        result.data.push({ name: key, data: vec3.value });
                        break;
                    case MaterialUniformType.VEC4:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == AssetProperty.UNIFORM_VEC4);
                            if (!property) return;
                            // NOTE: создаем новую проперти с теми же параметрами, но с другим именем
                            const newProperty = { ...property };
                            newProperty.name = key;
                            newProperty.title = key;
                            newProperty.readonly = value.readonly;
                            const params = material.uniforms[key].params as MaterialUniformParams[MaterialUniformType.VEC4];
                            newProperty.params = {
                                x: {
                                    min: params.x.min,
                                    max: params.x.max,
                                    step: params.x.step
                                },
                                y: {
                                    min: params.y.min,
                                    max: params.y.max,
                                    step: params.y.step
                                },
                                z: {
                                    min: params.z.min,
                                    max: params.z.max,
                                    step: params.z.step
                                },
                                w: {
                                    min: params.w.min,
                                    max: params.w.max,
                                    step: params.w.step
                                }
                            };
                            group.property_list.push(newProperty);
                        });
                        const vec4 = material.data.uniforms[key] as IUniform<Vector4>;
                        result.data.push({ name: key, data: vec4.value });
                        break;
                    case MaterialUniformType.COLOR:
                        _config.forEach((group) => {
                            const property = group.property_list.find((property) => property.name == AssetProperty.UNIFORM_COLOR);
                            if (!property) return;
                            // NOTE: создаем новую проперти с теми же параметрами, но с другим именем
                            const newProperty = { ...property };
                            newProperty.name = key;
                            newProperty.title = key;
                            newProperty.readonly = value.readonly;
                            group.property_list.push(newProperty);
                        });
                        const color = material.data.uniforms[key] as IUniform<string>;
                        result.data.push({ name: key, data: color.value });
                        break;
                }
            });

            return result;
        });

        Inspector.clear();
        Inspector.setData(data, _config);
    }

    function saveAssetAtlas(info: BeforeChangeInfo) {
        const atlases: TextureAtlasEventData[] = [];
        info.ids.forEach((id) => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Log.error('[saveAtlas] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(get_basename(texture_path));
            const oldAtlas = ResourceManager.get_atlas_by_texture_name(texture_name);
            atlases.push({ texture_path, atlas: oldAtlas ? oldAtlas : '' });
        });

        HistoryControl.add('TEXTURE_ATLAS', atlases);
    }

    function updateAssetAtlas(info: ChangeInfo) {
        const atlas = info.data.event.value as string;

        info.ids.forEach((id) => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Log.error('[updateAtlas] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(get_basename(texture_path));
            const old_atlas = ResourceManager.get_atlas_by_texture_name(texture_name) || '';
            ResourceManager.override_atlas_texture(old_atlas, atlas, texture_name);

            // NOTE: возможно обновление текстур в мешах должно быть в override_atlas_texture 
            SceneManager.get_scene_list().forEach((mesh) => {
                const is_type = mesh.type == IObjectTypes.GO_SPRITE_COMPONENT || mesh.type == IObjectTypes.GUI_BOX;
                if (!is_type) return;

                const mesh_texture = (mesh as IBaseMesh).get_texture();
                const is_atlas = mesh_texture.includes(old_atlas);
                const is_texture = mesh_texture.includes(texture_name);

                if (is_atlas && is_texture) {
                    mesh.set_texture(texture_name, atlas);
                }
            });
        });

        ResourceManager.write_metadata();
    }

    function saveMinFilter(info: BeforeChangeInfo) {
        const minFilters: MinFilterEventData[] = [];
        info.ids.forEach((id) => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Log.error('[saveMinFilter] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(get_basename(texture_path));
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);
            if (atlas == null) {
                Log.error('[saveMinFilter] Atlas not found for texture:', texture_name);
                return;
            }

            const texture_data = ResourceManager.get_texture(texture_name, atlas);
            minFilters.push({
                texture_path,
                filter: texture_data.texture.minFilter as MinificationTextureFilter
            });
        });

        HistoryControl.add('TEXTURE_MIN_FILTER', minFilters);
    }

    function updateMinFilter(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Log.error('[updateMinFilter] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(get_basename(texture_path));
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);
            if (atlas == null) {
                Log.error('[updateMinFilter] Atlas not found for texture:', texture_name);
                return;
            }

            const filter_mode = info.data.event.value as FilterMode;
            const threeFilterMode = convertFilterModeToThreeJS(filter_mode) as MinificationTextureFilter;
            const texture_data = ResourceManager.get_texture(texture_name, atlas);
            texture_data.texture.minFilter = threeFilterMode;
        });

        ResourceManager.write_metadata();
    }

    function saveMagFilter(info: BeforeChangeInfo) {
        const magFilters: MagFilterEventData[] = [];
        info.ids.forEach((id) => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Log.error('[saveMagFilter] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(get_basename(texture_path));
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);
            if (atlas == null) {
                Log.error('[saveMagFilter] Atlas not found for texture:', texture_name);
                return;
            }

            const texture_data = ResourceManager.get_texture(texture_name, atlas);
            magFilters.push({
                texture_path,
                filter: texture_data.texture.magFilter as MagnificationTextureFilter
            });
        });

        HistoryControl.add('TEXTURE_MAG_FILTER', magFilters);
    }

    function updateMagFilter(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Log.error('[updateMagFilter] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(get_basename(texture_path));
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);
            if (atlas == null) {
                Log.error('[updateMagFilter] Atlas not found for texture:', texture_name);
                return;
            }

            const filter_mode = info.data.event.value as FilterMode;
            const threeFilterMode = convertFilterModeToThreeJS(filter_mode) as MagnificationTextureFilter;
            const texture_data = ResourceManager.get_texture(texture_name, atlas);
            texture_data.texture.magFilter = threeFilterMode;
        });

        ResourceManager.write_metadata();
    }

    function saveMaterialVertexProgram(info: BeforeChangeInfo) {
        const vertexPrograms: { material_path: string, program: string }[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(get_basename(path));
            const material = ResourceManager.get_material(name);
            if (!material) return;
            vertexPrograms.push({
                material_path: path,
                program: material.data.vertexShader
            });
        });
        HistoryControl.add('MATERIAL_VERTEX_PROGRAM', vertexPrograms);
    }

    function updateMaterialVertexProgram(info: ChangeInfo) {
        const program = info.data.event.value as string;
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(get_basename(path));
            const material = ResourceManager.get_material(name);
            if (!material) return;
            material.data.vertexShader = program;
            material.data.needsUpdate = true;
            EventBus.trigger('MATERIAL_CHANGED', {
                material_name: material.name,
                property: 'vertexShader',
                value: program
            });
        });
    }

    function saveMaterialFragmentProgram(info: BeforeChangeInfo) {
        const fragmentPrograms: { material_path: string, program: string }[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(get_basename(path));
            const material = ResourceManager.get_material(name);
            if (!material) return;
            fragmentPrograms.push({
                material_path: path,
                program: material.data.fragmentShader
            });
        });
        HistoryControl.add('MATERIAL_FRAGMENT_PROGRAM', fragmentPrograms);
    }
    
    function updateMaterialFragmentProgram(info: ChangeInfo) {
        const program = info.data.event.value as string;
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(get_basename(path));
            const material = ResourceManager.get_material(name);
            if (!material) return;
            material.data.fragmentShader = program;
            material.data.needsUpdate = true;
            EventBus.trigger('MATERIAL_CHANGED', {
                material_name: material.name,
                property: 'fragmentShader',
                value: program
            });
        });
    }

    function saveUniformSampler2D(info: BeforeChangeInfo) {
        const sampler2Ds: { material_path: string, uniform_name: string, value: string }[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(get_basename(path));
            const material = ResourceManager.get_material(name);
            if (!material) return;
            const uniform = material.data.uniforms[info.field.name];
            if (uniform) {
                sampler2Ds.push({
                    material_path: path,
                    uniform_name: info.field.name,
                    value: uniform.value?.image?.src || ''
                });
            }
        });
        HistoryControl.add('MATERIAL_SAMPLER2D', sampler2Ds);
    }

    function updateUniformSampler2D(info: ChangeInfo) {
        const atlas = (info.data.event.value as string).split('/')[0];
        const texture = (info.data.event.value as string).split('/')[1];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(get_basename(path));
            const material = ResourceManager.get_material(name);
            if (!material) return;
            material.data.uniforms[info.data.field.name].value = ResourceManager.get_texture(texture || '', atlas || '').texture;
            material.data.needsUpdate = true;
            EventBus.trigger('MATERIAL_CHANGED', {
                material_name: material.name,
                property: info.data.field.name,
                value: info.data.event.value
            });
        });
    }

    function saveUniformFloat(info: BeforeChangeInfo) {
        const floats: { material_path: string, uniform_name: string, value: number }[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(get_basename(path));
            const material = ResourceManager.get_material(name);
            if (!material) return;
            const uniform = material.data.uniforms[info.field.name];
            if (uniform) {
                floats.push({
                    material_path: path,
                    uniform_name: info.field.name,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MATERIAL_FLOAT', floats);
    }

    function updateUniformFloat(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(get_basename(path));
            const material = ResourceManager.get_material(name);
            if (!material) return;
            material.data.uniforms[info.data.field.name] = { value: info.data.event.value } as IUniform<number>;
            material.data.needsUpdate = true;
            EventBus.trigger('MATERIAL_CHANGED', {
                material_name: material.name,
                property: info.data.field.name,
                value: info.data.event.value
            });
        });
    }

    function saveUniformRange(info: BeforeChangeInfo) {
        const ranges: { material_path: string, uniform_name: string, value: number }[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(get_basename(path));
            const material = ResourceManager.get_material(name);
            if (!material) return;
            const uniform = material.data.uniforms[info.field.name];
            if (uniform) {
                ranges.push({
                    material_path: path,
                    uniform_name: info.field.name,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MATERIAL_RANGE', ranges);
    }

    function updateUniformRange(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(get_basename(path));
            const material = ResourceManager.get_material(name);
            if (!material) return;
            material.data.uniforms[info.data.field.name] = info.data.event.value as IUniform<number>;
            material.data.needsUpdate = true;
            EventBus.trigger('MATERIAL_CHANGED', {
                material_name: material.name,
                property: info.data.field.name,
                value: info.data.event.value
            });
        });
    }

    function saveUniformVec2(info: BeforeChangeInfo) {
        const vec2s: { material_path: string, uniform_name: string, value: Vector2 }[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(get_basename(path));
            const material = ResourceManager.get_material(name);
            if (!material) return;
            const uniform = material.data.uniforms[Object.keys(material.data.uniforms).find(key => material.uniforms[key].type === MaterialUniformType.VEC2) || ''];
            if (uniform) {
                vec2s.push({
                    material_path: path,
                    uniform_name: Object.keys(material.data.uniforms).find(key => material.uniforms[key].type === MaterialUniformType.VEC2) || '',
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MATERIAL_VEC2', vec2s);
    }

    function updateUniformVec2(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(get_basename(path));
            const material = ResourceManager.get_material(name);
            if (!material) return;
            material.data.uniforms[info.data.field.name] = info.data.event.value as IUniform<Vector2>;
            material.data.needsUpdate = true;
            EventBus.trigger('MATERIAL_CHANGED', {
                material_name: material.name,
                property: info.data.field.name,
                value: info.data.event.value
            });
        });
    }

    function saveUniformVec3(info: BeforeChangeInfo) {
        const vec3s: { material_path: string, uniform_name: string, value: Vector3 }[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(get_basename(path));
            const material = ResourceManager.get_material(name);
            if (!material) return;
            const uniform = material.data.uniforms[info.field.name];
            if (uniform) {
                vec3s.push({
                    material_path: path,
                    uniform_name: info.field.name,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MATERIAL_VEC3', vec3s);
    }

    function updateUniformVec3(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(get_basename(path));
            const material = ResourceManager.get_material(name);
            if (!material) return;
            material.data.uniforms[info.data.field.name] = info.data.event.value as IUniform<Vector3>;
            material.data.needsUpdate = true;
            EventBus.trigger('MATERIAL_CHANGED', {
                material_name: material.name,
                property: info.data.field.name,
                value: info.data.event.value
            });
        });
    }

    function saveUniformVec4(info: BeforeChangeInfo) {
        const vec4s: { material_path: string, uniform_name: string, value: Vector4 }[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(get_basename(path));
            const material = ResourceManager.get_material(name);
            if (!material) return;
            const uniform = material.data.uniforms[info.field.name];
            if (uniform) {
                vec4s.push({
                    material_path: path,
                    uniform_name: info.field.name,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MATERIAL_VEC4', vec4s);
    }

    function updateUniformVec4(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(get_basename(path));
            const material = ResourceManager.get_material(name);
            if (!material) return;
            material.data.uniforms[info.data.field.name] = info.data.event.value as IUniform<Vector4>;
            material.data.needsUpdate = true;
            EventBus.trigger('MATERIAL_CHANGED', {
                material_name: material.name,
                property: info.data.field.name,
                value: info.data.event.value
            });
        });
    }

    function saveUniformColor(info: BeforeChangeInfo) {
        const colors: { material_path: string, uniform_name: string, value: string }[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(get_basename(path));
            const material = ResourceManager.get_material(name);
            if (!material) return;
            const uniform = material.data.uniforms[Object.keys(material.data.uniforms).find(key => material.uniforms[key].type === MaterialUniformType.COLOR) || ''];
            if (uniform) {
                const color = new Color();
                color.setRGB(uniform.value.x, uniform.value.y, uniform.value.z);
                colors.push({
                    material_path: path,
                    uniform_name: Object.keys(material.data.uniforms).find(key => material.uniforms[key].type === MaterialUniformType.COLOR) || '',
                    value: color.getHexString()
                });
            }
        });
        HistoryControl.add('MATERIAL_COLOR', colors);
    }

    function updateUniformColor(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(get_basename(path));
            const material = ResourceManager.get_material(name);
            if (!material) return;
            const color = new Color(info.data.event.value as string);
            material.data.uniforms[info.data.field.name] = { value: new Vector3(color.r, color.g, color.b) } as IUniform<Vector3>;
            material.data.needsUpdate = true;
            EventBus.trigger('MATERIAL_CHANGED', {
                material_name: material.name,
                property: info.data.field.name,
                value: info.data.event.value
            });
        });
    }

    init();
    return { set_selected_textures, set_selected_materials };
}

function convertFilterModeToThreeJS(filter_mode: FilterMode): number {
    switch (filter_mode) {
        case FilterMode.NEAREST:
            return NearestFilter;
        case FilterMode.LINEAR:
            return LinearFilter;
        default:
            return LinearFilter;
    }
}

function convertThreeJSFilterToFilterMode(filter: number): FilterMode {
    switch (filter) {
        case NearestFilter:
            return FilterMode.NEAREST;
        case LinearFilter:
            return FilterMode.LINEAR;
        default:
            return FilterMode.LINEAR;
    }
}