import { Euler, Vector2, Vector3, Vector4 } from "three";
import { degToRad, radToDeg } from "three/src/math/MathUtils";
import { Slice9Mesh } from "../render_engine/objects/slice9";
import { GoSprite, FlipMode } from "../render_engine/objects/sub_types";
import { TextMesh } from "../render_engine/objects/text";
import { IObjectTypes } from "../render_engine/types";
import { ChangeInfo, InspectorGroup, PropertyType, BeforeChangeInfo, PropertyData, PropertyParams } from "../modules_editor/Inspector";
import { deepClone, hexToRGB } from "../modules/utils";
import { MeshMaterialUniformInfo, MeshPropertyInfo } from "../controls/types";
import { anchorToScreenPreset, convertBlendModeToThreeJS, convertThreeJSBlendingToBlendMode, generateMaterialOptions, generateTextureOptions, getChangedInfo, getDraggedInfo, pivotToScreenPreset, screenPresetToAnchorValue, screenPresetToPivotValue, update_option } from "./helpers";
import { IUniform, Texture } from "three";
import { Color } from "three";
import { MaterialUniformParams, MaterialUniformType } from "../render_engine/resource_manager";
import { rgbToHex } from "../modules/utils";
import { get_file_name, is_base_mesh } from "../render_engine/helpers/utils";
import { HistoryOwner, THistoryUndo } from "../modules_editor/modules_editor_const";


declare global {
    const ObjectInspector: ReturnType<typeof MeshInspectorCreate>;
}

export function register_mesh_inspector() {
    (window as any).MeshInspector = MeshInspectorCreate();
}

