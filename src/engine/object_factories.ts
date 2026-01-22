/**
 * Фабрики объектов сцены
 *
 * Каждая фабрика отвечает за создание конкретного типа объекта.
 */

import { ObjectTypes } from '@editor/core/render/types';
import type { ISceneObject } from './types';
import type { IObjectFactory, IObjectRegistry } from './object_registry';

// Импорты классов объектов
import { Slice9Mesh } from '@editor/render_engine/objects/slice9';
import { TextMesh } from '@editor/render_engine/objects/text';
import { GoContainer, GoSprite, GoText, GuiBox, GuiContainer, GuiText } from '@editor/render_engine/objects/sub_types';
import { AnimatedMesh } from '@editor/render_engine/objects/animated_mesh';
import { EntityBase } from '@editor/render_engine/objects/entity_base';
import { Component } from '@editor/render_engine/components/container_component';
import { Model } from '@editor/render_engine/objects/model';
import { AudioMesh } from '@editor/render_engine/objects/audio_mesh';

/** Размер по умолчанию для объектов */
const DEFAULT_SIZE = 10;

// === Базовые фабрики ===

function create_entity_factory(): IObjectFactory {
    return {
        create(id: number, _params: Record<string, unknown>): ISceneObject {
            return new EntityBase(id) as unknown as ISceneObject;
        }
    };
}

function create_slice9_factory(): IObjectFactory {
    return {
        create(id: number, params: Record<string, unknown>): ISceneObject {
            return new Slice9Mesh(
                id,
                (params.width as number) || DEFAULT_SIZE,
                (params.height as number) || DEFAULT_SIZE,
                (params.slice_width as number) || 0,
                (params.slice_height as number) || 0
            ) as unknown as ISceneObject;
        }
    };
}

function create_text_factory(): IObjectFactory {
    return {
        create(id: number, params: Record<string, unknown>): ISceneObject {
            return new TextMesh(
                id,
                (params.text as string) || '',
                (params.width as number) || DEFAULT_SIZE,
                (params.height as number) || DEFAULT_SIZE
            ) as unknown as ISceneObject;
        }
    };
}

// === GUI фабрики ===

function create_gui_container_factory(): IObjectFactory {
    return {
        create(id: number, _params: Record<string, unknown>): ISceneObject {
            return new GuiContainer(id) as unknown as ISceneObject;
        }
    };
}

function create_gui_box_factory(): IObjectFactory {
    return {
        create(id: number, params: Record<string, unknown>): ISceneObject {
            return new GuiBox(
                id,
                (params.width as number) || DEFAULT_SIZE,
                (params.height as number) || DEFAULT_SIZE,
                (params.slice_width as number) || 0,
                (params.slice_height as number) || 0
            ) as unknown as ISceneObject;
        }
    };
}

function create_gui_text_factory(): IObjectFactory {
    return {
        create(id: number, params: Record<string, unknown>): ISceneObject {
            return new GuiText(
                id,
                (params.text as string) || '',
                (params.width as number) || DEFAULT_SIZE,
                (params.height as number) || DEFAULT_SIZE
            ) as unknown as ISceneObject;
        }
    };
}

// === GO фабрики ===

function create_go_container_factory(): IObjectFactory {
    return {
        create(id: number, _params: Record<string, unknown>): ISceneObject {
            return new GoContainer(id) as unknown as ISceneObject;
        }
    };
}

function create_go_sprite_factory(): IObjectFactory {
    return {
        create(id: number, params: Record<string, unknown>): ISceneObject {
            return new GoSprite(
                id,
                (params.width as number) || DEFAULT_SIZE,
                (params.height as number) || DEFAULT_SIZE,
                (params.slice_width as number) || 0,
                (params.slice_height as number) || 0
            ) as unknown as ISceneObject;
        }
    };
}

function create_go_label_factory(): IObjectFactory {
    return {
        create(id: number, params: Record<string, unknown>): ISceneObject {
            return new GoText(
                id,
                (params.text as string) || '',
                (params.width as number) || DEFAULT_SIZE,
                (params.height as number) || DEFAULT_SIZE
            ) as unknown as ISceneObject;
        }
    };
}

function create_model_factory(): IObjectFactory {
    return {
        create(id: number, params: Record<string, unknown>): ISceneObject {
            return new Model(
                id,
                (params.width as number) || DEFAULT_SIZE,
                (params.height as number) || DEFAULT_SIZE
            ) as unknown as ISceneObject;
        }
    };
}

function create_animated_mesh_factory(): IObjectFactory {
    return {
        create(id: number, params: Record<string, unknown>): ISceneObject {
            return new AnimatedMesh(
                id,
                (params.width as number) || DEFAULT_SIZE,
                (params.height as number) || DEFAULT_SIZE
            ) as unknown as ISceneObject;
        }
    };
}

function create_audio_factory(): IObjectFactory {
    return {
        create(id: number, _params: Record<string, unknown>): ISceneObject {
            return new AudioMesh(id) as unknown as ISceneObject;
        }
    };
}

function create_component_factory(): IObjectFactory {
    return {
        create(id: number, params: Record<string, unknown>): ISceneObject {
            return new Component(id, (params.type as number) || 0) as unknown as ISceneObject;
        }
    };
}

/**
 * Регистрирует все стандартные фабрики объектов
 */
export function register_default_factories(registry: IObjectRegistry): void {
    // Базовые типы
    registry.register(ObjectTypes.ENTITY, create_entity_factory());
    registry.register(ObjectTypes.EMPTY, create_entity_factory());
    registry.register(ObjectTypes.SLICE9_PLANE, create_slice9_factory());
    registry.register(ObjectTypes.TEXT, create_text_factory());

    // GUI типы
    registry.register(ObjectTypes.GUI_CONTAINER, create_gui_container_factory());
    registry.register(ObjectTypes.GUI_BOX, create_gui_box_factory());
    registry.register(ObjectTypes.GUI_TEXT, create_gui_text_factory());

    // GO типы
    registry.register(ObjectTypes.GO_CONTAINER, create_go_container_factory());
    registry.register(ObjectTypes.GO_SPRITE_COMPONENT, create_go_sprite_factory());
    registry.register(ObjectTypes.GO_LABEL_COMPONENT, create_go_label_factory());
    registry.register(ObjectTypes.GO_MODEL_COMPONENT, create_model_factory());
    registry.register(ObjectTypes.GO_ANIMATED_MODEL_COMPONENT, create_animated_mesh_factory());
    registry.register(ObjectTypes.GO_AUDIO_COMPONENT, create_audio_factory());

    // Компоненты
    registry.register(ObjectTypes.COMPONENT, create_component_factory());
}
