// NOTE: для большей ясности все изменения в материалах делаются на прямую в файл, ResourceManager прослушивает изменения в файлах и обновляет загруженные данные, альтернативный вариант, это посылать события изменения материала и прослушивать их в ResourceManager, но в таком случае будет чуть больше запутанность, так как ResourceManager всеравно будет прослушивать изменения в файлах, но при этом еще и обрабатывать напрямую события изменения материала, который записывает в файл, еще как вариант, это посылать только событие изменения, а ResourceManager будет обрабатывать и сам записывать эти изменения в файл


import { Vector2, Vector3, Vector4, Color, IUniform, Texture, MagnificationTextureFilter, MinificationTextureFilter } from "three";
import { get_file_name } from "../render_engine/helpers/utils";
import { MaterialUniformParams, MaterialUniformType } from "../render_engine/resource_manager";
import { IObjectTypes, IBaseMesh } from "../render_engine/types";
import { InspectorGroup, PropertyData, PropertyType, ChangeInfo, BeforeChangeInfo, PropertyParams } from "../modules_editor/Inspector";
import { MaterialVertexProgramEventData, MaterialFragmentProgramEventData, MaterialTransparentEventData, AssetMaterialUniformInfo, AssetTextureInfo } from "../controls/types";
import { hexToRGB, rgbToHex } from "../modules/utils";
import { convertFilterModeToThreeJS, convertThreeJSFilterToFilterMode, generateAtlasOptions, generateFragmentProgramOptions, generateTextureOptions, generateVertexProgramOptions, update_option } from "./helpers";
import { HistoryOwner, THistoryUndo } from "../modules_editor/modules_editor_const";


declare global {
    const AssetInspector: ReturnType<typeof AssetInspectorCreate>;
}

export function register_asset_inspector() {
    (window as any).AssetInspector = AssetInspectorCreate();
}

