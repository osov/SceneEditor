import { Euler, Quaternion, ShaderMaterial, Vector2, Vector3, Vector4 } from "three";
import { degToRad, radToDeg } from "three/src/math/MathUtils";
import { Slice9Mesh } from "../render_engine/objects/slice9";
import { GoSprite, FlipMode, GuiBox, GuiText } from "../render_engine/objects/sub_types";
import { TextMesh } from "../render_engine/objects/text";
import { IBaseMeshAndThree, IObjectTypes } from "../render_engine/types";
import { ChangeInfo, PropertyType, BeforeChangeInfo, PropertyData } from "../modules_editor/Inspector";
import { deepClone, euler_to_quat, hexToRGB, quat_to_euler, swap } from "../modules/utils";
import { MeshMaterialPropertyInfo, MeshMaterialUniformInfo, MeshPropertyInfo } from "../controls/types";
import { anchorToScreenPreset, convertBlendModeToThreeJS, convertThreeJSBlendingToBlendMode, generateMaterialOptions, generateModelOptions, generateTextureOptions, getChangedInfo, getDraggedInfo, pivotToScreenPreset, screenPresetToAnchorValue, screenPresetToPivotValue } from "./helpers";
import { IUniform, Texture } from "three";
import { Color } from "three";
import { MaterialUniformParams, MaterialUniformType } from "../render_engine/resource_manager";
import { rgbToHex } from "../modules/utils";
import { get_file_name, is_base_mesh } from "../render_engine/helpers/utils";
import { HistoryOwner, TDictionary, THistoryUndo } from "../modules_editor/modules_editor_const";
import { AnimatedMesh } from "../render_engine/objects/animated_mesh";
import { WORLD_SCALAR } from "../config";
import { Model } from "@editor/render_engine/objects/model";
import { MultipleMaterialMesh } from "@editor/render_engine/objects/multiple_material_mesh";
import { AudioMesh, SoundFunctionType, SoundZoneType } from "../render_engine/objects/audio_mesh";


declare global {
    const MeshInspector: ReturnType<typeof MeshInspectorCreate>;
}

export function register_mesh_inspector() {
    (window as any).MeshInspector = MeshInspectorCreate();
}

export enum MeshProperty {
    TYPE = 'type',
    NAME = 'name',
    ACTIVE = 'active',
    POSITION = 'position',
    ROTATION = 'rotation',
    SCALE = 'scale',
    SIZE = 'size',
    PIVOT = 'pivot',
    ANCHOR = 'anchor',
    ANCHOR_PRESET = 'anchor_preset',
    COLOR = 'color',
    INHERITED_ALPHA = 'inherited_alpha',
    TEXT_ALPHA = 'text_alpha',
    SLICE9 = 'slice9',
    TEXT = 'text',
    FONT = 'font',
    FONT_SIZE = 'font_size',
    TEXT_ALIGN = 'text_align',
    LINE_HEIGHT = 'line_height',
    BLEND_MODE = 'blend_mode',
    MATERIAL = 'material',
    MODEL = 'model',
    ANIMATION_LIST = 'animation_list',
    ACTIVE_MODEL_ANIMATION = 'active_model_animation',
    TRANSFORM = 'transform',
    GO_TO_ORIGINAL_MATERIAL = 'go_to_original_material',
    FLIP_DIAGONAL = 'flip_diagonal',
    FLIP_VERTICAL = 'flip_vertical',
    FLIP_HORIZONTAL = 'flip_horizontal',
    SOUND = 'sound',
    VOLUME = 'volume',
    SPEED = 'speed',
    LOOP = 'loop',
    PLAY = 'play',
    STOP = 'stop',
    SOUND_RADIUS = 'sound_radius',
    MAX_VOLUME_RADIUS = 'max_volume_radius',
    PAN_NORMALIZATION_DISTANCE = 'pan_normalization_distance',
    SOUND_FUNCTION = 'sound_function',
    ZONE_TYPE = 'zone_type',
    RECTANGLE_WIDTH = 'rectangle_width',
    RECTANGLE_HEIGHT = 'rectangle_height',
    RECTANGLE_MAX_VOLUME_WIDTH = 'rectangle_max_volume_width',
    RECTANGLE_MAX_VOLUME_HEIGHT = 'rectangle_max_volume_height',
    TILE_LAYER = 'tile_layer',
    CLIPPING_MODE = 'clipping_mode',
    INVERTED_CLIPPING = 'inverted_clipping',
    CLIPPING_VISIBLE = 'clipping_visible',
}

export enum MeshPropertyTitle {
    TYPE = 'Тип',
    NAME = 'Название',
    ACTIVE = 'Aктивный',
    POSITION = 'Позиция',
    ROTATION = 'Вращение',
    SCALE = 'Масштаб',
    SIZE = 'Размер',
    PIVOT = 'Точка опоры',
    ANCHOR = 'Anchor',
    ANCHOR_PRESET = 'Anchor Preset',
    COLOR = 'Цвет',
    INHERITED_ALPHA = 'Наследовать Прозрачность',
    TEXT_ALPHA = 'Прозрачность',
    SLICE9 = 'Slice9',
    TEXT = 'Текст',
    FONT = 'Шрифт',
    FONT_SIZE = 'Размер шрифта',
    TEXT_ALIGN = 'Выравнивание текста',
    LINE_HEIGHT = 'Высота строки',
    BLEND_MODE = 'Режим смешивания',
    MATERIAL = 'Материал',
    MODEL = 'Модель',
    ANIMATION_LIST = 'Список анимаций',
    ACTIVE_MODEL_ANIMATION = 'Активная анимация',
    TRANSFORM = 'Трансформ',
    GO_TO_ORIGINAL_MATERIAL = 'Перейти к оригиналу',
    FLIP_DIAGONAL = 'Диагональное отражение',
    FLIP_VERTICAL = 'Вертикальное отражение',
    FLIP_HORIZONTAL = 'Горизонтальное отражение',
    SOUND = 'Звук',
    VOLUME = 'Громкость',
    SPEED = 'Скорость',
    LOOP = 'Повторять',
    PLAY = 'Воспроизвести',
    STOP = 'Остановить',
    SOUND_RADIUS = 'Радиус звука',
    MAX_VOLUME_RADIUS = 'Радиус макс. громкости',
    PAN_NORMALIZATION_DISTANCE = 'Дистанция панормирования',
    SOUND_FUNCTION = 'Функция звука',
    ZONE_TYPE = 'Тип зоны',
    RECTANGLE_WIDTH = 'Ширина зоны звука',
    RECTANGLE_HEIGHT = 'Высота зоны звука',
    RECTANGLE_MAX_VOLUME_WIDTH = 'Ширина зоны макс. громкости',
    RECTANGLE_MAX_VOLUME_HEIGHT = 'Высота зоны макс. громкости',
    TILE_LAYER = 'Слой',
    CLIPPING_FOLDER = 'Обрезка',
    CLIPPING_MODE = 'Режим',
    INVERTED_CLIPPING = 'Инвертированный',
    CLIPPING_VISIBLE = 'Видимый',
}

export enum ScreenPointPreset {
    NONE = 'None',
    CENTER = 'Center',
    TOP_LEFT = 'Top Left',
    TOP_CENTER = 'Top Center',
    TOP_RIGHT = 'Top Right',
    LEFT_CENTER = 'Left Center',
    RIGHT_CENTER = 'Right Center',
    BOTTOM_LEFT = 'Bottom Left',
    BOTTOM_CENTER = 'Bottom Center',
    BOTTOM_RIGHT = 'Bottom Right',
    CUSTOM = 'Custom',
}

export enum TextAlign {
    NONE = 'None',
    CENTER = 'center',
    LEFT = 'left',
    RIGHT = 'right',
    JUSTIFY = 'justify',
}

export enum BlendMode {
    NORMAL = 'normal',
    ADD = 'add',
    MULTIPLY = 'multiply',
    SUBTRACT = 'subtract',
    // CUSTOM = 'custom'
}