export enum MeshProperty {
    ID = 'mesh_id',
    TYPE = 'mesh_type',
    NAME = 'mesh_name',
    VISIBLE = 'mesh_visible',
    ACTIVE = 'mesh_active',
    POSITION = 'mesh_position',
    ROTATION = 'mesh_rotation',
    SCALE = 'mesh_scale',
    SIZE = 'mesh_size',
    PIVOT = 'mesh_pivot',
    ANCHOR = 'mesh_anchor',
    ANCHOR_PRESET = 'mesh_anchor_preset',
    COLOR = 'mesh_color',
    ALPHA = 'mesh_alpha',
    TEXTURE = 'mesh_texture',
    SLICE9 = 'mesh_slice9',
    TEXT = 'mesh_text',
    FONT = 'mesh_font',
    FONT_SIZE = 'mesh_font_size',
    TEXT_ALIGN = 'mesh_text_align',
    ATLAS = 'mesh_atlas',
    LINE_HEIGHT = 'mesh_line_height',
    BLEND_MODE = 'mesh_blend_mode',
    FLIP_VERTICAL = 'mesh_flip_vertical',
    FLIP_HORIZONTAL = 'mesh_flip_horizontal',
    FLIP_DIAGONAL = 'mesh_flip_diagonal',
    MATERIAL = 'mesh_material',
    MATERIAL_BUTTON = 'mesh_material_button',
    MATERIAL_UNIFORM_SAMPLER2D = 'mesh_material_uniform_sampler2d',
    MATERIAL_UNIFORM_FLOAT = 'mesh_material_uniform_float',
    MATERIAL_UNIFORM_RANGE = 'mesh_material_uniform_range',
    MATERIAL_UNIFORM_VEC2 = 'mesh_material_uniform_vec2',
    MATERIAL_UNIFORM_VEC3 = 'mesh_material_uniform_vec3',
    MATERIAL_UNIFORM_VEC4 = 'mesh_material_uniform_vec4',
    MATERIAL_UNIFORM_COLOR = 'mesh_material_uniform_color'
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
    const _config: InspectorGroup[] = [
        {
            name: 'base',
            title: '',
            property_list: [
                // { name: MeshProperty.ID, title: 'ID', type: PropertyType.NUMBER, readonly: true },
                { name: MeshProperty.TYPE, title: 'Тип', type: PropertyType.STRING, readonly: true },
                { name: MeshProperty.NAME, title: 'Название', type: PropertyType.STRING, onBeforeChange: saveName, onChange: handleNameChange },
                // { name: ObjectProperty.VISIBLE, title: 'Видимый', type: PropertyType.BOOLEAN, onSave: saveVisible, onUpdate: updateVisible },
                { name: MeshProperty.ACTIVE, title: 'Активный', type: PropertyType.BOOLEAN, onBeforeChange: saveActive, onChange: handleActiveChange }
            ]
        },
        {
            name: 'transform',
            title: 'Трансформ',
            property_list: [
                {
                    name: MeshProperty.POSITION, title: 'Позиция', type: PropertyType.VECTOR_3, params: {
                        x: { format: (v: number) => v.toFixed(2), step: 0.1 },
                        y: { format: (v: number) => v.toFixed(2), step: 0.1 },
                        z: { format: (v: number) => v.toFixed(2), step: 0.1 },
                    },
                    onBeforeChange: savePosition,
                    onChange: handlePositionChange,
                    onRefresh: refreshPosition
                },
                {
                    name: MeshProperty.ROTATION, title: 'Вращение', type: PropertyType.VECTOR_3, params: {
                        x: { format: (v: number) => v.toFixed(2) },
                        y: { format: (v: number) => v.toFixed(2) },
                        z: { format: (v: number) => v.toFixed(2) }
                    },
                    onBeforeChange: saveRotation,
                    onChange: handleRotationChange,
                    onRefresh: refreshRotation
                },
                {
                    name: MeshProperty.SCALE, title: 'Маштаб', type: PropertyType.VECTOR_2, params: {
                        x: { format: (v: number) => v.toFixed(2) },
                        y: { format: (v: number) => v.toFixed(2) },
                    },
                    onBeforeChange: saveScale,
                    onChange: handleScaleChange,
                    onRefresh: refreshScale
                },
                {
                    name: MeshProperty.PIVOT, title: 'Точка опоры', type: PropertyType.LIST_TEXT, params: {
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
                },
                {
                    name: MeshProperty.SIZE, title: 'Размер', type: PropertyType.VECTOR_2, params: {
                        x: { min: 0, max: 0xFFFFFFFF, step: 1, format: (v: number) => v.toFixed(2) },
                        y: { min: 0, max: 0xFFFFFFFF, step: 1, format: (v: number) => v.toFixed(2) },
                    },
                    onBeforeChange: saveSize,
                    onChange: handleSizeChange,
                    onRefresh: refreshSize
                }
            ]
        },
        {
            name: 'anchor',
            title: 'Якорь',
            property_list: [
                {
                    name: MeshProperty.ANCHOR, title: 'Значение', type: PropertyType.POINT_2D, params: {
                        x: { min: -1, max: 1, format: (v: number) => v.toFixed(2) },
                        y: { min: -1, max: 1, format: (v: number) => v.toFixed(2) }
                    },
                    onBeforeChange: saveAnchor,
                    onChange: handleAnchorChange,
                    onRefresh: refreshAnchor
                },
                {
                    name: MeshProperty.ANCHOR_PRESET,
                    title: 'Anchor Preset',
                    type: PropertyType.LIST_TEXT,
                    params: {
                        'Top Left': 'Top Left',
                        'Top Center': 'Top Center',
                        'Top Right': 'Top Right',
                        'Middle Left': 'Middle Left',
                        'Middle Center': 'Middle Center',
                        'Middle Right': 'Middle Right',
                        'Bottom Left': 'Bottom Left',
                        'Bottom Center': 'Bottom Center',
                        'Bottom Right': 'Bottom Right'
                    },
                    onBeforeChange: saveAnchorPreset,
                    onChange: handleAnchorPresetChange,
                    onRefresh: refreshAnchorPreset
                }
            ]
        },
        {
            name: 'text',
            title: 'Текст',
            property_list: [
                { name: MeshProperty.TEXT, title: 'Текст', type: PropertyType.STRING, onBeforeChange: saveText, onChange: handleTextChange },
                {
                    name: MeshProperty.FONT, title: 'Шрифт', type: PropertyType.LIST_TEXT, params: ResourceManager.get_all_fonts(),
                    onBeforeChange: saveFont,
                    onChange: handleFontChange
                },
                {
                    name: MeshProperty.FONT_SIZE, title: 'Размер шрифта', type: PropertyType.NUMBER, params: {
                        min: 8, step: 1, format: (v: number) => v.toFixed(0)
                    },
                    onBeforeChange: saveFontSize,
                    onChange: handleFontSizeChange,
                    onRefresh: refreshFontSize
                },
                {
                    name: MeshProperty.TEXT_ALIGN, title: 'Выравнивание', type: PropertyType.LIST_TEXT, params: {
                        'Центр': TextAlign.CENTER,
                        'Слева': TextAlign.LEFT,
                        'Справа': TextAlign.RIGHT,
                        'По ширине': TextAlign.JUSTIFY
                    },
                    onBeforeChange: saveTextAlign,
                    onChange: handleTextAlignChange
                },
                {
                    name: MeshProperty.LINE_HEIGHT, title: 'Высота строки', type: PropertyType.NUMBER, params: {
                        min: 0.5, max: 3, step: 0.1, format: (v: number) => v.toFixed(2)
                    },
                    onBeforeChange: saveLineHeight,
                    onChange: handleLineHeightChange
                }
            ]
        },
        {
            name: 'material',
            title: 'Материал',
            property_list: [
                {
                    name: MeshProperty.MATERIAL, title: 'Шаблон', type: PropertyType.LIST_TEXT, params: generateMaterialOptions(),
                    onBeforeChange: saveMaterial,
                    onChange: handleMaterialChange
                },

                { name: MeshProperty.COLOR, title: 'Цвет', type: PropertyType.COLOR, onBeforeChange: saveColor, onChange: handleColorChange },
                {
                    name: MeshProperty.MATERIAL_UNIFORM_SAMPLER2D,
                    title: 'Sampler2D',
                    type: PropertyType.LIST_TEXTURES,
                    params: () => generateTextureOptions(true),
                    onBeforeChange: saveUniformSampler2D,
                    onChange: handleUniformSampler2DChange
                },
                {
                    name: MeshProperty.MATERIAL_UNIFORM_FLOAT,
                    title: 'Float',
                    type: PropertyType.NUMBER,
                    params: {
                        min: 0,
                        max: 1,
                        step: 0.01
                    },
                    onBeforeChange: saveUniformFloat,
                    onChange: handleUniformFloatChange
                },
                {
                    name: MeshProperty.MATERIAL_UNIFORM_RANGE,
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
                    name: MeshProperty.MATERIAL_UNIFORM_VEC2,
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
                    name: MeshProperty.MATERIAL_UNIFORM_VEC3,
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
                    name: MeshProperty.MATERIAL_UNIFORM_VEC4,
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
                    name: MeshProperty.MATERIAL_UNIFORM_COLOR,
                    title: 'Color',
                    type: PropertyType.COLOR,
                    onBeforeChange: saveUniformColor,
                    onChange: handleUniformColorChange
                },
                {
                    name: MeshProperty.SLICE9, title: 'Slice9', type: PropertyType.POINT_2D, params: {
                        x: { min: 0, max: 100, format: (v: number) => v.toFixed(2) },
                        y: { min: 0, max: 100, format: (v: number) => v.toFixed(2) }
                    },
                    onBeforeChange: saveSlice,
                    onChange: handleSliceChange,
                    onRefresh: refreshSlice9
                },
                {
                    name: MeshProperty.BLEND_MODE, title: 'Режим смешивания', type: PropertyType.LIST_TEXT, params: {
                        'Нормальный': BlendMode.NORMAL,
                        'Сложение': BlendMode.ADD,
                        'Умножение': BlendMode.MULTIPLY,
                        'Вычитание': BlendMode.SUBTRACT,
                        // 'Пользовательский': BlendMode.CUSTOM
                    },
                    onBeforeChange: saveBlendMode,
                    onChange: handleBlendModeChange
                },
                {
                    name: MeshProperty.MATERIAL_BUTTON,
                    title: 'Открыть оригинальный материал',
                    type: PropertyType.BUTTON
                },
            ]
        },
        {
            name: 'Flip',
            title: 'Отражение',
            property_list: [
                { name: MeshProperty.FLIP_VERTICAL, title: 'По вертикали', type: PropertyType.BOOLEAN, onBeforeChange: saveUV, onChange: handleFlipVerticalChange, onRefresh: refreshFlipVertical },
                { name: MeshProperty.FLIP_HORIZONTAL, title: 'По горизонтали', type: PropertyType.BOOLEAN, onBeforeChange: saveUV, onChange: handleFlipHorizontalChange, onRefresh: refreshFlipHorizontal },
                { name: MeshProperty.FLIP_DIAGONAL, title: 'По диагонали', type: PropertyType.BOOLEAN, onBeforeChange: saveUV, onChange: handleFlipDiagonalChange, onRefresh: refreshFlipDiagonal },
            ]
        }
    ];

    let _selected_meshes: number[] = [];

    function init() {
        subscribe();
    }

    function subscribe() {
        EventBus.on('SYS_SELECTED_MESH_LIST', (e) => {
            set_selected_meshes(e.list.map((value) => value.mesh_data.id));
        });

        EventBus.on('SYS_UNSELECTED_MESH_LIST', () => {
            Inspector.clear();
        });

        EventBus.on('SYS_HISTORY_UNDO', (event: THistoryUndo) => {
            if (event.owner != HistoryOwner.MESH_INSPECTOR) return;
            undo(event);
        });
    }

    function set_selected_meshes(mesh_ids: number[]) {
        _selected_meshes = mesh_ids;

        const list = SceneManager.get_scene_list().filter((item) => _selected_meshes.includes(item.mesh_data.id));
        const data = list.map((value) => {
            const fields: PropertyData<PropertyType>[] = [];

            // fields.push({ name: MeshProperty.ID, data: value.mesh_data.id });

            fields.push({ name: MeshProperty.TYPE, data: value.type });
            fields.push({ name: MeshProperty.NAME, data: value.name });
            // fields.push({ name: ObjectProperty.VISIBLE, data: value.get_visible() });
            fields.push({ name: MeshProperty.ACTIVE, data: value.get_active() });

            // NOTE: исключаем gui контейнер
            if (value.type != IObjectTypes.GUI_CONTAINER) {

                // NOTE: трансформация
                {
                    fields.push({ name: MeshProperty.POSITION, data: value.get_position() });

                    const raw = value.rotation;
                    const rotation = new Vector3(radToDeg(raw.x), radToDeg(raw.y), radToDeg(raw.z));
                    fields.push({ name: MeshProperty.ROTATION, data: rotation });

                    fields.push({ name: MeshProperty.SCALE, data: value.get_scale() });
                }

                // NOTE: gui поля
                if ([IObjectTypes.GUI_BOX, IObjectTypes.GUI_TEXT].includes(value.type)) {
                    fields.push({ name: MeshProperty.SIZE, data: value.get_size() });

                    const pivot_preset = pivotToScreenPreset(value.get_pivot());
                    fields.push({ name: MeshProperty.PIVOT, data: pivot_preset });

                    const anchor_preset = anchorToScreenPreset(value.get_anchor());
                    fields.push({ name: MeshProperty.ANCHOR_PRESET, data: anchor_preset });
                    fields.push({ name: MeshProperty.ANCHOR, data: value.get_anchor() });
                } else if (IObjectTypes.GO_SPRITE_COMPONENT == value.type || IObjectTypes.GO_LABEL_COMPONENT == value.type) {
                    fields.push({ name: MeshProperty.SIZE, data: value.get_size() });
                }

                // NOTE: визуальные поля
                if ([IObjectTypes.SLICE9_PLANE, IObjectTypes.GUI_BOX, IObjectTypes.GO_SPRITE_COMPONENT].includes(value.type)) {
                    // NOTE: обновляем конфиг материалов
                    update_option(_config, MeshProperty.MATERIAL, generateMaterialOptions);

                    fields.push({ name: MeshProperty.MATERIAL, data: (value as Slice9Mesh).material.name || '' });

                    fields.push({ name: MeshProperty.COLOR, data: value.get_color() });

                    fields.push({ name: MeshProperty.BLEND_MODE, data: convertThreeJSBlendingToBlendMode((value as Slice9Mesh).material.blending) });

                    fields.push({ name: MeshProperty.SLICE9, data: (value as Slice9Mesh).get_slice() });

                    // NOTE: обновляем конфиг текстур для sampler2d полeй
                    update_option(_config, MeshProperty.MATERIAL_UNIFORM_SAMPLER2D, () => generateTextureOptions(true));

                    // Add material properties
                    const material = (value as Slice9Mesh).material;
                    if (material) {
                        const material_info = ResourceManager.get_material_info(material.name);
                        if (material_info) {
                            Object.entries(material.uniforms).forEach(([key, uniform]) => {
                                const uniformInfo = material_info.uniforms[key];
                                if (!uniformInfo) return;
                                if (uniformInfo.hide) return;
                                switch (uniformInfo.type) {
                                    case MaterialUniformType.SAMPLER2D:
                                        _config.forEach((group) => {
                                            const property = group.property_list.find((property) => property.name == MeshProperty.MATERIAL_UNIFORM_SAMPLER2D);
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
                                        fields.push({ name: key, data: `${atlas}/${texture_name}` });
                                        break;
                                    case MaterialUniformType.FLOAT:
                                        _config.forEach((group) => {
                                            const property = group.property_list.find((property) => property.name == MeshProperty.MATERIAL_UNIFORM_FLOAT);
                                            if (!property) return;
                                            const newProperty = { ...property };
                                            newProperty.name = key;
                                            newProperty.title = key;
                                            newProperty.readonly = uniformInfo.readonly;
                                            group.property_list.push(newProperty);
                                        });
                                        const float = uniform as IUniform<number>;
                                        fields.push({ name: key, data: float.value });
                                        break;
                                    case MaterialUniformType.RANGE:
                                        _config.forEach((group) => {
                                            const property = group.property_list.find((property) => property.name == MeshProperty.MATERIAL_UNIFORM_RANGE);
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
                                        fields.push({ name: key, data: range.value });
                                        break;
                                    case MaterialUniformType.VEC2:
                                        _config.forEach((group) => {
                                            const property = group.property_list.find((property) => property.name == MeshProperty.MATERIAL_UNIFORM_VEC2);
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
                                        fields.push({ name: key, data: vec2.value });
                                        break;
                                    case MaterialUniformType.VEC3:
                                        _config.forEach((group) => {
                                            const property = group.property_list.find((property) => property.name == MeshProperty.MATERIAL_UNIFORM_VEC3);
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
                                        fields.push({ name: key, data: vec3.value });
                                        break;
                                    case MaterialUniformType.VEC4:
                                        _config.forEach((group) => {
                                            const property = group.property_list.find((property) => property.name == MeshProperty.MATERIAL_UNIFORM_VEC4);
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
                                        fields.push({ name: key, data: vec4.value });
                                        break;
                                    case MaterialUniformType.COLOR:
                                        _config.forEach((group) => {
                                            const property = group.property_list.find((property) => property.name == MeshProperty.MATERIAL_UNIFORM_COLOR);
                                            if (!property) return;
                                            const newProperty = { ...property };
                                            newProperty.name = key;
                                            newProperty.title = key;
                                            newProperty.readonly = uniformInfo.readonly;
                                            group.property_list.push(newProperty);
                                        });
                                        const color = uniform as IUniform<Vector3>;
                                        fields.push({ name: key, data: rgbToHex(color.value) });
                                        break;
                                }
                            });
                        }
                    }

                    // NOTE: отражение только для спрайта
                    if (value.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                        const sprite = value as GoSprite;
                        const currentFlip = sprite.get_flip();

                        switch (currentFlip) {
                            case FlipMode.NONE:
                                fields.push({ name: MeshProperty.FLIP_DIAGONAL, data: false });
                                fields.push({ name: MeshProperty.FLIP_VERTICAL, data: false });
                                fields.push({ name: MeshProperty.FLIP_HORIZONTAL, data: false });
                                break;
                            case FlipMode.VERTICAL:
                                fields.push({ name: MeshProperty.FLIP_DIAGONAL, data: false });
                                fields.push({ name: MeshProperty.FLIP_VERTICAL, data: true });
                                fields.push({ name: MeshProperty.FLIP_HORIZONTAL, data: false });
                                break;
                            case FlipMode.HORIZONTAL:
                                fields.push({ name: MeshProperty.FLIP_DIAGONAL, data: false });
                                fields.push({ name: MeshProperty.FLIP_VERTICAL, data: false });
                                fields.push({ name: MeshProperty.FLIP_HORIZONTAL, data: true });
                                break;
                            case FlipMode.DIAGONAL:
                                fields.push({ name: MeshProperty.FLIP_DIAGONAL, data: true });
                                fields.push({ name: MeshProperty.FLIP_VERTICAL, data: false });
                                fields.push({ name: MeshProperty.FLIP_HORIZONTAL, data: false });
                                break;
                        }
                    }

                    let selected_meshes_material = '';
                    for (const id of list.map((value) => value.mesh_data.id)) {
                        const mesh = SceneManager.get_mesh_by_id(id);
                        if (mesh == undefined || !(mesh instanceof Slice9Mesh)) break;
                        const material = (mesh as Slice9Mesh).material;
                        if (material == undefined) break;
                        if (selected_meshes_material == '') {
                            selected_meshes_material = material.name;
                        } else if (selected_meshes_material !== material.name) {
                            selected_meshes_material = '';
                            break;
                        }
                    }

                    if (selected_meshes_material != '') {
                        fields.push({
                            name: MeshProperty.MATERIAL_BUTTON, data: () => {
                                const material_info = ResourceManager.get_material_info(selected_meshes_material);
                                if (material_info) {
                                    AssetInspector.set_selected_materials([material_info.path]);
                                }
                            }
                        });
                    }
                }

                // NOTE: обновляем конфиг шрифтов
                update_option(_config, MeshProperty.FONT, ResourceManager.get_all_fonts);

                // NOTE: текстовые поля
                if ([IObjectTypes.TEXT, IObjectTypes.GUI_TEXT, IObjectTypes.GO_LABEL_COMPONENT].includes(value.type)) {
                    fields.push({ name: MeshProperty.TEXT, data: (value as TextMesh).text });
                    fields.push({ name: MeshProperty.FONT, data: (value as TextMesh).font || '' });
                    fields.push({ name: MeshProperty.COLOR, data: value.get_color() });
                    fields.push({ name: MeshProperty.ALPHA, data: (value as TextMesh).fillOpacity });

                    const delta = new Vector3(1 * value.scale.x, 1 * value.scale.y);
                    const max_delta = Math.max(delta.x, delta.y);
                    const font_size = (value as TextMesh).fontSize * max_delta;

                    fields.push({ name: MeshProperty.FONT_SIZE, data: font_size });
                    fields.push({ name: MeshProperty.TEXT_ALIGN, data: (value as TextMesh).textAlign });

                    const line_height = (value as TextMesh).lineHeight;
                    if (line_height == 'normal') fields.push({ name: MeshProperty.LINE_HEIGHT, data: 1 });
                    else fields.push({ name: MeshProperty.LINE_HEIGHT, data: line_height });
                }
            }

            return { id: value.mesh_data.id, data: fields };
        });

        Inspector.clear();
        Inspector.setData(data, _config);
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
        const raw = mesh.rotation;
        return new Vector3(radToDeg(raw.x), radToDeg(raw.y), radToDeg(raw.z));
    }

    function refreshScale(ids: number[]) {
        const mesh = SceneManager.get_mesh_by_id(ids[0]);
        if (mesh == undefined) {
            Log.error('[refreshScale] Mesh not found for id:', ids);
            return;
        }
        return mesh.get_scale();
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
            mesh.name = item.value;
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

    function savePosition(info: BeforeChangeInfo) {
        const oldPositions: MeshPropertyInfo<Vector3>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[savePosition] Mesh not found for id:', id);
                return;
            }
            oldPositions.push({ mesh_id: mesh.mesh_data.id, value: deepClone(mesh.position) });
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

    function saveRotation(info: BeforeChangeInfo) {
        const oldRotations: MeshPropertyInfo<Euler>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveRotation] Mesh not found for id:', id);
                return;
            }
            oldRotations.push({ mesh_id: id, value: deepClone(mesh.rotation) });
        });
        HistoryControl.add("MESH_ROTATE", oldRotations, HistoryOwner.MESH_INSPECTOR);
    }

    function handleRotationChange(info: ChangeInfo) {
        const [isChangedX, isChangedY, isChangedZ] = getChangedInfo(info);
        const rawRot = info.data.event.value as Vector3;
        const rot = new Vector3(degToRad(rawRot.x), degToRad(rawRot.y), degToRad(rawRot.z));

        const data = info.ids.map((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[updateRotation] Mesh not found for id:', id);
                return;
            }
            const x = isChangedX ? rot.x : mesh.rotation.x;
            const y = isChangedY ? rot.y : mesh.rotation.y;
            const z = isChangedZ ? rot.z : mesh.rotation.z;
            return { mesh_id: id, value: new Vector3(x, y, z) };
        }).filter((item) => item != undefined);

        updateRotation(data, info.data.event.last);
    }

    function updateRotation(data: MeshPropertyInfo<Vector3>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updateRotation] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.rotation.set(item.value.x, item.value.y, item.value.z);
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

    function updateScale(data: MeshPropertyInfo<Vector3>[], last: boolean) {
        if (!last) return;

        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updateScale] Mesh not found for id:', item.mesh_id);
                continue;
            }
            mesh.scale.copy(item.value);
            mesh.transform_changed();

            if ((mesh as TextMesh).fontSize) {
                const delta = new Vector3(1 * item.value.x, 1 * item.value.y, item.value.z);
                const max_delta = Math.max(delta.x, delta.y);
                (mesh as TextMesh).fontSize * max_delta;
            }
        }

        const meshes = data.map(item => SceneManager.get_mesh_by_id(item.mesh_id)).filter(mesh => mesh != undefined);
        TransformControl.set_proxy_in_average_point(meshes);
        SizeControl.draw();
        Inspector.refresh([MeshProperty.FONT_SIZE]);
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

    function updateSize(data: MeshPropertyInfo<Vector2>[], last: boolean) {
        if (!last) return;

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
            Inspector.refresh([MeshProperty.ANCHOR_PRESET]);
        }
        Inspector.refresh([MeshProperty.ANCHOR]);
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
        Inspector.refresh([MeshProperty.ANCHOR]);
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
        Inspector.refresh([MeshProperty.SCALE]);
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
            const text_align = item.value as any;
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
        const blendModes: MeshPropertyInfo<BlendMode>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[saveBlendMode] Mesh not found for id:', id);
                return;
            }
            blendModes.push({
                mesh_id: id,
                value: (mesh as any).material.blending
            });
        });
        HistoryControl.add('MESH_BLEND_MODE', blendModes, HistoryOwner.MESH_INSPECTOR);
    }

    function handleBlendModeChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<BlendMode>(info);
        updateBlendMode(data, info.data.event.last);
    }

