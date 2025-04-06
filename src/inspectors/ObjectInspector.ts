import { AdditiveBlending, MultiplyBlending, NormalBlending, SubtractiveBlending, Vector2, Vector3 } from "three";
import { degToRad, radToDeg } from "three/src/math/MathUtils";
import { Slice9Mesh } from "../render_engine/objects/slice9";
import { GoSprite, FlipMode } from "../render_engine/objects/sub_types";
import { TextMesh } from "../render_engine/objects/text";
import { IBaseMeshAndThree, IObjectTypes } from "../render_engine/types";
import { ChangeInfo, InspectorGroup, PropertyType, castTextureInfo, generateTextureOptions, getChangedInfo, getDraggedInfo, update_option } from "../modules_editor/Inspector";
import { deepClone } from "../modules/utils";
import { NameEventData, ActiveEventData, VisibleEventData, PositionEventData, RotationEventData, ScaleEventData, SizeEventData, PivotEventData, AnchorEventData, ColorEventData, AlphaEventData, TextureEventData, SliceEventData, TextEventData, FontEventData, FontSizeEventData, TextAlignEventData, LineHeightEventData, MeshAtlasEventData, BlendModeEventData, UVEventData, MaterialEventData } from "../controls/types";

declare global {
    const ObjectInspector: ReturnType<typeof ObjectInspectorCreate>;
}

export function register_object_inspector() {
    (window as any).ObjectInspector = ObjectInspectorCreate();
}