function MeshInspectorCreate() {
    let _selected_meshes: number[] = [];

    function init() {
        subscribe();
    }

    function subscribe() {
        EventBus.on('SYS_SELECTED_MESH_LIST', (e) => {
            set_selected_meshes(e.list.map((value: IBaseMeshAndThree) => value.mesh_data.id));
        });

        EventBus.on('SYS_UNSELECTED_MESH_LIST', () => {
            Inspector.clear();
        });

        EventBus.on('SYS_HISTORY_UNDO', (event: THistoryUndo) => {
            if (event.owner != HistoryOwner.MESH_INSPECTOR) return;
            undo(event);
        });

        EventBus.on('SYS_CHANGED_LAYER_DATA', () => {
            set_selected_meshes(_selected_meshes);
        });
    }

    function set_selected_meshes(mesh_ids: number[]) {
        _selected_meshes = mesh_ids;

        const list = SceneManager.get_scene_list().filter((item) => _selected_meshes.includes(item.mesh_data.id));
        const data = list.map((mesh) => {
            const fields: PropertyData<PropertyType>[] = [];
            generateBaseFields(fields, mesh);

            if (mesh instanceof Slice9Mesh || mesh instanceof MultipleMaterialMesh) {
                let mask = 0;
                if (mesh instanceof MultipleMaterialMesh) {
                    mesh.traverse((m) => {
                        if (["Mesh", "SkinnedMesh"].includes(m.type))
                            mask = m.layers.mask;
                    });
                } else {
                    mask = mesh.layers.mask;
                }
                fields.push({
                    key: MeshProperty.TILE_LAYER,
                    title: MeshPropertyTitle.TILE_LAYER,
                    value: ResourceManager.get_layers_names_by_mask(mask),
                    type: PropertyType.ITEM_LIST,
                    params: {
                        pickText: 'Выберите слой',
                        emptyText: 'Нет добавленных слоев',
                        options: [...ResourceManager.get_layers(), 'Добавить/Удалить'],
                        onOptionClick: (option: string) => {
                            if (option == 'Добавить/Удалить') {
                                ControlManager.open_layer_manager();
                                return false;
                            }
                            return true;
                        }
                    },
                    onBeforeChange: saveLayer,
                    onChange: handleLayerChange
                });
            }

            switch (mesh.type) {
                case IObjectTypes.GO_CONTAINER:
                case IObjectTypes.COMPONENT:
                    generateTransformFields(fields, mesh);
                    break;
                case IObjectTypes.GUI_BOX:
                    generateGuiBoxFields(list, fields, mesh);
                    break;
                case IObjectTypes.GUI_TEXT:
                    generateGuiTextFields(fields, mesh);
                    break;
                case IObjectTypes.GO_SPRITE_COMPONENT:
                    generateSpriteFields(list, fields, mesh);
                    break;
                case IObjectTypes.GO_LABEL_COMPONENT:
                    generateLabelFields(fields, mesh);
                    break;
                case IObjectTypes.GO_MODEL_COMPONENT:
                    generateModelFields(list, fields, mesh as Model);
                    break;
                case IObjectTypes.GO_ANIMATED_MODEL_COMPONENT:
                    generateAnimatedModelFields(list, fields, mesh as AnimatedMesh);
                    break;
                case IObjectTypes.GO_AUDIO_COMPONENT:
                    generateAudioFields(fields, mesh as AudioMesh);
                    break;
            }

            return { id: mesh.mesh_data.id, fields };
        });

        Inspector.clear();
        Inspector.setData(data);
    }

    function generateBaseFields(fields: PropertyData<PropertyType>[], mesh: IBaseMeshAndThree) {
        // NOTE: для дебага
        fields.push({
            key: 'id',
            title: 'id',
            value: mesh.mesh_data.id,
            type: PropertyType.NUMBER,
            params: { format: (v: number) => v.toFixed(0) },
            readonly: true
        });

        fields.push({
            key: MeshProperty.TYPE,
            title: MeshPropertyTitle.TYPE,
            value: mesh.type,
            type: PropertyType.STRING,
            readonly: true
        });

        fields.push({
            key: MeshProperty.NAME,
            title: MeshPropertyTitle.NAME,
            value: mesh.name,
            type: PropertyType.STRING,
            onBeforeChange: saveName,
            onChange: handleNameChange
        });

        fields.push({
            key: MeshProperty.ACTIVE,
            title: MeshPropertyTitle.ACTIVE,
            value: mesh.get_active(),
            type: PropertyType.BOOLEAN,
            onBeforeChange: saveActive,
            onChange: handleActiveChange
        });
    }

    function generateTransformFields(fields: PropertyData<PropertyType>[], mesh: IBaseMeshAndThree, isGui = false) {
        const transform_fields: PropertyData<PropertyType>[] = [];
        transform_fields.push({
            key: MeshProperty.POSITION,
            title: MeshPropertyTitle.POSITION,
            value: isGui ? new Vector2(mesh.position.x, mesh.position.y) : mesh.get_position(),
            type: isGui ? PropertyType.VECTOR_2 : PropertyType.VECTOR_3,
            params: isGui ? {
                x: { step: 0.1, format: (v: number) => v.toFixed(1) },
                y: { step: 0.1, format: (v: number) => v.toFixed(1) }
            } : {
                x: { step: 0.1, format: (v: number) => v.toFixed(1) },
                y: { step: 0.1, format: (v: number) => v.toFixed(1) },
                z: { step: 0.1, format: (v: number) => v.toFixed(1) }
            },
            onBeforeChange: savePosition,
            onChange: isGui ? handleGuiPositionChange : handlePositionChange,
            onRefresh: refreshPosition
        });

        const raw = mesh.quaternion;
        const rotation = new Vector3().fromArray(quat_to_euler(raw.x, raw.y, raw.z, raw.w));
        swap(rotation, 'x', 'z');
        transform_fields.push({
            key: MeshProperty.ROTATION,
            title: MeshPropertyTitle.ROTATION,
            value: rotation,
            type: PropertyType.VECTOR_3,
            params: {
                x: { step: 1, format: (v: number) => v.toFixed(1) },
                y: { step: 1, format: (v: number) => v.toFixed(1) },
                z: { step: 1, format: (v: number) => v.toFixed(1) }
            },
            onBeforeChange: saveRotation,
            onChange: handleRotationChange,
            onRefresh: refreshRotation
        });

        if (mesh instanceof MultipleMaterialMesh) {
            const scale = mesh.get_scale();
            const scale_factor = Math.max(scale.x, scale.y);
            transform_fields.push({
                key: MeshProperty.SCALE,
                title: MeshPropertyTitle.SCALE,
                value: scale_factor,
                type: PropertyType.SLIDER,
                params: {
                    min: 0.001,
                    max: 1,
                    step: 0.001,
                    format: (v: number) => v.toFixed(3)
                },
                onBeforeChange: saveModelScale,
                onChange: handleModelScaleChange,
                onRefresh: refreshModelScale
            });
        } else {
            transform_fields.push({
                key: MeshProperty.SCALE,
                title: MeshPropertyTitle.SCALE,
                value: mesh.get_scale(),
                type: PropertyType.VECTOR_2,
                params: {
                    x: { step: 0.1, format: (v: number) => v.toFixed(1) },
                    y: { step: 0.1, format: (v: number) => v.toFixed(1) },
                },
                onBeforeChange: saveScale,
                onChange: handleScaleChange,
                onRefresh: refreshScale
            });
        }

        fields.push({
            key: MeshPropertyTitle.TRANSFORM,
            value: transform_fields,
            type: PropertyType.FOLDER,
            params: { expanded: true }
        });
    }

    function generateGuiTransformFields(fields: PropertyData<PropertyType>[], mesh: IBaseMeshAndThree) {
        generateSizeField(fields, mesh);

        const pivot_preset = pivotToScreenPreset(mesh.get_pivot());
        fields.push({
            key: MeshProperty.PIVOT,
            title: MeshPropertyTitle.PIVOT,
            value: pivot_preset,
            type: PropertyType.LIST_TEXT,
            params: {
                'Центр': ScreenPointPreset.CENTER,
                'Левый Верхний': ScreenPointPreset.TOP_LEFT,
                'Центр Сверху': ScreenPointPreset.TOP_CENTER,
                'Правый Верхний': ScreenPointPreset.TOP_RIGHT,
                'Центр Слева': ScreenPointPreset.LEFT_CENTER,
                'Центр Справа': ScreenPointPreset.RIGHT_CENTER,
                'Левый Нижний': ScreenPointPreset.BOTTOM_LEFT,
                'Центр Снизу': ScreenPointPreset.BOTTOM_CENTER,
                'Правый Нижний': ScreenPointPreset.BOTTOM_RIGHT
            },
            onBeforeChange: savePivot,
            onChange: handlePivotChange,
            onRefresh: refreshPivot
        });

        const anchor_preset = anchorToScreenPreset(mesh.get_anchor());
        fields.push({
            key: MeshProperty.ANCHOR_PRESET,
            title: MeshPropertyTitle.ANCHOR_PRESET,
            value: anchor_preset,
            type: PropertyType.LIST_TEXT,
            params: {
                'Левый Верхний': ScreenPointPreset.TOP_LEFT,
                'Центр Сверху': ScreenPointPreset.TOP_CENTER,
                'Правый Верхний': ScreenPointPreset.TOP_RIGHT,
                'Центр Слева': ScreenPointPreset.LEFT_CENTER,
                'Центр': ScreenPointPreset.CENTER,
                'Центр Справа': ScreenPointPreset.RIGHT_CENTER,
                'Левый Нижний': ScreenPointPreset.BOTTOM_LEFT,
                'Центр Снизу': ScreenPointPreset.BOTTOM_CENTER,
                'Правый Нижний': ScreenPointPreset.BOTTOM_RIGHT
            },
            onBeforeChange: saveAnchorPreset,
            onChange: handleAnchorPresetChange,
            onRefresh: refreshAnchorPreset
        });

        fields.push({
            key: MeshProperty.ANCHOR,
            title: MeshPropertyTitle.ANCHOR,
            value: mesh.get_anchor(),
            type: PropertyType.POINT_2D, params: {
                x: { min: -1, max: 1, step: 0.1, format: (v: number) => v.toFixed(1) },
                y: { min: -1, max: 1, step: 0.1, format: (v: number) => v.toFixed(1) }
            },
            onBeforeChange: saveAnchor,
            onChange: handleAnchorChange,
            onRefresh: refreshAnchor
        });

        if (mesh instanceof GuiBox && !SceneManager.find_nearest_clipping_parent(mesh)) {
            const clipping_fields: PropertyData<PropertyType>[] = [];
            clipping_fields.push({
                key: MeshProperty.CLIPPING_MODE,
                title: MeshPropertyTitle.CLIPPING_MODE,
                value: mesh.isClippingEnabled() ? 'Stencil' : 'None',
                type: PropertyType.LIST_TEXT,
                params: {
                    'None': 'None',
                    'Stencil': 'Stencil'
                },
                onBeforeChange: saveUIClipping,
                onChange: handleUIClippingChange
            });

            if (mesh.isClippingEnabled()) {
                clipping_fields.push({
                    key: MeshProperty.INVERTED_CLIPPING,
                    title: MeshPropertyTitle.INVERTED_CLIPPING,
                    value: mesh.isInvertedClipping(),
                    type: PropertyType.BOOLEAN,
                    onBeforeChange: saveUIInvertedClipping,
                    onChange: handleUIInvertedClippingChange
                });

                clipping_fields.push({
                    key: MeshProperty.CLIPPING_VISIBLE,
                    title: MeshPropertyTitle.CLIPPING_VISIBLE,
                    value: mesh.isClippingVisible(),
                    type: PropertyType.BOOLEAN,
                    onBeforeChange: saveUIClippingVisible,
                    onChange: handleUIClippingVisibleChange
                });
            }

            fields.push({
                key: MeshPropertyTitle.CLIPPING_FOLDER,
                value: clipping_fields,
                type: PropertyType.FOLDER,
                params: { expanded: true }
            });
        }
    }

    function generateSizeField(fields: PropertyData<PropertyType>[], mesh: IBaseMeshAndThree) {
        fields.push({
            key: MeshProperty.SIZE,
            title: MeshPropertyTitle.SIZE,
            value: mesh.get_size(),
            type: PropertyType.VECTOR_2,
            params: {
                x: { min: 0, max: 0xFFFFFFFF, step: 0.1, format: (v: number) => v.toFixed(1) },
                y: { min: 0, max: 0xFFFFFFFF, step: 0.1, format: (v: number) => v.toFixed(1) },
            },
            onBeforeChange: saveSize,
            onChange: handleSizeChange,
            onRefresh: refreshSize
        });
    }

    function generateTextFields(fields: PropertyData<PropertyType>[], mesh: IBaseMeshAndThree) {
        const text_fields: PropertyData<PropertyType>[] = [];
        text_fields.push({
            key: MeshProperty.TEXT,
            title: MeshPropertyTitle.TEXT,
            value: (mesh as TextMesh).text,
            type: PropertyType.LOG_DATA,
            onBeforeChange: saveText,
            onChange: handleTextChange
        });

        text_fields.push({
            key: MeshProperty.FONT,
            title: MeshPropertyTitle.FONT,
            value: (mesh as TextMesh).font || '',
            type: PropertyType.LIST_TEXT,
            params: ResourceManager.get_all_fonts(),
            onBeforeChange: saveFont,
            onChange: handleFontChange
        });

        text_fields.push({
            key: MeshProperty.COLOR,
            title: MeshPropertyTitle.COLOR,
            value: mesh.get_color(),
            type: PropertyType.COLOR,
            onBeforeChange: saveColor,
            onChange: handleColorChange
        });

        text_fields.push({
            key: MeshProperty.TEXT_ALPHA,
            title: MeshPropertyTitle.TEXT_ALPHA,
            value: (mesh as TextMesh).fillOpacity,
            type: PropertyType.SLIDER,
            params: {
                min: 0,
                max: 1,
                step: 0.01,
                format: (v: number) => v.toFixed(2)
            },
            onBeforeChange: saveTextAlpha,
            onChange: handleTextAlphaChange
        });

        const delta = new Vector3(1 * mesh.scale.x, 1 * mesh.scale.y);
        const max_delta = Math.max(delta.x, delta.y);
        const font_size = (mesh as TextMesh).fontSize * max_delta;

        text_fields.push({
            key: MeshProperty.FONT_SIZE,
            title: MeshPropertyTitle.FONT_SIZE,
            value: font_size,
            type: PropertyType.NUMBER,
            params: {
                min: 8,
                step: 1,
                format: (v: number) => v.toFixed(0)
            },
            onBeforeChange: saveFontSize,
            onChange: handleFontSizeChange,
            onRefresh: refreshFontSize
        });

        text_fields.push({
            key: MeshProperty.TEXT_ALIGN,
            title: MeshPropertyTitle.TEXT_ALIGN,
            value: (mesh as TextMesh).textAlign,
            type: PropertyType.LIST_TEXT,
            params: {
                'Центр': TextAlign.CENTER,
                'Слева': TextAlign.LEFT,
                'Справа': TextAlign.RIGHT,
                'По ширине': TextAlign.JUSTIFY
            },
            onBeforeChange: saveTextAlign,
            onChange: handleTextAlignChange
        });

        const line_height = (mesh as TextMesh).lineHeight;
        if (line_height == 'normal') {
            text_fields.push({
                key: MeshProperty.LINE_HEIGHT,
                title: MeshPropertyTitle.LINE_HEIGHT,
                value: 1,
                type: PropertyType.NUMBER,
                params: {
                    min: 0.5,
                    max: 3,
                    step: 0.1,
                    format: (v: number) => v.toFixed(2)
                },
                onBeforeChange: saveLineHeight,
                onChange: handleLineHeightChange
            });
        } else {
            text_fields.push({
                key: MeshProperty.LINE_HEIGHT,
                title: MeshPropertyTitle.LINE_HEIGHT,
                value: line_height,
                type: PropertyType.NUMBER,
                params: {
                    min: 0.5,
                    max: 3,
                    step: 0.1,
                    format: (v: number) => v.toFixed(2)
                },
                onBeforeChange: saveLineHeight,
                onChange: handleLineHeightChange
            });
        }
        fields.push({
            key: MeshPropertyTitle.TEXT,
            value: text_fields,
            type: PropertyType.FOLDER,
            params: { expanded: true }
        });
    }

    function generateMaterialFields(title: string, list: IBaseMeshAndThree[], fields: PropertyData<PropertyType>[], mesh: IBaseMeshAndThree, material: ShaderMaterial, expanded = false, with_slice9 = false, with_flip = false, index = 0) {
        const material_fields: PropertyData<PropertyType>[] = [];
        material_fields.push({
            key: MeshProperty.MATERIAL,
            title: MeshPropertyTitle.MATERIAL,
            value: material.name || '',
            type: PropertyType.LIST_TEXT,
            params: generateMaterialOptions(),
            data: { material_index: index },
            onBeforeChange: saveMaterial,
            onChange: handleMaterialChange
        });

        if (!(mesh instanceof MultipleMaterialMesh)) {
            material_fields.push({
                key: MeshProperty.COLOR,
                title: MeshPropertyTitle.COLOR,
                value: mesh.get_color(),
                type: PropertyType.COLOR,
                data: { material_index: index },
                onBeforeChange: saveColor,
                onChange: handleColorChange,
            });
        }

        material_fields.push({
            key: MeshProperty.BLEND_MODE,
            title: MeshPropertyTitle.BLEND_MODE,
            value: convertThreeJSBlendingToBlendMode(mesh instanceof MultipleMaterialMesh ? mesh.get_materials()[index].blending : material.blending),
            type: PropertyType.LIST_TEXT, params: {
                'Нормальный': BlendMode.NORMAL,
                'Сложение': BlendMode.ADD,
                'Умножение': BlendMode.MULTIPLY,
                'Вычитание': BlendMode.SUBTRACT,
                // 'Пользовательский': BlendMode.CUSTOM
            },
            data: { material_index: index },
            onBeforeChange: saveBlendMode,
            onChange: handleBlendModeChange
        });

        if (with_slice9) {
            material_fields.push({
                key: MeshProperty.SLICE9,
                title: MeshPropertyTitle.SLICE9,
                value: (mesh as Slice9Mesh).get_slice(),
                type: PropertyType.POINT_2D, params: {
                    x: { min: 0, max: 100, format: (v: number) => v.toFixed(2) },
                    y: { min: 0, max: 100, format: (v: number) => v.toFixed(2) }
                },
                data: { material_index: index },
                onBeforeChange: saveSlice,
                onChange: handleSliceChange,
                onRefresh: refreshSlice9
            });
        }

        if (material) {
            const material_info = ResourceManager.get_material_info(material.name);
            if (material_info) {
                Object.entries(material.uniforms).forEach(([key, uniform]) => {
                    const uniformInfo = material_info.uniforms[key];
                    if (!uniformInfo) return;
                    if (uniformInfo.hide) return;
                    switch (uniformInfo.type) {
                        case MaterialUniformType.SAMPLER2D:
                            const texture = uniform as IUniform<Texture>;
                            // NOTE: берем данные из меша a не из юниформы для u_texture, так как в ней хранится просто Texture и даже если хранить в userData информацию об атласе и имени, то в случаях когда текстура это атлас который по uv режиться на текстуры, она будет перезаписываться по мере загрузки других частей из этой текстуры-атласа, так как все они ссылаются на один и тот же объект Texture
                            // FIXME: остается косяк с с другими текстурными юниформами так как о них нет информации какие части текстуры-атласа они используют
                            let texture_name = '';
                            if (key == 'u_texture') {
                                if (mesh instanceof MultipleMaterialMesh) {
                                    const info = mesh.get_texture(index);
                                    texture_name = info ? info[0] : '';
                                } else {
                                    const info = mesh.get_texture();
                                    texture_name = info ? info[0] : '';
                                }
                            } else if (texture.value) texture_name = get_file_name((texture.value as any).path || '');

                            let atlas = '';
                            if (key == 'u_texture') {
                                if (mesh instanceof MultipleMaterialMesh) {
                                    const info = mesh.get_texture(index);
                                    atlas = info ? info[1] : '';
                                } else {
                                    const info = mesh.get_texture();
                                    atlas = info ? info[1] : '';
                                }
                            } else {
                                atlas = ResourceManager.get_atlas_by_texture_name(texture_name) || '';
                            }

                            material_fields.push({
                                key,
                                value: `${atlas}/${texture_name}`,
                                type: PropertyType.LIST_TEXTURES,
                                readonly: uniformInfo.readonly,
                                params: generateTextureOptions(true),
                                data: { material_index: index },
                                onBeforeChange: saveUniformSampler2D,
                                onChange: handleUniformSampler2DChange
                            });
                            break;
                        case MaterialUniformType.FLOAT:
                            const float = uniform as IUniform<number>;
                            material_fields.push({
                                key,
                                value: float.value,
                                type: PropertyType.NUMBER,
                                params: {
                                    step: 0.01,
                                    format: (v: number) => v.toFixed(2)
                                },
                                readonly: uniformInfo.readonly,
                                data: { material_index: index },
                                onBeforeChange: saveUniformFloat,
                                onChange: handleUniformFloatChange
                            });
                            break;
                        case MaterialUniformType.RANGE:
                            const range = uniform as IUniform<number>;
                            const range_params = uniformInfo.params as MaterialUniformParams[MaterialUniformType.RANGE];
                            let value = range.value;
                            let onBeforeChange = saveUniformRange;
                            let onChange = handleUniformRangeChange;
                            let onRefresh = undefined;
                            // NOTE: для ui нужны свои обработчики
                            if (key == 'alpha' && (mesh instanceof GuiBox || mesh instanceof GuiText)) {
                                // NOTE: если это alpha то нужно добавить флаг наследования прозрачности
                                material_fields.push({
                                    key: MeshProperty.INHERITED_ALPHA,
                                    title: MeshPropertyTitle.INHERITED_ALPHA,
                                    value: (mesh as GuiBox).isInheredAlpha(),
                                    type: PropertyType.BOOLEAN,
                                    onBeforeChange: saveInheredAlpha,
                                    onChange: handleInheredAlphaChange,
                                });

                                value = mesh.get_alpha();
                                onBeforeChange = saveUIAlpha;
                                onChange = handleUIAlphaChange;
                                onRefresh = refreshUIAlpha;
                            }
                            material_fields.push({
                                key,
                                value,
                                type: PropertyType.SLIDER,
                                readonly: uniformInfo.readonly,
                                params: {
                                    min: range_params.min ?? 0,
                                    max: range_params.max ?? 1,
                                    step: range_params.step ?? 0.01
                                },
                                data: { material_index: index },
                                onBeforeChange,
                                onChange,
                                onRefresh
                            });
                            break;
                        case MaterialUniformType.VEC2:
                            const vec2 = uniform as IUniform<Vector2>;
                            const vec2_params = uniformInfo.params as MaterialUniformParams[MaterialUniformType.VEC2];
                            material_fields.push({
                                key,
                                value: vec2.value,
                                type: PropertyType.VECTOR_2,
                                readonly: uniformInfo.readonly,
                                params: {
                                    x: {
                                        min: vec2_params.x.min ?? -1000,
                                        max: vec2_params.x.min ?? 1000,
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
                                data: { material_index: index },
                                onBeforeChange: saveUniformVec2,
                                onChange: handleUniformVec2Change
                            });
                            break;
                        case MaterialUniformType.VEC3:
                            const vec3 = uniform as IUniform<Vector3>;
                            const vec3_params = uniformInfo.params as MaterialUniformParams[MaterialUniformType.VEC3];
                            material_fields.push({
                                key,
                                value: vec3.value,
                                type: PropertyType.VECTOR_3,
                                readonly: uniformInfo.readonly,
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
                                data: { material_index: index },
                                onBeforeChange: saveUniformVec3,
                                onChange: handleUniformVec3Change
                            });
                            break;
                        case MaterialUniformType.VEC4:
                            const vec4 = uniform as IUniform<Vector4>;
                            const vec4_params = uniformInfo.params as MaterialUniformParams[MaterialUniformType.VEC4];
                            material_fields.push({
                                key,
                                value: vec4.value,
                                type: PropertyType.VECTOR_4,
                                readonly: uniformInfo.readonly,
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
                                data: { material_index: index },
                                onBeforeChange: saveUniformVec4,
                                onChange: handleUniformVec4Change
                            });
                            break;
                        case MaterialUniformType.COLOR:
                            const color = uniform as IUniform<Vector3>;
                            material_fields.push({
                                key,
                                value: rgbToHex(color.value),
                                type: PropertyType.COLOR,
                                readonly: uniformInfo.readonly,
                                data: { material_index: index },
                                onBeforeChange: saveUniformColor,
                                onChange: handleUniformColorChange
                            });
                            break;
                    }
                });
            }
        }

        // // NOTE: отражение только для спрайта
        if (with_flip && mesh.type === IObjectTypes.GO_SPRITE_COMPONENT) {
            const sprite = mesh as GoSprite;
            const currentFlip = sprite.get_flip();

            switch (currentFlip) {
                case FlipMode.NONE:
                    material_fields.push({
                        key: MeshProperty.FLIP_DIAGONAL,
                        title: MeshPropertyTitle.FLIP_DIAGONAL,
                        value: false,
                        type: PropertyType.BOOLEAN,
                        data: { material_index: index },
                        onBeforeChange: saveUV,
                        onChange: handleFlipDiagonalChange,
                        onRefresh: refreshFlipDiagonal
                    });
                    material_fields.push({
                        key: MeshProperty.FLIP_VERTICAL,
                        title: MeshPropertyTitle.FLIP_VERTICAL,
                        value: false,
                        type: PropertyType.BOOLEAN,
                        data: { material_index: index },
                        onBeforeChange: saveUV,
                        onChange: handleFlipVerticalChange,
                        onRefresh: refreshFlipVertical
                    });
                    material_fields.push({
                        key: MeshProperty.FLIP_HORIZONTAL,
                        title: MeshPropertyTitle.FLIP_HORIZONTAL,
                        value: false,
                        type: PropertyType.BOOLEAN,
                        data: { material_index: index },
                        onBeforeChange: saveUV,
                        onChange: handleFlipHorizontalChange,
                        onRefresh: refreshFlipHorizontal
                    });
                    break;
                case FlipMode.VERTICAL:
                    material_fields.push({
                        key: MeshProperty.FLIP_DIAGONAL,
                        title: MeshPropertyTitle.FLIP_DIAGONAL,
                        value: false,
                        type: PropertyType.BOOLEAN,
                        data: { material_index: index },
                        onBeforeChange: saveUV,
                        onChange: handleFlipDiagonalChange,
                        onRefresh: refreshFlipDiagonal
                    });
                    material_fields.push({
                        key: MeshProperty.FLIP_VERTICAL,
                        title: MeshPropertyTitle.FLIP_VERTICAL,
                        value: true,
                        type: PropertyType.BOOLEAN,
                        data: { material_index: index },
                        onBeforeChange: saveUV,
                        onChange: handleFlipVerticalChange,
                        onRefresh: refreshFlipVertical
                    });
                    material_fields.push({
                        key: MeshProperty.FLIP_HORIZONTAL,
                        title: MeshPropertyTitle.FLIP_HORIZONTAL,
                        value: false,
                        type: PropertyType.BOOLEAN,
                        data: { material_index: index },
                        onBeforeChange: saveUV,
                        onChange: handleFlipHorizontalChange,
                        onRefresh: refreshFlipHorizontal
                    });
                    break;
                case FlipMode.HORIZONTAL:
                    material_fields.push({
                        key: MeshProperty.FLIP_DIAGONAL,
                        title: MeshPropertyTitle.FLIP_DIAGONAL,
                        value: false,
                        type: PropertyType.BOOLEAN,
                        data: { material_index: index },
                        onBeforeChange: saveUV,
                        onChange: handleFlipDiagonalChange,
                        onRefresh: refreshFlipDiagonal
                    });
                    material_fields.push({
                        key: MeshProperty.FLIP_VERTICAL,
                        title: MeshPropertyTitle.FLIP_VERTICAL,
                        value: false,
                        type: PropertyType.BOOLEAN,
                        data: { material_index: index },
                        onBeforeChange: saveUV,
                        onChange: handleFlipVerticalChange,
                        onRefresh: refreshFlipVertical
                    });
                    material_fields.push({
                        key: MeshProperty.FLIP_HORIZONTAL,
                        title: MeshPropertyTitle.FLIP_HORIZONTAL,
                        value: true,
                        type: PropertyType.BOOLEAN,
                        data: { material_index: index },
                        onBeforeChange: saveUV,
                        onChange: handleFlipHorizontalChange,
                        onRefresh: refreshFlipHorizontal
                    });
                    break;
                case FlipMode.DIAGONAL:
                    material_fields.push({
                        key: MeshProperty.FLIP_DIAGONAL,
                        title: MeshPropertyTitle.FLIP_DIAGONAL,
                        value: true,
                        type: PropertyType.BOOLEAN,
                        data: { material_index: index },
                        onBeforeChange: saveUV,
                        onChange: handleFlipDiagonalChange,
                        onRefresh: refreshFlipDiagonal
                    });
                    material_fields.push({
                        key: MeshProperty.FLIP_VERTICAL,
                        title: MeshPropertyTitle.FLIP_VERTICAL,
                        value: false,
                        type: PropertyType.BOOLEAN,
                        data: { material_index: index },
                        onBeforeChange: saveUV,
                        onChange: handleFlipVerticalChange,
                        onRefresh: refreshFlipVertical
                    });
                    material_fields.push({
                        key: MeshProperty.FLIP_HORIZONTAL,
                        title: MeshPropertyTitle.FLIP_HORIZONTAL,
                        value: false,
                        type: PropertyType.BOOLEAN,
                        data: { material_index: index },
                        onBeforeChange: saveUV,
                        onChange: handleFlipHorizontalChange,
                        onRefresh: refreshFlipHorizontal
                    });
                    break;
            }
        }

        generateGoToOriginalMaterialButton(list, material_fields, index);

        fields.push({
            key: title,
            value: material_fields,
            type: PropertyType.FOLDER,
            params: { expanded }
        });
    }

    function generateGoToOriginalMaterialButton(list: IBaseMeshAndThree[], fields: PropertyData<PropertyType>[], index?: number) {
        let selected_meshes_material = '';
        for (const id of list.map((value) => value.mesh_data.id)) {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) break;
            let material;
            if (mesh instanceof Slice9Mesh) material = (mesh as Slice9Mesh).material;
            else if (mesh instanceof MultipleMaterialMesh) {
                const materials = (mesh as MultipleMaterialMesh).get_materials();
                if (materials) {
                    material = materials[index ?? 0];
                }
            }
            if (material == undefined) break;
            if (selected_meshes_material == '') {
                selected_meshes_material = material.name;
            } else if (selected_meshes_material != material.name) {
                selected_meshes_material = '';
                break;
            }
        }

        if (selected_meshes_material != '') {
            fields.push({
                key: MeshProperty.GO_TO_ORIGINAL_MATERIAL,
                title: MeshPropertyTitle.GO_TO_ORIGINAL_MATERIAL,
                type: PropertyType.BUTTON,
                value: async () => {
                    const material_info = ResourceManager.get_material_info(selected_meshes_material);
                    if (material_info) {
                        const path = material_info.path.replace(/^\/+/, '');
                        await AssetControl.select_file(path);
                    }
                }
            });
        }
    }

    function generateModelFields(list: IBaseMeshAndThree[], fields: PropertyData<PropertyType>[], mesh: IBaseMeshAndThree) {
        generateTransformFields(fields, mesh);

        const model_fields: PropertyData<PropertyType>[] = [];

        const model = (mesh as Model).get_mesh_name();

        model_fields.push({
            key: MeshProperty.MODEL,
            title: MeshPropertyTitle.MODEL,
            value: model,
            type: PropertyType.LIST_TEXT,
            params: generateModelOptions(),
            onBeforeChange: saveModel,
            onChange: handleModelChange
        });

        fields.push({
            key: MeshPropertyTitle.MODEL,
            value: model_fields,
            type: PropertyType.FOLDER,
            params: { expanded: true }
        });

        const material_folders: PropertyData<PropertyType>[] = [];
        (mesh as MultipleMaterialMesh).get_materials().forEach((material: ShaderMaterial, idx: number) => {
            const is_first = (idx == 0);
            generateMaterialFields(`Материал ${idx}`, list, material_folders, mesh, material, is_first, false, false, idx);
        });

        fields.push({
            key: MeshPropertyTitle.MATERIAL,
            value: material_folders,
            type: PropertyType.FOLDER,
            params: { expanded: true }
        });
    }

    function generateAnimatedModelFields(list: IBaseMeshAndThree[], fields: PropertyData<PropertyType>[], mesh: IBaseMeshAndThree) {
        generateTransformFields(fields, mesh);

        const model_fields: PropertyData<PropertyType>[] = [];

        const model = (mesh as AnimatedMesh).get_mesh_name();

        model_fields.push({
            key: MeshProperty.MODEL,
            title: MeshPropertyTitle.MODEL,
            value: model,
            type: PropertyType.LIST_TEXT,
            params: generateModelOptions(),
            onBeforeChange: saveAnimatedModel,
            onChange: handleAnimatedModelChange
        });

        fields.push({
            key: MeshPropertyTitle.MODEL,
            value: model_fields,
            type: PropertyType.FOLDER,
            params: { expanded: true }
        });

        model_fields.push({
            key: MeshProperty.ANIMATION_LIST,
            title: MeshPropertyTitle.ANIMATION_LIST,
            value: Object.keys((mesh as AnimatedMesh).get_animation_list()),
            type: PropertyType.ITEM_LIST,
            params: {
                pickText: 'Выберите анимацию',
                emptyText: 'Нет добавленных анимаций',
                options: ResourceManager.get_all_model_animations(model)
            },
            onBeforeChange: saveAnimationList,
            onChange: handleAnimationListChange
        });

        const animationOptions: { [key: string]: string } = {};
        Object.keys((mesh as AnimatedMesh).get_animation_list()).forEach(animation => {
            animationOptions[animation] = animation;
        });

        model_fields.push({
            key: MeshProperty.ACTIVE_MODEL_ANIMATION,
            title: MeshPropertyTitle.ACTIVE_MODEL_ANIMATION,
            value: (mesh as AnimatedMesh).get_animation(),
            type: PropertyType.LIST_TEXT,
            params: animationOptions,
            onBeforeChange: saveActiveModelAnimation,
            onChange: handleActiveModelAnimationChange
        });

        const material_folders: PropertyData<PropertyType>[] = [];
        (mesh as MultipleMaterialMesh).get_materials().forEach((material: ShaderMaterial, idx: number) => {
            const is_first = (idx == 0);
            generateMaterialFields(`Материал ${idx}`, list, material_folders, mesh, material, is_first, false, false, idx);
        });

        fields.push({
            key: MeshPropertyTitle.MATERIAL,
            value: material_folders,
            type: PropertyType.FOLDER,
            params: { expanded: true }
        });

    }

    function generateAudioFields(fields: PropertyData<PropertyType>[], mesh: AudioMesh) {
        generateTransformFields(fields, mesh);

        const audio_fields: PropertyData<PropertyType>[] = [];

        const soundOptions: { [key: string]: string } = {};
        ResourceManager.get_all_sounds().forEach(sound => {
            soundOptions[sound] = sound;
        });

        audio_fields.push({
            key: MeshProperty.SOUND,
            title: MeshPropertyTitle.SOUND,
            value: mesh.get_sound(),
            type: PropertyType.LIST_TEXT,
            params: soundOptions,
            onBeforeChange: saveSound,
            onChange: handleSoundChange
        });

        audio_fields.push({
            key: MeshProperty.LOOP,
            title: MeshPropertyTitle.LOOP,
            value: mesh.get_loop(),
            type: PropertyType.BOOLEAN,
            onBeforeChange: saveLoop,
            onChange: handleLoopChange
        });

        audio_fields.push({
            key: MeshProperty.VOLUME,
            title: MeshPropertyTitle.VOLUME,
            value: mesh.get_volume(),
            type: PropertyType.SLIDER,
            params: {
                min: 0,
                max: 2,
                step: 0.01,
                format: (value: number) => value.toFixed(2)
            },
            onBeforeChange: saveVolume,
            onChange: handleVolumeChange
        });

        audio_fields.push({
            key: MeshProperty.SPEED,
            title: MeshPropertyTitle.SPEED,
            value: mesh.get_speed(),
            type: PropertyType.SLIDER,
            params: {
                min: 0,
                max: 2,
                step: 0.01,
                format: (value: number) => value.toFixed(2)
            },
            onBeforeChange: saveSpeed,
            onChange: handleSpeedChange
        });

        audio_fields.push({
            key: MeshProperty.ZONE_TYPE,
            title: MeshPropertyTitle.ZONE_TYPE,
            value: mesh.get_zone_type(),
            type: PropertyType.LIST_TEXT,
            params: {
                'Круговая': SoundZoneType.CIRCULAR,
                'Прямоугольная': SoundZoneType.RECTANGULAR
            },
            onBeforeChange: saveZoneType,
            onChange: handleZoneTypeChange
        });

        if (mesh.get_zone_type() == SoundZoneType.CIRCULAR) {
            audio_fields.push({
                key: MeshProperty.SOUND_RADIUS,
                title: MeshPropertyTitle.SOUND_RADIUS,
                value: mesh.get_sound_radius(),
                type: PropertyType.NUMBER,
                params: {
                    min: 0,
                    max: 1000,
                    step: 1,
                    format: (value: number) => value.toFixed(0)
                },
                onBeforeChange: saveSoundRadius,
                onChange: handleSoundRadiusChange
            });

            audio_fields.push({
                key: MeshProperty.MAX_VOLUME_RADIUS,
                title: MeshPropertyTitle.MAX_VOLUME_RADIUS,
                value: mesh.get_max_volume_radius(),
                type: PropertyType.NUMBER,
                params: {
                    min: 0,
                    max: 1000,
                    step: 1,
                    format: (value: number) => value.toFixed(0)
                },
                onBeforeChange: saveMaxVolumeRadius,
                onChange: handleMaxVolumeRadiusChange
            });
        }

        if (mesh.get_zone_type() == SoundZoneType.RECTANGULAR) {
            audio_fields.push({
                key: MeshProperty.RECTANGLE_WIDTH,
                title: MeshPropertyTitle.RECTANGLE_WIDTH,
                value: mesh.get_rectangle_width(),
                type: PropertyType.NUMBER,
                params: {
                    min: 0,
                    max: 1000,
                    step: 1,
                    format: (value: number) => value.toFixed(0)
                },
                onBeforeChange: saveRectangleWidth,
                onChange: handleRectangleWidthChange
            });

            audio_fields.push({
                key: MeshProperty.RECTANGLE_HEIGHT,
                title: MeshPropertyTitle.RECTANGLE_HEIGHT,
                value: mesh.get_rectangle_height(),
                type: PropertyType.NUMBER,
                params: {
                    min: 0,
                    max: 1000,
                    step: 1,
                    format: (value: number) => value.toFixed(0)
                },
                onBeforeChange: saveRectangleHeight,
                onChange: handleRectangleHeightChange
            });

            audio_fields.push({
                key: MeshProperty.RECTANGLE_MAX_VOLUME_WIDTH,
                title: MeshPropertyTitle.RECTANGLE_MAX_VOLUME_WIDTH,
                value: mesh.get_rectangle_max_volume_width(),
                type: PropertyType.NUMBER,
                params: {
                    min: 0,
                    max: 1000,
                    step: 1,
                    format: (value: number) => value.toFixed(0)
                },
                onBeforeChange: saveRectangleMaxVolumeWidth,
                onChange: handleRectangleMaxVolumeWidthChange
            });

            audio_fields.push({
                key: MeshProperty.RECTANGLE_MAX_VOLUME_HEIGHT,
                title: MeshPropertyTitle.RECTANGLE_MAX_VOLUME_HEIGHT,
                value: mesh.get_rectangle_max_volume_height(),
                type: PropertyType.NUMBER,
                params: {
                    min: 0,
                    max: 1000,
                    step: 1,
                    format: (value: number) => value.toFixed(0)
                },
                onBeforeChange: saveRectangleMaxVolumeHeight,
                onChange: handleRectangleMaxVolumeHeightChange
            });
        }

        audio_fields.push({
            key: MeshProperty.PAN_NORMALIZATION_DISTANCE,
            title: MeshPropertyTitle.PAN_NORMALIZATION_DISTANCE,
            value: mesh.get_pan_normalization_distance(),
            type: PropertyType.NUMBER,
            params: {
                min: 0,
                max: 1000,
                step: 1,
                format: (value: number) => value.toFixed(0)
            },
            onBeforeChange: savePanNormalizationDistance,
            onChange: handlePanNormalizationDistanceChange
        });

        audio_fields.push({
            key: MeshProperty.SOUND_FUNCTION,
            title: MeshPropertyTitle.SOUND_FUNCTION,
            value: mesh.get_sound_function(),
            type: PropertyType.LIST_TEXT,
            params: {
                'Линейная': SoundFunctionType.LINEAR,
                'Экспоненциальная': SoundFunctionType.EXPONENTIAL,
                'Квадратичная': SoundFunctionType.QUADRATIC,
                'Обратная квадратичная': SoundFunctionType.INVERSE_QUADRATIC,
                'Плавная ступень': SoundFunctionType.SMOOTH_STEP
            },
            onBeforeChange: saveSoundFunction,
            onChange: handleSoundFunctionChange
        });

        if (mesh.get_sound() != '' && !mesh.is_spatial()) {
            const is_playing = mesh.is_playing();
            audio_fields.push({
                key: is_playing ? MeshProperty.STOP : MeshProperty.PLAY,
                title: is_playing ? MeshPropertyTitle.STOP : MeshPropertyTitle.PLAY,
                value: () => {
                    if (is_playing) {
                        mesh.stop();
                    } else {
                        mesh.play(() => {
                            // NOTE: для того чтобы сменить кнопку по окончанию проигрывания звука
                            set_selected_meshes(_selected_meshes);
                        });
                    }

                    // NOTE: для того чтобы сменить кнопку
                    set_selected_meshes(_selected_meshes);
                },
                type: PropertyType.BUTTON,
            });
        }

        fields.push({
            key: MeshPropertyTitle.SOUND,
            value: audio_fields,
            type: PropertyType.FOLDER,
            params: { expanded: true }
        });
    }

    function generateGuiBoxFields(list: IBaseMeshAndThree[], fields: PropertyData<PropertyType>[], mesh: IBaseMeshAndThree) {
        generateTransformFields(fields, mesh, true);
        generateGuiTransformFields(fields, mesh);

        generateMaterialFields('Материал', list, fields, mesh, (mesh as Slice9Mesh).material, true, true, false);
    }

    function generateGuiTextFields(fields: PropertyData<PropertyType>[], mesh: IBaseMeshAndThree) {
        generateTransformFields(fields, mesh, true);
        generateGuiTransformFields(fields, mesh);
        generateTextFields(fields, mesh);
    }

    function generateSpriteFields(list: IBaseMeshAndThree[], fields: PropertyData<PropertyType>[], mesh: IBaseMeshAndThree) {
        generateTransformFields(fields, mesh);
        generateSizeField(fields, mesh);
        generateMaterialFields('Материал', list, fields, mesh, (mesh as Slice9Mesh).material, true, true, true);
    }

    function generateLabelFields(fields: PropertyData<PropertyType>[], mesh: IBaseMeshAndThree) {
        generateTransformFields(fields, mesh);
        generateSizeField(fields, mesh);
        generateTextFields(fields, mesh);
    }

    function refreshPosition(ids: number[]) {
        const mesh = SceneManager.get_mesh_by_id(ids[0]);
        if (mesh == undefined) {
            Log.error('[refreshPosition] Mesh not found for id:', ids);
            return;
        }
        return mesh.get_position();
    }

    function refreshRotation(ids: number[]) {
        const mesh = SceneManager.get_mesh_by_id(ids[0]);
        if (mesh == undefined) {
            Log.error('[refreshRotation] Mesh not found for id:', ids);
            return;
        }
        const raw = mesh.quaternion;
        return new Vector3().fromArray(quat_to_euler(raw.x, raw.y, raw.z, raw.w));
    }

    function refreshScale(ids: number[]) {
        const mesh = SceneManager.get_mesh_by_id(ids[0]);
        if (mesh == undefined) {
            Log.error('[refreshScale] Mesh not found for id:', ids);
            return;
        }
        return mesh.get_scale();
    }

    function refreshModelScale(ids: number[]) {
        const mesh = SceneManager.get_mesh_by_id(ids[0]);
        if (mesh == undefined) {
            Log.error('[refreshModelScale] Mesh not found for id:', ids);
            return;
        }
        const firstChild = (mesh as AnimatedMesh).children[0];
        if (firstChild) {
            return Math.max(...firstChild.scale.toArray());
        }
        return WORLD_SCALAR;
    }

    function refreshSize(ids: number[]) {
        const mesh = SceneManager.get_mesh_by_id(ids[0]);
        if (mesh == undefined) {
            Log.error('[refreshSize] Mesh not found for id:', ids);
            return;
        }
        return mesh.get_size();
    }

    function refreshPivot(ids: number[]) {
        const mesh = SceneManager.get_mesh_by_id(ids[0]);
        if (mesh == undefined) {
            Log.error('[refreshPivot] Mesh not found for id:', ids);
            return;
        }
        return pivotToScreenPreset(mesh.get_pivot());
    }

    function refreshAnchor(ids: number[]) {
        const mesh = SceneManager.get_mesh_by_id(ids[0]);
        if (mesh == undefined) {
            Log.error('[refreshAnchor] Mesh not found for id:', ids);
            return;
        }
        return mesh.get_anchor();
    }

    function refreshAnchorPreset(ids: number[]) {
        const mesh = SceneManager.get_mesh_by_id(ids[0]);
        if (mesh == undefined) {
            Log.error('[refreshAnchorPreset] Mesh not found for id:', ids);
            return;
        }
        return anchorToScreenPreset(mesh.get_anchor());
    }

    function refreshSlice9(ids: number[]) {
        const mesh = SceneManager.get_mesh_by_id(ids[0]) as Slice9Mesh;
        if (mesh == undefined) {
            Log.error('[refreshSlice9] Mesh not found for id:', ids);
            return;
        }
        return mesh.get_slice();
    }

    function refreshFontSize(ids: number[]) {
        const mesh = SceneManager.get_mesh_by_id(ids[0]) as TextMesh;
        if (mesh == undefined) {
            Log.error('[refreshFontSize] Mesh not found for id:', ids);
            return;
        }
        const delta = new Vector3(1 * mesh.scale.x, 1 * mesh.scale.y);
        const max_delta = Math.max(delta.x, delta.y);
        return mesh.fontSize * max_delta;
    }

    function refreshFlipVertical(ids: number[]) {
        const mesh = SceneManager.get_mesh_by_id(ids[0]) as GoSprite;
        if (mesh == undefined) {
            Log.error('[refreshFlipVertical] Mesh not found for id:', ids);
            return;
        }
        return mesh.get_flip() == FlipMode.VERTICAL;
    }

    function refreshFlipHorizontal(ids: number[]) {
        const mesh = SceneManager.get_mesh_by_id(ids[0]) as GoSprite;
        if (mesh == undefined) {
            Log.error('[refreshFlipHorizontal] Mesh not found for id:', ids);
            return;
        }
        return mesh.get_flip() == FlipMode.HORIZONTAL;
    }

    function refreshFlipDiagonal(ids: number[]) {
        const mesh = SceneManager.get_mesh_by_id(ids[0]) as GoSprite;
        if (mesh == undefined) {
            Log.error('[refreshFlipDiagonal] Mesh not found for id:', ids);
            return;
        }
        return mesh.get_flip() == FlipMode.DIAGONAL;
    }

    function saveName(info: BeforeChangeInfo) {
        const names: MeshPropertyInfo<string>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveName] Mesh not found for id:', id);
                return;
            }
            names.push({ mesh_id: id, value: mesh.name });
        });
        HistoryControl.add('MESH_NAME', names, HistoryOwner.MESH_INSPECTOR);
    }

    function handleNameChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<string>(info);
        updateName(data, info.data.event.last);
    }

    function updateName(data: MeshPropertyInfo<string>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updateName] Mesh not found for id:', item.mesh_id);
                return;
            }
            SceneManager.set_mesh_name(mesh, item.value);
            ControlManager.update_graph();
        }
    }

    function getChildrenActive(list: any[], state: boolean) {
        let result: MeshPropertyInfo<boolean>[] = [];
        list.forEach((item: any) => {
            if (!is_base_mesh(item)) return;
            result.push({ mesh_id: item.mesh_data.id, value: item.get_active() });
            if (item.children.length > 0) {
                const children = getChildrenActive(item.children, state);
                if (children.length > 0) result.push(...children);
            }
        });
        return result;
    }

    function saveActive(info: BeforeChangeInfo) {
        const actives: MeshPropertyInfo<boolean>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveActive] Mesh not found for id:', id);
                return;
            }
            actives.push({ mesh_id: id, value: mesh.get_active() });
            if (mesh.children.length > 0) {
                const children = getChildrenActive(mesh.children, mesh.get_active());
                if (children.length > 0) actives.push(...children);
            }
        });
        HistoryControl.add('MESH_ACTIVE', actives, HistoryOwner.MESH_INSPECTOR);
    }

    function handleActiveChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<boolean>(info);
        updateActive(data, info.data.event.last);
    }

    function updateActive(data: MeshPropertyInfo<boolean>[], _: boolean) {
        const ids: { id: number, visible: boolean }[] = [];
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updateActive] Mesh not found for id:', item.mesh_id);
                return;
            }
            mesh.set_active(item.value);
            ids.push({ id: item.mesh_id, visible: mesh.get_visible() });
            if (mesh.children) {
                const children = updateChildrenActive(mesh.children, item.value);
                if (children.length > 0) ids.push(...children);
            }

            EventBus.trigger("SYS_GRAPH_ACTIVE", { list: ids, state: item.value });
        }
    }

    function updateChildrenActive(children: any[], state: boolean) {
        const result: { id: number, visible: boolean }[] = [];
        children.forEach((child: any) => {
            if (!is_base_mesh(child)) return;
            child.set_active(state);
            result.push({ id: child.mesh_data.id, visible: child.get_visible() });
            if (child.children.length > 0) {
                const children = updateChildrenActive(child.children, state);
                if (children.length > 0) result.push(...children);
            }
        });
        return result;
    }

    function saveUIClipping(info: BeforeChangeInfo) {
        const oldClipping: MeshPropertyInfo<boolean>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveUIClipping] Mesh not found for id:', id);
                return;
            }
            if (mesh.type != IObjectTypes.GUI_BOX) return;
            oldClipping.push({
                mesh_id: mesh.mesh_data.id,
                value: (mesh as GuiBox).isClippingEnabled()
            });
        });
        HistoryControl.add('MESH_CLIPPING', oldClipping, HistoryOwner.MESH_INSPECTOR);
    }

    function handleUIClippingChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<string>(info);
        const patchedData = data.map(item => {
            return {
                mesh_id: item.mesh_id,
                value: item.value != 'None'
            };
        });
        updateUIClipping(patchedData, info.data.event.last);
    }

    function updateUIClipping(data: MeshPropertyInfo<boolean>[], _: boolean) {
        data.forEach((item) => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (!mesh || !(mesh instanceof GuiBox)) return;
            if (item.value) mesh.enableClipping();
            else mesh.disableClipping();
        });

        force_refresh();
    }

    function saveModel(info: BeforeChangeInfo) {
        const oldModels: MeshPropertyInfo<{ mesh_name: string, scale: number }>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveModel] Mesh not found for id:', id);
                return;
            }
            if (mesh.type != IObjectTypes.GO_MODEL_COMPONENT) return;
            const firstChild = (mesh as Model).children[0];
            oldModels.push({
                mesh_id: mesh.mesh_data.id, value: {
                    mesh_name: (mesh as Model).get_mesh_name(),
                    scale: firstChild ? Math.max(...firstChild.scale.toArray()) : WORLD_SCALAR,
                }
            });
        });
        HistoryControl.add("MESH_MODEL", oldModels, HistoryOwner.MESH_INSPECTOR);
    }

    function handleModelChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<string>(info);
        const patchedData = data.map(item => {
            return {
                mesh_id: item.mesh_id,
                value: {
                    mesh_name: item.value,
                    scale: 1 * WORLD_SCALAR,
                    animations: [],
                    current_animation: ''
                }
            };
        });
        updateModel(patchedData, info.data.event.last);
    }

    function updateModel(data: MeshPropertyInfo<{ mesh_name: string, scale: number }>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updateModel] Mesh not found for id:', item.mesh_id);
                return;
            }
            const model = item.value;
            if (model) {
                const info = (mesh as Model).get_texture();
                let [texture, atlas] = '';
                if (info) {
                    [texture, atlas] = info;
                }

                const prevFirstChild = (mesh as Model).children[0];

                let scale = model.scale;
                if (prevFirstChild) {
                    scale = Math.max(...prevFirstChild.scale.toArray());
                }

                (mesh as Model).set_mesh(model.mesh_name);

                const firstChild = (mesh as Model).children[0];
                if (firstChild) {
                    firstChild.scale.setScalar(scale);
                }

                if (texture && atlas) {
                    (mesh as Model).set_texture(texture, atlas);
                }
            }
        }

        force_refresh();
    }

    function saveAnimatedModel(info: BeforeChangeInfo) {
        const oldModels: MeshPropertyInfo<{ mesh_name: string, scale: number, animations: string[], current_animation: string }>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveModel] Mesh not found for id:', id);
                return;
            }
            if (mesh.type != IObjectTypes.GO_ANIMATED_MODEL_COMPONENT) return;
            const firstChild = (mesh as AnimatedMesh).children[0];
            oldModels.push({
                mesh_id: mesh.mesh_data.id, value: {
                    mesh_name: (mesh as AnimatedMesh).get_mesh_name(),
                    scale: firstChild ? Math.max(...firstChild.scale.toArray()) : WORLD_SCALAR,
                    animations: Object.keys((mesh as AnimatedMesh).get_animation_list()),
                    current_animation: (mesh as AnimatedMesh).get_animation()
                }
            });
        });
        HistoryControl.add("MESH_ANIMATED_MODEL", oldModels, HistoryOwner.MESH_INSPECTOR);
    }

    function handleAnimatedModelChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<string>(info);
        const pathedData = data.map(item => {
            return {
                mesh_id: item.mesh_id,
                value: {
                    mesh_name: item.value,
                    scale: WORLD_SCALAR,
                    animations: [],
                    current_animation: ''
                }
            };
        });
        updateAnimatedModel(pathedData, info.data.event.last);
    }

    function updateAnimatedModel(data: MeshPropertyInfo<{ mesh_name: string, scale: number, animations: string[], current_animation: string }>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updateModel] Mesh not found for id:', item.mesh_id);
                return;
            }
            const model = item.value;
            if (model) {
                const info = (mesh as AnimatedMesh).get_texture();
                let [texture, atlas] = '';
                if (info) {
                    [texture, atlas] = info;
                }

                const prevFirstChild = (mesh as AnimatedMesh).children[0];
                let scale = model.scale;
                if (prevFirstChild) {
                    scale = Math.max(...prevFirstChild.scale.toArray());
                }

                (mesh as AnimatedMesh).set_mesh(model.mesh_name);

                const firstChild = (mesh as AnimatedMesh).children[0];
                if (firstChild) {
                    firstChild.scale.setScalar(scale);
                    mesh.transform_changed();
                }
                if (texture && atlas) {
                    (mesh as AnimatedMesh).set_texture(texture, atlas);
                }

                if (mesh instanceof AnimatedMesh) {
                    model.animations.forEach(animation => {
                        (mesh as AnimatedMesh).add_animation(animation);
                    });
                    (mesh as AnimatedMesh).set_animation(model.current_animation);
                }
            }
        }

        force_refresh();
    }

    function saveAnimationList(info: BeforeChangeInfo) {
        const oldAnimations: MeshPropertyInfo<string[]>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveAnimationList] Mesh not found for id:', id);
                return;
            }
            oldAnimations.push({ mesh_id: mesh.mesh_data.id, value: Object.keys((mesh as AnimatedMesh).get_animation_list()) });
        });
        HistoryControl.add("MESH_ANIMATION_LIST", oldAnimations, HistoryOwner.MESH_INSPECTOR);
    }

    function handleAnimationListChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<string[]>(info);
        updateAnimationList(data, info.data.event.last);
    }

    function updateAnimationList(data: MeshPropertyInfo<string[]>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updateAnimationList] Mesh not found for id:', item.mesh_id);
                return;
            }

            const animatedMesh = mesh as AnimatedMesh;
            const currentAnimations = Object.keys(animatedMesh.get_animation_list());
            const newAnimations = item.value;

            // Add animations that are in new list but not in current
            newAnimations.forEach(animation => {
                if (!currentAnimations.includes(animation)) {
                    animatedMesh.add_animation(animation);
                }
            });

            // Remove animations that are in current but not in new list
            currentAnimations.forEach(animation => {
                if (!newAnimations.includes(animation)) {
                    animatedMesh.remove_animation(animation);
                }
            });
        }

        force_refresh();
    }

    function saveActiveModelAnimation(info: BeforeChangeInfo) {
        const oldAnimations: MeshPropertyInfo<string>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveActiveModelAnimation] Mesh not found for id:', id);
                return;
            }
            if (mesh.type != IObjectTypes.GO_ANIMATED_MODEL_COMPONENT) return;
            oldAnimations.push({ mesh_id: mesh.mesh_data.id, value: (mesh as AnimatedMesh).get_animation() });
        });
        HistoryControl.add("MESH_ACTIVE_MODEL_ANIMATION", oldAnimations, HistoryOwner.MESH_INSPECTOR);

    }

    function handleActiveModelAnimationChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<string>(info);
        updateActiveModelAnimation(data, info.data.event.last);
    }

    function updateActiveModelAnimation(data: MeshPropertyInfo<string>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updateActiveModelAnimation] Mesh not found for id:', item.mesh_id);
                return;
            }
            const animation = item.value;
            if (animation) {
                (mesh as AnimatedMesh).set_animation(animation);
            }
        }
    }

    function savePosition(info: BeforeChangeInfo) {
        const oldPositions: MeshPropertyInfo<Vector3>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[savePosition] Mesh not found for id:', id);
                return;
            }
            oldPositions.push({ mesh_id: id, value: mesh.position.clone() });
        });
        HistoryControl.add("MESH_TRANSLATE", oldPositions, HistoryOwner.MESH_INSPECTOR);
    }

    function handlePositionChange(info: ChangeInfo) {
        const [isDraggedX, isDraggedY, isDraggedZ] = getDraggedInfo(info);
        const [isChangedX, isChangedY, isChangedZ] = getChangedInfo(info);

        const pos = info.data.event.value as Vector3;
        const averagePoint = new Vector3();
        averagePoint.copy(pos);

        if (isDraggedX || isDraggedY || isDraggedZ) {
            const sum = new Vector3(0, 0, 0);
            info.ids.forEach((id) => {
                const mesh = SceneManager.get_mesh_by_id(id);
                if (mesh == undefined) {
                    Log.error('[updatePosition] Mesh not found for id:', id);
                    return;
                }
                sum.add(mesh.get_position());
            });
            averagePoint.copy(sum.divideScalar(info.ids.length));
        }

        const data = info.ids.map((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[updatePosition] Mesh not found for id:', id);
                return;
            }
            const x = isDraggedX ? mesh.get_position().x + (pos.x - averagePoint.x) : isChangedX ? pos.x : mesh.get_position().x;
            const y = isDraggedY ? mesh.get_position().y + (pos.y - averagePoint.y) : isChangedY ? pos.y : mesh.get_position().y;
            const z = isDraggedZ ? mesh.get_position().z + (pos.z - averagePoint.z) : isChangedZ ? pos.z : mesh.get_position().z;

            return { mesh_id: id, value: new Vector3(x, y, z) };
        }).filter((item) => item != undefined);

        updatePosition(data, info.data.event.last);
    }

    function updatePosition(data: MeshPropertyInfo<Vector3>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updatePosition] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.set_position(item.value.x, item.value.y, item.value.z);
        }

        const meshes = data.map(item => SceneManager.get_mesh_by_id(item.mesh_id)).filter(mesh => mesh != undefined);
        TransformControl.set_proxy_in_average_point(meshes);
        SizeControl.draw();
    }

    function handleGuiPositionChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<Vector2>(info);
        updateGuiPosition(data, info.data.event.last);
    }

    function updateGuiPosition(data: { mesh_id: number, value: Vector2 }[], last: boolean) {
        data.forEach(({ mesh_id, value }) => {
            const mesh = SceneManager.get_mesh_by_id(mesh_id);
            if (mesh) {
                mesh.position.x = value.x;
                mesh.position.y = value.y;
            }
        });
        if (last) {
            force_refresh();
        }
    }

    function saveRotation(info: BeforeChangeInfo) {
        const oldRotations: MeshPropertyInfo<Quaternion>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveRotation] Mesh not found for id:', id);
                return;
            }
            oldRotations.push({ mesh_id: id, value: mesh.quaternion.clone() });
        });
        HistoryControl.add("MESH_ROTATE", oldRotations, HistoryOwner.MESH_INSPECTOR);
    }

    function handleRotationChange(info: ChangeInfo) {
        const [isChangedX, isChangedY, isChangedZ] = getChangedInfo(info);
        const rot = info.data.event.value as Vector3;

        const data = info.ids.map((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[updateRotation] Mesh not found for id:', id);
                return;
            }

            const currentQuat = mesh.quaternion;
            const currentEuler = new Vector3().fromArray(quat_to_euler(currentQuat.x, currentQuat.y, currentQuat.z, currentQuat.w));

            const finalRot = new Vector3(
                isChangedZ ? rot.z : currentEuler.x,
                isChangedY ? rot.y : currentEuler.y,
                isChangedX ? rot.x : currentEuler.z
            );

            const newQuat = new Quaternion().fromArray(euler_to_quat(finalRot.x, finalRot.y, finalRot.z));

            return { mesh_id: id, value: newQuat };
        }).filter((item) => item != undefined);

        updateRotation(data, info.data.event.last);
    }

    function updateRotation(data: MeshPropertyInfo<Quaternion>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updateRotation] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.quaternion.set(item.value.x, item.value.y, item.value.z, item.value.w);
            mesh.transform_changed();
        }

        const meshes = data.map(item => SceneManager.get_mesh_by_id(item.mesh_id)).filter(mesh => mesh != undefined);
        TransformControl.set_proxy_in_average_point(meshes);
        SizeControl.draw();
    }

    function saveScale(info: BeforeChangeInfo) {
        const oldScales: MeshPropertyInfo<Vector3>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveScale] Mesh not found for id:', id);
                return;
            }
            oldScales.push({ mesh_id: id, value: deepClone(mesh.scale) });
        });
        HistoryControl.add("MESH_SCALE", oldScales, HistoryOwner.MESH_INSPECTOR);
    }

    function handleScaleChange(info: ChangeInfo) {
        const [isChangedX, isChangedY] = getChangedInfo(info);
        const scale = info.data.event.value as Vector3;

        const data = info.ids.map((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[updateScale] Mesh not found for id:', id);
                return;
            }
            const x = isChangedX ? scale.x : mesh.get_scale().x;
            const y = isChangedY ? scale.y : mesh.get_scale().y;
            return { mesh_id: id, value: new Vector3(x, y, 1) };
        }).filter((item) => item != undefined);

        updateScale(data, info.data.event.last);
    }

    function updateScale(data: MeshPropertyInfo<Vector3>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updateScale] Mesh not found for id:', item.mesh_id);
                continue;
            }

            if (mesh instanceof Slice9Mesh) {
                mesh.set_scale(item.value.x, item.value.y);
            }
            else if (mesh instanceof TextMesh) {
                mesh.set_scale(item.value.x, item.value.y);
                const delta = new Vector3(1 * item.value.x, 1 * item.value.y, 1);
                const max_delta = Math.max(delta.x, delta.y);
                mesh.fontSize * max_delta;
            }
            else if (mesh instanceof MultipleMaterialMesh) {
                mesh.set_scale(item.value.x, item.value.y);
            }
        }

        const meshes = data.map(item => SceneManager.get_mesh_by_id(item.mesh_id)).filter(mesh => mesh != undefined);
        TransformControl.set_proxy_in_average_point(meshes);
        SizeControl.draw();
        Inspector.refresh(['font_size']);
    }

    function saveModelScale(info: BeforeChangeInfo) {
        const oldScales: MeshPropertyInfo<number>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveModelScale] Mesh not found for id:', id);
                return;
            }
            if (mesh instanceof MultipleMaterialMesh) {
                const scale_factor = Math.max(...mesh.get_scale().toArray());
                oldScales.push({ mesh_id: id, value: scale_factor });
            }
        });
        HistoryControl.add('MESH_MODEL_SCALE', oldScales, HistoryOwner.MESH_INSPECTOR);
    }

    function handleModelScaleChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<number>(info);
        updateModelScale(data, info.data.event.last);
    }

    function updateModelScale(data: MeshPropertyInfo<number>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updateModelScale] Mesh not found for id:', item.mesh_id);
                continue;
            }
            if (mesh instanceof MultipleMaterialMesh) {
                mesh.set_scale(item.value, item.value);
            }
        }
    }

    function saveSize(info: BeforeChangeInfo) {
        const oldSizes: MeshPropertyInfo<{ size: Vector2, pos: Vector3 }>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveSize] Mesh not found for id:', id);
                return;
            }
            oldSizes.push({ mesh_id: id, value: { pos: mesh.get_position(), size: mesh.get_size() } });
        });
        HistoryControl.add('MESH_SIZE', oldSizes, HistoryOwner.MESH_INSPECTOR);
    }

    function handleSizeChange(info: ChangeInfo) {
        const [isChangedX, isChangedY] = getChangedInfo(info);
        const size = info.data.event.value as Vector2;

        const data = info.ids.map((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[updateSize] Mesh not found for id:', id);
                return;
            }
            const x = isChangedX ? size.x : mesh.get_size().x;
            const y = isChangedY ? size.y : mesh.get_size().y;
            return { mesh_id: id, value: new Vector2(x, y) };
        }).filter((item) => item != undefined);

        updateSize(data, info.data.event.last);
    }

    function updateSize(data: MeshPropertyInfo<Vector2>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updateSize] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.set_size(item.value.x, item.value.y);
        }

        const meshes = data.map(item => SceneManager.get_mesh_by_id(item.mesh_id)).filter(mesh => mesh != undefined);
        TransformControl.set_proxy_in_average_point(meshes);
        SizeControl.draw();
    }

    function savePivot(info: BeforeChangeInfo) {
        const pivots: MeshPropertyInfo<Vector2>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[savePivot] Mesh not found for id:', id);
                return;
            }
            pivots.push({ mesh_id: id, value: mesh.get_pivot() });
        });
        HistoryControl.add('MESH_PIVOT', pivots, HistoryOwner.MESH_INSPECTOR);
    }

    function handlePivotChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<ScreenPointPreset>(info);
        updatePivot(data, info.data.event.last);
    }

    function updatePivot(data: MeshPropertyInfo<ScreenPointPreset>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updatePivot] Mesh not found for id:', item.mesh_id);
                return;
            }
            const pivot_preset = item.value;
            const pivot = screenPresetToPivotValue(pivot_preset);
            mesh.set_pivot(pivot.x, pivot.y, true);
        }

        SizeControl.draw();
    }

    function saveAnchor(info: BeforeChangeInfo) {
        const anchors: MeshPropertyInfo<Vector2>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveAnchor] Mesh not found for id:', id);
                return;
            }
            anchors.push({ mesh_id: id, value: mesh.get_anchor() });
        });
        HistoryControl.add('MESH_ANCHOR', anchors, HistoryOwner.MESH_INSPECTOR);
    }

    function handleAnchorChange(info: ChangeInfo) {
        const [isChangedX, isChangedY] = getChangedInfo(info);
        const anchor = info.data.event.value as Vector2;

        const data = info.ids.map((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[updateAnchor] Mesh not found for id:', id);
                return;
            }
            const x = isChangedX ? anchor.x : mesh.get_anchor().x;
            const y = isChangedY ? anchor.y : mesh.get_anchor().y;
            return { mesh_id: id, value: new Vector2(x, y) };
        }).filter((item) => item != undefined);

        updateAnchor(data, info.data.event.last);
    }

    function updateAnchor(data: MeshPropertyInfo<Vector2>[], last: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updateAnchor] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.set_anchor(item.value.x, item.value.y);
        }

        SizeControl.draw();

        if (last) {
            Inspector.refresh(['anchor_preset']);
        }
        Inspector.refresh(['anchor']);
    }

    function saveAnchorPreset(info: BeforeChangeInfo) {
        const anchors: MeshPropertyInfo<Vector2>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveAnchorPreset] Mesh not found for id:', id);
                return;
            }
            anchors.push({ mesh_id: id, value: mesh.get_anchor() });
        });
        HistoryControl.add('MESH_ANCHOR', anchors, HistoryOwner.MESH_INSPECTOR);
    }

    function handleAnchorPresetChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<ScreenPointPreset>(info);
        updateAnchorPreset(data, info.data.event.last);
    }

    function updateAnchorPreset(data: MeshPropertyInfo<ScreenPointPreset>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updateAnchorPreset] Mesh not found for id:', item.mesh_id);
                return;
            }
            const anchor = screenPresetToAnchorValue(item.value);
            if (anchor) {
                mesh.set_anchor(anchor.x, anchor.y);
            }
        }
        SizeControl.draw();
        Inspector.refresh(['anchor']);
    }

    function saveColor(info: BeforeChangeInfo) {
        const colors: MeshPropertyInfo<string>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveColor] Mesh not found for id:', id);
                return;
            }
            colors.push({ mesh_id: id, value: mesh.get_color() });
        });
        HistoryControl.add('MESH_COLOR', colors, HistoryOwner.MESH_INSPECTOR);
    }

    function handleColorChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<string>(info);
        updateColor(data, info.data.event.last);
    }

    function updateColor(data: MeshPropertyInfo<string>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updateColor] Mesh not found for id:', item.mesh_id);
                continue;
            }
            const color = item.value;
            mesh.set_color(color);
        }
    }

    function saveTextAlpha(info: BeforeChangeInfo) {
        const alphas: MeshPropertyInfo<number>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveTextAlpha] Mesh not found for id:', id);
                return;
            }
            alphas.push({ mesh_id: id, value: (mesh as TextMesh).fillOpacity });
        });
        HistoryControl.add('MESH_TEXT_ALPHA', alphas, HistoryOwner.MESH_INSPECTOR);
    }

    function handleTextAlphaChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<number>(info);
        updateTextAlpha(data, info.data.event.last);
    }

    function updateTextAlpha(data: MeshPropertyInfo<number>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as TextMesh;
            if (mesh == undefined) {
                Log.error('[updateTextAlpha] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.fillOpacity = item.value;
        }
    }

    function saveInheredAlpha(info: BeforeChangeInfo) {
        const inheredAlphas: MeshPropertyInfo<boolean>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as GuiBox;
            if (mesh == undefined) {
                Log.error('[saveInheredAlpha] Mesh not found for id:', id);
                return;
            }
            inheredAlphas.push({ mesh_id: id, value: mesh.isInheredAlpha() });
        });
        HistoryControl.add('MESH_INHERITED_ALPHA', inheredAlphas, HistoryOwner.MESH_INSPECTOR);
    }

    function handleInheredAlphaChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<boolean>(info);
        updateInheredAlpha(data, info.data.event.last);
    }

    function updateInheredAlpha(data: MeshPropertyInfo<boolean>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as GuiBox;
            if (mesh == undefined) {
                Log.error('[updateInheredAlpha] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.setInheredAlpha(item.value);
        }
    }

    function saveSlice(info: BeforeChangeInfo) {
        const slices: MeshPropertyInfo<Vector2>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as Slice9Mesh;
            if (mesh == undefined) {
                Log.error('[saveSlice] Mesh not found for id:', id);
                return;
            }
            slices.push({ mesh_id: id, value: mesh.get_slice() });
        });
        HistoryControl.add('MESH_SLICE', slices, HistoryOwner.MESH_INSPECTOR);
    }

    function handleSliceChange(info: ChangeInfo) {
        const [isChangedX, isChangedY] = getChangedInfo(info);
        const slice = info.data.event.value as Vector2;

        const data = info.ids.map((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as Slice9Mesh;
            if (mesh == undefined) {
                Log.error('[updateSlice] Mesh not found for id:', id);
                return;
            }
            const x = isChangedX ? slice.x : mesh.get_slice().x;
            const y = isChangedY ? slice.y : mesh.get_slice().y;

            return { mesh_id: id, value: new Vector2(x, y) };
        }).filter((item) => item != undefined);

        updateSlice(data, info.data.event.last);
    }

    function updateSlice(data: MeshPropertyInfo<Vector2>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as Slice9Mesh;
            if (mesh == undefined) {
                Log.error('[updateSlice] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.set_slice(item.value.x, item.value.y);
        }
    }

    function saveText(info: BeforeChangeInfo) {
        const texts: MeshPropertyInfo<string>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as TextMesh;
            if (mesh == undefined) {
                Log.error('[saveText] Mesh not found for id:', id);
                return;
            }
            texts.push({ mesh_id: id, value: deepClone(mesh.text) });
        });
        HistoryControl.add('MESH_TEXT', texts, HistoryOwner.MESH_INSPECTOR);
    }

    function handleTextChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<string>(info);
        updateText(data, info.data.event.last);
    }

    function updateText(data: MeshPropertyInfo<string>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as TextMesh;
            if (mesh == undefined) {
                Log.error('[updateText] Mesh not found for id:', item.mesh_id);
                continue;
            }
            const text = item.value;
            mesh.text = text;
        }
    }

    function saveFont(info: BeforeChangeInfo) {
        const fonts: MeshPropertyInfo<string>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as TextMesh;
            if (mesh == undefined) {
                Log.error('[saveFont] Mesh not found for id:', id);
                return;
            }
            const oldFont = deepClone(mesh.font);
            fonts.push({ mesh_id: id, value: oldFont ? oldFont : '' });
        });
        HistoryControl.add('MESH_FONT', fonts, HistoryOwner.MESH_INSPECTOR);
    }

    function handleFontChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<string>(info);
        updateFont(data, info.data.event.last);
    }

    function updateFont(data: MeshPropertyInfo<string>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as TextMesh;
            if (mesh == undefined) {
                Log.error('[updateFont] Mesh not found for id:', item.mesh_id);
                continue;
            }
            const font = item.value;
            mesh.font = font;
        }
    }

    function saveFontSize(info: BeforeChangeInfo) {
        const fontSizes: MeshPropertyInfo<Vector3>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveFontSize] Mesh not found for id:', id);
                return;
            }
            const oldScale = mesh.get_scale();
            fontSizes.push({ mesh_id: id, value: new Vector3(oldScale.x, oldScale.y, 1) });
        });
        HistoryControl.add('MESH_FONT_SIZE', fontSizes, HistoryOwner.MESH_INSPECTOR);
    }

    function handleFontSizeChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<number>(info);
        updateFontSize(data, info.data.event.last);
    }

    function updateFontSize(data: MeshPropertyInfo<number>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as TextMesh;
            if (mesh == undefined) {
                Log.error('[updateFontSize] Mesh not found for id:', item.mesh_id);
                continue;
            }
            const font_size = item.value;
            const delta = font_size / mesh.fontSize;
            mesh.scale.set(1 * delta, 1 * delta, mesh.scale.z);
            mesh.transform_changed();
        }

        const meshes = data.map(item => SceneManager.get_mesh_by_id(item.mesh_id)).filter(mesh => mesh != undefined);
        TransformControl.set_proxy_in_average_point(meshes);
        SizeControl.draw();
        Inspector.refresh(['scale']);
    }

    function saveTextAlign(info: BeforeChangeInfo) {
        const textAligns: MeshPropertyInfo<'left' | 'right' | 'center' | 'justify'>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as TextMesh;
            if (mesh == undefined) {
                Log.error('[saveTextAlign] Mesh not found for id:', id);
                return;
            }
            textAligns.push({ mesh_id: id, value: deepClone(mesh.textAlign) });
        });
        HistoryControl.add('MESH_TEXT_ALIGN', textAligns, HistoryOwner.MESH_INSPECTOR);
    }

    function handleTextAlignChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<any>(info);
        updateTextAlign(data, info.data.event.last);
    }

    function updateTextAlign(data: MeshPropertyInfo<any>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as TextMesh;
            if (mesh == undefined) {
                Log.error('[updateTextAlign] Mesh not found for id:', item.mesh_id);
                continue;
            }
            const text_align = item.value;
            mesh.textAlign = text_align;
        }
    }

    function saveLineHeight(info: BeforeChangeInfo) {
        const lineHeights: MeshPropertyInfo<number | 'normal'>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as TextMesh;
            if (mesh == undefined) {
                Log.error('[saveLineHeight] Mesh not found for id:', id);
                return;
            }
            lineHeights.push({ mesh_id: id, value: deepClone(mesh.lineHeight) });
        });
        HistoryControl.add('MESH_LINE_HEIGHT', lineHeights, HistoryOwner.MESH_INSPECTOR);
    }

    function handleLineHeightChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<number>(info);
        updateLineHeight(data, info.data.event.last);
    }

    function updateLineHeight(data: MeshPropertyInfo<number>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as TextMesh;
            if (mesh == undefined) {
                Log.error('[updateLineHeight] Mesh not found for id:', item.mesh_id);
                continue;
            }
            const line_height = item.value;
            mesh.lineHeight = line_height;
        }
    }

    function saveBlendMode(info: BeforeChangeInfo) {
        const blendModes: MeshMaterialPropertyInfo<BlendMode>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveBlendMode] Mesh not found for id:', id);
                return;
            }
            if (mesh instanceof Slice9Mesh) {
                const blend_mode = convertThreeJSBlendingToBlendMode(mesh.material.blending);
                blendModes.push({ mesh_id: id, material_index: 0, value: blend_mode });
            }
            else if (mesh instanceof MultipleMaterialMesh) {
                const blend_mode = convertThreeJSBlendingToBlendMode(mesh.get_materials()[info.field.data.material_index].blending);
                blendModes.push({ mesh_id: id, material_index: info.field.data.material_index, value: blend_mode });
            }
        });
        HistoryControl.add('MESH_BLEND_MODE', blendModes, HistoryOwner.MESH_INSPECTOR);
    }

    function handleBlendModeChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshMaterialData<BlendMode>(info);
        updateBlendMode(data, info.data.event.last);
    }

    function updateBlendMode(data: MeshMaterialPropertyInfo<BlendMode>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updateBlendMode] Mesh not found for id:', item.mesh_id);
                continue;
            }
            const blend_mode = item.value as BlendMode;
            const threeBlendMode = convertBlendModeToThreeJS(blend_mode);
            if (mesh instanceof Slice9Mesh) {
                ResourceManager.set_material_property_for_mesh(mesh, 'blending', threeBlendMode);
            }
            else if (mesh instanceof MultipleMaterialMesh) {
                ResourceManager.set_material_property_for_multiple_mesh(mesh, item.material_index, 'blending', threeBlendMode);
            }
        }
    }

    function saveMaterial(info: BeforeChangeInfo) {
        const materials: MeshPropertyInfo<{ name: string, uniforms?: TDictionary<any> }>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveMaterial] Mesh not found for id:', id);
                return;
            }
            if (mesh instanceof Slice9Mesh) {
                const material_name = mesh.material.name;
                const changed_uniforms = ResourceManager.get_changed_uniforms_for_mesh(mesh);
                materials.push({ mesh_id: id, value: { name: material_name, uniforms: changed_uniforms } });
            }
            else if (mesh instanceof MultipleMaterialMesh) {
                const material_name = mesh.get_materials()[info.field.data.material_index].name;
                const changed_uniforms = ResourceManager.get_changed_uniforms_for_multiple_material_mesh(mesh, info.field.data.material_index);
                materials.push({ mesh_id: id, value: { name: material_name, uniforms: changed_uniforms } });
            }
        });
        HistoryControl.add('MESH_MATERIAL', materials, HistoryOwner.MESH_INSPECTOR);
    }

    function handleMaterialChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<string>(info);
        const patchedData = data.map(item => {
            return {
                mesh_id: item.mesh_id,
                value: {
                    name: item.value
                }
            };
        });
        updateMaterial(patchedData, info.data.event.last);
    }

    function updateMaterial(data: MeshPropertyInfo<{ name: string, uniforms?: TDictionary<any> }>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updateMaterial] Mesh not found for id:', item.mesh_id);
                return;
            }

            if (mesh instanceof Slice9Mesh) {
                // NOTE: запоминаем текстуру перед сменой материала если она есть
                const texture_info = mesh.get_texture();
                const texture_name = texture_info[0];
                const atlas = texture_info[1];
                const has_texture = texture_name != '';

                const material_name = item.value.name;
                mesh.set_material(material_name);

                const material = ResourceManager.get_material_by_mesh_id(material_name, item.mesh_id);
                if (material && material.uniforms['u_texture'] != undefined) {
                    if (has_texture) {
                        mesh.set_texture(texture_name, atlas);
                    } else if (material.uniforms['u_texture'].value != null) {
                        const texture_name = material.uniforms['u_texture'].value.name;
                        const atlas = material.uniforms['u_texture'].value.atlas;
                        mesh.set_texture(texture_name, atlas);
                    }
                }

                if (item.value.uniforms) {
                    for (const [uniform_name, value] of Object.entries(item.value.uniforms)) {
                        const material_info = ResourceManager.get_material_info(material_name);
                        if (material_info && material_info.uniforms[uniform_name].type == MaterialUniformType.SAMPLER2D) {
                            const texture_info = value.split('/');
                            const converted_value = ResourceManager.get_texture(texture_info[1], texture_info[0]).texture;
                            ResourceManager.set_material_uniform_for_mesh(mesh, uniform_name, converted_value);
                        } else ResourceManager.set_material_uniform_for_mesh(mesh, uniform_name, value);
                    }
                }
            }
            else if (mesh instanceof MultipleMaterialMesh) {
                let texture_name = '';
                let atlas = '';
                const texture_info = mesh.get_texture(item.index);
                if (texture_info) {
                    texture_name = texture_info[0];
                    atlas = texture_info[1];
                }
                const has_texture = texture_name != '';
                const material_name = item.value.name;
                mesh.set_material(material_name, item.index);

                const material = ResourceManager.get_material_by_mesh_id(material_name, item.mesh_id, item.index);
                if (material && material.uniforms['u_texture'] != undefined) {
                    if (has_texture) {
                        mesh.set_texture(texture_name, atlas, item.index);
                    }
                    else if (material.uniforms['u_texture'].value != null) {
                        const texture_name = material.uniforms['u_texture'].value.name;
                        const atlas = material.uniforms['u_texture'].value.atlas;
                        mesh.set_texture(texture_name, atlas, item.index);
                    }
                }

                if (item.value.uniforms) {
                    for (const [uniform_name, value] of Object.entries(item.value.uniforms)) {
                        ResourceManager.set_material_uniform_for_multiple_material_mesh(mesh, item.index ?? 0, uniform_name, value);
                    }
                }
            }
        }

        force_refresh();
    }

    function saveUV(info: BeforeChangeInfo) {
        const uvs: MeshPropertyInfo<Float32Array>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveUV] Mesh not found for id:', id);
                return;
            }
            if (mesh.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                const sprite = mesh as GoSprite;
                uvs.push({
                    mesh_id: id,
                    value: sprite.get_uv()
                });
            }
        });
        HistoryControl.add('MESH_UV', uvs, HistoryOwner.MESH_INSPECTOR);
    }

    function handleFlipVerticalChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<boolean>(info);
        updateFlipVertical(data, info.data.event.last);
    }

    function updateFlipVertical(data: { mesh_id: number, value: boolean }[], last: boolean) {
        data.forEach(item => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as GoSprite;
            if (mesh?.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                mesh.set_flip(FlipMode.NONE);
                if (item.value) {
                    mesh.set_flip(FlipMode.VERTICAL);
                }
            }
        });

        if (last) {
            Inspector.refresh(['flip_diagonal', 'flip_horizontal']);
        }
    }

    function handleFlipHorizontalChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<boolean>(info);
        updateFlipHorizontal(data, info.data.event.last);
    }

    function updateFlipHorizontal(data: { mesh_id: number, value: boolean }[], last: boolean) {
        data.forEach(item => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as GoSprite;
            if (mesh?.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                mesh.set_flip(FlipMode.NONE);
                if (item.value) {
                    mesh.set_flip(FlipMode.HORIZONTAL);
                }
            }
        });

        if (last) {
            Inspector.refresh(['flip_diagonal', 'flip_vertical']);
        }
    }

    function handleFlipDiagonalChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<boolean>(info);
        updateFlipDiagonal(data, info.data.event.last);
    }

    function updateFlipDiagonal(data: { mesh_id: number, value: boolean }[], last: boolean) {
        data.forEach(item => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as GoSprite;
            if (mesh?.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                mesh.set_flip(FlipMode.NONE);
                if (item.value) {
                    mesh.set_flip(FlipMode.DIAGONAL);
                }
            }
        });

        if (last) {
            Inspector.refresh(['flip_vertical', 'flip_horizontal']);
        }
    }

    function saveUniformSampler2D(info: BeforeChangeInfo) {
        const sampler2Ds: MeshMaterialUniformInfo<string>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (!mesh) return;

            if (mesh instanceof Slice9Mesh) {
                const material = mesh.material;
                if (!material) return;

                const uniform = material.uniforms[info.field.key];
                if (uniform) {
                    let atlas_texture = `${mesh.get_texture()[1]}/${mesh.get_texture()[0]}`;
                    if (atlas_texture == '/') {
                        const texture_name = get_file_name(uniform.value?.path || '');
                        const atlas = ResourceManager.get_atlas_by_texture_name(texture_name);
                        atlas_texture = `${atlas}/${texture_name}`;
                    }
                    sampler2Ds.push({
                        mesh_id: id,
                        material_index: 0,
                        uniform_name: info.field.key,
                        value: atlas_texture
                    });
                }
            }
            else if (mesh instanceof MultipleMaterialMesh) {
                const material = mesh.get_materials()[info.field.data.material_index];
                if (!material) return;

                const uniform = material.uniforms[info.field.key];
                if (uniform) {
                    let atlas_texture = '/';
                    const texture_info = mesh.get_texture(info.field.data.material_index);
                    if (texture_info) {
                        atlas_texture = `${texture_info[1]}/${texture_info[0]}`;
                    }
                    sampler2Ds.push({
                        mesh_id: id,
                        material_index: info.field.data.material_index,
                        uniform_name: info.field.key,
                        value: atlas_texture
                    });
                }
            }
        });
        HistoryControl.add('MESH_MATERIAL_SAMPLER2D', sampler2Ds, HistoryOwner.MESH_INSPECTOR);
    }

    function handleUniformSampler2DChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshMaterialUniformData<string>(info);
        data.forEach(item => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (!mesh) return;

            const texture_name = get_file_name(item.value as string || '');
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name) || '';
            item.value = `${atlas}/${texture_name}`;
        });
        updateUniformSampler2D(data, info.data.event.last);
    }

    function updateUniformSampler2D(data: MeshMaterialUniformInfo<string>[], _: boolean) {
        data.forEach((item) => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (!mesh) return;

            const [atlas, texture_name] = item.value.split('/');
            const texture = ResourceManager.get_texture(texture_name, atlas).texture;
            if (!texture) return;

            if (mesh instanceof Slice9Mesh) {
                const material = ResourceManager.get_material_by_mesh_id(mesh.material.name, item.mesh_id, 0);
                if (!material) return;

                if (item.uniform_name == 'u_texture') {
                    mesh.set_texture(texture_name, atlas);
                }
                else {
                    ResourceManager.set_material_uniform_for_mesh(mesh, item.uniform_name, texture);
                }
            }
            else if (mesh instanceof MultipleMaterialMesh) {
                const materials = mesh.get_materials();

                let material_name = '';
                if (materials.length >= item.material_index) material_name = materials[item.material_index].name;
                else Log.error('[updateUniformSampler2D] Material index out of range:', item.material_index);

                const material = ResourceManager.get_material_by_mesh_id(material_name, item.mesh_id, item.material_index);
                if (!material) return;

                if (item.uniform_name == 'u_texture') {
                    mesh.set_texture(texture_name, atlas);
                }
                else {
                    ResourceManager.set_material_uniform_for_multiple_material_mesh(mesh, item.material_index, item.uniform_name, texture);
                    // NOTE: не уверен что это тут нужно, это же толко в slice9 материале, и только для u_texture ?
                    ResourceManager.set_material_define_for_multiple_material_mesh(mesh, item.material_index, 'USE_TEXTURE', '');
                }
            }

            EventBus.trigger('SYS_MESH_MATERIAL_CHANGED', {
                mesh_id: item.mesh_id,
                material_index: item.material_index,
                is_uniform: true,
                property: item.uniform_name,
                value: texture
            }, false);
        });
    }

    function saveUniformFloat(info: BeforeChangeInfo) {
        const floats: MeshMaterialUniformInfo<number>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (!mesh) return;

            if (mesh instanceof Slice9Mesh) {
                const material = mesh.material;
                if (!material) return;

                const uniform = material.uniforms[info.field.key];
                if (uniform) {
                    floats.push({
                        mesh_id: id,
                        material_index: 0,
                        uniform_name: info.field.key,
                        value: uniform.value
                    });
                }
            }
            else if (mesh instanceof MultipleMaterialMesh) {
                const material = mesh.get_materials()[info.field.data.material_index];
                if (!material) return;

                const uniform = material.uniforms[info.field.key];
                if (uniform) {
                    floats.push({
                        mesh_id: id,
                        material_index: info.field.data.material_index,
                        uniform_name: info.field.key,
                        value: uniform.value
                    });
                }
            }
        });
        HistoryControl.add('MESH_MATERIAL_FLOAT', floats, HistoryOwner.MESH_INSPECTOR);
    }

    function handleUniformFloatChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshMaterialUniformData<number>(info);
        updateUniformFloat(data, info.data.event.last);
    }

    function updateUniformFloat(data: MeshMaterialUniformInfo<number>[], _: boolean) {
        data.forEach((item) => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (!mesh) return;

            if (mesh instanceof Slice9Mesh) {
                const material = mesh.material;
                if (!material) return;

                ResourceManager.set_material_uniform_for_mesh(mesh, item.uniform_name, item.value);
            }
            else if (mesh instanceof MultipleMaterialMesh) {
                const material = mesh.get_materials()[item.material_index];
                if (!material) return;

                ResourceManager.set_material_uniform_for_multiple_material_mesh(mesh, item.material_index, item.uniform_name, item.value);
            }

            EventBus.trigger('SYS_MESH_MATERIAL_CHANGED', {
                mesh_id: item.mesh_id,
                material_index: item.material_index,
                is_uniform: true,
                property: item.uniform_name,
                value: item.value
            }, false);
        });
    }

    function saveUniformRange(info: BeforeChangeInfo) {
        const ranges: MeshMaterialUniformInfo<number>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (!mesh) return;

            if (mesh instanceof Slice9Mesh) {
                const material = mesh.material;
                if (!material) return;

                const uniform = material.uniforms[info.field.key];
                if (uniform) {
                    ranges.push({
                        mesh_id: id,
                        material_index: 0,
                        uniform_name: info.field.key,
                        value: uniform.value
                    });
                }
            }
            else if (mesh instanceof MultipleMaterialMesh) {
                const material = mesh.get_materials()[info.field.data.material_index];
                if (!material) return;

                const uniform = material.uniforms[info.field.key];
                if (uniform) {
                    ranges.push({
                        mesh_id: id,
                        material_index: info.field.data.material_index,
                        uniform_name: info.field.key,
                        value: uniform.value
                    });
                }
            }
        });
        HistoryControl.add('MESH_MATERIAL_RANGE', ranges, HistoryOwner.MESH_INSPECTOR);
    }

    function handleUniformRangeChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshMaterialUniformData<number>(info);
        updateUniformRange(data, info.data.event.last);
    }

    function updateUniformRange(data: MeshMaterialUniformInfo<number>[], _: boolean) {
        data.forEach((item) => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (!mesh) return;

            if (mesh instanceof Slice9Mesh) {
                const material = mesh.material;
                if (!material) return;

                ResourceManager.set_material_uniform_for_mesh(mesh, item.uniform_name, item.value);
            }
            else if (mesh instanceof MultipleMaterialMesh) {
                const material = mesh.get_materials()[item.material_index];
                if (!material) return;

                ResourceManager.set_material_uniform_for_multiple_material_mesh(mesh, item.material_index, item.uniform_name, item.value);
            }

            EventBus.trigger('SYS_MESH_MATERIAL_CHANGED', {
                mesh_id: item.mesh_id,
                material_index: item.material_index,
                is_uniform: true,
                property: item.uniform_name,
                value: item.value
            }, false);
        });
    }

    function saveUIAlpha(info: BeforeChangeInfo) {
        const alphas: MeshMaterialUniformInfo<number>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (!mesh || !(mesh instanceof GuiBox)) return;

            const uniform = mesh.material.uniforms[info.field.key];
            if (uniform) {
                alphas.push({
                    mesh_id: id,
                    material_index: 0,
                    uniform_name: info.field.key,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MESH_UI_ALPHA', alphas, HistoryOwner.MESH_INSPECTOR);
    }

    function handleUIAlphaChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshMaterialUniformData<number>(info);
        updateUIAlpha(data, info.data.event.last);
    }

    function updateUIAlpha(data: MeshMaterialUniformInfo<number>[], _: boolean) {
        data.forEach((item) => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (!mesh || !(mesh instanceof GuiBox)) return;

            mesh.set_alpha(item.value);

            EventBus.trigger('SYS_MESH_MATERIAL_CHANGED', {
                mesh_id: item.mesh_id,
                material_index: item.material_index,
                is_uniform: true,
                property: item.uniform_name,
                value: item.value
            }, false);
        });

        Inspector.refresh(['alpha']);
    }

    function refreshUIAlpha(ids: number[]) {
        const mesh = SceneManager.get_mesh_by_id(ids[0]);
        if (mesh == undefined || !(mesh instanceof GuiBox)) {
            Log.error('[refreshUIAlpha] Mesh not found for id:', ids);
            return 1;
        }
        return mesh.get_alpha();
    }

    function saveUniformVec2(info: BeforeChangeInfo) {
        const vec2s: MeshMaterialUniformInfo<Vector2>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (!mesh) return;

            if (mesh instanceof Slice9Mesh) {
                const material = mesh.material;
                if (!material) return;

                const uniform = material.uniforms[info.field.key];
                if (uniform) {
                    vec2s.push({
                        mesh_id: id,
                        material_index: 0,
                        uniform_name: info.field.key,
                        value: uniform.value
                    });
                }
            }
            else if (mesh instanceof MultipleMaterialMesh) {
                const material = mesh.get_materials()[info.field.data.material_index];
                if (!material) return;

                const uniform = material.uniforms[info.field.key];
                if (uniform) {
                    vec2s.push({
                        mesh_id: id,
                        material_index: info.field.data.material_index,
                        uniform_name: info.field.key,
                        value: uniform.value
                    });
                }
            }
        });
        HistoryControl.add('MESH_MATERIAL_VEC2', vec2s, HistoryOwner.MESH_INSPECTOR);
    }

    function handleUniformVec2Change(info: ChangeInfo) {
        const data = convertChangeInfoToMeshMaterialUniformData<Vector2>(info);
        updateUniformVec2(data, info.data.event.last);
    }

    function updateUniformVec2(data: MeshMaterialUniformInfo<Vector2>[], _: boolean) {
        data.forEach((item) => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (!mesh) return;

            if (mesh instanceof Slice9Mesh) {
                const material = mesh.material;
                if (!material) return;

                ResourceManager.set_material_uniform_for_mesh(mesh, item.uniform_name, item.value);
            }
            else if (mesh instanceof MultipleMaterialMesh) {
                const material = mesh.get_materials()[item.material_index];
                if (!material) return;

                ResourceManager.set_material_uniform_for_multiple_material_mesh(mesh, item.material_index, item.uniform_name, item.value);
            }

            EventBus.trigger('SYS_MESH_MATERIAL_CHANGED', {
                mesh_id: item.mesh_id,
                material_index: item.material_index,
                is_uniform: true,
                property: item.uniform_name,
                value: item.value
            }, false);
        });
    }

    function saveUniformVec3(info: BeforeChangeInfo) {
        const vec3s: MeshMaterialUniformInfo<Vector3>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (!mesh) return;

            if (mesh instanceof Slice9Mesh) {
                const material = mesh.material;
                if (!material) return;

                const uniform = material.uniforms[info.field.key];
                if (uniform) {
                    vec3s.push({
                        mesh_id: id,
                        material_index: 0,
                        uniform_name: info.field.key,
                        value: uniform.value
                    });
                }
            }
            else if (mesh instanceof MultipleMaterialMesh) {
                const material = mesh.get_materials()[info.field.data.material_index];
                if (!material) return;

                const uniform = material.uniforms[info.field.key];
                if (uniform) {
                    vec3s.push({
                        mesh_id: id,
                        material_index: info.field.data.material_index,
                        uniform_name: info.field.key,
                        value: uniform.value
                    });
                }
            }
        });
        HistoryControl.add('MESH_MATERIAL_VEC3', vec3s, HistoryOwner.MESH_INSPECTOR);
    }

    function handleUniformVec3Change(info: ChangeInfo) {
        const data = convertChangeInfoToMeshMaterialUniformData<Vector3>(info);
        updateUniformVec3(data, info.data.event.last);
    }

    function updateUniformVec3(data: MeshMaterialUniformInfo<Vector3>[], _: boolean) {
        data.forEach((item) => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (!mesh) return;

            if (mesh instanceof Slice9Mesh) {

                const material = mesh.material;
                if (!material) return;

                ResourceManager.set_material_uniform_for_mesh(mesh, item.uniform_name, item.value);
            }
            else if (mesh instanceof MultipleMaterialMesh) {
                const material = mesh.get_materials()[item.material_index];
                if (!material) return;

                ResourceManager.set_material_uniform_for_multiple_material_mesh(mesh, item.material_index, item.uniform_name, item.value);
            }

            EventBus.trigger('SYS_MESH_MATERIAL_CHANGED', {
                mesh_id: item.mesh_id,
                material_index: item.material_index,
                is_uniform: true,
                property: item.uniform_name,
                value: item.value
            }, false);
        });
    }

    function saveUniformVec4(info: BeforeChangeInfo) {
        const vec4s: MeshMaterialUniformInfo<Vector4>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (!mesh) return;

            if (mesh instanceof Slice9Mesh) {
                const material = mesh.material;
                if (!material) return;

                const uniform = material.uniforms[info.field.key];
                if (uniform) {
                    vec4s.push({
                        mesh_id: id,
                        material_index: 0,
                        uniform_name: info.field.key,
                        value: uniform.value
                    });
                }
            }
            else if (mesh instanceof MultipleMaterialMesh) {
                const material = mesh.get_materials()[info.field.data.material_index];
                if (!material) return;

                const uniform = material.uniforms[info.field.key];
                if (uniform) {
                    vec4s.push({
                        mesh_id: id,
                        material_index: info.field.data.material_index,
                        uniform_name: info.field.key,
                        value: uniform.value
                    });
                }
            }
        });
        HistoryControl.add('MESH_MATERIAL_VEC4', vec4s, HistoryOwner.MESH_INSPECTOR);
    }

    function handleUniformVec4Change(info: ChangeInfo) {
        const data = convertChangeInfoToMeshMaterialUniformData<Vector4>(info);
        updateUniformVec4(data, info.data.event.last);
    }

    function updateUniformVec4(data: MeshMaterialUniformInfo<Vector4>[], _: boolean) {
        data.forEach((item) => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (!mesh) return;

            if (mesh instanceof Slice9Mesh) {
                const material = mesh.material;
                if (!material) return;

                ResourceManager.set_material_uniform_for_mesh(mesh, item.uniform_name, item.value);
            }
            else if (mesh instanceof MultipleMaterialMesh) {
                const material = mesh.get_materials()[item.material_index];
                if (!material) return;

                ResourceManager.set_material_uniform_for_multiple_material_mesh(mesh, item.material_index, item.uniform_name, item.value);
            }

            EventBus.trigger('SYS_MESH_MATERIAL_CHANGED', {
                mesh_id: item.mesh_id,
                material_index: item.material_index,
                is_uniform: true,
                property: item.uniform_name,
                value: item.value
            }, false);
        });
    }

    function saveUniformColor(info: BeforeChangeInfo) {
        const colors: MeshMaterialUniformInfo<string>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (!mesh) return;

            if (mesh instanceof Slice9Mesh) {
                const material = mesh.material;
                if (!material) return;

                const uniform = material.uniforms[info.field.key];
                if (uniform) {
                    const color = new Color();
                    color.setRGB(uniform.value.x, uniform.value.y, uniform.value.z);
                    colors.push({
                        mesh_id: id,
                        material_index: 0,
                        uniform_name: info.field.key,
                        value: color.getHexString()
                    });
                }
            }
            else if (mesh instanceof MultipleMaterialMesh) {
                const material = mesh.get_materials()[info.field.data.material_index];
                if (!material) return;

                const uniform = material.uniforms[info.field.key];
                if (uniform) {
                    const color = new Color();
                    color.setRGB(uniform.value.x, uniform.value.y, uniform.value.z);
                    colors.push({
                        mesh_id: id,
                        material_index: info.field.data.material_index,
                        uniform_name: info.field.key,
                        value: color.getHexString()
                    });
                }
            }
        });
        HistoryControl.add('MESH_MATERIAL_COLOR', colors, HistoryOwner.MESH_INSPECTOR);
    }

    function handleUniformColorChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshMaterialUniformData<string>(info);
        updateUniformColor(data, info.data.event.last);
    }

    function updateUniformColor(data: MeshMaterialUniformInfo<string>[], _: boolean) {
        data.forEach((item) => {
            const rgb = hexToRGB(item.value);
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (!mesh) return;

            if (mesh instanceof Slice9Mesh) {
                const material = mesh.material;
                if (!material) return;

                ResourceManager.set_material_uniform_for_mesh(mesh, item.uniform_name, rgb);
            }
            else if (mesh instanceof MultipleMaterialMesh) {
                const material = mesh.get_materials()[item.material_index];
                if (!material) return;

                ResourceManager.set_material_uniform_for_multiple_material_mesh(mesh, item.material_index, item.uniform_name, rgb);
            }

            EventBus.trigger('SYS_MESH_MATERIAL_CHANGED', {
                mesh_id: item.mesh_id,
                material_index: item.material_index,
                is_uniform: true,
                property: item.uniform_name,
                value: rgb
            }, false);
        });
    }

    function saveSound(info: BeforeChangeInfo) {
        const sounds: MeshPropertyInfo<string>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[saveSound] Mesh not found for id:', id);
                return;
            }
            sounds.push({ mesh_id: id, value: mesh.get_sound() });
        });
        HistoryControl.add('MESH_SOUND', sounds, HistoryOwner.MESH_INSPECTOR);
    }

    function handleSoundChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<string>(info);
        updateSound(data, info.data.event.last);
    }

    function updateSound(data: MeshPropertyInfo<string>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[updateSound] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.set_sound(item.value);
        }

        force_refresh();
    }

    function saveLoop(info: BeforeChangeInfo) {
        const loops: MeshPropertyInfo<boolean>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[saveLoop] Mesh not found for id:', id);
                return;
            }
            loops.push({ mesh_id: id, value: mesh.get_loop() });
        });
        HistoryControl.add('MESH_SOUND_LOOP', loops, HistoryOwner.MESH_INSPECTOR);
    }

    function handleLoopChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<boolean>(info);
        updateLoop(data, info.data.event.last);
    }

    function updateLoop(data: MeshPropertyInfo<boolean>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[updateLoop] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.set_loop(item.value);
        }
    }

    function saveVolume(info: BeforeChangeInfo) {
        const volumes: MeshPropertyInfo<number>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[saveVolume] Mesh not found for id:', id);
                return;
            }
            volumes.push({ mesh_id: id, value: mesh.get_volume() });
        });
        HistoryControl.add('MESH_SOUND_VOLUME', volumes, HistoryOwner.MESH_INSPECTOR);
    }

    function handleVolumeChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<number>(info);
        updateVolume(data, info.data.event.last);
    }

    function updateVolume(data: MeshPropertyInfo<number>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[updateVolume] Mesh not found for id:', item.mesh_id);
                continue;
            }
            if (!Number.isFinite(item.value)) continue;
            mesh.set_volume(item.value);
        }
    }

    function saveSpeed(info: BeforeChangeInfo) {
        const speeds: MeshPropertyInfo<number>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[saveSpeed] Mesh not found for id:', id);
                return;
            }
            speeds.push({ mesh_id: id, value: mesh.get_speed() });
        });
        HistoryControl.add('MESH_SOUND_SPEED', speeds, HistoryOwner.MESH_INSPECTOR);
    }

    function handleSpeedChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<number>(info);
        updateSpeed(data, info.data.event.last);
    }

    function updateSpeed(data: MeshPropertyInfo<number>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[updateSpeed] Mesh not found for id:', item.mesh_id);
                continue;
            }
            if (!Number.isFinite(item.value)) continue;
            mesh.set_speed(item.value);
        }
    }

    function saveLayer(info: BeforeChangeInfo) {
        const layers: MeshPropertyInfo<number>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveTileLayer] Mesh not found for id:', id);
                return;
            }
            layers.push({ mesh_id: id, value: mesh.layers.mask });
        });
        HistoryControl.add('MESH_LAYERS', layers, HistoryOwner.MESH_INSPECTOR);
    }

    function handleLayerChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<string[]>(info);
        const patched_data = data.map(item => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (!mesh) {
                Log.error('[handleLayerChange] Mesh not found for id:', item.mesh_id);
                return;
            }
            return { mesh_id: item.mesh_id, value: (mesh.layers.mask & 0xFFFFFC00) | ResourceManager.get_layers_mask_by_names(item.value) };
        }).filter(item => item != undefined) as MeshPropertyInfo<number>[];
        updateLayer(patched_data, info.data.event.last);
    }

    function updateLayer(data: MeshPropertyInfo<number>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updateTileLayer] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.layers.mask = item.value;
            if (mesh instanceof MultipleMaterialMesh) {
                mesh.traverse((m) => {
                    if (["Mesh", "SkinnedMesh"].includes(m.type)) {
                        m.layers.mask = item.value;
                    }
                });
            }
        }
    }

    function saveUIInvertedClipping(info: BeforeChangeInfo) {
        const oldClipping: MeshPropertyInfo<boolean>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveUIInvertedClipping] Mesh not found for id:', id);
                return;
            }
            if (mesh.type != IObjectTypes.GUI_BOX) return;
            oldClipping.push({
                mesh_id: mesh.mesh_data.id,
                value: (mesh as GuiBox).isInvertedClipping()
            });
        });
        HistoryControl.add('MESH_INVERTED_CLIPPING', oldClipping, HistoryOwner.MESH_INSPECTOR);
    }

    function handleUIInvertedClippingChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<boolean>(info);
        updateUIInvertedClipping(data, info.data.event.last);
    }

    function updateUIInvertedClipping(data: MeshPropertyInfo<boolean>[], _: boolean) {
        data.forEach((item) => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (!mesh || !(mesh instanceof GuiBox)) return;
            mesh.enableClipping(item.value, mesh.isClippingVisible());
        });
    }

    function saveUIClippingVisible(info: BeforeChangeInfo) {
        const oldClippingVisible: MeshPropertyInfo<boolean>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveUIClippingVisible] Mesh not found for id:', id);
                return;
            }
            if (mesh.type != IObjectTypes.GUI_BOX) return;
            oldClippingVisible.push({
                mesh_id: mesh.mesh_data.id,
                value: (mesh as GuiBox).isClippingVisible()
            });
        });
        HistoryControl.add('MESH_CLIPPING_VISIBLE', oldClippingVisible, HistoryOwner.MESH_INSPECTOR);
    }

    function handleUIClippingVisibleChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<boolean>(info);
        updateUIClippingVisible(data, info.data.event.last);
    }

    function updateUIClippingVisible(data: MeshPropertyInfo<boolean>[], _: boolean) {
        data.forEach((item) => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (!mesh || !(mesh instanceof GuiBox)) return;
            mesh.enableClipping(mesh.isInvertedClipping(), item.value);
        });
    }

    function saveSoundRadius(info: BeforeChangeInfo) {
        const soundRadius: MeshPropertyInfo<number>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[saveSoundRadius] Mesh not found for id:', id);
                return;
            }
            soundRadius.push({ mesh_id: id, value: mesh.get_sound_radius() });
        });
        HistoryControl.add('MESH_SOUND_RADIUS', soundRadius, HistoryOwner.MESH_INSPECTOR);
    }

    function handleSoundRadiusChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<number>(info);
        updateSoundRadius(data, info.data.event.last);
    }

    function updateSoundRadius(data: MeshPropertyInfo<number>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[updateSoundRadius] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.set_sound_radius(item.value);
        }
    }

    function saveMaxVolumeRadius(info: BeforeChangeInfo) {
        const maxVolumeRadius: MeshPropertyInfo<number>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[saveMaxVolumeRadius] Mesh not found for id:', id);
                return;
            }
            maxVolumeRadius.push({ mesh_id: id, value: mesh.get_max_volume_radius() });
        });
        HistoryControl.add('MESH_MAX_VOLUME_RADIUS', maxVolumeRadius, HistoryOwner.MESH_INSPECTOR);
    }

    function handleMaxVolumeRadiusChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<number>(info);
        updateMaxVolumeRadius(data, info.data.event.last);
    }

    function updateMaxVolumeRadius(data: MeshPropertyInfo<number>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[updateMaxVolumeRadius] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.set_max_volume_radius(item.value);
        }
    }

    function savePanNormalizationDistance(info: BeforeChangeInfo) {
        const panNormalizationDistance: MeshPropertyInfo<number>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[savePanNormalizationDistance] Mesh not found for id:', id);
                return;
            }
            panNormalizationDistance.push({ mesh_id: id, value: mesh.get_pan_normalization_distance() });
        });
        HistoryControl.add('MESH_PAN_NORMALIZATION_DISTANCE', panNormalizationDistance, HistoryOwner.MESH_INSPECTOR);
    }

    function handlePanNormalizationDistanceChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<number>(info);
        updatePanNormalizationDistance(data, info.data.event.last);
    }

    function updatePanNormalizationDistance(data: MeshPropertyInfo<number>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[updatePanNormalizationDistance] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.set_pan_normalization_distance(item.value);
        }
    }

    function saveSoundFunction(info: BeforeChangeInfo) {
        const soundFunction: MeshPropertyInfo<string>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[saveSoundFunction] Mesh not found for id:', id);
                return;
            }
            soundFunction.push({ mesh_id: id, value: mesh.get_sound_function() });
        });
        HistoryControl.add('MESH_SOUND_FUNCTION', soundFunction, HistoryOwner.MESH_INSPECTOR);
    }

    function handleSoundFunctionChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<string>(info);
        updateSoundFunction(data, info.data.event.last);
    }

    function updateSoundFunction(data: MeshPropertyInfo<string>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[updateSoundFunction] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.set_sound_function(item.value as SoundFunctionType);
        }
    }

    function saveZoneType(info: BeforeChangeInfo) {
        const zoneTypes: MeshPropertyInfo<string>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[saveZoneType] Mesh not found for id:', id);
                return;
            }
            zoneTypes.push({ mesh_id: id, value: mesh.get_zone_type() });
        });
        HistoryControl.add('MESH_SOUND_ZONE_TYPE', zoneTypes, HistoryOwner.MESH_INSPECTOR);
    }

    function handleZoneTypeChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<string>(info);
        updateZoneType(data, info.data.event.last);
    }

    function updateZoneType(data: MeshPropertyInfo<string>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[updateZoneType] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.set_zone_type(item.value as SoundZoneType);
        }
    }

    function saveRectangleWidth(info: BeforeChangeInfo) {
        const rectangleWidths: MeshPropertyInfo<number>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[saveRectangleWidth] Mesh not found for id:', id);
                return;
            }
            rectangleWidths.push({ mesh_id: id, value: mesh.get_rectangle_width() });
        });
        HistoryControl.add('MESH_SOUND_RECTANGLE_WIDTH', rectangleWidths, HistoryOwner.MESH_INSPECTOR);
    }

    function handleRectangleWidthChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<number>(info);
        updateRectangleWidth(data, info.data.event.last);
    }

    function updateRectangleWidth(data: MeshPropertyInfo<number>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[updateRectangleWidth] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.set_rectangle_width(item.value);
        }
    }

    function saveRectangleHeight(info: BeforeChangeInfo) {
        const rectangleHeights: MeshPropertyInfo<number>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[saveRectangleHeight] Mesh not found for id:', id);
                return;
            }
            rectangleHeights.push({ mesh_id: id, value: mesh.get_rectangle_height() });
        });
        HistoryControl.add('MESH_SOUND_RECTANGLE_HEIGHT', rectangleHeights, HistoryOwner.MESH_INSPECTOR);
    }

    function handleRectangleHeightChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<number>(info);
        updateRectangleHeight(data, info.data.event.last);
    }

    function updateRectangleHeight(data: MeshPropertyInfo<number>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[updateRectangleHeight] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.set_rectangle_height(item.value);
        }
    }

    function saveRectangleMaxVolumeWidth(info: BeforeChangeInfo) {
        const rectangleMaxVolumeWidths: MeshPropertyInfo<number>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[saveRectangleMaxVolumeWidth] Mesh not found for id:', id);
                return;
            }
            rectangleMaxVolumeWidths.push({ mesh_id: id, value: mesh.get_rectangle_max_volume_width() });
        });
        HistoryControl.add('MESH_SOUND_RECTANGLE_MAX_VOLUME_WIDTH', rectangleMaxVolumeWidths, HistoryOwner.MESH_INSPECTOR);
    }

    function handleRectangleMaxVolumeWidthChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<number>(info);
        updateRectangleMaxVolumeWidth(data, info.data.event.last);
    }

    function updateRectangleMaxVolumeWidth(data: MeshPropertyInfo<number>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[updateRectangleMaxVolumeWidth] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.set_rectangle_max_volume_width(item.value);
        }
    }

    function saveRectangleMaxVolumeHeight(info: BeforeChangeInfo) {
        const rectangleMaxVolumeHeights: MeshPropertyInfo<number>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[saveRectangleMaxVolumeHeight] Mesh not found for id:', id);
                return;
            }
            rectangleMaxVolumeHeights.push({ mesh_id: id, value: mesh.get_rectangle_max_volume_height() });
        });
        HistoryControl.add('MESH_SOUND_RECTANGLE_MAX_VOLUME_HEIGHT', rectangleMaxVolumeHeights, HistoryOwner.MESH_INSPECTOR);
    }

    function handleRectangleMaxVolumeHeightChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<number>(info);
        updateRectangleMaxVolumeHeight(data, info.data.event.last);
    }

    function updateRectangleMaxVolumeHeight(data: MeshPropertyInfo<number>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as AudioMesh;
            if (mesh == undefined) {
                Log.error('[updateRectangleMaxVolumeHeight] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.set_rectangle_max_volume_height(item.value);
        }
    }

    function undo(event: THistoryUndo) {
        switch (event.type) {
            case 'MESH_NAME':
                const names = event.data as MeshPropertyInfo<string>[];
                updateName(names, true);
                break;
            case 'MESH_ACTIVE':
                const actives = event.data as MeshPropertyInfo<boolean>[];
                updateActive(actives, true);
                break;
            case 'MESH_CLIPPING':
                const clippings = event.data as MeshPropertyInfo<boolean>[];
                updateUIClipping(clippings, true);
                break;
            case 'MESH_INVERTED_CLIPPING':
                const invertedClippings = event.data as MeshPropertyInfo<boolean>[];
                updateUIInvertedClipping(invertedClippings, true);
                break;
            case 'MESH_LAYERS':
                const layers = event.data as MeshPropertyInfo<number>[];
                updateLayer(layers, true);
                break;
            case 'MESH_TRANSLATE':
                const positions = event.data as MeshPropertyInfo<Vector3>[];
                updatePosition(positions, true);
                break;
            case 'MESH_ROTATE':
                const rotations = event.data as MeshPropertyInfo<Quaternion>[];
                updateRotation(rotations, true);
                break;
            case 'MESH_SCALE':
                const scales = event.data as MeshPropertyInfo<Vector3>[];
                updateScale(scales, true);
                break;
            case 'MESH_MODEL_SCALE':
                const modelScales = event.data as MeshPropertyInfo<number>[];
                updateModelScale(modelScales, true);
                break;
            case 'MESH_SIZE':
                const sizes = event.data as MeshPropertyInfo<{ size: Vector2, pos: Vector3 }>[];
                updateSize(sizes.map(item => ({ mesh_id: item.mesh_id, value: item.value.size })), true);
                break;
            case 'MESH_PIVOT':
                const pivots = event.data as MeshPropertyInfo<ScreenPointPreset>[];
                updatePivot(pivots, true);
                break;
            case 'MESH_ANCHOR':
                const anchors = event.data as MeshPropertyInfo<Vector2>[];
                updateAnchor(anchors, true);
                break;
            case 'MESH_COLOR':
                const colors = event.data as MeshPropertyInfo<string>[];
                updateColor(colors, true);
                break;
            case 'MESH_INHERITED_ALPHA':
                const inheredAlphas = event.data as MeshPropertyInfo<boolean>[];
                updateInheredAlpha(inheredAlphas, true);
                break;
            case 'MESH_TEXT_ALPHA':
                const alphas = event.data as MeshPropertyInfo<number>[];
                updateTextAlpha(alphas, true);
                break;
            case 'MESH_UV':
                const uvs = event.data as MeshPropertyInfo<Float32Array>[];
                uvs.forEach(uv => {
                    const mesh = SceneManager.get_mesh_by_id(uv.mesh_id) as GoSprite;
                    if (mesh?.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                        const geometry = mesh.geometry;
                        geometry.attributes.uv.array.set(uv.value);
                        geometry.attributes.uv.needsUpdate = true;
                        mesh.transform_changed();
                    }
                });
                break;
            case 'MESH_SLICE':
                const slices = event.data as MeshPropertyInfo<Vector2>[];
                updateSlice(slices, true);
                break;
            case 'MESH_TEXT':
                const texts = event.data as MeshPropertyInfo<string>[];
                updateText(texts, true);
                break;
            case 'MESH_FONT':
                const fonts = event.data as MeshPropertyInfo<string>[];
                updateFont(fonts, true);
                break;
            case 'MESH_FONT_SIZE':
                const fontSizes = event.data as MeshPropertyInfo<number>[];
                updateFontSize(fontSizes, true);
                break;
            case 'MESH_TEXT_ALIGN':
                const textAligns = event.data as MeshPropertyInfo<TextAlign>[];
                updateTextAlign(textAligns, true);
                break;
            case 'MESH_LINE_HEIGHT':
                const lineHeights = event.data as MeshPropertyInfo<number>[];
                updateLineHeight(lineHeights, true);
                break;
            case 'MESH_MODEL':
                const models = event.data as MeshPropertyInfo<{ mesh_name: string, scale: number }>[];
                updateModel(models, true);
                break;
            case 'MESH_ANIMATED_MODEL':
                const animated_models = event.data as MeshPropertyInfo<{ mesh_name: string, scale: number, animations: string[], current_animation: string }>[];
                updateAnimatedModel(animated_models, true);
                break;
            case 'MESH_ANIMATION_LIST':
                const animationLists = event.data as MeshPropertyInfo<string[]>[];
                updateAnimationList(animationLists, true);
                break;
            case 'MESH_ACTIVE_MODEL_ANIMATION':
                const activeModelAnimations = event.data as MeshPropertyInfo<string>[];
                updateActiveModelAnimation(activeModelAnimations, true);
                break;
            case 'MESH_BLEND_MODE':
                const blendModes = event.data as MeshMaterialPropertyInfo<BlendMode>[];
                updateBlendMode(blendModes, true);
                break;
            case 'MESH_MATERIAL':
                const materials = event.data as MeshPropertyInfo<{ name: string, uniforms?: TDictionary<any> }>[];
                updateMaterial(materials, true);
                break;
            case 'MESH_MATERIAL_SAMPLER2D':
                const sampler2Ds = event.data as MeshMaterialUniformInfo<string>[];
                updateUniformSampler2D(sampler2Ds, true);
                break;
            case 'MESH_MATERIAL_FLOAT':
                const floats = event.data as MeshMaterialUniformInfo<number>[];
                updateUniformFloat(floats, true);
                break;
            case 'MESH_MATERIAL_RANGE':
                const ranges = event.data as MeshMaterialUniformInfo<number>[];
                updateUniformRange(ranges, true);
                break;
            case 'MESH_UI_ALPHA':
                const uiAlphas = event.data as MeshMaterialUniformInfo<number>[];
                updateUIAlpha(uiAlphas, true);
                break;
            case 'MESH_MATERIAL_VEC2':
                const vec2s = event.data as MeshMaterialUniformInfo<Vector2>[];
                updateUniformVec2(vec2s, true);
                break;
            case 'MESH_MATERIAL_VEC3':
                const vec3s = event.data as MeshMaterialUniformInfo<Vector3>[];
                updateUniformVec3(vec3s, true);
                break;
            case 'MESH_MATERIAL_VEC4':
                const vec4s = event.data as MeshMaterialUniformInfo<Vector4>[];
                updateUniformVec4(vec4s, true);
                break;
            case 'MESH_MATERIAL_COLOR':
                const materialColors = event.data as MeshMaterialUniformInfo<string>[];
                updateUniformColor(materialColors, true);
                break;
            case 'MESH_SOUND':
                const sounds = event.data as MeshPropertyInfo<string>[];
                updateSound(sounds, true);
                break;
            case 'MESH_SOUND_LOOP':
                const loops = event.data as MeshPropertyInfo<boolean>[];
                updateLoop(loops, true);
                break;
            case 'MESH_SOUND_VOLUME':
                const volumes = event.data as MeshPropertyInfo<number>[];
                updateVolume(volumes, true);
                break;
            case 'MESH_SOUND_SPEED':
                const speeds = event.data as MeshPropertyInfo<number>[];
                updateSpeed(speeds, true);
                break;
            case 'MESH_SOUND_RADIUS':
                const soundRadius = event.data as MeshPropertyInfo<number>[];
                updateSoundRadius(soundRadius, true);
                break;
            case 'MESH_MAX_VOLUME_RADIUS':
                const maxVolumeRadius = event.data as MeshPropertyInfo<number>[];
                updateMaxVolumeRadius(maxVolumeRadius, true);
                break;
            case 'MESH_PAN_NORMALIZATION_DISTANCE':
                const panNormalizationDistance = event.data as MeshPropertyInfo<number>[];
                updatePanNormalizationDistance(panNormalizationDistance, true);
                break;
            case 'MESH_SOUND_FUNCTION':
                const soundFunction = event.data as MeshPropertyInfo<string>[];
                updateSoundFunction(soundFunction, true);
                break;
            case 'MESH_SOUND_ZONE_TYPE':
                const zoneTypes = event.data as MeshPropertyInfo<string>[];
                updateZoneType(zoneTypes, true);
                break;
            case 'MESH_SOUND_RECTANGLE_WIDTH':
                const rectangleWidths = event.data as MeshPropertyInfo<number>[];
                updateRectangleWidth(rectangleWidths, true);
                break;
            case 'MESH_SOUND_RECTANGLE_HEIGHT':
                const rectangleHeights = event.data as MeshPropertyInfo<number>[];
                updateRectangleHeight(rectangleHeights, true);
                break;
            case 'MESH_SOUND_RECTANGLE_MAX_VOLUME_WIDTH':
                const rectangleMaxVolumeWidths = event.data as MeshPropertyInfo<number>[];
                updateRectangleMaxVolumeWidth(rectangleMaxVolumeWidths, true);
                break;
            case 'MESH_SOUND_RECTANGLE_MAX_VOLUME_HEIGHT':
                const rectangleMaxVolumeHeights = event.data as MeshPropertyInfo<number>[];
                updateRectangleMaxVolumeHeight(rectangleMaxVolumeHeights, true);
                break;
        }

        set_selected_meshes(_selected_meshes);
    }

    function convertChangeInfoToMeshData<T>(info: ChangeInfo): { mesh_id: number, value: T }[] {
        const value = info.data.event.value as T;
        return info.ids.map(id => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[convertChangeInfoToMeshData] Mesh not found for id:', id);
                return null;
            }
            return { mesh_id: id, value };
        }).filter(item => item != null) as { mesh_id: number, value: T }[];
    }

    function convertChangeInfoToMeshMaterialData<T>(info: ChangeInfo): MeshMaterialPropertyInfo<T>[] {
        const value = info.data.event.value as T;
        return info.ids.map(id => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[convertChangeInfoToMeshData] Mesh not found for id:', id);
                return null;
            }
            return { mesh_id: id, material_index: info.data.field.data.material_index, value };
        }).filter(item => item != null) as MeshMaterialPropertyInfo<T>[];
    }

    function convertChangeInfoToMeshMaterialUniformData<T>(info: ChangeInfo): MeshMaterialUniformInfo<T>[] {
        const value = info.data.event.value as T;
        return info.ids.map(id => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[convertChangeInfoToMeshData] Mesh not found for id:', id);
                return null;
            }
            return { mesh_id: id, material_index: info.data.field.data.material_index, uniform_name: info.data.field.key, value };
        }).filter(item => item != null) as MeshMaterialUniformInfo<T>[];
    }

    function force_refresh() {
        setTimeout(() => {
            set_selected_meshes(_selected_meshes);
        });
    }

    init();
    return { force_refresh };
}