export enum AssetProperty {
    ASSET_ATLAS = 'asset_atlas',
    ATLAS_BUTTON = 'asset_atlas_button',
    MIN_FILTER = 'asset_min_filter',
    MAG_FILTER = 'asset_mag_filter',
    TRANSPARENT = 'asset_transparent',
    VERTEX_PROGRAM = 'asset_vertex_program',
    FRAGMENT_PROGRAM = 'asset_fragment_program',
    UNIFORM_SAMPLER2D = 'asset_uniform_sampler2d',
    UNIFORM_FLOAT = 'asset_uniform_float',
    UNIFORM_RANGE = 'asset_uniform_range',
    UNIFORM_VEC2 = 'asset_uniform_vec2',
    UNIFORM_VEC3 = 'asset_uniform_vec3',
    UNIFORM_VEC4 = 'asset_uniform_vec4',
    UNIFORM_COLOR = 'asset_uniform_color',
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
                    onBeforeChange: saveAssetAtlas,
                    onChange: handleAssetAtlasChange
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
                    onBeforeChange: saveMinFilter,
                    onChange: handleMinFilterChange
                },
                {
                    name: AssetProperty.MAG_FILTER,
                    title: 'Фильтр увеличения',
                    type: PropertyType.LIST_TEXT,
                    params: {
                        'nearest': FilterMode.NEAREST,
                        'linear': FilterMode.LINEAR
                    },
                    onBeforeChange: saveMagFilter,
                    onChange: handleMagFilterChange
                },
                {
                    name: AssetProperty.VERTEX_PROGRAM,
                    title: 'Vertex Program',
                    type: PropertyType.LIST_TEXT,
                    params: generateVertexProgramOptions(),
                    onBeforeChange: saveMaterialVertexProgram,
                    onChange: handleMaterialVertexProgramChange
                },
                {
                    name: AssetProperty.FRAGMENT_PROGRAM,
                    title: 'Fragment Program',
                    type: PropertyType.LIST_TEXT,
                    params: generateFragmentProgramOptions(),
                    onBeforeChange: saveMaterialFragmentProgram,
                    onChange: handleMaterialFragmentProgramChange
                },
                {
                    name: AssetProperty.TRANSPARENT,
                    title: 'Transparent',
                    type: PropertyType.BOOLEAN,
                    onBeforeChange: saveMaterialTransparent,
                    onChange: handleMaterialTransparentChange
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
                    params: generateTextureOptions(true),
                    onBeforeChange: saveUniformSampler2D,
                    onChange: handleUniformSampler2DChange
                },
                {
                    name: AssetProperty.UNIFORM_FLOAT,
                    title: 'Float',
                    type: PropertyType.NUMBER,
                    onBeforeChange: saveUniformFloat,
                    onChange: handleUniformFloatChange
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
                    onBeforeChange: saveUniformRange,
                    onChange: handleUniformRangeChange
                },
                {
                    name: AssetProperty.UNIFORM_VEC2,
                    title: 'Vec2',
                    type: PropertyType.VECTOR_2,
                    params: {
                        x: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) },
                        y: { min: -1000, max: 1000, step: 0.1, format: (v: number) => v.toFixed(2) }
                    },
                    onBeforeChange: saveUniformVec2,
                    onChange: handleUniformVec2Change
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
                    onBeforeChange: saveUniformVec3,
                    onChange: handleUniformVec3Change
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
                    onBeforeChange: saveUniformVec4,
                    onChange: handleUniformVec4Change
                },
                {
                    name: AssetProperty.UNIFORM_COLOR,
                    title: 'Color',
                    type: PropertyType.COLOR,
                    onBeforeChange: saveUniformColor,
                    onChange: handleUniformColorChange
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

        EventBus.on('SYS_HISTORY_UNDO', async (event: THistoryUndo) => {
            if (event.owner !== HistoryOwner.ASSET_INSPECTOR) return;
            await undo(event);
        });
    }

    // NOTE: возможно лучше принимать имена текстур вместо путей
    function set_selected_textures(textures_paths: string[]) {
        _selected_textures = textures_paths;

        // NOTE: обновляем конфиг атласов
        update_option(_config, AssetProperty.ASSET_ATLAS, generateAtlasOptions);

        const data = _selected_textures.map((path, id) => {
            const result = { id, data: [] as PropertyData<PropertyType>[] };

            const texture_name = get_file_name(path);
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

        // NOTE: обновляем конфиг шейдеров
        update_option(_config, AssetProperty.VERTEX_PROGRAM, generateVertexProgramOptions);
        update_option(_config, AssetProperty.FRAGMENT_PROGRAM, generateFragmentProgramOptions);

        // NOTE: обновляем конфиг текстур для sampler2d полeй
        update_option(_config, AssetProperty.UNIFORM_SAMPLER2D, () => generateTextureOptions(true));

        const data = _selected_materials.map((path, id) => {
            const result = { id, data: [] as PropertyData<PropertyType>[] };

            const material_name = get_file_name(path);
            const material_info = ResourceManager.get_material_info(material_name)
            if (material_info) {
                const origin = ResourceManager.get_material_by_hash(material_name, material_info.origin);
                if (origin) {
                    result.data.push({ name: AssetProperty.VERTEX_PROGRAM, data: get_file_name(material_info.vertexShader) });
                    result.data.push({ name: AssetProperty.FRAGMENT_PROGRAM, data: get_file_name(material_info.fragmentShader) });
                    result.data.push({ name: AssetProperty.TRANSPARENT, data: origin.transparent });

                    Object.entries(origin.uniforms).forEach(([key, uniform]) => {
                        const uniformInfo = material_info.uniforms[key];
                        if (!uniformInfo) return;
                        switch (uniformInfo.type) {
                            case MaterialUniformType.SAMPLER2D:
                                _config.forEach((group) => {
                                    const property = group.property_list.find((property) => property.name == AssetProperty.UNIFORM_SAMPLER2D);
                                    if (!property) return;
                                    const newProperty = { ...property };
                                    newProperty.name = key;
                                    newProperty.title = key;
                                    newProperty.readonly = uniformInfo.readonly;
                                    group.property_list.push(newProperty);
                                });
                                const texture = uniform as IUniform<Texture>;
                                const texture_name = get_file_name((texture.value as any).path || '');
                                const atlas = ResourceManager.get_atlas_by_texture_name(texture_name) || '';
                                result.data.push({ name: key, data: `${atlas}/${texture_name}` });
                                break;
                            case MaterialUniformType.FLOAT:
                                _config.forEach((group) => {
                                    const property = group.property_list.find((property) => property.name == AssetProperty.UNIFORM_FLOAT);
                                    if (!property) return;
                                    // NOTE: создаем новую проперти с теми же параметрами, но с другим именем
                                    const newProperty = { ...property };
                                    newProperty.name = key;
                                    newProperty.title = key;
                                    newProperty.readonly = uniformInfo.readonly;
                                    group.property_list.push(newProperty);
                                });
                                const data = uniform as IUniform<number>;
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
                                    const property = group.property_list.find((property) => property.name == AssetProperty.UNIFORM_VEC2);
                                    if (!property) return;
                                    // NOTE: создаем новую проперти с теми же параметрами, но с другим именем
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
                                    const property = group.property_list.find((property) => property.name == AssetProperty.UNIFORM_VEC3);
                                    if (!property) return;
                                    // NOTE: создаем новую проперти с теми же параметрами, но с другим именем
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
                                    const property = group.property_list.find((property) => property.name == AssetProperty.UNIFORM_VEC4);
                                    if (!property) return;
                                    // NOTE: создаем новую проперти с теми же параметрами, но с другим именем
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
                                    const property = group.property_list.find((property) => property.name == AssetProperty.UNIFORM_COLOR);
                                    if (!property) return;
                                    // NOTE: создаем новую проперти с теми же параметрами, но с другим именем
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
                }
            }

            return result;
        });

        Inspector.clear();
        Inspector.setData(data, _config);
    }

    function saveAssetAtlas(info: BeforeChangeInfo) {
        const atlases: AssetTextureInfo<string>[] = [];
        info.ids.forEach((id) => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Log.error('[saveAtlas] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(texture_path);
            const oldAtlas = ResourceManager.get_atlas_by_texture_name(texture_name);
            atlases.push({ texture_path, value: oldAtlas ? oldAtlas : '' });
        });

        HistoryControl.add('TEXTURE_ATLAS', atlases, HistoryOwner.ASSET_INSPECTOR);
    }

    function handleAssetAtlasChange(info: ChangeInfo) {
        const data = convertChangeInfoToTextureData<string>(info);
        updateAssetAtlas(data.map(item => ({ ...item, atlas: item.value })), info.data.event.last);
    }

    async function updateAssetAtlas(data: AssetTextureInfo<string>[], last: boolean) {
        for (const item of data) {
            const texture_name = get_file_name(item.texture_path);
            const old_atlas = ResourceManager.get_atlas_by_texture_name(texture_name) || '';
            ResourceManager.override_atlas_texture(old_atlas, item.value, texture_name);


            if (last) {
                // NOTE: возможно обновление текстур в мешах должно быть в override_atlas_texture 
                SceneManager.get_scene_list().forEach((mesh) => {
                    const is_type = mesh.type == IObjectTypes.GO_SPRITE_COMPONENT || mesh.type == IObjectTypes.GUI_BOX;
                    if (!is_type) return;

                    const mesh_texture = (mesh as IBaseMesh).get_texture();
                    const is_atlas = mesh_texture.includes(old_atlas);
                    const is_texture = mesh_texture.includes(texture_name);

                    if (is_atlas && is_texture) {
                        mesh.set_texture(texture_name, item.value);
                    }
                });
            }
        }

        if (last) {
            await ResourceManager.write_metadata();
        }
    }

    function saveMinFilter(info: BeforeChangeInfo) {
        const minFilters: AssetTextureInfo<MinificationTextureFilter>[] = [];
        info.ids.forEach((id) => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Log.error('[saveMinFilter] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(texture_path);
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);
            if (atlas == null) {
                Log.error('[saveMinFilter] Atlas not found for texture:', texture_name);
                return;
            }

            const texture_data = ResourceManager.get_texture(texture_name, atlas);
            minFilters.push({
                texture_path,
                value: texture_data.texture.minFilter as MinificationTextureFilter
            });
        });

        HistoryControl.add('TEXTURE_MIN_FILTER', minFilters, HistoryOwner.ASSET_INSPECTOR);
    }

    function handleMinFilterChange(info: ChangeInfo) {
        const data = convertChangeInfoToTextureData<FilterMode>(info).map(item => {
            return {
                ...item,
                value: convertFilterModeToThreeJS(item.value) as MinificationTextureFilter
            };
        });
        updateMinFilter(data.map(item => ({ ...item, value: item.value })), info.data.event.last);
    }

    async function updateMinFilter(data: AssetTextureInfo<MinificationTextureFilter>[], last: boolean) {
        for (const item of data) {
            const texture_name = get_file_name(item.texture_path);
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);
            if (atlas == null) continue;
            const texture_data = ResourceManager.get_texture(texture_name, atlas);
            texture_data.texture.minFilter = item.value;
        }
        if (last) {
            await ResourceManager.write_metadata();
        }
    }

    function saveMagFilter(info: BeforeChangeInfo) {
        const magFilters: AssetTextureInfo<MagnificationTextureFilter>[] = [];
        info.ids.forEach((id) => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Log.error('[saveMagFilter] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(texture_path);
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);
            if (atlas == null) {
                Log.error('[saveMagFilter] Atlas not found for texture:', texture_name);
                return;
            }

            const texture_data = ResourceManager.get_texture(texture_name, atlas);
            magFilters.push({
                texture_path,
                value: texture_data.texture.magFilter as MagnificationTextureFilter
            });
        });

        HistoryControl.add('TEXTURE_MAG_FILTER', magFilters, HistoryOwner.ASSET_INSPECTOR);
    }

    function handleMagFilterChange(info: ChangeInfo) {
        const data = convertChangeInfoToTextureData<FilterMode>(info).map(item => {
            return {
                ...item,
                value: convertFilterModeToThreeJS(item.value) as MagnificationTextureFilter
            };
        });
        updateMagFilter(data.map(item => ({ ...item, value: item.value })), info.data.event.last);
    }

    async function updateMagFilter(data: AssetTextureInfo<MagnificationTextureFilter>[], last: boolean) {
        for (const item of data) {
            const texture_name = get_file_name(item.texture_path);
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);
            if (atlas == null) continue;
            const texture_data = ResourceManager.get_texture(texture_name, atlas);
            texture_data.texture.magFilter = item.value;
        }
        if (last) {
            await ResourceManager.write_metadata();
        }
    }

    function saveMaterialVertexProgram(info: BeforeChangeInfo) {
        const vertexPrograms: MaterialVertexProgramEventData[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(path);
            const material_info = ResourceManager.get_material_info(name);
            if (!material_info) return;
            const origin = ResourceManager.get_material_by_hash(name, material_info.origin);
            if (!origin) return;
            vertexPrograms.push({
                material_path: path,
                program: origin.vertexShader
            });
        });
        HistoryControl.add('MATERIAL_VERTEX_PROGRAM', vertexPrograms, HistoryOwner.ASSET_INSPECTOR);
    }

    function handleMaterialVertexProgramChange(info: ChangeInfo) {
        const data = convertChangeInfoToMaterialData<string>(info);
        updateMaterialVertexProgram(data.map(item => ({ material_path: item.material_path, program: item.value })), info.data.event.last);
    }

    async function updateMaterialVertexProgram(data: MaterialVertexProgramEventData[], last: boolean) {
        for (const item of data) {
            const get_response = await AssetControl.get_file_data(item.material_path);
            if (get_response.result != 1) continue;
            const material_data = JSON.parse(get_response.data!);
            material_data.vertexShader = item.program;
            await AssetControl.save_file_data(item.material_path, JSON.stringify(material_data, null, 2));

            if (last) {
                EventBus.trigger('SYS_MATERIAL_CHANGED', {
                    material_name: get_file_name(item.material_path),
                    is_uniform: false,
                    property: 'vertexShader',
                    value: item.program
                }, false);
            }
        }
    }

    function saveMaterialFragmentProgram(info: BeforeChangeInfo) {
        const fragmentPrograms: MaterialFragmentProgramEventData[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(path);
            const material_info = ResourceManager.get_material_info(name);
            if (!material_info) return;
            const origin = ResourceManager.get_material_by_hash(name, material_info.origin);
            if (!origin) return;
            fragmentPrograms.push({
                material_path: path,
                program: origin.fragmentShader
            });
        });
        HistoryControl.add('MATERIAL_FRAGMENT_PROGRAM', fragmentPrograms, HistoryOwner.ASSET_INSPECTOR);
    }

    async function handleMaterialFragmentProgramChange(info: ChangeInfo) {
        const data = convertChangeInfoToMaterialData<string>(info);
        await updateMaterialFragmentProgram(data.map(item => ({ material_path: item.material_path, program: item.value })), info.data.event.last);
    }

    async function updateMaterialFragmentProgram(data: MaterialFragmentProgramEventData[], last: boolean) {
        for (const item of data) {
            const get_response = await AssetControl.get_file_data(item.material_path);
            if (get_response.result != 1) continue;
            const material_data = JSON.parse(get_response.data!);
            material_data.fragmentShader = item.program;
            await AssetControl.save_file_data(item.material_path, JSON.stringify(material_data, null, 2));

            if (last) {
                EventBus.trigger('SYS_MATERIAL_CHANGED', {
                    material_name: get_file_name(item.material_path),
                    is_uniform: false,
                    property: 'fragmentShader',
                    value: item.program
                }, false);
            }
        }
    }

    function saveUniformSampler2D(info: BeforeChangeInfo) {
        const sampler2Ds: AssetMaterialUniformInfo<string>[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(path);
            const material_info = ResourceManager.get_material_info(name);
            if (!material_info) return;
            const origin = ResourceManager.get_material_by_hash(name, material_info.origin);
            if (!origin) return;
            const uniform = origin.uniforms[info.field.name];
            if (uniform) {
                sampler2Ds.push({
                    material_path: path,
                    uniform_name: info.field.name,
                    value: uniform.value?.image?.src || ''
                });
            }
        });
        HistoryControl.add('MATERIAL_SAMPLER2D', sampler2Ds, HistoryOwner.ASSET_INSPECTOR);
    }

    async function handleUniformSampler2DChange(info: ChangeInfo) {
        const data = convertChangeInfoToMaterialData<string>(info);
        await updateUniformSampler2D(data.map(item => ({
            material_path: item.material_path,
            uniform_name: item.uniform_name!,
            value: item.value
        })), info.data.event.last);
    }

    async function updateUniformSampler2D(data: AssetMaterialUniformInfo<string>[], last: boolean) {
        for (const item of data) {
            const get_response = await AssetControl.get_file_data(item.material_path);
            if (get_response.result != 1) continue;
            const material_data = JSON.parse(get_response.data!);
            material_data.data[item.uniform_name] = item.value || null;
            await AssetControl.save_file_data(item.material_path, JSON.stringify(material_data, null, 2));

            if (last) {
                EventBus.trigger('SYS_MATERIAL_CHANGED', {
                    material_name: get_file_name(item.material_path),
                    is_uniform: true,
                    property: item.uniform_name,
                    value: item.value
                }, false);
            }
        }
    }

    function saveUniformFloat(info: BeforeChangeInfo) {
        const floats: AssetMaterialUniformInfo<number>[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(path);
            const material_info = ResourceManager.get_material_info(name);
            if (!material_info) return;
            const origin = ResourceManager.get_material_by_hash(name, material_info.origin);
            if (!origin) return;
            const uniform = origin.uniforms[info.field.name];
            if (uniform) {
                floats.push({
                    material_path: path,
                    uniform_name: info.field.name,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MATERIAL_FLOAT', floats, HistoryOwner.ASSET_INSPECTOR);
    }

    async function handleUniformFloatChange(info: ChangeInfo) {
        const data = convertChangeInfoToMaterialData<number>(info);
        await updateUniformFloat(data.map(item => ({
            material_path: item.material_path,
            uniform_name: item.uniform_name!,
            value: item.value
        })), info.data.event.last);
    }

    async function updateUniformFloat(data: AssetMaterialUniformInfo<number>[], last: boolean) {
        for (const item of data) {
            const get_response = await AssetControl.get_file_data(item.material_path);
            if (get_response.result != 1) continue;
            const material_data = JSON.parse(get_response.data!);
            material_data.data[item.uniform_name] = item.value;
            await AssetControl.save_file_data(item.material_path, JSON.stringify(material_data, null, 2));

            if (last) {
                EventBus.trigger('SYS_MATERIAL_CHANGED', {
                    material_name: get_file_name(item.material_path),
                    is_uniform: true,
                    property: item.uniform_name,
                    value: item.value
                }, false);
            }
        }
    }

    function saveUniformRange(info: BeforeChangeInfo) {
        const ranges: AssetMaterialUniformInfo<number>[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(path);
            const material_info = ResourceManager.get_material_info(name);
            if (!material_info) return;
            const origin = ResourceManager.get_material_by_hash(name, material_info.origin);
            if (!origin) return;
            const uniform = origin.uniforms[info.field.name];
            if (uniform) {
                ranges.push({
                    material_path: path,
                    uniform_name: info.field.name,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MATERIAL_RANGE', ranges, HistoryOwner.ASSET_INSPECTOR);
    }

    async function handleUniformRangeChange(info: ChangeInfo) {
        const data = convertChangeInfoToMaterialData<number>(info);
        await updateUniformRange(data.map(item => ({
            material_path: item.material_path,
            uniform_name: item.uniform_name!,
            value: item.value
        })), info.data.event.last);
    }

    async function updateUniformRange(data: AssetMaterialUniformInfo<number>[], last: boolean) {
        for (const item of data) {
            const get_response = await AssetControl.get_file_data(item.material_path);
            if (get_response.result != 1) continue;
            const material_data = JSON.parse(get_response.data!);
            material_data.data[item.uniform_name] = item.value;
            await AssetControl.save_file_data(item.material_path, JSON.stringify(material_data, null, 2));

            if (last) {
                EventBus.trigger('SYS_MATERIAL_CHANGED', {
                    material_name: get_file_name(item.material_path),
                    is_uniform: true,
                    property: item.uniform_name,
                    value: item.value
                }, false);
            }
        }
    }

    function saveUniformVec2(info: BeforeChangeInfo) {
        const vec2s: AssetMaterialUniformInfo<Vector2>[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(path);
            const material_info = ResourceManager.get_material_info(name);
            if (!material_info) return;
            const origin = ResourceManager.get_material_by_hash(name, material_info.origin);
            if (!origin) return;
            const uniform = origin.uniforms[info.field.name];
            if (uniform) {
                vec2s.push({
                    material_path: path,
                    uniform_name: info.field.name,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MATERIAL_VEC2', vec2s, HistoryOwner.ASSET_INSPECTOR);
    }

    async function handleUniformVec2Change(info: ChangeInfo) {
        const data = convertChangeInfoToMaterialData<Vector2>(info);
        await updateUniformVec2(data.map(item => ({
            material_path: item.material_path,
            uniform_name: item.uniform_name!,
            value: item.value
        })), info.data.event.last);
    }

    async function updateUniformVec2(data: AssetMaterialUniformInfo<Vector2>[], last: boolean) {
        for (const item of data) {
            const get_response = await AssetControl.get_file_data(item.material_path);
            if (get_response.result != 1) continue;
            const material_data = JSON.parse(get_response.data!);
            material_data.data[item.uniform_name] = item.value.toArray();
            await AssetControl.save_file_data(item.material_path, JSON.stringify(material_data, null, 2));

            if (last) {
                EventBus.trigger('SYS_MATERIAL_CHANGED', {
                    material_name: get_file_name(item.material_path),
                    is_uniform: true,
                    property: item.uniform_name,
                    value: item.value
                }, false);
            }
        }
    }

    function saveUniformVec3(info: BeforeChangeInfo) {
        const vec3s: AssetMaterialUniformInfo<Vector3>[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(path);
            const material_info = ResourceManager.get_material_info(name);
            if (!material_info) return;
            const origin = ResourceManager.get_material_by_hash(name, material_info.origin);
            if (!origin) return;
            const uniform = origin.uniforms[info.field.name];
            if (uniform) {
                vec3s.push({
                    material_path: path,
                    uniform_name: info.field.name,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MATERIAL_VEC3', vec3s, HistoryOwner.ASSET_INSPECTOR);
    }

    async function handleUniformVec3Change(info: ChangeInfo) {
        const data = convertChangeInfoToMaterialData<Vector3>(info);
        await updateUniformVec3(data.map(item => ({
            material_path: item.material_path,
            uniform_name: item.uniform_name!,
            value: item.value
        })), info.data.event.last);
    }

    async function updateUniformVec3(data: AssetMaterialUniformInfo<Vector3>[], last: boolean) {
        for (const item of data) {
            const get_response = await AssetControl.get_file_data(item.material_path);
            if (get_response.result != 1) continue;
            const material_data = JSON.parse(get_response.data!);
            material_data.data[item.uniform_name] = item.value.toArray();
            await AssetControl.save_file_data(item.material_path, JSON.stringify(material_data, null, 2));

            if (last) {
                EventBus.trigger('SYS_MATERIAL_CHANGED', {
                    material_name: get_file_name(item.material_path),
                    is_uniform: true,
                    property: item.uniform_name,
                    value: item.value
                }, false);
            }
        }
    }

    function saveUniformVec4(info: BeforeChangeInfo) {
        const vec4s: AssetMaterialUniformInfo<Vector4>[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(path);
            const material_info = ResourceManager.get_material_info(name);
            if (!material_info) return;
            const origin = ResourceManager.get_material_by_hash(name, material_info.origin);
            if (!origin) return;
            const uniform = origin.uniforms[info.field.name];
            if (uniform) {
                vec4s.push({
                    material_path: path,
                    uniform_name: info.field.name,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MATERIAL_VEC4', vec4s, HistoryOwner.ASSET_INSPECTOR);
    }

    async function handleUniformVec4Change(info: ChangeInfo) {
        const data = convertChangeInfoToMaterialData<Vector4>(info);
        await updateUniformVec4(data.map(item => ({
            material_path: item.material_path,
            uniform_name: item.uniform_name!,
            value: item.value
        })), info.data.event.last);
    }

    async function updateUniformVec4(data: AssetMaterialUniformInfo<Vector4>[], last: boolean) {
        for (const item of data) {
            const get_response = await AssetControl.get_file_data(item.material_path);
            if (get_response.result != 1) continue;
            const material_data = JSON.parse(get_response.data!);
            material_data.data[item.uniform_name] = item.value.toArray();
            await AssetControl.save_file_data(item.material_path, JSON.stringify(material_data, null, 2));

            if (last) {
                EventBus.trigger('SYS_MATERIAL_CHANGED', {
                    material_name: get_file_name(item.material_path),
                    is_uniform: true,
                    property: item.uniform_name,
                    value: item.value
                }, false);
            }
        }
    }

    function saveUniformColor(info: BeforeChangeInfo) {
        const colors: AssetMaterialUniformInfo<string>[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(path);
            const material_info = ResourceManager.get_material_info(name);
            if (!material_info) return;
            const origin = ResourceManager.get_material_by_hash(name, material_info.origin);
            if (!origin) return;
            const uniform = origin.uniforms[info.field.name];
            if (uniform) {
                const color = new Color();
                color.setRGB(uniform.value.x, uniform.value.y, uniform.value.z);
                colors.push({
                    material_path: path,
                    uniform_name: info.field.name,
                    value: color.getHexString()
                });
            }
        });
        HistoryControl.add('MATERIAL_COLOR', colors, HistoryOwner.ASSET_INSPECTOR);
    }

    async function handleUniformColorChange(info: ChangeInfo) {
        const data = convertChangeInfoToMaterialData<string>(info);
        await updateUniformColor(data.map(item => ({
            material_path: item.material_path,
            uniform_name: item.uniform_name!,
            value: item.value
        })), info.data.event.last);
    }

    async function updateUniformColor(data: AssetMaterialUniformInfo<string>[], last: boolean) {
        for (const item of data) {
            const get_response = await AssetControl.get_file_data(item.material_path);
            if (get_response.result != 1) continue;
            const material_data = JSON.parse(get_response.data!);
            material_data.data[item.uniform_name] = item.value;
            await AssetControl.save_file_data(item.material_path, JSON.stringify(material_data, null, 2));

            if (last) {
                const color = new Color(item.value);
                EventBus.trigger('SYS_MATERIAL_CHANGED', {
                    material_name: get_file_name(item.material_path),
                    is_uniform: true,
                    property: item.uniform_name,
                    value: hexToRGB(color.getHexString())
                }, false);
            }
        }
    }

    function saveMaterialTransparent(info: BeforeChangeInfo) {
        const transparents: MaterialTransparentEventData[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(path);
            const material_info = ResourceManager.get_material_info(name);
            if (!material_info) return;
            const origin = ResourceManager.get_material_by_hash(name, material_info.origin);
            if (!origin) return;
            transparents.push({
                material_path: path,
                value: origin.transparent
            });
        });
        HistoryControl.add('MATERIAL_TRANSPARENT', transparents, HistoryOwner.ASSET_INSPECTOR);
    }

    async function handleMaterialTransparentChange(info: ChangeInfo) {
        const data = convertChangeInfoToMaterialData<boolean>(info);
        await updateMaterialTransparent(data.map(item => ({
            material_path: item.material_path,
            value: item.value
        })), info.data.event.last);
    }

    async function updateMaterialTransparent(data: MaterialTransparentEventData[], last: boolean) {
        for (const item of data) {
            const get_response = await AssetControl.get_file_data(item.material_path);
            if (get_response.result != 1) continue;
            const material_data = JSON.parse(get_response.data!);
            material_data.transparent = item.value;
            await AssetControl.save_file_data(item.material_path, JSON.stringify(material_data, null, 2));

            if (last) {
                EventBus.trigger('SYS_MATERIAL_CHANGED', {
                    material_name: get_file_name(item.material_path),
                    is_uniform: false,
                    property: 'transparent',
                    value: item.value
                }, false);
            }
        }
    }

    function convertChangeInfoToMaterialData<T>(info: ChangeInfo): { material_path: string, uniform_name?: string, value: T }[] {
        const value = info.data.event.value as T;
        return info.ids.map(id => {
            const path = _selected_materials[id];
            if (path == null) return null;
            return {
                material_path: path,
                uniform_name: info.data.field?.name,
                value
            };
        }).filter(item => item != null) as { material_path: string, uniform_name?: string, value: T }[];
    }

    function convertChangeInfoToTextureData<T>(info: ChangeInfo): { texture_path: string, value: T }[] {
        const value = info.data.event.value as T;
        return info.ids.map(id => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Log.error('[convertChangeInfoToTextureData] Texture path not found for id:', id);
                return null;
            }
            return { texture_path, value };
        }).filter(item => item != null) as { texture_path: string, value: T }[];
    }

    async function undo(event: THistoryUndo) {
        if (event.owner !== HistoryOwner.ASSET_INSPECTOR) return;

        switch (event.type) {
            case 'TEXTURE_ATLAS':
                const atlases = event.data as AssetTextureInfo<string>[];
                await updateAssetAtlas(atlases, true);
                break;

            case 'TEXTURE_MIN_FILTER':
                const minFilters = event.data as AssetTextureInfo<MinificationTextureFilter>[];
                await updateMinFilter(minFilters, true);
                break;

            case 'TEXTURE_MAG_FILTER':
                const magFilters = event.data as AssetTextureInfo<MagnificationTextureFilter>[];
                await updateMagFilter(magFilters, true);
                break;

            case 'MATERIAL_VERTEX_PROGRAM':
                const vertexPrograms = event.data as MaterialVertexProgramEventData[];
                await updateMaterialVertexProgram(vertexPrograms, true);
                break;

            case 'MATERIAL_FRAGMENT_PROGRAM':
                const fragmentPrograms = event.data as MaterialFragmentProgramEventData[];
                await updateMaterialFragmentProgram(fragmentPrograms, true);
                break;

            case 'MATERIAL_SAMPLER2D':
                const sampler2Ds = event.data as AssetMaterialUniformInfo<string>[];
                await updateUniformSampler2D(sampler2Ds, true);
                break;

            case 'MATERIAL_FLOAT':
                const floats = event.data as AssetMaterialUniformInfo<number>[];
                await updateUniformFloat(floats, true);
                break;

            case 'MATERIAL_RANGE':
                const ranges = event.data as AssetMaterialUniformInfo<number>[];
                await updateUniformRange(ranges, true);
                break;

            case 'MATERIAL_VEC2':
                const vec2s = event.data as AssetMaterialUniformInfo<Vector2>[];
                await updateUniformVec2(vec2s, true);
                break;

            case 'MATERIAL_VEC3':
                const vec3s = event.data as AssetMaterialUniformInfo<Vector3>[];
                await updateUniformVec3(vec3s, true);
                break;

            case 'MATERIAL_VEC4':
                const vec4s = event.data as AssetMaterialUniformInfo<Vector4>[];
                await updateUniformVec4(vec4s, true);
                break;

            case 'MATERIAL_COLOR':
                const colors = event.data as AssetMaterialUniformInfo<string>[];
                await updateUniformColor(colors, true);
                break;

            case 'MATERIAL_TRANSPARENT':
                const transparents = event.data as MaterialTransparentEventData[];
                await updateMaterialTransparent(transparents, true);
                break;
        }
    }

    init();
    return { set_selected_textures, set_selected_materials };
}