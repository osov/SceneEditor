// NOTE: для большей ясности все изменения в материалах делаются на прямую в файл, ResourceManager прослушивает изменения в файлах и обновляет загруженные данные, альтернативный вариант, это посылать события изменения материала и прослушивать их в ResourceManager, но в таком случае будет чуть больше запутанность, так как ResourceManager всеравно будет прослушивать изменения в файлах, но при этом еще и обрабатывать напрямую события изменения материала, который записывает в файл, еще как вариант, это посылать только событие изменения, а ResourceManager будет обрабатывать и сам записывать эти изменения в файл


import { Vector2, Vector3, Vector4, Color, IUniform, Texture, MagnificationTextureFilter, MinificationTextureFilter } from "three";
import { get_file_name } from "../render_engine/helpers/utils";
import { MaterialUniformParams, MaterialUniformType } from "../render_engine/resource_manager";
import { IObjectTypes, IBaseMesh } from "../render_engine/types";
import { PropertyData, PropertyType, ChangeInfo, BeforeChangeInfo } from "../modules_editor/Inspector";
import { AssetTextureInfo, AssetMaterialInfo } from "../controls/types";
import { rgbToHex } from "../modules/utils";
import { convertFilterModeToThreeJS, convertThreeJSFilterToFilterMode, generateAtlasOptions, generateFragmentProgramOptions, generateTextureOptions, generateVertexProgramOptions } from "./helpers";
import { HistoryOwner, THistoryUndo } from "../modules_editor/modules_editor_const";


declare global {
    const AssetInspector: ReturnType<typeof AssetInspectorCreate>;
}

export function register_asset_inspector() {
    (window as any).AssetInspector = AssetInspectorCreate();
}

export enum AssetProperty {
    ASSET_ATLAS = 'Aтлас',
    ATLAS_BUTTON = 'Атлас менеджер',
    MIN_FILTER = 'Минимальный фильтр',
    MAG_FILTER = 'Максимальный фильтр',
    TRANSPARENT = 'Прозрачность',
    VERTEX_PROGRAM = 'Вершинный шейдер',
    FRAGMENT_PROGRAM = 'Фрагментный шейдер',
}

export enum FilterMode {
    NEAREST = 'nearest',
    LINEAR = 'linear',
}