    function updateBlendMode(data: MeshPropertyInfo<BlendMode>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id);
            if (mesh == undefined) {
                Log.error('[updateBlendMode] Mesh not found for id:', item.mesh_id);
                continue;
            }
            const blend_mode = item.value as BlendMode;
            const threeBlendMode = convertBlendModeToThreeJS(blend_mode);
            (mesh as any).material.blending = threeBlendMode;
        }
    }

    function saveMaterial(info: BeforeChangeInfo) {
        const materials: MeshPropertyInfo<string>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as Slice9Mesh;
            if (mesh == undefined) {
                Log.error('[saveMaterial] Mesh not found for id:', id);
                return;
            }
            const material_name = mesh.material.name;
            materials.push({ mesh_id: id, value: material_name });
        });
        HistoryControl.add('MESH_MATERIAL', materials, HistoryOwner.MESH_INSPECTOR);
    }

    function handleMaterialChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshData<string>(info);
        updateMaterial(data, info.data.event.last);
    }

    function updateMaterial(data: MeshPropertyInfo<string>[], _: boolean) {
        for (const item of data) {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as Slice9Mesh;
            if (mesh == undefined) {
                Log.error('[updateMaterial] Mesh not found for id:', item.mesh_id);
                return;
            }
            const texture_info = mesh.get_texture();
            const texture_name = texture_info[0];
            const atlas = texture_info[1];
            const has_texture = texture_name != '';

            const material_name = item.value as string;
            mesh.set_material(material_name);

            if (has_texture) {
                mesh.set_texture(texture_name, atlas);
            }
            else {
                const material = ResourceManager.get_material_by_mesh_id(material_name, item.mesh_id);
                if (material) {
                    if (material.uniforms['u_texture'].value != null) {
                        const texture_name = material.uniforms['u_texture'].value.name;
                        const atlas = material.uniforms['u_texture'].value.atlas;
                        mesh.set_texture(texture_name, atlas);
                    }
                }
            }
        }

        setTimeout(() => {
            set_selected_meshes(_selected_meshes);
        });
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
            Inspector.refresh([MeshProperty.FLIP_DIAGONAL, MeshProperty.FLIP_HORIZONTAL]);
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
            Inspector.refresh([MeshProperty.FLIP_DIAGONAL, MeshProperty.FLIP_VERTICAL]);
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
            Inspector.refresh([MeshProperty.FLIP_VERTICAL, MeshProperty.FLIP_HORIZONTAL]);
        }
    }

    function saveUniformSampler2D(info: BeforeChangeInfo) {
        const sampler2Ds: MeshMaterialUniformInfo<string>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as Slice9Mesh;
            if (!mesh) return;

            const material = mesh.material;
            if (!material) return;

            const uniform = material.uniforms[info.field.name];
            if (uniform) {
                sampler2Ds.push({
                    mesh_id: id,
                    uniform_name: info.field.name,
                    value: uniform.value?.path || ''
                });
            }
        });
        HistoryControl.add('MESH_MATERIAL_SAMPLER2D', sampler2Ds, HistoryOwner.MESH_INSPECTOR);
    }

    function handleUniformSampler2DChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshMaterialData<string>(info);
        updateUniformSampler2D(data, info.data.event.last);
    }

    function updateUniformSampler2D(data: MeshMaterialUniformInfo<string>[], _: boolean) {
        data.forEach((item) => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as Slice9Mesh;
            if (!mesh) return;

            const material = ResourceManager.get_material_by_mesh_id(mesh.material.name, item.mesh_id);
            if (!material) return;

            const texture_name = get_file_name(item.value as string || '');
            const atlas = ResourceManager.get_atlas_by_texture_name(texture_name) || '';
            const texture = ResourceManager.get_texture(texture_name, atlas).texture;
            if (!texture) return;

            if (item.uniform_name == 'u_texture') {
                mesh.set_texture(texture_name, atlas);
            }
            else {
                ResourceManager.set_material_uniform_for_mesh(mesh, material.name, item.uniform_name, texture);
                ResourceManager.set_material_define_for_mesh(mesh, material.name, 'USE_TEXTURE', '');
            }

            EventBus.trigger('SYS_MESH_MATERIAL_CHANGED', {
                mesh_id: item.mesh_id,
                is_uniform: true,
                property: item.uniform_name,
                value: texture
            });
        });
    }

    function saveUniformFloat(info: BeforeChangeInfo) {
        const floats: MeshMaterialUniformInfo<number>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as Slice9Mesh;
            if (!mesh) return;

            const material = mesh.material;
            if (!material) return;

            const uniform = material.uniforms[info.field.name];
            if (uniform) {
                floats.push({
                    mesh_id: id,
                    uniform_name: info.field.name,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MESH_MATERIAL_FLOAT', floats, HistoryOwner.MESH_INSPECTOR);
    }

    function handleUniformFloatChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshMaterialData<number>(info);
        updateUniformFloat(data, info.data.event.last);
    }

    function updateUniformFloat(data: MeshMaterialUniformInfo<number>[], _: boolean) {
        data.forEach((item) => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as Slice9Mesh;
            if (!mesh) return;

            const material = mesh.material;
            if (!material) return;

            ResourceManager.set_material_uniform_for_mesh(mesh, material.name, item.uniform_name, item.value as number);

            EventBus.trigger('SYS_MESH_MATERIAL_CHANGED', {
                mesh_id: item.mesh_id,
                is_uniform: true,
                property: item.uniform_name,
                value: item.value
            });
        });
    }

    function saveUniformRange(info: BeforeChangeInfo) {
        const ranges: MeshMaterialUniformInfo<number>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as Slice9Mesh;
            if (!mesh) return;

            const material = mesh.material;
            if (!material) return;

            const uniform = material.uniforms[info.field.name];
            if (uniform) {
                ranges.push({
                    mesh_id: id,
                    uniform_name: info.field.name,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MESH_MATERIAL_RANGE', ranges, HistoryOwner.MESH_INSPECTOR);
    }

    function handleUniformRangeChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshMaterialData<number>(info);
        updateUniformRange(data, info.data.event.last);
    }

    function updateUniformRange(data: MeshMaterialUniformInfo<number>[], _: boolean) {
        data.forEach((item) => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as Slice9Mesh;
            if (!mesh) return;

            const material = mesh.material;
            if (!material) return;

            ResourceManager.set_material_uniform_for_mesh(mesh, material.name, item.uniform_name, item.value);

            EventBus.trigger('SYS_MESH_MATERIAL_CHANGED', {
                mesh_id: item.mesh_id,
                is_uniform: true,
                property: item.uniform_name,
                value: item.value
            });
        });
    }

    function saveUniformVec2(info: BeforeChangeInfo) {
        const vec2s: MeshMaterialUniformInfo<Vector2>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as Slice9Mesh;
            if (!mesh) return;

            const material = mesh.material;
            if (!material) return;

            const uniform = material.uniforms[info.field.name];
            if (uniform) {
                vec2s.push({
                    mesh_id: id,
                    uniform_name: info.field.name,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MESH_MATERIAL_VEC2', vec2s, HistoryOwner.MESH_INSPECTOR);
    }

    function handleUniformVec2Change(info: ChangeInfo) {
        const data = convertChangeInfoToMeshMaterialData<Vector2>(info);
        updateUniformVec2(data, info.data.event.last);
    }

    function updateUniformVec2(data: MeshMaterialUniformInfo<Vector2>[], last: boolean) {
        if (!last) return;

        data.forEach((item) => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as Slice9Mesh;
            if (!mesh) return;

            const material = mesh.material;
            if (!material) return;

            ResourceManager.set_material_uniform_for_mesh(mesh, material.name, item.uniform_name, item.value);

            EventBus.trigger('SYS_MESH_MATERIAL_CHANGED', {
                mesh_id: item.mesh_id,
                is_uniform: true,
                property: item.uniform_name,
                value: item.value
            });
        });
    }

    function saveUniformVec3(info: BeforeChangeInfo) {
        const vec3s: MeshMaterialUniformInfo<Vector3>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as Slice9Mesh;
            if (!mesh) return;

            const material = mesh.material;
            if (!material) return;

            const uniform = material.uniforms[info.field.name];
            if (uniform) {
                vec3s.push({
                    mesh_id: id,
                    uniform_name: info.field.name,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MESH_MATERIAL_VEC3', vec3s, HistoryOwner.MESH_INSPECTOR);
    }

    function handleUniformVec3Change(info: ChangeInfo) {
        const data = convertChangeInfoToMeshMaterialData<Vector3>(info);
        updateUniformVec3(data, info.data.event.last);
    }

    function updateUniformVec3(data: MeshMaterialUniformInfo<Vector3>[], last: boolean) {
        if (!last) return;

        data.forEach((item) => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as Slice9Mesh;
            if (!mesh) return;

            const material = mesh.material;
            if (!material) return;

            ResourceManager.set_material_uniform_for_mesh(mesh, material.name, item.uniform_name, item.value);

            EventBus.trigger('SYS_MESH_MATERIAL_CHANGED', {
                mesh_id: item.mesh_id,
                is_uniform: true,
                property: item.uniform_name,
                value: item.value
            });
        });
    }

    function saveUniformVec4(info: BeforeChangeInfo) {
        const vec4s: MeshMaterialUniformInfo<Vector4>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as Slice9Mesh;
            if (!mesh) return;

            const material = mesh.material;
            if (!material) return;

            const uniform = material.uniforms[info.field.name];
            if (uniform) {
                vec4s.push({
                    mesh_id: id,
                    uniform_name: info.field.name,
                    value: uniform.value
                });
            }
        });
        HistoryControl.add('MESH_MATERIAL_VEC4', vec4s, HistoryOwner.MESH_INSPECTOR);
    }

    function handleUniformVec4Change(info: ChangeInfo) {
        const data = convertChangeInfoToMeshMaterialData<Vector4>(info);
        updateUniformVec4(data, info.data.event.last);
    }

    function updateUniformVec4(data: MeshMaterialUniformInfo<Vector4>[], last: boolean) {
        if (!last) return;

        data.forEach((item) => {
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as Slice9Mesh;
            if (!mesh) return;

            const material = mesh.material;
            if (!material) return;

            ResourceManager.set_material_uniform_for_mesh(mesh, material.name, item.uniform_name, item.value);

            EventBus.trigger('SYS_MESH_MATERIAL_CHANGED', {
                mesh_id: item.mesh_id,
                is_uniform: true,
                property: item.uniform_name,
                value: item.value
            });
        });
    }

    function saveUniformColor(info: BeforeChangeInfo) {
        const colors: MeshMaterialUniformInfo<string>[] = [];
        info.ids.forEach((id) => {
            const mesh = SceneManager.get_mesh_by_id(id) as Slice9Mesh;
            if (!mesh) return;

            const material = mesh.material;
            if (!material) return;

            const uniform = material.uniforms[info.field.name];
            if (uniform) {
                const color = new Color();
                color.setRGB(uniform.value.x, uniform.value.y, uniform.value.z);
                colors.push({
                    mesh_id: id,
                    uniform_name: info.field.name,
                    value: color.getHexString()
                });
            }
        });
        HistoryControl.add('MESH_MATERIAL_COLOR', colors, HistoryOwner.MESH_INSPECTOR);
    }

    function handleUniformColorChange(info: ChangeInfo) {
        const data = convertChangeInfoToMeshMaterialData<string>(info);
        updateUniformColor(data, info.data.event.last);
    }

    function updateUniformColor(data: MeshMaterialUniformInfo<string>[], last: boolean) {
        if (!last) return;

        data.forEach((item) => {
            const rgb = hexToRGB(item.value);
            const mesh = SceneManager.get_mesh_by_id(item.mesh_id) as Slice9Mesh;
            if (!mesh) return;

            const material = mesh.material;
            if (!material) return;

            ResourceManager.set_material_uniform_for_mesh(mesh, material.name, item.uniform_name, rgb);

            EventBus.trigger('SYS_MESH_MATERIAL_CHANGED', {
                mesh_id: item.mesh_id,
                is_uniform: true,
                property: item.uniform_name,
                value: rgb
            });
        });
    }

    function undo(event: THistoryUndo) {
        if (event.owner !== HistoryOwner.MESH_INSPECTOR) return;

        switch (event.type) {
            case 'MESH_NAME':
                const names = event.data as MeshPropertyInfo<string>[];
                updateName(names, true);
                break;
            case 'MESH_ACTIVE':
                const actives = event.data as MeshPropertyInfo<boolean>[];
                updateActive(actives, true);
                break;
            case 'MESH_TRANSLATE':
                const positions = event.data as MeshPropertyInfo<Vector3>[];
                updatePosition(positions, true);
                break;
            case 'MESH_ROTATE':
                const rotations = event.data as MeshPropertyInfo<Vector3>[];
                updateRotation(rotations, true);
                break;
            case 'MESH_SCALE':
                const scales = event.data as MeshPropertyInfo<Vector3>[];
                updateScale(scales, true);
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
            case 'MESH_BLEND_MODE':
                const blendModes = event.data as MeshPropertyInfo<BlendMode>[];
                updateBlendMode(blendModes, true);
                break;
            case 'MESH_MATERIAL':
                const materials = event.data as MeshPropertyInfo<string>[];
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

    function convertChangeInfoToMeshMaterialData<T>(info: ChangeInfo): { mesh_id: number, uniform_name: string, value: T }[] {
        const value = info.data.event.value as T;
        return info.ids.map(id => {
            const mesh = SceneManager.get_mesh_by_id(id);
            if (mesh == undefined) {
                Log.error('[convertChangeInfoToMeshData] Mesh not found for id:', id);
                return null;
            }
            return { mesh_id: id, uniform_name: info.data.field.name, value };
        }).filter(item => item != null) as { mesh_id: number, uniform_name: string, value: T }[];
    }

    init();
    return {};
}