/**
 * Component Parser - парсинг компонентов GO для Defold
 */

import { Vector3, Vector4 } from 'three';
import {
    ExtDependenceType,
    type IExtDependencies,
    type ILabel,
    type ISound,
    type ISpineModel,
    type ISprite,
} from '../convert_types';
import {
    encodeSprite,
    encodeLabel,
    encodeSound,
    encodeSpineModel,
    encodePrototype,
    encodeCollectionProxy,
    encodeCollectionFactory,
    encodeFactory,
    type IDefoldSprite,
    type IDefoldLabel,
    type IDefoldSpineModel,
    type IDefoldEmbeddedComponent,
    type IDefoldGo,
    DefoldSizeMode,
    DefoldBlendMode,
    DefoldPivot,
} from '../defold_encoder';
import { eulerToQuaternion } from '../../../modules/utils';
import { castColor } from './utils';

/** Конвертировать Sprite в DefoldSprite */
export function castSprite2DefoldSprite(data: ISprite): IDefoldSprite {
    return {
        textures: {
            sampler: 'texture_sampler',
            texture: data.atlas
        },
        default_animation: data.texture,
        size_mode: DefoldSizeMode.SIZE_MODE_MANUAL,
        size: new Vector3(data.width, data.height),
        slice9: new Vector4(data.slice_width, data.slice_height, data.slice_width, data.slice_height)
    };
}

/** Конвертировать Label в DefoldLabel */
export function castLabel2DefoldLabel(data: ILabel): IDefoldLabel {
    return {
        text: data.text,
        font: data.font.split('.')[0] + '.font',
        size: new Vector4(data.width, data.height),
        scale: new Vector4(data.scale.x, data.scale.y, data.scale.z),
        color: data.color ? castColor(data.color) : new Vector3(1, 1, 1),
        outline: data.outline ? castColor(data.outline) : new Vector3(1, 1, 1),
        shadow: data.shadow ? castColor(data.shadow) : new Vector3(1, 1, 1),
        leading: data.leading,
        tracking: 0,
        pivot: DefoldPivot.PIVOT_CENTER,
        blend_mode: DefoldBlendMode.BLEND_MODE_ALPHA,
        line_break: data.line_break,
        material: '/builtins/fonts/label-df.material'
    };
}

/** Конвертировать SpineModel в DefoldSpineModel */
export function castSpineModel2DefoldSpineModel(data: ISpineModel): IDefoldSpineModel {
    return {
        spine_scene: data.spine_scene,
        default_animation: data.default_animation,
        skin: data.skin
    };
}

/** Конвертировать Sprite в EmbeddedComponent */
export function castSprite2DefoldEmbeddedComponent(sprite: ISprite): IDefoldEmbeddedComponent {
    return {
        id: sprite.name,
        position: sprite.position,
        rotation: eulerToQuaternion(sprite.rotation),
        scale: sprite.scale,
        type: 'sprite',
        data: encodeSprite(castSprite2DefoldSprite(sprite))
    };
}

/** Конвертировать Label в EmbeddedComponent */
export function castLabel2DefoldEmbeddedComponent(label: ILabel): IDefoldEmbeddedComponent {
    return {
        id: label.name,
        position: label.position,
        rotation: eulerToQuaternion(label.rotation),
        scale: label.scale,
        type: 'label',
        data: encodeLabel(castLabel2DefoldLabel(label))
    };
}

/** Конвертировать SpineModel в EmbeddedComponent */
export function castSpineModel2DefoldEmbeddedComponent(spine_model: ISpineModel): IDefoldEmbeddedComponent {
    return {
        id: spine_model.name,
        position: spine_model.position,
        rotation: eulerToQuaternion(spine_model.rotation),
        scale: spine_model.scale,
        type: 'spinemodel',
        data: encodeSpineModel(castSpineModel2DefoldSpineModel(spine_model))
    };
}

/** Конвертировать Sound в EmbeddedComponent */
export function castSound2DefoldEmbeddedComponent(data: ISound): IDefoldEmbeddedComponent {
    return {
        id: data.name,
        position: new Vector3(),
        rotation: new Vector4(),
        type: 'sound',
        data: encodeSound({
            sound: data.path,
            looping: data.loop ? 1 : 0,
            group: data.group,
            gain: data.gain,
            pan: data.pan,
            speed: data.speed
        })
    };
}

/** Конвертировать Sound в DefoldGo */
export function castSound2DefoldGoSound(data: ISound): IDefoldGo {
    return {
        id: data.name,
        position: new Vector3(),
        rotation: new Vector4(),
        scale3: new Vector3(1, 1, 1),
        data: encodePrototype({
            embedded_components: [castSound2DefoldEmbeddedComponent(data)]
        })
    };
}

/** Конвертировать ExtDependencies в EmbeddedComponent */
export function castExtDependencies2DefoldEmbeddedComponent(data: IExtDependencies): IDefoldEmbeddedComponent {
    const component = {
        id: data.name,
        position: new Vector3(),
        rotation: new Vector4(),
        type: '',
        data: ''
    };

    switch (data.type) {
        case ExtDependenceType.COLLECTION_PROXY:
            component.type = 'collectionproxy';
            component.data = encodeCollectionProxy({
                collection: data.path.split('.')[0] + '.collection'
            });
            break;
        case ExtDependenceType.COLLECTION_FACTORY:
            component.type = 'collectionfactory';
            component.data = encodeCollectionFactory({
                prototype: data.path.split('.')[0] + '.collection'
            });
            break;
        case ExtDependenceType.GO_FACTORY:
            component.type = 'factory';
            component.data = encodeFactory({
                prototype: data.path.split('.')[0] + '.go'
            });
            break;
    }

    return component;
}

/** Конвертировать IExtDependence в DefoldGo для CollectionProxy */
export function castIExtDependence2DefoldGoCollectionProxy(data: IExtDependencies): IDefoldGo {
    return {
        id: data.name,
        position: new Vector3(),
        rotation: new Vector4(),
        scale3: new Vector3(1, 1, 1),
        data: encodePrototype({
            embedded_components: [castExtDependencies2DefoldEmbeddedComponent(data)]
        })
    };
}

/** Конвертировать IExtDependence в DefoldGo для CollectionFactory */
export function castIExtDependence2DefoldGoCollectionFactory(data: IExtDependencies): IDefoldGo {
    return {
        id: data.name,
        position: new Vector3(),
        rotation: new Vector4(),
        scale3: new Vector3(1, 1, 1),
        data: encodePrototype({
            embedded_components: [castExtDependencies2DefoldEmbeddedComponent(data)]
        })
    };
}

/** Конвертировать IExtDependence в DefoldGo для Factory */
export function castIExtDependence2DefoldGoFactory(data: IExtDependencies): IDefoldGo {
    return {
        id: data.name,
        position: new Vector3(),
        rotation: new Vector4(),
        scale3: new Vector3(1, 1, 1),
        data: encodePrototype({
            embedded_components: [castExtDependencies2DefoldEmbeddedComponent(data)]
        })
    };
}