function AssetInspectorCreate() {
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

        const data = _selected_textures.map((path, id) => {
            const result = { id, fields: [] as PropertyData<PropertyType>[] };

            const texture_name = get_file_name(path);
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);

            if (atlas == null) {
                Log.error(`[set_selected_textures] Atlas for texture ${texture_name} not found`);
                return { id, fields: [] };
            }

            result.fields.push({
                name: AssetProperty.ASSET_ATLAS,
                value: atlas,
                type: PropertyType.LIST_TEXT,
                params: generateAtlasOptions(),
                onBeforeChange: saveAssetAtlas,
                onChange: handleAssetAtlasChange
            });

            result.fields.push({
                name: AssetProperty.ATLAS_BUTTON,
                type: PropertyType.BUTTON,
                value: () => {
                    ControlManager.open_atlas_manager();
                }
            });

            const min_filter = convertThreeJSFilterToFilterMode(ResourceManager.get_texture(texture_name, atlas).texture.minFilter);
            const mag_filter = convertThreeJSFilterToFilterMode(ResourceManager.get_texture(texture_name, atlas).texture.magFilter);

            result.fields.push({
                name: AssetProperty.MIN_FILTER,
                value: min_filter,
                type: PropertyType.LIST_TEXT,
                params: {
                    'nearest': FilterMode.NEAREST,
                    'linear': FilterMode.LINEAR
                },
                onBeforeChange: saveMinFilter,
                onChange: handleMinFilterChange
            });

            result.fields.push({
                name: AssetProperty.MAG_FILTER,
                value: mag_filter,
                type: PropertyType.LIST_TEXT,
                params: {
                    'nearest': FilterMode.NEAREST,
                    'linear': FilterMode.LINEAR
                },
                onBeforeChange: saveMagFilter,
                onChange: handleMagFilterChange
            });

            return result;
        });

        Inspector.clear();
        Inspector.setData(data);
    }

    function set_selected_materials(materials_paths: string[]) {
        _selected_materials = materials_paths;

        const data = _selected_materials.map((path, id) => {
            const result = { id, fields: [] as PropertyData<PropertyType>[] };

            const material_name = get_file_name(path);
            const material_info = ResourceManager.get_material_info(material_name)
            if (material_info) {
                const origin = ResourceManager.get_material_by_hash(material_name, material_info.origin);
                if (origin) {
                    result.fields.push({
                        name: AssetProperty.VERTEX_PROGRAM,
                        value: material_info.vertexShader,
                        type: PropertyType.LIST_TEXT,
                        params: generateVertexProgramOptions(),
                        onBeforeChange: saveMaterialVertexProgram,
                        onChange: handleMaterialVertexProgramChange
                    });

                    result.fields.push({
                        name: AssetProperty.FRAGMENT_PROGRAM,
                        value: material_info.fragmentShader,
                        type: PropertyType.LIST_TEXT,
                        params: generateFragmentProgramOptions(),
                        onBeforeChange: saveMaterialFragmentProgram,
                        onChange: handleMaterialFragmentProgramChange
                    });

                    result.fields.push({
                        name: AssetProperty.TRANSPARENT,
                        value: origin.transparent,
                        type: PropertyType.BOOLEAN,
                        onBeforeChange: saveMaterialTransparent,
                        onChange: handleMaterialTransparentChange
                    });

                    Object.entries(origin.uniforms).forEach(([key, uniform]) => {
                        const uniformInfo = material_info.uniforms[key];
                        if (!uniformInfo) return;
                        if (uniformInfo.hide) return;
                        switch (uniformInfo.type) {
                            case MaterialUniformType.SAMPLER2D:
                                const texture = uniform as IUniform<Texture>;
                                const texture_name = get_file_name((texture.value as any).path || '');
                                const atlas = ResourceManager.get_atlas_by_texture_name(texture_name) || '';
                                result.fields.push({
                                    name: key,
                                    value: `${atlas}/${texture_name}`,
                                    type: PropertyType.LIST_TEXTURES,
                                    params: generateTextureOptions(true),
                                    onBeforeChange: saveUniformSampler2D,
                                    onChange: handleUniformSampler2DChange
                                });
                                break;
                            case MaterialUniformType.FLOAT:
                                const data = uniform as IUniform<number>;
                                result.fields.push({
                                    name: key,
                                    value: data.value,
                                    type: PropertyType.NUMBER,
                                    onBeforeChange: saveUniformFloat,
                                    onChange: handleUniformChange<number>
                                });
                                break;
                            case MaterialUniformType.RANGE:
                                const range = uniform as IUniform<number>;
                                const range_params = uniformInfo.params as MaterialUniformParams[MaterialUniformType.RANGE];
                                result.fields.push({
                                    name: key,
                                    value: range.value,
                                    type: PropertyType.SLIDER,
                                    params: {
                                        min: range_params.min ?? 0,
                                        max: range_params.max ?? 1,
                                        step: range_params.step ?? 0.01
                                    },
                                    onBeforeChange: saveUniformRange,
                                    onChange: handleUniformChange<number>
                                });
                                break;
                            case MaterialUniformType.VEC2:
                                const vec2 = uniform as IUniform<Vector2>;
                                const vec2_params = uniformInfo.params as MaterialUniformParams[MaterialUniformType.VEC2];
                                result.fields.push({
                                    name: key,
                                    value: vec2.value,
                                    type: PropertyType.VECTOR_2,
                                    params: {
                                        x: {
                                            min: vec2_params.x.min ?? -1000,
                                            max: vec2_params.x.max ?? 1000,
                                            step: vec2_params.x.step ?? 0.1,
                                            format: (v: number) => v.toFixed(2)
                                        },
                                        y: {
                                            min: vec2_params.y.min ?? -1000,
                                            max: vec2_params.y.max ?? 1000,
                                            step: vec2_params.y.step ?? 0.1,
                                            format: (v: number) => v.toFixed(2)
                                        }
                                    },
                                    onBeforeChange: saveUniformVec2,
                                    onChange: handleUniformChange<Vector2>
                                });
                                break;
                            case MaterialUniformType.VEC3:
                                const vec3 = uniform as IUniform<Vector3>;
                                const vec3_params = uniformInfo.params as MaterialUniformParams[MaterialUniformType.VEC3];
                                result.fields.push({
                                    name: key,
                                    value: vec3.value,
                                    type: PropertyType.VECTOR_3,
                                    params: {
                                        x: {
                                            min: vec3_params.x.min ?? -1000,
                                            max: vec3_params.x.max ?? 1000,
                                            step: vec3_params.x.step ?? 0.1,
                                            format: (v: number) => v.toFixed(2)
                                        },
                                        y: {
                                            min: vec3_params.y.min ?? -1000,
                                            max: vec3_params.y.max ?? 1000,
                                            step: vec3_params.y.step ?? 0.1,
                                            format: (v: number) => v.toFixed(2)
                                        },
                                        z: {
                                            min: vec3_params.z.min ?? -1000,
                                            max: vec3_params.z.max ?? 1000,
                                            step: vec3_params.z.step ?? 0.1,
                                            format: (v: number) => v.toFixed(2)
                                        }
                                    },
                                    onBeforeChange: saveUniformVec3,
                                    onChange: handleUniformChange<Vector3>
                                });
                                break;
                            case MaterialUniformType.VEC4:
                                const vec4 = uniform as IUniform<Vector4>;
                                const vec4_params = uniformInfo.params as MaterialUniformParams[MaterialUniformType.VEC4];
                                result.fields.push({
                                    name: key,
                                    value: vec4.value,
                                    type: PropertyType.VECTOR_4,
                                    params: {
                                        x: {
                                            min: vec4_params.x.min ?? -1000,
                                            max: vec4_params.x.max ?? 1000,
                                            step: vec4_params.x.step ?? 0.1,
                                            format: (v: number) => v.toFixed(2)
                                        },
                                        y: {
                                            min: vec4_params.y.min ?? -1000,
                                            max: vec4_params.y.max ?? 1000,
                                            step: vec4_params.y.step ?? 0.1,
                                            format: (v: number) => v.toFixed(2)
                                        },
                                        z: {
                                            min: vec4_params.z.min ?? -1000,
                                            max: vec4_params.z.max ?? 1000,
                                            step: vec4_params.z.step ?? 0.1,
                                            format: (v: number) => v.toFixed(2)
                                        },
                                        w: {
                                            min: vec4_params.w.min ?? -1000,
                                            max: vec4_params.w.max ?? 1000,
                                            step: vec4_params.w.step ?? 0.1,
                                            format: (v: number) => v.toFixed(2)
                                        }
                                    },
                                    onBeforeChange: saveUniformVec4,
                                    onChange: handleUniformChange<Vector4>
                                });
                                break;
                            case MaterialUniformType.COLOR:
                                const color = uniform as IUniform<Vector3>;
                                result.fields.push({
                                    name: key,
                                    value: rgbToHex(color.value),
                                    type: PropertyType.COLOR,
                                    onBeforeChange: saveUniformColor,
                                    onChange: handleUniformChange<string>
                                });
                                break;
                        }
                    });
                }
            }

            return result;
        });

        Inspector.clear();
        Inspector.setData(data);
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

    async function updateMaterialProperty<T>(data: AssetMaterialInfo<T>[], last: boolean) {
        for (const item of data) {
            EventBus.trigger('SYS_MATERIAL_CHANGED', {
                material_name: get_file_name(item.material_path),
                is_uniform: false,
                property: item.name,
                value: item.value
            }, false);

            if (last) {
                const get_response = await AssetControl.get_file_data(item.material_path);
                if (get_response.result != 1) continue;
                const material_data = JSON.parse(get_response.data!);
                material_data[item.name] = item.value;
                await AssetControl.save_file_data(item.material_path, JSON.stringify(material_data, null, 2));
            }
        }
    }

    function saveMaterialVertexProgram(info: BeforeChangeInfo) {
        const vertexPrograms: AssetMaterialInfo<string>[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(path);
            const material_info = ResourceManager.get_material_info(name);
            if (!material_info) return;
            const origin = ResourceManager.get_material_by_hash(name, material_info.origin);
            if (!origin) return;
            vertexPrograms.push({
                material_path: path,
                name: 'vertexShader',
                value: origin.vertexShader
            });
        });
        HistoryControl.add('MATERIAL_VERTEX_PROGRAM', vertexPrograms, HistoryOwner.ASSET_INSPECTOR);
    }

    function handleMaterialVertexProgramChange(info: ChangeInfo) {
        const data = convertChangeInfoToMaterialData<string>(info);
        updateMaterialProperty(data, info.data.event.last);
    }

    function saveMaterialFragmentProgram(info: BeforeChangeInfo) {
        const fragmentPrograms: AssetMaterialInfo<string>[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(path);
            const material_info = ResourceManager.get_material_info(name);
            if (!material_info) return;
            const origin = ResourceManager.get_material_by_hash(name, material_info.origin);
            if (!origin) return;
            fragmentPrograms.push({
                material_path: path,
                name: 'fragmentShader',
                value: origin.fragmentShader
            });
        });
        HistoryControl.add('MATERIAL_FRAGMENT_PROGRAM', fragmentPrograms, HistoryOwner.ASSET_INSPECTOR);
    }

    async function handleMaterialFragmentProgramChange(info: ChangeInfo) {
        const data = convertChangeInfoToMaterialData<string>(info);
        await updateMaterialProperty(data, info.data.event.last);
    }

    function saveMaterialTransparent(info: BeforeChangeInfo) {
        const transparents: AssetMaterialInfo<boolean>[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(path);
            const material_info = ResourceManager.get_material_info(name);
            if (!material_info) return;
            const origin = ResourceManager.get_material_by_hash(name, material_info.origin);
            if (!origin) return;
            transparents.push({
                material_path: path,
                name: 'transparent',
                value: origin.transparent
            });
        });
        HistoryControl.add('MATERIAL_TRANSPARENT', transparents, HistoryOwner.ASSET_INSPECTOR);
    }

    async function handleMaterialTransparentChange(info: ChangeInfo) {
        const data = convertChangeInfoToMaterialData<boolean>(info);
        await updateMaterialProperty(data, info.data.event.last);
    }

    async function handleUniformChange<T>(info: ChangeInfo) {
        const data = convertChangeInfoToMaterialData<T>(info);
        await updateUniform(data, info.data.event.last);
    }

    function saveUniforms<T>(info: BeforeChangeInfo) {
        const uniforms: AssetMaterialInfo<T>[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(path);
            const material_info = ResourceManager.get_material_info(name);
            if (!material_info) return;
            const origin = ResourceManager.get_material_by_hash(name, material_info.origin);
            if (!origin) return;
            const uniform = origin.uniforms[info.field.name];
            if (uniform) {
                uniforms.push({
                    material_path: path,
                    name: info.field.name,
                    value: uniform.value
                });
            }
        });
        return uniforms;
    }

    async function updateUniform<T>(data: AssetMaterialInfo<T>[], last: boolean) {
        for (const item of data) {
            await ResourceManager.set_material_uniform_for_original(get_file_name(item.material_path), item.name, item.value, last);
        }
    }

    function saveUniformSampler2D(info: BeforeChangeInfo) {
        const sampler2Ds: AssetMaterialInfo<string>[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(path);
            const material_info = ResourceManager.get_material_info(name);
            if (!material_info) return;
            const origin = ResourceManager.get_material_by_hash(name, material_info.origin);
            if (!origin) return;
            const uniform = origin.uniforms[info.field.name];
            if (uniform) {
                const texture_name = get_file_name(uniform.value.path || '');
                const atlas = ResourceManager.get_atlas_by_texture_name(texture_name) || '';
                sampler2Ds.push({
                    material_path: path,
                    name: info.field.name,
                    value: `${atlas}/${texture_name}`
                });
            }
        });
        HistoryControl.add('MATERIAL_SAMPLER2D', sampler2Ds, HistoryOwner.ASSET_INSPECTOR);
    }

    async function handleUniformSampler2DChange(info: ChangeInfo) {
        const data = convertChangeInfoToMaterialData<string>(info);
        await updateUniformSampler2D(data, info.data.event.last);
    }

    async function updateUniformSampler2D(data: AssetMaterialInfo<string>[], last: boolean) {
        for (const item of data) {
            const texture_name = get_file_name(item.value || '');
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name) || '';
            const texture = ResourceManager.get_texture(texture_name, atlas).texture;
            await ResourceManager.set_material_uniform_for_original(get_file_name(item.material_path), item.name, texture, last);
        }
    }

    function saveUniformFloat(info: BeforeChangeInfo) {
        const floats = saveUniforms<number>(info);
        HistoryControl.add('MATERIAL_FLOAT', floats, HistoryOwner.ASSET_INSPECTOR);
    }

    function saveUniformRange(info: BeforeChangeInfo) {
        const ranges = saveUniforms<number>(info);
        HistoryControl.add('MATERIAL_RANGE', ranges, HistoryOwner.ASSET_INSPECTOR);
    }

    function saveUniformVec2(info: BeforeChangeInfo) {
        const vec2s = saveUniforms<Vector2>(info);
        HistoryControl.add('MATERIAL_VEC2', vec2s, HistoryOwner.ASSET_INSPECTOR);
    }

    function saveUniformVec3(info: BeforeChangeInfo) {
        const vec3s = saveUniforms<Vector3>(info);
        HistoryControl.add('MATERIAL_VEC3', vec3s, HistoryOwner.ASSET_INSPECTOR);
    }

    function saveUniformVec4(info: BeforeChangeInfo) {
        const vec4s = saveUniforms<Vector4>(info);
        HistoryControl.add('MATERIAL_VEC4', vec4s, HistoryOwner.ASSET_INSPECTOR);
    }

    function saveUniformColor(info: BeforeChangeInfo) {
        const colors: AssetMaterialInfo<string>[] = [];
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
                    name: info.field.name,
                    value: color.getHexString()
                });
            }
        });
        HistoryControl.add('MATERIAL_COLOR', colors, HistoryOwner.ASSET_INSPECTOR);
    }

    function convertChangeInfoToMaterialData<T>(info: ChangeInfo): { material_path: string, name: string, value: T }[] {
        const value = info.data.event.value as T;
        return info.ids.map(id => {
            const path = _selected_materials[id];
            if (path == null) return null;
            return {
                material_path: path,
                name: info.data.field?.name,
                value
            };
        }).filter(item => item != null) as { material_path: string, name: string, value: T }[];
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
        switch (event.type) {
            case 'TEXTURE_ATLAS':
                const atlases = event.data as AssetTextureInfo<string>[];
                await updateAssetAtlas(atlases, true);
                set_selected_textures(_selected_textures);
                break;

            case 'TEXTURE_MIN_FILTER':
                const minFilters = event.data as AssetTextureInfo<MinificationTextureFilter>[];
                await updateMinFilter(minFilters, true);
                set_selected_textures(_selected_textures);
                break;

            case 'TEXTURE_MAG_FILTER':
                const magFilters = event.data as AssetTextureInfo<MagnificationTextureFilter>[];
                await updateMagFilter(magFilters, true);
                set_selected_textures(_selected_textures);
                break;

            case 'MATERIAL_VERTEX_PROGRAM':
                const vertexPrograms = event.data as AssetMaterialInfo<string>[];
                await updateMaterialProperty(vertexPrograms, true);
                set_selected_materials(_selected_materials);
                break;

            case 'MATERIAL_FRAGMENT_PROGRAM':
                const fragmentPrograms = event.data as AssetMaterialInfo<string>[];
                await updateMaterialProperty(fragmentPrograms, true);
                set_selected_materials(_selected_materials);
                break;

            case 'MATERIAL_TRANSPARENT':
                const transparents = event.data as AssetMaterialInfo<boolean>[];
                await updateMaterialProperty(transparents, true);
                set_selected_materials(_selected_materials);
                break;

            case 'MATERIAL_SAMPLER2D':
                const sampler2Ds = event.data as AssetMaterialInfo<string>[];
                await updateUniformSampler2D(sampler2Ds, true);
                set_selected_materials(_selected_materials);
                break;

            case 'MATERIAL_FLOAT':
                const floats = event.data as AssetMaterialInfo<number>[];
                await updateUniform(floats, true);
                set_selected_materials(_selected_materials);
                break;

            case 'MATERIAL_RANGE':
                const ranges = event.data as AssetMaterialInfo<number>[];
                await updateUniform(ranges, true);
                set_selected_materials(_selected_materials);
                break;

            case 'MATERIAL_VEC2':
                const vec2s = event.data as AssetMaterialInfo<Vector2>[];
                await updateUniform(vec2s, true);
                set_selected_materials(_selected_materials);
                break;

            case 'MATERIAL_VEC3':
                const vec3s = event.data as AssetMaterialInfo<Vector3>[];
                await updateUniform(vec3s, true);
                set_selected_materials(_selected_materials);
                break;

            case 'MATERIAL_VEC4':
                const vec4s = event.data as AssetMaterialInfo<Vector4>[];
                await updateUniform(vec4s, true);
                set_selected_materials(_selected_materials);
                break;

            case 'MATERIAL_COLOR':
                const colors = event.data as AssetMaterialInfo<string>[];
                await updateUniform(colors, true);
                set_selected_materials(_selected_materials);
                break;
        }
    }

    init();
    return { set_selected_textures, set_selected_materials };
}