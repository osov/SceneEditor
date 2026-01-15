// NOTE: для большей ясности все изменения в материалах делаются на прямую в файл, ResourceManager прослушивает изменения в файлах и обновляет загруженные данные, альтернативный вариант, это посылать события изменения материала и прослушивать их в ResourceManager, но в таком случае будет чуть больше запутанность, так как ResourceManager всеравно будет прослушивать изменения в файлах, но при этом еще и обрабатывать напрямую события изменения материала, который записывает в файл, еще как вариант, это посылать только событие изменения, а ResourceManager будет обрабатывать и сам записывать эти изменения в файл


import { Vector2, Vector3, Vector4, Color, IUniform, Texture, MagnificationTextureFilter, MinificationTextureFilter, Wrapping } from "three";
import { get_file_name, updateEachMaterialWhichHasTexture } from "../render_engine/helpers/utils";
import { MaterialUniformParams, MaterialUniformType } from "../render_engine/resource_manager";
import { IObjectTypes, IBaseMesh } from "../render_engine/types";
import { PropertyData, PropertyType, ChangeInfo, BeforeChangeInfo, ObjectData } from "../modules_editor/Inspector";
import type { AssetTextureInfo, AssetMaterialInfo, AssetAudioInfo } from "@editor/shared";
import { hexToRGB, rgbToHex } from "../modules/utils";
import { convertFilterModeToThreeJS, convertThreeJSFilterToFilterMode, convertWrappingModeToThreeJS, convertThreeJSWrappingToWrappingMode, generateAtlasOptions, generateFragmentProgramOptions, generateTextureOptions, generateVertexProgramOptions } from "./helpers";
import { HistoryOwner, THistoryUndo } from "../modules_editor/modules_editor_const";
import { Services } from '@editor/core';


declare global {
    const AssetInspector: ReturnType<typeof AssetInspectorCreate>;
}

export function register_asset_inspector() {
    (window as any).AssetInspector = AssetInspectorCreate();
}

export enum FilterMode {
    NEAREST = 'nearest',
    LINEAR = 'linear',
}

export enum WrappingMode {
    REPEAT = 'repeat',
    CLAMP = 'clamp',
    MIRROR = 'mirror'
}

export enum AssetProperty {
    TEXTURE_NAME = 'texture_name',
    ATLAS = 'atlas',
    ATLAS_BUTTON = 'atlas_button',
    MIN_FILTER = 'min_filter',
    MAG_FILTER = 'mag_filter',
    WRAP_S = 'wrap_s',
    WRAP_T = 'wrap_t',
    VERTEX_PROGRAM = 'vertex_program',
    FRAGMENT_PROGRAM = 'fragment_program',
    TRANSPARENT = 'transparent',
    SOUND = 'sound',
    DURATION = 'duration',
    LOOP = 'loop',
    VOLUME = 'volume',
    SPEED = 'speed',
    PAN = 'pan',
    SOUND_PLAY_BUTTON = 'sound_play_button',
    SOUND_STOP_BUTTON = 'sound_stop_button'
}

export enum AssetPropertyTitle {
    TEXTURE_NAME = 'Имя текстуры',
    ATLAS = 'Атлас',
    ATLAS_BUTTON = 'Перейти в атлас менеджер',
    MIN_FILTER = 'Минимальный фильтр',
    MAG_FILTER = 'Максимальный фильтр',
    WRAP_S = 'Обертка по X',
    WRAP_T = 'Обертка по Y',
    VERTEX_PROGRAM = 'Вершинный шейдер',
    FRAGMENT_PROGRAM = 'Фрагментный шейдер',
    TRANSPARENT = 'Прозрачность',
    SOUND = 'Звук',
    DURATION = 'Длительность',
    LOOP = 'Повторять',
    VOLUME = 'Громкость',
    SPEED = 'Скорость',
    PAN = 'Панорамирование',
    SOUND_PLAY_BUTTON = 'Воспроизвести',
    SOUND_STOP_BUTTON = 'Остановить'
}

