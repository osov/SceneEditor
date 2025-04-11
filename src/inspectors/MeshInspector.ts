import { Vector2, Vector3 } from "three";
import { degToRad, radToDeg } from "three/src/math/MathUtils";
import { Slice9Mesh } from "../render_engine/objects/slice9";
import { GoSprite, FlipMode } from "../render_engine/objects/sub_types";
import { TextMesh } from "../render_engine/objects/text";
import { IBaseMeshAndThree, IObjectTypes } from "../render_engine/types";
import { ChangeInfo, InspectorGroup, PropertyType, BeforeChangeInfo } from "../modules_editor/Inspector";
import { deepClone } from "../modules/utils";
import { NameEventData, ActiveEventData, VisibleEventData, PositionEventData, RotationEventData, ScaleEventData, SizeEventData, PivotEventData, AnchorEventData, ColorEventData, AlphaEventData, TextureEventData, SliceEventData, TextEventData, FontEventData, FontSizeEventData, TextAlignEventData, LineHeightEventData, MeshAtlasEventData, BlendModeEventData, UVEventData, MaterialEventData } from "../controls/types";
import { anchorToScreenPreset, castTextureInfo, convertBlendModeToThreeJS, convertThreeJSBlendingToBlendMode, generateAtlasOptions, generateMaterialOptions, generateTextureOptions, getChangedInfo, getDraggedInfo, pivotToScreenPreset, screenPresetToAnchorValue, screenPresetToPivotValue, update_option } from "./helpers";


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
                { name: MeshProperty.TYPE, title: 'Тип', type: PropertyType.STRING, readonly: true },
                { name: MeshProperty.NAME, title: 'Название', type: PropertyType.STRING, onSave: saveName, onUpdate: updateName },
                // { name: ObjectProperty.VISIBLE, title: 'Видимый', type: PropertyType.BOOLEAN, onSave: saveVisible, onUpdate: updateVisible },
                { name: MeshProperty.ACTIVE, title: 'Активный', type: PropertyType.BOOLEAN, onSave: saveActive, onUpdate: updateActive }
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
                    onSave: savePosition,
                    onUpdate: updatePosition,
                    onRefresh: refreshPosition
                },
                {
                    name: MeshProperty.ROTATION, title: 'Вращение', type: PropertyType.VECTOR_3, params: {
                        x: { format: (v: number) => v.toFixed(2) },
                        y: { format: (v: number) => v.toFixed(2) },
                        z: { format: (v: number) => v.toFixed(2) }
                    },
                    onSave: saveRotation,
                    onUpdate: updateRotation,
                    onRefresh: refreshRotation
                },
                {
                    name: MeshProperty.SCALE, title: 'Маштаб', type: PropertyType.VECTOR_2, params: {
                        x: { format: (v: number) => v.toFixed(2) },
                        y: { format: (v: number) => v.toFixed(2) },
                    },
                    onSave: saveScale,
                    onUpdate: updateScale,
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
                    onSave: savePivot,
                    onUpdate: updatePivot,
                    onRefresh: refreshPivot
                },
                {
                    name: MeshProperty.SIZE, title: 'Размер', type: PropertyType.VECTOR_2, params: {
                        x: { min: 0, max: 0xFFFFFFFF, step: 1, format: (v: number) => v.toFixed(2) },
                        y: { min: 0, max: 0xFFFFFFFF, step: 1, format: (v: number) => v.toFixed(2) },
                    },
                    onSave: saveSize,
                    onUpdate: updateSize,
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
                    onSave: saveAnchor,
                    onUpdate: updateAnchor,
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
                    onSave: (info: BeforeChangeInfo) => saveAnchorPreset(info),
                    onUpdate: updateAnchorPreset,
                    onRefresh: refreshAnchorPreset
                }
            ]
        },
        {
            name: 'graphics',
            title: 'Визуал',
            property_list: [
                { name: MeshProperty.COLOR, title: 'Цвет', type: PropertyType.COLOR, onSave: saveColor, onUpdate: updateColor },
                {
                    name: MeshProperty.ALPHA,
                    title: 'Alpha',
                    type: PropertyType.SLIDER,
                    params: {
                        min: 0,
                        max: 1,
                        step: 0.01
                    },
                    onSave: (info: BeforeChangeInfo) => saveAlpha(info),
                    onUpdate: updateAlpha
                },
                { name: MeshProperty.ATLAS, title: 'Атлас', type: PropertyType.LIST_TEXT, params: generateAtlasOptions(), onSave: saveAtlas, onUpdate: updateAtlas },
                {
                    name: MeshProperty.TEXTURE, title: 'Текстура', type: PropertyType.LIST_TEXTURES, params: generateTextureOptions(),
                    onSave: saveTexture,
                    onUpdate: updateTexture,
                },
                {
                    name: MeshProperty.MATERIAL, title: 'Материал', type: PropertyType.LIST_TEXT, params: generateMaterialOptions(),
                    onSave: saveMaterial,
                    onUpdate: updateMaterial
                },
                {
                    name: MeshProperty.MATERIAL_BUTTON,
                    title: 'Настроить материал',
                    type: PropertyType.BUTTON
                },
                {
                    name: MeshProperty.SLICE9, title: 'Slice9', type: PropertyType.POINT_2D, params: {
                        x: { min: 0, max: 100, format: (v: number) => v.toFixed(2) },
                        y: { min: 0, max: 100, format: (v: number) => v.toFixed(2) }
                    },
                    onSave: saveSlice,
                    onUpdate: updateSlice,
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
                    onSave: saveBlendMode,
                    onUpdate: updateBlendMode
                },
            ]
        },
        {
            name: 'flip',
            title: 'Отражение',
            property_list: [
                { name: MeshProperty.FLIP_VERTICAL, title: 'По вертикали', type: PropertyType.BOOLEAN, onSave: saveUV, onUpdate: updateFlipVertical, onRefresh: refreshFlipVertical },
                { name: MeshProperty.FLIP_HORIZONTAL, title: 'По горизонтали', type: PropertyType.BOOLEAN, onSave: saveUV, onUpdate: updateFlipHorizontal, onRefresh: refreshFlipHorizontal },
                { name: MeshProperty.FLIP_DIAGONAL, title: 'По диагонали', type: PropertyType.BOOLEAN, onSave: saveUV, onUpdate: updateFlipDiagonal, onRefresh: refreshFlipDiagonal }
            ]
        },
        {
            name: 'text',
            title: 'Текст',
            property_list: [
                { name: MeshProperty.TEXT, title: 'Текст', type: PropertyType.STRING, onSave: saveText, onUpdate: updateText },
                {
                    name: MeshProperty.FONT, title: 'Шрифт', type: PropertyType.LIST_TEXT, params: ResourceManager.get_all_fonts(),
                    onSave: saveFont,
                    onUpdate: updateFont
                },
                {
                    name: MeshProperty.FONT_SIZE, title: 'Размер шрифта', type: PropertyType.NUMBER, params: {
                        min: 8, step: 1, format: (v: number) => v.toFixed(0)
                    },
                    onSave: saveFontSize,
                    onUpdate: updateFontSize,
                    onRefresh: refreshFontSize
                },
                {
                    name: MeshProperty.TEXT_ALIGN, title: 'Выравнивание', type: PropertyType.LIST_TEXT, params: {
                        'Центр': TextAlign.CENTER,
                        'Слева': TextAlign.LEFT,
                        'Справа': TextAlign.RIGHT,
                        'По ширине': TextAlign.JUSTIFY
                    },
                    onSave: saveTextAlign,
                    onUpdate: updateTextAlign
                },
                {
                    name: MeshProperty.LINE_HEIGHT, title: 'Высота строки', type: PropertyType.NUMBER, params: {
                        min: 0.5, max: 3, step: 0.1, format: (v: number) => v.toFixed(2)
                    },
                    onSave: saveLineHeight,
                    onUpdate: updateLineHeight
                }
            ]
        }
    ];

    let _selected_meshes: IBaseMeshAndThree[] = [];

    function init() {
        subscribe();
    }

    function subscribe() {
        EventBus.on('SYS_SELECTED_MESH_LIST', (e) => {
            set_selected_meshes(e.list);
        });

        EventBus.on('SYS_UNSELECTED_MESH_LIST', () => {
            Inspector.clear();
        });
    }

    function set_selected_meshes(list: IBaseMeshAndThree[]) {
        _selected_meshes = list;
        const data = list.map((value) => {
            const fields = [];

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
                    fields.push({ name: MeshProperty.COLOR, data: value.get_color() });
                    fields.push({ name: MeshProperty.ALPHA, data: (value as Slice9Mesh).get_alpha() });

                    const atlas = (value as Slice9Mesh).get_texture()[1];
                    const texture = (value as Slice9Mesh).get_texture()[0];

                    // NOTE: обновляем конфиг атласов
                    update_option(_config, MeshProperty.ATLAS, generateAtlasOptions);

                    // NOTE: обновляем конфиг текстур только для выбранного атласа
                    update_option(_config, MeshProperty.TEXTURE, () => {
                        const list: any[] = [];
                        ResourceManager.get_all_textures().forEach((info) => {
                            if (info.atlas != atlas) {
                                return;
                            }
                            list.push(castTextureInfo(info));
                        });
                        return list;
                    });

                    // NOTE: обновляем конфиг материалов
                    update_option(_config, MeshProperty.MATERIAL, generateMaterialOptions);

                    fields.push({ name: MeshProperty.ATLAS, data: atlas });
                    fields.push({ name: MeshProperty.TEXTURE, data: texture });

                    fields.push({ name: MeshProperty.MATERIAL, data: (value as Slice9Mesh).get_material().name || '' });
                    fields.push({
                        name: MeshProperty.MATERIAL_BUTTON, data: () => {
                            MeshMaterialInspector.set_selected_mesh_material([(value as Slice9Mesh).get_material()]);
                        }
                    });

                    fields.push({ name: MeshProperty.BLEND_MODE, data: convertThreeJSBlendingToBlendMode((value as Slice9Mesh).material.blending) });
                    fields.push({ name: MeshProperty.SLICE9, data: (value as Slice9Mesh).get_slice() });

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
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if (mesh == undefined) {
            Log.error('[refreshPosition] Mesh not found for id:', ids);
            return;
        }

        return mesh.get_position();
    }

    function refreshRotation(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if (mesh == undefined) {
            Log.error('[refreshRotation] Mesh not found for id:', ids);
            return;
        }

        const raw = mesh.rotation;
        return new Vector3(radToDeg(raw.x), radToDeg(raw.y), radToDeg(raw.z));
    }

    function refreshScale(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if (mesh == undefined) {
            Log.error('[refreshScale] Mesh not found for id:', ids);
            return;
        }

        return mesh.get_scale();
    }

    function refreshSize(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if (mesh == undefined) {
            Log.error('[refreshSize] Mesh not found for id:', ids);
            return;
        }

        return mesh.get_size();
    }

    function refreshPivot(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if (mesh == undefined) {
            Log.error('[refreshPivot] Mesh not found for id:', ids);
            return;
        }

        return pivotToScreenPreset(mesh.get_pivot());
    }

    function refreshAnchor(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if (mesh == undefined) {
            Log.error('[refreshAnchor] Mesh not found for id:', ids);
            return;
        }

        return mesh.get_anchor();
    }

    function refreshAnchorPreset(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if (mesh == undefined) {
            Log.error('[refreshAnchorPreset] Mesh not found for id:', ids);
            return;
        }

        return anchorToScreenPreset(mesh.get_anchor());
    }

    function refreshSlice9(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if (mesh == undefined) {
            Log.error('[refreshSlice9] Mesh not found for id:', ids);
            return;
        }

        return (mesh as Slice9Mesh).get_slice();
    }

    function refreshFontSize(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if (mesh == undefined) {
            Log.error('[refreshFontSize] Mesh not found for id:', ids);
            return;
        }

        const delta = new Vector3(1 * mesh.scale.x, 1 * mesh.scale.y);
        const max_delta = Math.max(delta.x, delta.y);
        return (mesh as TextMesh).fontSize * max_delta;
    }

    function refreshFlipVertical(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if (mesh == undefined) {
            Log.error('[refreshFlipVertical] Mesh not found for id:', ids);
            return;
        }

        return (mesh as GoSprite).get_flip() == FlipMode.VERTICAL;
    }

    function refreshFlipHorizontal(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if (mesh == undefined) {
            Log.error('[refreshFlipHorizontal] Mesh not found for id:', ids);
            return;
        }

        return (mesh as GoSprite).get_flip() == FlipMode.HORIZONTAL;
    }

    function refreshFlipDiagonal(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if (mesh == undefined) {
            Log.error('[refreshFlipDiagonal] Mesh not found for id:', ids);
            return;
        }

        return (mesh as GoSprite).get_flip() == FlipMode.DIAGONAL;
    }

    function saveName(info: BeforeChangeInfo) {
        const names: NameEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[saveName] Mesh not found for id:', id);
                return;
            }

            names.push({ id_mesh: id, name: mesh.name });
        });

        HistoryControl.add('MESH_NAME', names);
    }

    function updateName(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[updateName] Mesh not found for id:', id);
                return;
            }

            mesh.name = info.data.event.value as string;
            ControlManager.update_graph();
        });
    }

    function getChildrenActive(list: any[], state: boolean) {
        let result: ActiveEventData[] = [];

        list.forEach((item: any) => {
            result.push({ id_mesh: item.mesh_data.id, state: item.get_active() });
            if (item.children.length > 0) {
                const children = getChildrenActive(item.children, state);
                if (children.length > 0) result.push(...children);
            }
        });
        return result;
    }

    function saveActive(info: BeforeChangeInfo) {
        const actives: ActiveEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[saveActive] Mesh not found for id:', id);
                return;
            }

            actives.push({ id_mesh: id, state: mesh.get_active() });

            if (mesh.children.length > 0) {
                const children = getChildrenActive(mesh.children, mesh.get_active());
                if (children.length > 0) actives.push(...children);
            }

        });

        HistoryControl.add('MESH_ACTIVE', actives);
    }

    function updateChildrenActive(children: any[], state: boolean) {
        const result: { id: number, visible: boolean }[] = [];
        children.forEach((child: any) => {
            child.set_active(state);
            result.push({ id: child.mesh_data.id, visible: child.get_visible() });
            if (child.children.length > 0) {
                const children = updateChildrenActive(child.children, state);
                if (children.length > 0) result.push(...children);
            }
        });
        return result;
    }

    function updateActive(info: ChangeInfo) {
        const ids: { id: number, visible: boolean }[] = [];
        const state = info.data.event.value as boolean;
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[updateActive] Mesh not found for id:', id);
                return;
            }

            mesh.set_active(state);
            ids.push({ id, visible: mesh.get_visible() });
            if (mesh.children) {
                const children = updateChildrenActive(mesh.children, state);
                if (children.length > 0) ids.push(...children);
            }
        });

        EventBus.trigger("SYS_GRAPH_ACTIVE", { list: ids, state });
    }

    // function saveVisible(ids: number[]) {
    //     const visibles: VisibleEventData[] = [];
    //     ids.forEach((id) => {
    //         const mesh = _selected_meshes.find((item) => {
    //             return item.mesh_data.id == id;
    //         });

    //         if (mesh == undefined) {
    //             Log.error('[saveVisible] Mesh not found for id:', id);
    //             return;
    //         }

    //         visibles.push({ id_mesh: id, state: mesh.get_visible() });
    //     });

    //     HistoryControl.add('MESH_VISIBLE', visibles);
    // }

    // function updateVisible(info: ChangeInfo) {
    //     const state = info.data.event.value as boolean;

    //     info.ids.forEach((id) => {
    //         const mesh = _selected_meshes.find((item) => {
    //             return item.mesh_data.id == id;
    //         });

    //         if (mesh == undefined) {
    //             Log.error('[updateVisible] Mesh not found for id:', id);
    //             return;
    //         }

    //         mesh.set_visible(state);
    //     });

    //     EventBus.trigger("SYS_GRAPH_VISIBLE", {list: info.ids, state});
    // }

    function savePosition(info: BeforeChangeInfo) {
        const oldPositions: PositionEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[savePosition] Mesh not found for id:', id);
                return;
            }

            oldPositions.push({ id_mesh: mesh.mesh_data.id, position: deepClone(mesh.position) });
        });

        HistoryControl.add("MESH_TRANSLATE", oldPositions);
    }

    function updatePosition(info: ChangeInfo) {
        const [isDraggedX, isDraggedY, isDraggedZ] = getDraggedInfo(info);
        const [isChangedX, isChangedY, isChangedZ] = getChangedInfo(info);

        const pos = info.data.event.value as Vector3;

        const averagePoint = new Vector3();
        averagePoint.copy(pos);

        // NOTE: вычесляем среднее значение позиции между всеми обьектами
        if (isDraggedX || isDraggedY || isDraggedZ) {
            const sum = new Vector3(0, 0, 0);
            info.ids.forEach((id) => {
                const mesh = _selected_meshes.find((item) => {
                    return item.mesh_data.id == id;
                });

                if (mesh == undefined) {
                    Log.error('[updatePosition] Mesh not found for id:', id);
                    return;
                }

                sum.add(mesh.get_position());
            });

            averagePoint.copy(sum.divideScalar(info.ids.length));
        }

        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[updatePosition] Mesh not found for id:', id);
                return;
            }

            /* NOTE: высчитываем разницу среднего значения позиции и измененного значения в инспекторе
                     (оно уже там стоит в среднем значени, ставиться на этапе сравнения осей в векторах) */
            const x = isDraggedX ? mesh.get_position().x + (pos.x - averagePoint.x) : isChangedX ? pos.x : mesh.get_position().x;
            const y = isDraggedY ? mesh.get_position().y + (pos.y - averagePoint.y) : isChangedY ? pos.y : mesh.get_position().y;
            const z = isDraggedZ ? mesh.get_position().z + (pos.z - averagePoint.z) : isChangedZ ? pos.z : mesh.get_position().z;

            mesh.set_position(x, y, z);
        });

        TransformControl.set_proxy_in_average_point(_selected_meshes);
        SizeControl.draw();
    }

    function saveRotation(info: BeforeChangeInfo) {
        const oldRotations: RotationEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[saveRotation] Mesh not found for id:', id);
                return;
            }

            oldRotations.push({ id_mesh: id, rotation: deepClone(mesh.rotation) });
        });

        HistoryControl.add("MESH_ROTATE", oldRotations);
    }

    function updateRotation(info: ChangeInfo) {
        const [isChangedX, isChangedY, isChangedZ] = getChangedInfo(info);

        const rawRot = info.data.event.value as Vector3;
        const rot = new Vector3(degToRad(rawRot.x), degToRad(rawRot.y), degToRad(rawRot.z));

        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[updateRotation] Mesh not found for id:', id);
                return;
            }

            const x = isChangedX ? rot.x : mesh.rotation.x;
            const y = isChangedY ? rot.y : mesh.rotation.y;
            const z = isChangedZ ? rot.z : mesh.rotation.z;

            mesh.rotation.set(x, y, z);
            mesh.transform_changed();
        });

        TransformControl.set_proxy_in_average_point(_selected_meshes);
        SizeControl.draw();
    }

    function saveScale(info: BeforeChangeInfo) {
        const oldScales: ScaleEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[saveScale] Mesh not found for id:', id);
                return;
            }

            oldScales.push({ id_mesh: id, scale: deepClone(mesh.scale) });
        });

        HistoryControl.add("MESH_SCALE", oldScales);
    }

    function updateScale(info: ChangeInfo) {
        const [isChangedX, isChangedY] = getChangedInfo(info);

        const scale = info.data.event.value as Vector3;

        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[updateScale] Mesh not found for id:', id);
                return;
            }

            const x = isChangedX ? scale.x : mesh.get_scale().x;
            const y = isChangedY ? scale.y : mesh.get_scale().y;

            mesh.scale.set(x, y, 1);
            mesh.transform_changed();

            // если это текстовы меш, то от скейла зависит размер шрифта
            if ((mesh as TextMesh).fontSize) {
                const delta = new Vector3(1 * scale.x, 1 * scale.y, scale.z);
                const max_delta = Math.max(delta.x, delta.y);

                (mesh as TextMesh).fontSize * max_delta;
            }
        });

        TransformControl.set_proxy_in_average_point(_selected_meshes);
        SizeControl.draw();

        // для обновления размера шрифта
        Inspector.refresh([MeshProperty.FONT_SIZE]);
    }

    function saveSize(info: BeforeChangeInfo) {
        const oldSizes: SizeEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[saveSize] Mesh not found for id:', id);
                return;
            }

            oldSizes.push({ id_mesh: id, position: mesh.get_position(), size: mesh.get_size() });
        });

        HistoryControl.add('MESH_SIZE', oldSizes);
    }

    function updateSize(info: ChangeInfo) {
        const [isDraggedX, isDraggedY] = getDraggedInfo(info);
        const [isChangedX, isChangedY] = getChangedInfo(info);

        const size = info.data.event.value as Vector2;

        const averageSize = new Vector2();
        averageSize.copy(size);

        if (isDraggedX || isDraggedY) {
            const sum = new Vector2(0, 0);
            info.ids.forEach((id) => {
                const mesh = _selected_meshes.find((item) => {
                    return item.mesh_data.id == id;
                });

                if (mesh == undefined) {
                    Log.error('[updateSize] Mesh not found for id:', id);
                    return;
                }

                sum.add(mesh.get_size());
            });

            averageSize.copy(sum.divideScalar(info.ids.length));
        }

        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[updateSize] Mesh not found for id:', id);
                return;
            }

            const x = isDraggedX ? mesh.get_size().x + (size.x - averageSize.x) : isChangedX ? size.x : mesh.get_size().x;
            const y = isDraggedY ? mesh.get_size().y + (size.y - averageSize.y) : isChangedY ? size.y : mesh.get_size().y;

            mesh.set_size(x, y);
        });

        SizeControl.draw();
    }

    function savePivot(info: BeforeChangeInfo) {
        const pivots: PivotEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[savePivot] Mesh not found for id:', id);
                return;
            }

            pivots.push({ id_mesh: id, pivot: mesh.get_pivot() });
        });

        HistoryControl.add('MESH_PIVOT', pivots);
    }

    function updatePivot(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[updatePivot] Mesh not found for id:', id);
                return;
            }

            const pivot_preset = info.data.event.value as ScreenPointPreset;
            const pivot = screenPresetToPivotValue(pivot_preset);
            mesh.set_pivot(pivot.x, pivot.y, true);
        });

        SizeControl.draw();
    }

    function saveAnchor(info: BeforeChangeInfo) {
        const anchors: AnchorEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[saveAnchor] Mesh not found for id:', id);
                return;
            }

            anchors.push({ id_mesh: id, anchor: mesh.get_anchor() });
        });

        HistoryControl.add('MESH_ANCHOR', anchors);
    }

    function updateAnchor(info: ChangeInfo) {
        const [isChangedX, isChangedY] = getChangedInfo(info);

        const anchor = info.data.event.value as Vector2;

        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[updateAnchor] Mesh not found for id:', id);
                return;
            }

            const x = isChangedX ? anchor.x : mesh.get_anchor().x;
            const y = isChangedY ? anchor.y : mesh.get_anchor().y;

            mesh.set_anchor(x, y);
        });

        SizeControl.draw();

        if (info.data.event.last) {
            Inspector.refresh([MeshProperty.ANCHOR_PRESET]);
        }

        Inspector.refresh([MeshProperty.ANCHOR]);
    }

    function saveAnchorPreset(info: BeforeChangeInfo) {
        const anchors: AnchorEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[saveAnchorPreset] Mesh not found for id:', id);
                return;
            }

            anchors.push({ id_mesh: id, anchor: mesh.get_anchor() });
        });

        HistoryControl.add('MESH_ANCHOR', anchors);
    }

    function updateAnchorPreset(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[updateAnchorPreset] Mesh not found for id:', id);
                return;
            }

            const anchor = screenPresetToAnchorValue(info.data.event.value as ScreenPointPreset);
            if (anchor) {
                mesh.set_anchor(anchor.x, anchor.y);
            }
        });

        SizeControl.draw();
        Inspector.refresh([MeshProperty.ANCHOR]);
    }

    function saveColor(info: BeforeChangeInfo) {
        const colors: ColorEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[saveColor] Mesh not found for id:', id);
                return;
            }

            colors.push({ id_mesh: id, color: mesh.get_color() });
        });

        HistoryControl.add('MESH_COLOR', colors);
    }

    function updateColor(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[updateColor] Mesh not found for id:', id);
                return;
            }

            const color = info.data.event.value as string;
            mesh.set_color(color);
        });
    }

    function saveAlpha(info: BeforeChangeInfo) {
        const alphas: AlphaEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[saveAlpha] Mesh not found for id:', id);
                return;
            }

            if (mesh.type === IObjectTypes.TEXT || mesh.type === IObjectTypes.GUI_TEXT || mesh.type === IObjectTypes.GO_LABEL_COMPONENT) {
                alphas.push({ id_mesh: id, alpha: deepClone((mesh as TextMesh).fillOpacity) });
            } else if (mesh.type === IObjectTypes.SLICE9_PLANE || mesh.type === IObjectTypes.GUI_BOX || mesh.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                alphas.push({ id_mesh: id, alpha: deepClone((mesh as Slice9Mesh).get_alpha()) });
            }
        });

        HistoryControl.add('MESH_ALPHA', alphas);
    }

    function updateAlpha(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[updateAlpha] Mesh not found for id:', id);
                return;
            }

            const alpha = info.data.event.value as number;
            if (mesh.type === IObjectTypes.TEXT || mesh.type === IObjectTypes.GUI_TEXT || mesh.type === IObjectTypes.GO_LABEL_COMPONENT) {
                (mesh as TextMesh).fillOpacity = alpha;
            } else if (mesh.type === IObjectTypes.SLICE9_PLANE || mesh.type === IObjectTypes.GUI_BOX || mesh.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                (mesh as Slice9Mesh).set_alpha(alpha);
            }
        });
    }

    function saveTexture(info: BeforeChangeInfo) {
        const textures: TextureEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[saveTexture] Mesh not found for id:', id);
                return;
            }

            const texture = mesh.get_texture()[0];
            textures.push({ id_mesh: id, texture });
        });

        HistoryControl.add('MESH_TEXTURE', textures);
    }

    function updateTexture(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[updateTexture] Mesh not found for id:', id);
                return;
            }

            if (info.data.event.value) {
                const atlas = (mesh as Slice9Mesh).get_texture()[1];
                const texture = info.data.event.value as string;
                (mesh as Slice9Mesh).set_texture(texture, atlas);
            } else (mesh as Slice9Mesh).set_texture('');
        });
    }

    function saveSlice(info: BeforeChangeInfo) {
        const slices: SliceEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[saveSlice] Mesh not found for id:', id);
                return;
            }

            slices.push({ id_mesh: id, slice: (mesh as Slice9Mesh).get_slice() });
        });

        HistoryControl.add('MESH_SLICE', slices);
    }

    function updateSlice(info: ChangeInfo) {
        const [isChangedX, isChangedY] = getChangedInfo(info);

        const slice = info.data.event.value as Vector2;

        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[updateSlice] Mesh not found for id:', id);
                return;
            }

            const x = isChangedX ? slice.x : (mesh as Slice9Mesh).get_slice().x;
            const y = isChangedY ? slice.y : (mesh as Slice9Mesh).get_slice().y;

            (mesh as Slice9Mesh).set_slice(x, y);
        });
    }

    function saveText(info: BeforeChangeInfo) {
        const texts: TextEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[saveText] Mesh not found for id:', id);
                return;
            }

            texts.push({ id_mesh: id, text: deepClone((mesh as TextMesh).text) });
        });

        HistoryControl.add('MESH_TEXT', texts);
    }

    function updateText(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[updateText] Mesh not found for id:', id);
                return;
            }

            const text = info.data.event.value as string;
            (mesh as TextMesh).text = text;
        });
    }

    function saveFont(info: BeforeChangeInfo) {
        const fonts: FontEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[saveFont] Mesh not found for id:', id);
                return;
            }

            const oldFont = deepClone((mesh as TextMesh).font);
            fonts.push({ id_mesh: id, font: oldFont ? oldFont : '' });
        });

        HistoryControl.add('MESH_FONT', fonts);
    }

    function updateFont(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[updateFont] Mesh not found for id:', id);
                return;
            }

            const font = info.data.event.value as string;
            (mesh as TextMesh).font = font;
        });
    }

    function saveFontSize(info: BeforeChangeInfo) {
        const fontSizes: FontSizeEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[saveFontSize] Mesh not found for id:', id);
                return;
            }

            const oldScale = mesh.get_scale();
            fontSizes.push({ id_mesh: id, scale: new Vector3(oldScale.x, oldScale.y, 1) });
        });

        HistoryControl.add('MESH_FONT_SIZE', fontSizes);
    }

    function updateFontSize(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[updateFontSize] Mesh not found for id:', id);
                return;
            }

            const font_size = info.data.event.value as number;
            const delta = font_size / (mesh as TextMesh).fontSize;

            mesh.scale.set(1 * delta, 1 * delta, mesh.scale.z);
            mesh.transform_changed();
        });

        TransformControl.set_proxy_in_average_point(_selected_meshes);
        SizeControl.draw();
        Inspector.refresh([MeshProperty.SCALE]);
    }

    function saveTextAlign(info: BeforeChangeInfo) {
        const textAligns: TextAlignEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });
            if (mesh == undefined) {
                Log.error('[saveTextAlign] Mesh not found for id:', id);
                return;
            }

            textAligns.push({ id_mesh: id, text_align: deepClone((mesh as TextMesh).textAlign) });
        });

        HistoryControl.add('MESH_TEXT_ALIGN', textAligns);
    }

    function updateTextAlign(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });
            if (mesh == undefined) {
                Log.error('[updateTextAlign] Mesh not found for id:', id);
                return;
            }

            const text_align = info.data.event.value as any;
            (mesh as TextMesh).textAlign = text_align;
        });
    }

    function saveLineHeight(info: BeforeChangeInfo) {
        const lineHeights: LineHeightEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });
            if (mesh == undefined) {
                Log.error('[saveLineHeight] Mesh not found for id:', id);
                return;
            }

            lineHeights.push({ id_mesh: id, line_height: deepClone((mesh as TextMesh).lineHeight) });
        });

        HistoryControl.add('MESH_LINE_HEIGHT', lineHeights);
    }

    function updateLineHeight(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });
            if (mesh == undefined) {
                Log.error('[updateLineHeight] Mesh not found for id:', id);
                return;
            }

            const line_height = info.data.event.value as number;
            (mesh as TextMesh).lineHeight = line_height;
        });
    }

    function saveAtlas(info: BeforeChangeInfo) {
        const atlases: MeshAtlasEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[saveAtlas] Mesh not found for id:', id);
                return;
            }

            const atlas = mesh.get_texture()[1];
            const texture = mesh.get_texture()[0];
            atlases.push({ id_mesh: id, atlas, texture });
        });

        HistoryControl.add('MESH_ATLAS', atlases);
    }

    function updateAtlas(info: ChangeInfo) {
        const atlas = info.data.event.value as string;
        let texture = '';
        for (const item of ResourceManager.get_all_textures()) {
            if (item.atlas == atlas) {
                texture = item.name;
                break;
            }
        }
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[updateAtlas] Mesh not found for id:', id);
                return;
            }

            (mesh as Slice9Mesh).set_texture(texture, atlas);
        });

        // NOTE: на следующем кадре обновляем список выбранных мешей чтобы обновились опции текстур
        // моментально обновить не можем так как мы сейчас в событии обновления поля которое под копотом делает dispose
        // поэтому очистить инспектор и собрать поля занаво можно будет только после обновления поля
        setTimeout(() => set_selected_meshes(_selected_meshes));
    }

    function saveBlendMode(info: BeforeChangeInfo) {
        const blendModes: BlendModeEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[saveBlendMode] Mesh not found for id:', id);
                return;
            }

            blendModes.push({
                id_mesh: id,
                blend_mode: (mesh as any).material.blending
            });
        });

        HistoryControl.add('MESH_BLEND_MODE', blendModes);
    }

    function updateBlendMode(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[updateBlendMode] Mesh not found for id:', id);
                return;
            }

            const blend_mode = info.data.event.value as BlendMode;
            const threeBlendMode = convertBlendModeToThreeJS(blend_mode);
            (mesh as any).material.blending = threeBlendMode;
        });
    }

    function saveMaterial(info: BeforeChangeInfo) {
        const materials: MaterialEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[saveMaterial] Mesh not found for id:', id);
                return;
            }

            const material_name = (mesh as Slice9Mesh).get_material().name;
            materials.push({ id_mesh: id, material_name });
        });

        HistoryControl.add('MESH_MATERIAL', materials);
    }

    function updateMaterial(info: ChangeInfo) {
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[updateMaterial] Mesh not found for id:', id);
                return;
            }

            const material_name = info.data.event.value as string;
            (mesh as Slice9Mesh).set_material(material_name);
        });

        Inspector.refresh([MeshProperty.ATLAS, MeshProperty.TEXTURE]);
    }

    function saveUV(info: BeforeChangeInfo) {
        const uvs: UVEventData[] = [];
        info.ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[saveUV] Mesh not found for id:', id);
                return;
            }

            if (mesh.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                const sprite = mesh as GoSprite;
                uvs.push({
                    id_mesh: id,
                    uv: sprite.get_uv()
                });
            }
        });

        HistoryControl.add('MESH_UV', uvs);
    }

    function updateFlipVertical(info: ChangeInfo) {
        _selected_meshes.forEach((item) => {
            if (item.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                const sprite = item as GoSprite;
                sprite.set_flip(FlipMode.NONE);
                if (info.data.event.value) {
                    sprite.set_flip(FlipMode.VERTICAL);
                }
            }
        });

        Inspector.refresh([MeshProperty.FLIP_DIAGONAL, MeshProperty.FLIP_HORIZONTAL]);
    }

    function updateFlipHorizontal(info: ChangeInfo) {
        _selected_meshes.forEach((item) => {
            if (item.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                const sprite = item as GoSprite;
                sprite.set_flip(FlipMode.NONE);
                if (info.data.event.value) {
                    sprite.set_flip(FlipMode.HORIZONTAL);
                }
            }
        });

        Inspector.refresh([MeshProperty.FLIP_DIAGONAL, MeshProperty.FLIP_VERTICAL]);
    }

    function updateFlipDiagonal(info: ChangeInfo) {
        _selected_meshes.forEach((item) => {
            if (item.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                const sprite = item as GoSprite;
                sprite.set_flip(FlipMode.NONE);
                if (info.data.event.value) {
                    sprite.set_flip(FlipMode.DIAGONAL);
                }
            }
        });

        Inspector.refresh([MeshProperty.FLIP_VERTICAL, MeshProperty.FLIP_HORIZONTAL]);
    }

    init();
    return {};
}