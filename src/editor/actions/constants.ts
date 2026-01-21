/**
 * Actions Constants - константы для сервиса действий
 */

import { ObjectTypes } from '@editor/core/render/types';

/** GUI типы объектов */
export const GUI_TYPES = [
    ObjectTypes.GUI_CONTAINER,
    ObjectTypes.GUI_BOX,
    ObjectTypes.GUI_TEXT,
] as const;

/** GO типы объектов */
export const GO_TYPES = [
    ObjectTypes.GO_CONTAINER,
    ObjectTypes.GO_SPRITE_COMPONENT,
    ObjectTypes.GO_LABEL_COMPONENT,
    ObjectTypes.GO_MODEL_COMPONENT,
    ObjectTypes.GO_ANIMATED_MODEL_COMPONENT,
    ObjectTypes.GO_AUDIO_COMPONENT,
] as const;

export type GuiObjectType = typeof GUI_TYPES[number];
export type GoObjectType = typeof GO_TYPES[number];