export enum ObjectProperty {
    ID = 'id',
    TYPE = 'type',
    NAME = 'name',
    VISIBLE = 'visible',
    ACTIVE = 'active',
    POSITION = 'position',
    ROTATION = 'rotation',
    SCALE = 'scale',
    SIZE = 'size',
    PIVOT = 'pivot',
    ANCHOR = 'anchor',
    ANCHOR_PRESET = 'anchor_preset',
    COLOR = 'color',
    ALPHA = 'alpha',
    TEXTURE = 'texture',
    SLICE9 = 'slice9',
    TEXT = 'text',
    FONT = 'font',
    FONT_SIZE = 'font_size',
    TEXT_ALIGN = 'text_align',
    ATLAS = 'atlas',
    LINE_HEIGHT = 'line_height',
    BLEND_MODE = 'blend_mode',
    FLIP_VERTICAL = 'flip_vertical',
    FLIP_HORIZONTAL = 'flip_horizontal',
    FLIP_DIAGONAL = 'flip_diagonal',
    MATERIAL = 'material',
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


function ObjectInspectorCreate() {
    const _config: InspectorGroup[] = [
        {
            name: 'base',
            title: '',
            property_list: [
                { name: ObjectProperty.TYPE, title: 'Тип', type: PropertyType.STRING, readonly: true },
                { name: ObjectProperty.NAME, title: 'Название', type: PropertyType.STRING, onSave: saveName, onUpdate: updateName },
                // { name: ObjectProperty.VISIBLE, title: 'Видимый', type: PropertyType.BOOLEAN, onSave: saveVisible, onUpdate: updateVisible },
                { name: ObjectProperty.ACTIVE, title: 'Активный', type: PropertyType.BOOLEAN, onSave: saveActive, onUpdate: updateActive }
            ]
        },
        {
            name: 'transform',
            title: 'Трансформ',
            property_list: [
                {
                    name: ObjectProperty.POSITION, title: 'Позиция', type: PropertyType.VECTOR_3, params: {
                        x: { format: (v: number) => v.toFixed(2), step: 0.1 },
                        y: { format: (v: number) => v.toFixed(2), step: 0.1 },
                        z: { format: (v: number) => v.toFixed(2), step: 0.1 },
                    },
                    onSave: savePosition,
                    onUpdate: updatePosition,
                    onRefresh: refreshPosition
                },
                {
                    name: ObjectProperty.ROTATION, title: 'Вращение', type: PropertyType.VECTOR_3, params: {
                        x: { format: (v: number) => v.toFixed(2) },
                        y: { format: (v: number) => v.toFixed(2) },
                        z: { format: (v: number) => v.toFixed(2) }
                    },
                    onSave: saveRotation,
                    onUpdate: updateRotation,
                    onRefresh: refreshRotation
                },
                {
                    name: ObjectProperty.SCALE, title: 'Маштаб', type: PropertyType.VECTOR_2, params: {
                        x: { format: (v: number) => v.toFixed(2) },
                        y: { format: (v: number) => v.toFixed(2) },
                    },
                    onSave: saveScale,
                    onUpdate: updateScale,
                    onRefresh: refreshScale
                },
                {
                    name: ObjectProperty.PIVOT, title: 'Точка опоры', type: PropertyType.LIST_TEXT, params: {
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
                    name: ObjectProperty.SIZE, title: 'Размер', type: PropertyType.VECTOR_2, params: {
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
                    name: ObjectProperty.ANCHOR, title: 'Значение', type: PropertyType.POINT_2D, params: {
                        x: { min: -1, max: 1, format: (v: number) => v.toFixed(2) },
                        y: { min: -1, max: 1, format: (v: number) => v.toFixed(2) }
                    },
                    onSave: saveAnchor,
                    onUpdate: updateAnchor,
                    onRefresh: refreshAnchor
                },
                {
                    name: ObjectProperty.ANCHOR_PRESET, title: 'Пресет', type: PropertyType.LIST_TEXT, params: {
                        'Не выбрано': ScreenPointPreset.NONE,
                        'Центр': ScreenPointPreset.CENTER,
                        'Левый Верхний': ScreenPointPreset.TOP_LEFT,
                        'Центр Сверху': ScreenPointPreset.TOP_CENTER,
                        'Правый Верхний': ScreenPointPreset.TOP_RIGHT,
                        'Центр Слева': ScreenPointPreset.LEFT_CENTER,
                        'Центр Справа': ScreenPointPreset.RIGHT_CENTER,
                        'Левый Нижний': ScreenPointPreset.BOTTOM_LEFT,
                        'Центр Снизу': ScreenPointPreset.BOTTOM_CENTER,
                        'Правый Нижний': ScreenPointPreset.BOTTOM_RIGHT,
                        'Индивидуальный': ScreenPointPreset.CUSTOM
                    },
                    onSave: saveAnchorPreset,
                    onUpdate: updateAnchorPreset,
                    onRefresh: refreshAnchorPreset
                }
            ]
        },
        {
            name: 'graphics',
            title: 'Визуал',
            property_list: [
                { name: ObjectProperty.COLOR, title: 'Цвет', type: PropertyType.COLOR, onSave: saveColor, onUpdate: updateColor },
                { name: ObjectProperty.ALPHA, title: 'Прозрачность', type: PropertyType.NUMBER, params: { min: 0, max: 1, step: 0.1 }, onSave: saveAlpha, onUpdate: updateAlpha },
                { name: ObjectProperty.ATLAS, title: 'Атлас', type: PropertyType.LIST_TEXT, params: generateAtlasOptions(), onSave: saveAtlas, onUpdate: updateAtlas },
                {
                    name: ObjectProperty.TEXTURE, title: 'Текстура', type: PropertyType.LIST_TEXTURES, params: generateTextureOptions(),
                    onSave: saveTexture,
                    onUpdate: updateTexture,
                },
                {
                    name: ObjectProperty.MATERIAL, title: 'Материал', type: PropertyType.LIST_TEXT, params: generateMaterialOptions(),
                    onSave: saveMaterial,
                    onUpdate: updateMaterial
                },
                {
                    name: ObjectProperty.SLICE9, title: 'Slice9', type: PropertyType.POINT_2D, params: {
                        x: { min: 0, max: 100, format: (v: number) => v.toFixed(2) },
                        y: { min: 0, max: 100, format: (v: number) => v.toFixed(2) }
                    },
                    onSave: saveSlice,
                    onUpdate: updateSlice,
                    onRefresh: refreshSlice9
                },
                {
                    name: ObjectProperty.BLEND_MODE, title: 'Режим смешивания', type: PropertyType.LIST_TEXT, params: {
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
                { name: ObjectProperty.FLIP_VERTICAL, title: 'По вертикали', type: PropertyType.BOOLEAN, onSave: saveUV, onUpdate: updateFlipVertical, onRefresh: refreshFlipVertical },
                { name: ObjectProperty.FLIP_HORIZONTAL, title: 'По горизонтали', type: PropertyType.BOOLEAN, onSave: saveUV, onUpdate: updateFlipHorizontal, onRefresh: refreshFlipHorizontal },
                { name: ObjectProperty.FLIP_DIAGONAL, title: 'По диагонали', type: PropertyType.BOOLEAN, onSave: saveUV, onUpdate: updateFlipDiagonal, onRefresh: refreshFlipDiagonal }
            ]
        },
        {
            name: 'text',
            title: 'Текст',
            property_list: [
                { name: ObjectProperty.TEXT, title: 'Текст', type: PropertyType.LOG_DATA, onSave: saveText, onUpdate: updateText },
                {
                    name: ObjectProperty.FONT, title: 'Шрифт', type: PropertyType.LIST_TEXT, params: ResourceManager.get_all_fonts(),
                    onSave: saveFont,
                    onUpdate: updateFont
                },
                {
                    name: ObjectProperty.FONT_SIZE, title: 'Размер шрифта', type: PropertyType.NUMBER, params: {
                        min: 8, step: 1, format: (v: number) => v.toFixed(0)
                    },
                    onSave: saveFontSize,
                    onUpdate: updateFontSize,
                    onRefresh: refreshFontSize
                },
                {
                    name: ObjectProperty.TEXT_ALIGN, title: 'Выравнивание', type: PropertyType.LIST_TEXT, params: {
                        'Центр': TextAlign.CENTER,
                        'Слева': TextAlign.LEFT,
                        'Справа': TextAlign.RIGHT,
                        'По ширине': TextAlign.JUSTIFY
                    },
                    onSave: saveTextAlign,
                    onUpdate: updateTextAlign
                },
                {
                    name: ObjectProperty.LINE_HEIGHT, title: 'Высота строки', type: PropertyType.NUMBER, params: {
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

            fields.push({ name: ObjectProperty.TYPE, data: value.type });
            fields.push({ name: ObjectProperty.NAME, data: value.name });
            // fields.push({ name: ObjectProperty.VISIBLE, data: value.get_visible() });
            fields.push({ name: ObjectProperty.ACTIVE, data: value.get_active() });

            // NOTE: исключаем gui контейнер
            if (value.type != IObjectTypes.GUI_CONTAINER) {

                // NOTE: трансформация
                {
                    fields.push({ name: ObjectProperty.POSITION, data: value.get_position() });

                    const raw = value.rotation;
                    const rotation = new Vector3(radToDeg(raw.x), radToDeg(raw.y), radToDeg(raw.z));
                    fields.push({ name: ObjectProperty.ROTATION, data: rotation });

                    fields.push({ name: ObjectProperty.SCALE, data: value.get_scale() });
                }

                // NOTE: gui поля
                if ([IObjectTypes.GUI_BOX, IObjectTypes.GUI_TEXT].includes(value.type)) {
                    fields.push({ name: ObjectProperty.SIZE, data: value.get_size() });

                    const pivot_preset = pivotToScreenPreset(value.get_pivot());
                    fields.push({ name: ObjectProperty.PIVOT, data: pivot_preset });

                    const anchor_preset = anchorToScreenPreset(value.get_anchor());
                    fields.push({ name: ObjectProperty.ANCHOR_PRESET, data: anchor_preset });
                    fields.push({ name: ObjectProperty.ANCHOR, data: value.get_anchor() });
                } else if (IObjectTypes.GO_SPRITE_COMPONENT == value.type || IObjectTypes.GO_LABEL_COMPONENT == value.type) {
                    fields.push({ name: ObjectProperty.SIZE, data: value.get_size() });
                }

                // NOTE: визуальные поля
                if ([IObjectTypes.SLICE9_PLANE, IObjectTypes.GUI_BOX, IObjectTypes.GO_SPRITE_COMPONENT].includes(value.type)) {
                    fields.push({ name: ObjectProperty.COLOR, data: value.get_color() });
                    fields.push({ name: ObjectProperty.ALPHA, data: (value as Slice9Mesh).get_alpha() });

                    const atlas = (value as Slice9Mesh).get_texture()[1];
                    const texture = (value as Slice9Mesh).get_texture()[0];
                    
                    // NOTE: обновляем конфиг атласов
                    update_option(_config, ObjectProperty.ATLAS, generateAtlasOptions);

                    // NOTE: обновляем конфиг текстур только для выбранного атласа
                    update_option(_config, ObjectProperty.TEXTURE, () => {
                        const list: any[] = [];
                        ResourceManager.get_all_textures().forEach((info) => {
                            if(info.atlas != atlas) {
                                return;
                            }
                            list.push(castTextureInfo(info));
                        });
                        return list;
                    });

                    // NOTE: обновляем конфиг материалов
                    update_option(_config, ObjectProperty.MATERIAL, generateMaterialOptions);

                    fields.push({ name: ObjectProperty.ATLAS, data: atlas });
                    fields.push({ name: ObjectProperty.TEXTURE, data: texture });
                    fields.push({ name: ObjectProperty.MATERIAL, data: (value as Slice9Mesh).material.name || '' });
                    fields.push({ name: ObjectProperty.BLEND_MODE, data: convertThreeJSBlendingToBlendMode((value as Slice9Mesh).material.blending) });
                    fields.push({ name: ObjectProperty.SLICE9, data: (value as Slice9Mesh).get_slice() });

                    // NOTE: отражение только для спрайта
                    if (value.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                        const sprite = value as GoSprite;
                        const currentFlip = sprite.get_flip();

                        switch (currentFlip) {
                            case FlipMode.NONE:
                                fields.push({ name: ObjectProperty.FLIP_DIAGONAL, data: false });
                                fields.push({ name: ObjectProperty.FLIP_VERTICAL, data: false });
                                fields.push({ name: ObjectProperty.FLIP_HORIZONTAL, data: false });
                                break;
                            case FlipMode.VERTICAL:
                                fields.push({ name: ObjectProperty.FLIP_DIAGONAL, data: false });
                                fields.push({ name: ObjectProperty.FLIP_VERTICAL, data: true });
                                fields.push({ name: ObjectProperty.FLIP_HORIZONTAL, data: false });
                                break;
                            case FlipMode.HORIZONTAL:
                                fields.push({ name: ObjectProperty.FLIP_DIAGONAL, data: false });
                                fields.push({ name: ObjectProperty.FLIP_VERTICAL, data: false });
                                fields.push({ name: ObjectProperty.FLIP_HORIZONTAL, data: true });
                                break;
                            case FlipMode.DIAGONAL:
                                fields.push({ name: ObjectProperty.FLIP_DIAGONAL, data: true });
                                fields.push({ name: ObjectProperty.FLIP_VERTICAL, data: false });
                                fields.push({ name: ObjectProperty.FLIP_HORIZONTAL, data: false });
                                break;
                        }
                    }
                }

                // NOTE: обновляем конфиг шрифтов
                update_option(_config, ObjectProperty.FONT, ResourceManager.get_all_fonts);

                // NOTE: текстовые поля
                if ([IObjectTypes.TEXT, IObjectTypes.GUI_TEXT, IObjectTypes.GO_LABEL_COMPONENT].includes(value.type)) {
                    fields.push({ name: ObjectProperty.TEXT, data: (value as TextMesh).text });
                    fields.push({ name: ObjectProperty.FONT, data: (value as TextMesh).font || '' });
                    fields.push({ name: ObjectProperty.COLOR, data: value.get_color() });
                    fields.push({ name: ObjectProperty.ALPHA, data: (value as TextMesh).fillOpacity });

                    const delta = new Vector3(1 * value.scale.x, 1 * value.scale.y);
                    const max_delta = Math.max(delta.x, delta.y);
                    const font_size = (value as TextMesh).fontSize * max_delta;

                    fields.push({ name: ObjectProperty.FONT_SIZE, data: font_size });
                    fields.push({ name: ObjectProperty.TEXT_ALIGN, data: (value as TextMesh).textAlign });

                    const line_height = (value as TextMesh).lineHeight;
                    if (line_height == 'normal') fields.push({ name: ObjectProperty.LINE_HEIGHT, data: 1 });
                    else fields.push({ name: ObjectProperty.LINE_HEIGHT, data: line_height });
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

        if(mesh == undefined) {
            Log.error('[refreshPosition] Mesh not found for id:', ids);
            return;
        }

        return mesh.get_position();
    }

    function refreshRotation(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if(mesh == undefined) {
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

        if(mesh == undefined) {
            Log.error('[refreshScale] Mesh not found for id:', ids);
            return;
        }

        return mesh.get_scale();
    }

    function refreshSize(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if(mesh == undefined) {
            Log.error('[refreshSize] Mesh not found for id:', ids);
            return;
        }

        return mesh.get_size();
    }

    function refreshPivot(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if(mesh == undefined) {
            Log.error('[refreshPivot] Mesh not found for id:', ids);
            return;
        }

        return pivotToScreenPreset(mesh.get_pivot());
    }

    function refreshAnchor(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if(mesh == undefined) {
            Log.error('[refreshAnchor] Mesh not found for id:', ids);
            return;
        }

        return mesh.get_anchor();
    }

    function refreshAnchorPreset(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if(mesh == undefined) {
            Log.error('[refreshAnchorPreset] Mesh not found for id:', ids);
            return;
        }

        return anchorToScreenPreset(mesh.get_anchor());
    }

    function refreshSlice9(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if(mesh == undefined) {
            Log.error('[refreshSlice9] Mesh not found for id:', ids);
            return;
        }

        return (mesh as Slice9Mesh).get_slice();
    }

    function refreshFontSize(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if(mesh == undefined) {
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

        if(mesh == undefined) {
            Log.error('[refreshFlipVertical] Mesh not found for id:', ids);
            return;
        }

        return (mesh as GoSprite).get_flip() == FlipMode.VERTICAL;
    }

    function refreshFlipHorizontal(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if(mesh == undefined) {
            Log.error('[refreshFlipHorizontal] Mesh not found for id:', ids);
            return;
        }

        return (mesh as GoSprite).get_flip() == FlipMode.HORIZONTAL;
    }

    function refreshFlipDiagonal(ids: number[]) {
        const mesh = _selected_meshes.find((item) => {
            return ids.includes(item.mesh_data.id);
        });

        if(mesh == undefined) {
            Log.error('[refreshFlipDiagonal] Mesh not found for id:', ids);
            return;
        }

        return (mesh as GoSprite).get_flip() == FlipMode.DIAGONAL;
    }

    function saveName(ids: number[]) {
        const names: NameEventData[] = [];
        ids.forEach((id) => {
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

    function saveActive(ids: number[]) {
        const actives: ActiveEventData[] = [];
        ids.forEach((id) => {
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
            ids.push({id, visible: mesh.get_visible()});
            if (mesh.children) {
                const children = updateChildrenActive(mesh.children, state); 
                if (children.length > 0) ids.push(...children);
            }
        });

        EventBus.trigger("SYS_GRAPH_ACTIVE", {list: ids, state});
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

    function savePosition(ids: number[]) {
        const oldPositions: PositionEventData[] = [];
        ids.forEach((id) => {
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

    function saveRotation(ids: number[]) {
        const oldRotations: RotationEventData[] = [];
        ids.forEach((id) => {
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

    function saveScale(ids: number[]) {
        const oldScales: ScaleEventData[] = [];
        ids.forEach((id) => {
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
        Inspector.refresh([ObjectProperty.FONT_SIZE]);
    }

    function saveSize(ids: number[]) {
        const oldSizes: SizeEventData[] = [];
        ids.forEach((id) => {
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

    function savePivot(ids: number[]) {
        const pivots: PivotEventData[] = [];
        ids.forEach((id) => {
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

    function saveAnchor(ids: number[]) {
        const anchors: AnchorEventData[] = [];
        ids.forEach((id) => {
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
            Inspector.refresh([ObjectProperty.ANCHOR_PRESET]);
        }

        Inspector.refresh([ObjectProperty.ANCHOR]);
    }

    function saveAnchorPreset(ids: number[]) {
        const anchors: AnchorEventData[] = [];
        ids.forEach((id) => {
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
        Inspector.refresh([ObjectProperty.ANCHOR]);
    }

    function saveColor(ids: number[]) {
        const colors: ColorEventData[] = [];
        ids.forEach((id) => {
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

    function saveAlpha(ids: number[]) {
        const alphas: AlphaEventData[] = [];
        ids.forEach((id) => {
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

    function saveTexture(ids: number[]) {
        const textures: TextureEventData[] = [];
        ids.forEach((id) => {
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

    function saveSlice(ids: number[]) {
        const slices: SliceEventData[] = [];
        ids.forEach((id) => {
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

    function saveText(ids: number[]) {
        const texts: TextEventData[] = [];
        ids.forEach((id) => {
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

    function saveFont(ids: number[]) {
        const fonts: FontEventData[] = [];
        ids.forEach((id) => {
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

    function saveFontSize(ids: number[]) {
        const fontSizes: FontSizeEventData[] = [];
        ids.forEach((id) => {
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
        Inspector.refresh([ObjectProperty.SCALE]);
    }

    function saveTextAlign(ids: number[]) {
        const textAligns: TextAlignEventData[] = [];
        ids.forEach((id) => {
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

    function saveLineHeight(ids: number[]) {
        const lineHeights: LineHeightEventData[] = [];
        ids.forEach((id) => {
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

    function saveAtlas(ids: number[]) {
        const atlases: MeshAtlasEventData[] = [];
        ids.forEach((id) => {
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
        for(const item of ResourceManager.get_all_textures()) {
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

    function saveBlendMode(ids: number[]) {
        const blendModes: BlendModeEventData[] = [];
        ids.forEach((id) => {
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

    function saveMaterial(ids: number[]) {
        const materials: MaterialEventData[] = [];
        ids.forEach((id) => {
            const mesh = _selected_meshes.find((item) => {
                return item.mesh_data.id == id;
            });

            if (mesh == undefined) {
                Log.error('[saveMaterial] Mesh not found for id:', id);
                return;
            }

            materials.push({ id_mesh: id, material: (mesh as any).material.name });
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

            const material = info.data.event.value as string;
            (mesh as any).material = ResourceManager.get_material(material).data;
        });
    }

    function saveUV(ids: number[]) {
        const uvs: UVEventData[] = [];
        ids.forEach((id) => {
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
        saveUV(info.ids);
        _selected_meshes.forEach((item) => {
            if (item.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                const sprite = item as GoSprite;
                sprite.set_flip(FlipMode.NONE);
                if(info.data.event.value) { 
                    sprite.set_flip(FlipMode.VERTICAL);
                }
            }
        });

        Inspector.refresh([ObjectProperty.FLIP_DIAGONAL, ObjectProperty.FLIP_HORIZONTAL]);
    }

    function updateFlipHorizontal(info: ChangeInfo) {
        saveUV(info.ids);
        _selected_meshes.forEach((item) => {
            if (item.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                const sprite = item as GoSprite;
                sprite.set_flip(FlipMode.NONE);
                if(info.data.event.value) { 
                    sprite.set_flip(FlipMode.HORIZONTAL);
                }
            }
        });

        Inspector.refresh([ObjectProperty.FLIP_DIAGONAL, ObjectProperty.FLIP_VERTICAL]);
    }

    function updateFlipDiagonal(info: ChangeInfo) {
        saveUV(info.ids);
        _selected_meshes.forEach((item) => {
            if (item.type === IObjectTypes.GO_SPRITE_COMPONENT) {
                const sprite = item as GoSprite;
                sprite.set_flip(FlipMode.NONE);
                if(info.data.event.value) { 
                    sprite.set_flip(FlipMode.DIAGONAL);
                }
            }
        });

        Inspector.refresh([ObjectProperty.FLIP_VERTICAL, ObjectProperty.FLIP_HORIZONTAL]);
    }

    init();
    return {};
}

export function generateMaterialOptions() {
    const materialOptions: { [key: string]: string } = {};
    ResourceManager.get_all_materials().forEach(material => {
        materialOptions[material] = material;
    });
    return materialOptions;
}

export function generateAtlasOptions() {
    const data: {[key in string]: string} = {};
    ResourceManager.get_all_atlases().forEach((atlas) => {
        return data[atlas == '' ? 'Без атласа' : atlas] = atlas;
    });
    return data;
}

export function pivotToScreenPreset(pivot: Vector2) {
    if (pivot.x == 0.5 && pivot.y == 0.5) {
        return ScreenPointPreset.CENTER;
    } else if (pivot.x == 0 && pivot.y == 1) {
        return ScreenPointPreset.TOP_LEFT;
    } else if (pivot.x == 0.5 && pivot.y == 1) {
        return ScreenPointPreset.TOP_CENTER;
    } else if (pivot.x == 1 && pivot.y == 1) {
        return ScreenPointPreset.TOP_RIGHT;
    } else if (pivot.x == 0 && pivot.y == 0.5) {
        return ScreenPointPreset.LEFT_CENTER;
    } else if (pivot.x == 1 && pivot.y == 0.5) {
        return ScreenPointPreset.RIGHT_CENTER;
    } else if (pivot.x == 0 && pivot.y == 0) {
        return ScreenPointPreset.BOTTOM_LEFT;
    } else if (pivot.x == 0.5 && pivot.y == 0) {
        return ScreenPointPreset.BOTTOM_CENTER;
    } else if (pivot.x == 1 && pivot.y == 0) {
        return ScreenPointPreset.BOTTOM_RIGHT;
    }

    return ScreenPointPreset.CENTER;
}

export function screenPresetToPivotValue(preset: ScreenPointPreset) {
    switch (preset) {
        case ScreenPointPreset.CENTER: return new Vector2(0.5, 0.5);
        case ScreenPointPreset.TOP_LEFT: return new Vector2(0, 1);
        case ScreenPointPreset.TOP_CENTER: return new Vector2(0.5, 1);
        case ScreenPointPreset.TOP_RIGHT: return new Vector2(1, 1);
        case ScreenPointPreset.LEFT_CENTER: return new Vector2(0, 0.5);
        case ScreenPointPreset.RIGHT_CENTER: return new Vector2(1, 0.5);
        case ScreenPointPreset.BOTTOM_LEFT: return new Vector2(0, 0);
        case ScreenPointPreset.BOTTOM_CENTER: return new Vector2(0.5, 0);
        case ScreenPointPreset.BOTTOM_RIGHT: return new Vector2(1, 0);
        default: return new Vector2(0.5, 0.5);
    }
}

export function anchorToScreenPreset(anchor: Vector2) {
    if (anchor.x == 0.5 && anchor.y == 0.5) {
        return ScreenPointPreset.CENTER;
    } else if (anchor.x == 0 && anchor.y == 1) {
        return ScreenPointPreset.TOP_LEFT;
    } else if (anchor.x == 0.5 && anchor.y == 1) {
        return ScreenPointPreset.TOP_CENTER;
    } else if (anchor.x == 1 && anchor.y == 1) {
        return ScreenPointPreset.TOP_RIGHT;
    } else if (anchor.x == 0 && anchor.y == 0.5) {
        return ScreenPointPreset.LEFT_CENTER;
    } else if (anchor.x == 1 && anchor.y == 0.5) {
        return ScreenPointPreset.RIGHT_CENTER;
    } else if (anchor.x == 0 && anchor.y == 0) {
        return ScreenPointPreset.BOTTOM_LEFT;
    } else if (anchor.x == 0.5 && anchor.y == 0) {
        return ScreenPointPreset.BOTTOM_CENTER;
    } else if (anchor.x == 1 && anchor.y == 0) {
        return ScreenPointPreset.BOTTOM_RIGHT;
    } else if (anchor.x == -1 && anchor.y == -1) {
        return ScreenPointPreset.NONE;
    }

    return ScreenPointPreset.CUSTOM;
}

export function screenPresetToAnchorValue(preset: ScreenPointPreset) {
    switch (preset) {
        case ScreenPointPreset.CENTER: return new Vector2(0.5, 0.5);
        case ScreenPointPreset.TOP_LEFT: return new Vector2(0, 1);
        case ScreenPointPreset.TOP_CENTER: return new Vector2(0.5, 1);
        case ScreenPointPreset.TOP_RIGHT: return new Vector2(1, 1);
        case ScreenPointPreset.LEFT_CENTER: return new Vector2(0, 0.5);
        case ScreenPointPreset.RIGHT_CENTER: return new Vector2(1, 0.5);
        case ScreenPointPreset.BOTTOM_LEFT: return new Vector2(0, 0);
        case ScreenPointPreset.BOTTOM_CENTER: return new Vector2(0.5, 0);
        case ScreenPointPreset.BOTTOM_RIGHT: return new Vector2(1, 0);
        case ScreenPointPreset.NONE: return new Vector2(-1, -1);
        default: return new Vector2(0.5, 0.5);
    }
}

function convertBlendModeToThreeJS(blend_mode: BlendMode): number {
    switch (blend_mode) {
        case BlendMode.NORMAL:
            return NormalBlending;
        case BlendMode.ADD:
            return AdditiveBlending;
        case BlendMode.MULTIPLY:
            return MultiplyBlending;
        case BlendMode.SUBTRACT:
            return SubtractiveBlending;
        // case BlendMode.CUSTOM:
        //     return CustomBlending;
        default:
            return NormalBlending;
    }
}

function convertThreeJSBlendingToBlendMode(blending: number): BlendMode {
    switch (blending) {
        case NormalBlending:
            return BlendMode.NORMAL;
        case AdditiveBlending:
            return BlendMode.ADD;
        case MultiplyBlending:
            return BlendMode.MULTIPLY;
        case SubtractiveBlending:
            return BlendMode.SUBTRACT;
        default:
            return BlendMode.NORMAL;
    }
}