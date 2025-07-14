import { TextureInfo } from "../render_engine/resource_manager";
import { ChangeInfo } from "../modules_editor/Inspector";
import { BlendMode, ScreenPointPreset } from "./MeshInspector";
import { AdditiveBlending, Blending, LinearFilter, MultiplyBlending, NearestFilter, NormalBlending, SubtractiveBlending, Vector2, RepeatWrapping, ClampToEdgeWrapping, MirroredRepeatWrapping } from "three";
import { FilterMode, WrappingMode } from "./AssetInspector";

export function getChangedInfo(info: ChangeInfo) {
    let isChangedX = false;
    let isChangedY = false;
    let isChangedZ = false;
    let isChangedW = false;

    // NOTE: варинат как получить какие либо значения из tweakpane не переписывая половину либы
    const valueController = info.data.event.target.controller.labelController.valueController as any;

    // NOTE: для 2D пикера
    const picker = valueController.pickerC_;
    if (picker && picker.is_changed) {
        isChangedX = true;
        isChangedY = true;
        return [isChangedX, isChangedY];
    }

    // NOTE: учитываем что если Point2D то NumberTextController-ы будут в textC_.acs_, а если 3D/4D то сразу в acs_ 
    const acs = !valueController.acs_ ? valueController.textC_.acs_ : valueController.acs_;
    acs.forEach((ac: any, index: number) => {
        if (!ac.is_changed) return;
        switch (index) {
            case 0: isChangedX = true; break;
            case 1: isChangedY = true; break;
            case 2: isChangedZ = true; break;
            case 3: isChangedW = true; break;
        }
    });

    return [isChangedX, isChangedY, isChangedZ, isChangedW];
}

export function getDraggedInfo(info: ChangeInfo) {
    let isDraggedX = false;
    let isDraggedY = false;
    let isDraggedZ = false;
    let isDraggedW = false;

    // NOTE: варинат как получить какие либо значения из tweakpane не переписывая половину либы
    // учитываем что если Point2D то NumberTextController-ы будут в textC_.acs_, а если 3D/4D то сразу в acs_ 
    const valueController = info.data.event.target.controller.labelController.valueController as any;
    const acs = !valueController.acs_ ? valueController.textC_.acs_ : valueController.acs_;
    acs.forEach((ac: any, index: number) => {
        if (!ac.is_drag) return;
        switch (index) {
            case 0: isDraggedX = true; break;
            case 1: isDraggedY = true; break;
            case 2: isDraggedZ = true; break;
            case 3: isDraggedW = true; break;
        }
    });

    return [isDraggedX, isDraggedY, isDraggedZ, isDraggedW];
}

export function generateTextureOptions(with_atlas = false) {
    return ResourceManager.get_all_textures().map((info) => castTextureInfo(info, with_atlas));
}

export function castTextureInfo(info: TextureInfo, with_atlas = false) {
    const data = {
        value: with_atlas ? info.atlas + '/' + info.name : info.name,
        path: (info.data.texture as any).path ?? '',
        src: info.data.texture.image.src ?? ''
    } as any;

    if (info.atlas != '') {
        const sizeX = info.data.texture.image.width;
        const sizeY = info.data.texture.image.height;

        data.offset = {
            posX: -(sizeX * info.data.uvOffset.x),
            posY: -(sizeY - (sizeY * info.data.uvOffset.y)),
            width: info.data.size.x,
            height: info.data.size.y,
            sizeX,
            sizeY
        };

        if (info.data.size.x > info.data.size.y) {
            // по ширине
            if (info.data.size.x > 40) {
                const delta = info.data.size.x / 40;
                data.offset.posX /= delta;
                data.offset.posY /= delta;
                data.offset.width = 40;
                data.offset.height = info.data.size.y / delta;
                data.offset.sizeX = sizeX / delta;
                data.offset.sizeY = sizeY / delta;
            }
        } else {
            // по высоте
            if (info.data.size.y > 40) {
                const delta = info.data.size.y / 40;
                data.offset.posX /= delta;
                data.offset.posY /= delta;
                data.offset.width = info.data.size.x / delta;
                data.offset.height = 40;
                data.offset.sizeX = sizeX / delta;
                data.offset.sizeY = sizeY / delta;
            }
        }

        data.offset.posY += data.offset.height;
    }

    return data;
}

export function generateAtlasOptions() {
    const data: { [key in string]: string } = {};
    ResourceManager.get_all_atlases().forEach((atlas) => {
        return data[atlas == '' ? 'Без атласа' : atlas] = atlas;
    });
    return data;
}

export function generateMaterialOptions() {
    const materialOptions: { [key: string]: string } = {};
    ResourceManager.get_all_materials().sort().forEach(material => {
        materialOptions[material] = material;
    });
    return materialOptions;
}

export function generateModelOptions() {
    const modelOptions: { [key: string]: string } = {};
    ResourceManager.get_all_models().forEach(model => {
        modelOptions[model] = model;
    });
    return modelOptions;
}

export function generateModelAnimationOptions(model_name: string) {
    const animationOptions: { [key: string]: string } = {};
    ResourceManager.get_all_model_animations(model_name).forEach(animation => {
        animationOptions[animation] = animation;
    });
    return animationOptions;
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

export function convertBlendModeToThreeJS(blend_mode: BlendMode): Blending {
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

export function convertThreeJSBlendingToBlendMode(blending: number): BlendMode {
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

export function convertFilterModeToThreeJS(filter_mode: FilterMode): number {
    switch (filter_mode) {
        case FilterMode.NEAREST:
            return NearestFilter;
        case FilterMode.LINEAR:
            return LinearFilter;
        default:
            return LinearFilter;
    }
}

export function convertThreeJSFilterToFilterMode(filter: number): FilterMode {
    switch (filter) {
        case NearestFilter:
            return FilterMode.NEAREST;
        case LinearFilter:
            return FilterMode.LINEAR;
        default:
            return FilterMode.LINEAR;
    }
}

export function generateVertexProgramOptions() {
    const vertex_options: { [key: string]: string } = {};
    const vertex_programs = ResourceManager.get_all_vertex_programs();
    vertex_programs.forEach((program) => {
        vertex_options[program] = program;
    });
    return vertex_options;
}

export function generateFragmentProgramOptions() {
    const fragment_options: { [key: string]: string } = {};
    const fragment_programs = ResourceManager.get_all_fragment_programs();
    fragment_programs.forEach((program) => {
        fragment_options[program] = program;
    });
    return fragment_options;
}

export function convertWrappingModeToThreeJS(wrapping_mode: WrappingMode): number {
    switch (wrapping_mode) {
        case WrappingMode.REPEAT:
            return RepeatWrapping;
        case WrappingMode.CLAMP:
            return ClampToEdgeWrapping;
        case WrappingMode.MIRROR:
            return MirroredRepeatWrapping;
        default:
            return RepeatWrapping;
    }
}

export function convertThreeJSWrappingToWrappingMode(wrapping: number): WrappingMode {
    switch (wrapping) {
        case RepeatWrapping:
            return WrappingMode.REPEAT;
        case ClampToEdgeWrapping:
            return WrappingMode.CLAMP;
        case MirroredRepeatWrapping:
            return WrappingMode.MIRROR;
        default:
            return WrappingMode.REPEAT;
    }
}