function AssetInspectorCreate() {
    let _selected_textures: string[] = [];
    let _selected_materials: string[] = [];
    let _selected_audios: { path: string, id?: number }[] = [];

    function init() {
        subscribe();
    }

    function subscribe() {
        Services.event_bus.on('SYS_ASSETS_SELECTED_TEXTURES', (data) => {
            const e = data as { paths: string[] };
            set_selected_textures(e.paths);
        });

        Services.event_bus.on('SYS_ASSETS_SELECTED_MATERIALS', (data) => {
            const e = data as { paths: string[] };
            set_selected_materials(e.paths);
        });

        Services.event_bus.on('SYS_ASSETS_SELECTED_AUDIOS', (data) => {
            const e = data as { paths: string[] };
            _selected_audios.forEach(audio => {
                if (audio.id != undefined) {
                    AudioManager.stop(audio.id);
                }
            });
            set_selected_audios(e.paths.map(path => ({ path })));
        });

        Services.event_bus.on('SYS_ASSETS_CLEAR_SELECTED', () => {
            _selected_audios.forEach(audio => {
                if (audio.id != undefined) {
                    AudioManager.stop(audio.id);
                }
            });
            _selected_textures = [];
            _selected_materials = [];
            _selected_audios = [];
            Inspector.clear();
        });

        Services.event_bus.on('SYS_CHANGED_ATLAS_DATA', () => {
            if (_selected_textures.length > 0) {
                // NOTE: пока просто пересоздаем поля занаво, так как нет возможности обновить параметры биндинга
                set_selected_textures(_selected_textures);
            }
        });

        Services.event_bus.on('SYS_HISTORY_UNDO', async (data) => {
            const event = data as THistoryUndo;
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
                Services.logger.error(`[set_selected_textures] Atlas for texture ${texture_name} not found`);
                return { id, fields: [] };
            }

            result.fields.push({
                key: AssetProperty.TEXTURE_NAME,
                title: AssetPropertyTitle.TEXTURE_NAME,
                value: texture_name,
                readonly: true,
                type: PropertyType.STRING
            });

            result.fields.push({
                key: AssetProperty.ATLAS,
                title: AssetPropertyTitle.ATLAS,
                value: atlas,
                type: PropertyType.LIST_TEXT,
                params: generateAtlasOptions(),
                onBeforeChange: saveAssetAtlas,
                onChange: handleAssetAtlasChange
            });

            result.fields.push({
                key: AssetProperty.ATLAS_BUTTON,
                title: AssetPropertyTitle.ATLAS_BUTTON,
                type: PropertyType.BUTTON,
                value: () => {
                    ControlManager.open_atlas_manager();
                }
            });

            const min_filter = convertThreeJSFilterToFilterMode(ResourceManager.get_texture(texture_name, atlas).texture.minFilter);
            const mag_filter = convertThreeJSFilterToFilterMode(ResourceManager.get_texture(texture_name, atlas).texture.magFilter);

            result.fields.push({
                key: AssetProperty.MIN_FILTER,
                title: AssetPropertyTitle.MIN_FILTER,
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
                key: AssetProperty.MAG_FILTER,
                title: AssetPropertyTitle.MAG_FILTER,
                value: mag_filter,
                type: PropertyType.LIST_TEXT,
                params: {
                    'nearest': FilterMode.NEAREST,
                    'linear': FilterMode.LINEAR
                },
                onBeforeChange: saveMagFilter,
                onChange: handleMagFilterChange
            });

            const wrap_s = convertThreeJSWrappingToWrappingMode(ResourceManager.get_texture(texture_name, atlas).texture.wrapS);
            const wrap_t = convertThreeJSWrappingToWrappingMode(ResourceManager.get_texture(texture_name, atlas).texture.wrapT);

            result.fields.push({
                key: AssetProperty.WRAP_S,
                title: AssetPropertyTitle.WRAP_S,
                value: wrap_s,
                type: PropertyType.LIST_TEXT,
                params: {
                    'repeat': WrappingMode.REPEAT,
                    'clamp': WrappingMode.CLAMP,
                    'mirror': WrappingMode.MIRROR
                },
                onBeforeChange: saveWrapS,
                onChange: handleWrapSChange
            });

            result.fields.push({
                key: AssetProperty.WRAP_T,
                title: AssetPropertyTitle.WRAP_T,
                value: wrap_t,
                type: PropertyType.LIST_TEXT,
                params: {
                    'repeat': WrappingMode.REPEAT,
                    'clamp': WrappingMode.CLAMP,
                    'mirror': WrappingMode.MIRROR
                },
                onBeforeChange: saveWrapT,
                onChange: handleWrapTChange
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
                        key: AssetProperty.VERTEX_PROGRAM,
                        title: AssetPropertyTitle.VERTEX_PROGRAM,
                        value: material_info.vertexShader,
                        type: PropertyType.LIST_TEXT,
                        params: generateVertexProgramOptions(),
                        onBeforeChange: saveMaterialVertexProgram,
                        onChange: handleMaterialVertexProgramChange
                    });

                    result.fields.push({
                        key: AssetProperty.FRAGMENT_PROGRAM,
                        title: AssetPropertyTitle.FRAGMENT_PROGRAM,
                        value: material_info.fragmentShader,
                        type: PropertyType.LIST_TEXT,
                        params: generateFragmentProgramOptions(),
                        onBeforeChange: saveMaterialFragmentProgram,
                        onChange: handleMaterialFragmentProgramChange
                    });

                    result.fields.push({
                        key: AssetProperty.TRANSPARENT,
                        title: AssetPropertyTitle.TRANSPARENT,
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
                                    key,
                                    value: `${atlas}/${texture_name}`,
                                    type: PropertyType.LIST_TEXTURES,
                                    params: generateTextureOptions(true),
                                    onBeforeChange: saveUniformSampler2D,
                                    onChange: handleUniformSampler2DChange
                                });
                                break;
                            case MaterialUniformType.FLOAT:
                                const float = uniform as IUniform<number>;
                                result.fields.push({
                                    key,
                                    value: float.value,
                                    type: PropertyType.NUMBER,
                                    params: {
                                        step: 0.01,
                                        format: (v: number) => v.toFixed(2)
                                    },
                                    onBeforeChange: saveUniformFloat,
                                    onChange: handleUniformChange<number>
                                });
                                break;
                            case MaterialUniformType.RANGE:
                                const range = uniform as IUniform<number>;
                                const range_params = uniformInfo.params as MaterialUniformParams[MaterialUniformType.RANGE];
                                result.fields.push({
                                    key,
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
                                    key,
                                    value: vec2.value,
                                    type: PropertyType.VECTOR_2,
                                    params: {
                                        x: {
                                            min: vec2_params.x.min ?? -1000,
                                            max: vec2_params.x.max ?? 1000,
                                            step: vec2_params.x.step ?? 0.1,
                                            format: (v: number) => v.toFixed(1)
                                        },
                                        y: {
                                            min: vec2_params.y.min ?? -1000,
                                            max: vec2_params.y.max ?? 1000,
                                            step: vec2_params.y.step ?? 0.1,
                                            format: (v: number) => v.toFixed(1)
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
                                    key,
                                    value: vec3.value,
                                    type: PropertyType.VECTOR_3,
                                    params: {
                                        x: {
                                            min: vec3_params.x.min ?? -1000,
                                            max: vec3_params.x.max ?? 1000,
                                            step: vec3_params.x.step ?? 0.1,
                                            format: (v: number) => v.toFixed(1)
                                        },
                                        y: {
                                            min: vec3_params.y.min ?? -1000,
                                            max: vec3_params.y.max ?? 1000,
                                            step: vec3_params.y.step ?? 0.1,
                                            format: (v: number) => v.toFixed(1)
                                        },
                                        z: {
                                            min: vec3_params.z.min ?? -1000,
                                            max: vec3_params.z.max ?? 1000,
                                            step: vec3_params.z.step ?? 0.1,
                                            format: (v: number) => v.toFixed(1)
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
                                    key,
                                    value: vec4.value,
                                    type: PropertyType.VECTOR_4,
                                    params: {
                                        x: {
                                            min: vec4_params.x.min ?? -1000,
                                            max: vec4_params.x.max ?? 1000,
                                            step: vec4_params.x.step ?? 0.1,
                                            format: (v: number) => v.toFixed(1)
                                        },
                                        y: {
                                            min: vec4_params.y.min ?? -1000,
                                            max: vec4_params.y.max ?? 1000,
                                            step: vec4_params.y.step ?? 0.1,
                                            format: (v: number) => v.toFixed(1)
                                        },
                                        z: {
                                            min: vec4_params.z.min ?? -1000,
                                            max: vec4_params.z.max ?? 1000,
                                            step: vec4_params.z.step ?? 0.1,
                                            format: (v: number) => v.toFixed(1)
                                        },
                                        w: {
                                            min: vec4_params.w.min ?? -1000,
                                            max: vec4_params.w.max ?? 1000,
                                            step: vec4_params.w.step ?? 0.1,
                                            format: (v: number) => v.toFixed(1)
                                        }
                                    },
                                    onBeforeChange: saveUniformVec4,
                                    onChange: handleUniformChange<Vector4>
                                });
                                break;
                            case MaterialUniformType.COLOR:
                                const color = uniform as IUniform<Vector3>;
                                result.fields.push({
                                    key,
                                    value: rgbToHex(color.value),
                                    type: PropertyType.COLOR,
                                    onBeforeChange: saveUniformColor,
                                    onChange: handleUniformColorChange
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

    function set_selected_audios(audio_paths: { path: string, id?: number }[]) {
        _selected_audios = audio_paths;

        const data = _selected_audios.map(({ path, id }, idx) => {
            const result = { id: idx, fields: [] as PropertyData<PropertyType>[] };

            const audio_name = get_file_name(path);
            const audio_buffer = ResourceManager.get_sound_buffer(audio_name);

            if (!audio_buffer) return null;

            if (id == undefined) {
                id = AudioManager.create_audio(audio_name);
                _selected_audios[idx] = { path, id };
            }

            const audio_id = id;

            result.fields.push({
                key: AssetProperty.SOUND,
                title: AssetPropertyTitle.SOUND,
                value: audio_name,
                type: PropertyType.STRING,
                readonly: true
            });

            result.fields.push({
                key: AssetProperty.DURATION,
                title: AssetPropertyTitle.DURATION,
                value: audio_buffer.duration.toFixed(2) + ' сек',
                type: PropertyType.STRING,
                readonly: true
            });

            result.fields.push({
                key: AssetProperty.LOOP,
                title: AssetPropertyTitle.LOOP,
                value: AudioManager.get_loop(audio_id),
                type: PropertyType.BOOLEAN,
                onBeforeChange: saveAudioLoop,
                onChange: handleAudioLoopChange
            });

            result.fields.push({
                key: AssetProperty.VOLUME,
                title: AssetPropertyTitle.VOLUME,
                value: AudioManager.get_volume(audio_id),
                type: PropertyType.SLIDER,
                params: {
                    min: 0,
                    max: 2,
                    step: 0.01,
                    format: (value: number) => value.toFixed(2)
                },
                onBeforeChange: saveAudioVolume,
                onChange: handleAudioVolumeChange
            });

            result.fields.push({
                key: AssetProperty.SPEED,
                title: AssetPropertyTitle.SPEED,
                value: AudioManager.get_speed(audio_id),
                type: PropertyType.SLIDER,
                params: {
                    min: 0,
                    max: 2,
                    step: 0.01,
                    format: (value: number) => value.toFixed(2)
                },
                onBeforeChange: saveAudioSpeed,
                onChange: handleAudioSpeedChange
            });

            result.fields.push({
                key: AssetProperty.PAN,
                title: AssetPropertyTitle.PAN,
                value: AudioManager.get_pan(audio_id),
                type: PropertyType.SLIDER,
                params: {
                    min: -1,
                    max: 1,
                    step: 0.01,
                    format: (value: number) => value.toFixed(2)
                },
                onBeforeChange: saveAudioPan,
                onChange: handleAudioPanChange
            });

            const is_playing = AudioManager.is_playing(audio_id);
            result.fields.push({
                key: is_playing ? AssetProperty.SOUND_STOP_BUTTON : AssetProperty.SOUND_PLAY_BUTTON,
                title: is_playing ? AssetPropertyTitle.SOUND_STOP_BUTTON : AssetPropertyTitle.SOUND_PLAY_BUTTON,
                value: () => {
                    if (is_playing) AudioManager.stop(audio_id);
                    else {

                        // NOTE: для того чтобы сменить кнопку по окончанию проигрывания звука
                        AudioManager.set_end_callback(audio_id, () => {
                            set_selected_audios(_selected_audios);
                        });

                        AudioManager.play(audio_id);
                    }

                    // NOTE: для того чтобы сменить кнопку
                    set_selected_audios(_selected_audios);
                },
                type: PropertyType.BUTTON,
            });
            return result;
        }).filter(item => item != null) as ObjectData[];

        Inspector.clear();
        Inspector.setData(data);
    }

    function saveAssetAtlas(info: BeforeChangeInfo) {
        const atlases: AssetTextureInfo<string>[] = [];
        info.ids.forEach((id) => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Services.logger.error('[saveAtlas] Texture path not found for id:', id);
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
                Services.logger.error('[saveMinFilter] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(texture_path);
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);
            if (atlas == null) {
                Services.logger.error('[saveMinFilter] Atlas not found for texture:', texture_name);
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
            updateEachMaterialWhichHasTexture(texture_data.texture);

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
                Services.logger.error('[saveMagFilter] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(texture_path);
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);
            if (atlas == null) {
                Services.logger.error('[saveMagFilter] Atlas not found for texture:', texture_name);
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
            updateEachMaterialWhichHasTexture(texture_data.texture);
        }
        if (last) {
            await ResourceManager.write_metadata();
        }
    }

    function saveWrapS(info: BeforeChangeInfo) {
        const wrapS: AssetTextureInfo<Wrapping>[] = [];
        info.ids.forEach((id) => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Services.logger.error('[saveWrapS] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(texture_path);
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);
            if (atlas == null) {
                Services.logger.error('[saveWrapS] Atlas not found for texture:', texture_name);
                return;
            }

            const texture_data = ResourceManager.get_texture(texture_name, atlas);
            wrapS.push({
                texture_path,
                value: texture_data.texture.wrapS
            });
        });

        HistoryControl.add('TEXTURE_WRAP_S', wrapS, HistoryOwner.ASSET_INSPECTOR);
    }

    function handleWrapSChange(info: ChangeInfo) {
        const data = convertChangeInfoToTextureData<WrappingMode>(info).map(item => {
            return {
                ...item,
                value: convertWrappingModeToThreeJS(item.value) as Wrapping
            };
        });
        updateWrapS(data.map(item => ({ ...item, value: item.value })), info.data.event.last);
    }

    async function updateWrapS(data: AssetTextureInfo<Wrapping>[], last: boolean) {
        for (const item of data) {
            const texture_name = get_file_name(item.texture_path);
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);
            if (atlas == null) continue;
            const texture_data = ResourceManager.get_texture(texture_name, atlas);
            texture_data.texture.wrapS = item.value;
            updateEachMaterialWhichHasTexture(texture_data.texture);
        }
        if (last) await ResourceManager.write_metadata();
    }

    function saveWrapT(info: BeforeChangeInfo) {
        const wrapT: AssetTextureInfo<Wrapping>[] = [];
        info.ids.forEach((id) => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Services.logger.error('[saveWrapT] Texture path not found for id:', id);
                return;
            }

            const texture_name = get_file_name(texture_path);
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);
            if (atlas == null) {
                Services.logger.error('[saveWrapT] Atlas not found for texture:', texture_name);
                return;
            }

            const texture_data = ResourceManager.get_texture(texture_name, atlas);
            wrapT.push({
                texture_path,
                value: texture_data.texture.wrapT
            });
        });

        HistoryControl.add('TEXTURE_WRAP_T', wrapT, HistoryOwner.ASSET_INSPECTOR);
    }

    function handleWrapTChange(info: ChangeInfo) {
        const data = convertChangeInfoToTextureData<WrappingMode>(info).map(item => {
            return {
                ...item,
                value: convertWrappingModeToThreeJS(item.value) as Wrapping
            };
        });
        updateWrapT(data.map(item => ({ ...item, value: item.value })), info.data.event.last);
    }

    async function updateWrapT(data: AssetTextureInfo<Wrapping>[], last: boolean) {
        for (const item of data) {
            const texture_name = get_file_name(item.texture_path);
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);
            if (atlas == null) continue;
            const texture_data = ResourceManager.get_texture(texture_name, atlas);
            texture_data.texture.wrapT = item.value;
            updateEachMaterialWhichHasTexture(texture_data.texture);
        }
        if (last) await ResourceManager.write_metadata();
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

    async function handleMaterialVertexProgramChange(info: ChangeInfo) {
        const data = convertChangeInfoToMaterialData<string>(info);
        await updateMaterialVertexProgram(data, info.data.event.last);
    }

    async function updateMaterialVertexProgram(data: AssetMaterialInfo<string>[], last: boolean) {
        for (const item of data) {
            Services.event_bus.emit('SYS_MATERIAL_CHANGED', {
                material_name: get_file_name(item.material_path),
                is_uniform: false,
                property: 'vertexShader',
                value: item.value
            }, false);

            if (last) {
                const response = await AssetControl.get_file_data(item.material_path);
                if (!response) continue;
                const material_data = JSON.parse(response);
                material_data['vertexShader'] = item.value;
                await AssetControl.save_file_data(item.material_path, JSON.stringify(material_data, null, 2));
            }
        }
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
        await updateMaterialFragmentProgram(data, info.data.event.last);
    }

    async function updateMaterialFragmentProgram(data: AssetMaterialInfo<string>[], last: boolean) {
        for (const item of data) {
            Services.event_bus.emit('SYS_MATERIAL_CHANGED', {
                material_name: get_file_name(item.material_path),
                is_uniform: false,
                property: 'fragmentShader',
                value: item.value
            }, false);

            if (last) {
                const response = await AssetControl.get_file_data(item.material_path);
                if (!response) continue;
                const material_data = JSON.parse(response);
                material_data['fragmentShader'] = item.value;
                await AssetControl.save_file_data(item.material_path, JSON.stringify(material_data, null, 2));
            }
        }
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
        await updateMaterialTransparent(data, info.data.event.last);
    }

    async function updateMaterialTransparent(data: AssetMaterialInfo<boolean>[], last: boolean) {
        for (const item of data) {
            Services.event_bus.emit('SYS_MATERIAL_CHANGED', {
                material_name: get_file_name(item.material_path),
                is_uniform: false,
                property: 'transparent',
                value: item.value
            }, false);

            if (last) {
                const response = await AssetControl.get_file_data(item.material_path);
                if (!response) continue;
                const material_data = JSON.parse(response);
                material_data['transparent'] = item.value;
                await AssetControl.save_file_data(item.material_path, JSON.stringify(material_data, null, 2));
            }
        }
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
            const uniform = origin.uniforms[info.field.key];
            if (uniform) {
                uniforms.push({
                    material_path: path,
                    name: info.field.key,
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
            const uniform = origin.uniforms[info.field.key];
            if (uniform) {
                const texture_name = get_file_name(uniform.value.path || '');
                const atlas = ResourceManager.get_atlas_by_texture_name(texture_name) || '';
                sampler2Ds.push({
                    material_path: path,
                    name: info.field.key,
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

    function saveUniformColor(info: BeforeChangeInfo) {
        const colors: AssetMaterialInfo<string>[] = [];
        info.ids.forEach((id) => {
            const path = _selected_materials[id];
            const name = get_file_name(path);
            const material_info = ResourceManager.get_material_info(name);
            if (!material_info) return;
            const origin = ResourceManager.get_material_by_hash(name, material_info.origin);
            if (!origin) return;
            const uniform = origin.uniforms[info.field.key];
            if (uniform) {
                const color = new Color();
                color.setRGB(uniform.value.x, uniform.value.y, uniform.value.z);
                colors.push({
                    material_path: path,
                    name: info.field.key,
                    value: color.getHexString()
                });
            }
        });
        HistoryControl.add('MATERIAL_COLOR', colors, HistoryOwner.ASSET_INSPECTOR);
    }

    async function handleUniformColorChange(info: ChangeInfo) {
        const data = convertChangeInfoToMaterialData<string>(info);
        await updateUniformColor(data, info.data.event.last);
    }

    async function updateUniformColor(data: AssetMaterialInfo<string>[], last: boolean) {
        for (const item of data) {
            const rgb = hexToRGB(item.value);
            await ResourceManager.set_material_uniform_for_original(get_file_name(item.material_path), item.name, rgb, last);
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

    function saveAudioLoop(info: BeforeChangeInfo) {
        const loops: AssetAudioInfo<boolean>[] = [];
        info.ids.forEach((id) => {
            const audio = _selected_audios[id];
            if (audio == null) return;
            if (audio.id == undefined) return;
            loops.push({ audio_path: audio.path, audio_id: audio.id, value: AudioManager.get_loop(audio.id) });
        });
        HistoryControl.add('AUDIO_LOOP', loops, HistoryOwner.ASSET_INSPECTOR);
    }

    function handleAudioLoopChange(info: ChangeInfo) {
        const data = convertChangeInfoToAudioData<boolean>(info);
        updateAudioLoop(data, info.data.event.last);
    }

    function updateAudioLoop(data: AssetAudioInfo<boolean>[], _: boolean) {
        for (const item of data) {
            AudioManager.set_loop(item.audio_id, item.value);
        }
    }

    function saveAudioVolume(info: BeforeChangeInfo) {
        const volumes: AssetAudioInfo<number>[] = [];
        info.ids.forEach((id) => {
            const audio = _selected_audios[id];
            if (audio == null) return;
            if (audio.id == undefined) return;
            volumes.push({ audio_path: audio.path, audio_id: audio.id, value: AudioManager.get_volume(audio.id) });
        });
        HistoryControl.add('AUDIO_VOLUME', volumes, HistoryOwner.ASSET_INSPECTOR);
    }

    function handleAudioVolumeChange(info: ChangeInfo) {
        const data = convertChangeInfoToAudioData<number>(info);
        updateAudioVolume(data, info.data.event.last);
    }

    function updateAudioVolume(data: AssetAudioInfo<number>[], _: boolean) {
        for (const item of data) {
            AudioManager.set_volume(item.audio_id, item.value);
        }
    }

    function saveAudioSpeed(info: BeforeChangeInfo) {
        const speeds: AssetAudioInfo<number>[] = [];
        info.ids.forEach((id) => {
            const audio = _selected_audios[id];
            if (audio == null) return;
            if (audio.id == undefined) return;
            speeds.push({ audio_path: audio.path, audio_id: audio.id, value: AudioManager.get_speed(audio.id) });
        });
        HistoryControl.add('AUDIO_SPEED', speeds, HistoryOwner.ASSET_INSPECTOR);
    }

    function handleAudioSpeedChange(info: ChangeInfo) {
        const data = convertChangeInfoToAudioData<number>(info);
        updateAudioSpeed(data, info.data.event.last);
    }

    function updateAudioSpeed(data: AssetAudioInfo<number>[], _: boolean) {
        for (const item of data) {
            AudioManager.set_speed(item.audio_id, item.value);
        }
    }

    function saveAudioPan(info: BeforeChangeInfo) {
        const pans: AssetAudioInfo<number>[] = [];
        info.ids.forEach((id) => {
            const audio = _selected_audios[id];
            if (audio == null) return;
            if (audio.id == undefined) return;
            pans.push({ audio_path: audio.path, audio_id: audio.id, value: AudioManager.get_pan(audio.id) });
        });
        HistoryControl.add('AUDIO_PAN', pans, HistoryOwner.ASSET_INSPECTOR);
    }

    function handleAudioPanChange(info: ChangeInfo) {
        const data = convertChangeInfoToAudioData<number>(info);
        updateAudioPan(data, info.data.event.last);
    }

    function updateAudioPan(data: AssetAudioInfo<number>[], _: boolean) {
        for (const item of data) {
            AudioManager.set_pan(item.audio_id, item.value);
        }
    }

    function convertChangeInfoToAudioData<T>(info: ChangeInfo): AssetAudioInfo<T>[] {
        const value = info.data.event.value as T;
        return info.ids.map(id => {
            const audio = _selected_audios[id];
            if (audio == null) return null;
            return {
                audio_path: audio.path,
                audio_id: audio.id,
                value
            };
        }).filter(item => item != null) as AssetAudioInfo<T>[];
    }

    function convertChangeInfoToMaterialData<T>(info: ChangeInfo): AssetMaterialInfo<T>[] {
        const value = info.data.event.value as T;
        return info.ids.map(id => {
            const path = _selected_materials[id];
            if (path == null) return null;
            return {
                material_path: path,
                name: info.data.field?.key,
                value
            };
        }).filter(item => item != null) as AssetMaterialInfo<T>[];
    }

    function convertChangeInfoToTextureData<T>(info: ChangeInfo): { texture_path: string, value: T }[] {
        const value = info.data.event.value as T;
        return info.ids.map(id => {
            const texture_path = _selected_textures[id];
            if (texture_path == null) {
                Services.logger.error('[convertChangeInfoToTextureData] Texture path not found for id:', id);
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

            case 'TEXTURE_WRAP_S':
                const wrapS = event.data as AssetTextureInfo<Wrapping>[];
                await updateWrapS(wrapS, true);
                set_selected_textures(_selected_textures);
                break;

            case 'TEXTURE_WRAP_T':
                const wrapT = event.data as AssetTextureInfo<Wrapping>[];
                await updateWrapT(wrapT, true);
                set_selected_textures(_selected_textures);
                break;

            case 'MATERIAL_VERTEX_PROGRAM':
                const vertexPrograms = event.data as AssetMaterialInfo<string>[];
                await updateMaterialVertexProgram(vertexPrograms, true);
                set_selected_materials(_selected_materials);
                break;

            case 'MATERIAL_FRAGMENT_PROGRAM':
                const fragmentPrograms = event.data as AssetMaterialInfo<string>[];
                await updateMaterialFragmentProgram(fragmentPrograms, true);
                set_selected_materials(_selected_materials);
                break;

            case 'MATERIAL_TRANSPARENT':
                const transparents = event.data as AssetMaterialInfo<boolean>[];
                await updateMaterialTransparent(transparents, true);
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

            case 'AUDIO_LOOP':
                const loops = event.data as AssetAudioInfo<boolean>[];
                updateAudioLoop(loops, true);
                set_selected_audios(_selected_audios);
                break;

            case 'AUDIO_VOLUME':
                const volumes = event.data as AssetAudioInfo<number>[];
                updateAudioVolume(volumes, true);
                set_selected_audios(_selected_audios);
                break;

            case 'AUDIO_SPEED':
                const speeds = event.data as AssetAudioInfo<number>[];
                updateAudioSpeed(speeds, true);
                set_selected_audios(_selected_audios);
                break;

            case 'AUDIO_PAN':
                const pans = event.data as AssetAudioInfo<number>[];
                updateAudioPan(pans, true);
                set_selected_audios(_selected_audios);
                break;
        }
    }

    init();
    return { set_selected_textures, set_selected_materials, set_selected_audios };
}