// Модуль встроенных шейдеров

export { SLICE9_VERTEX_SHADER } from './slice9.vert';
export { SLICE9_FRAGMENT_SHADER } from './slice9.frag';

import { SLICE9_VERTEX_SHADER } from './slice9.vert';
import { SLICE9_FRAGMENT_SHADER } from './slice9.frag';

/**
 * Встроенный шейдер для slice9
 * Вынесен из slice9.ts для избежания циклических зависимостей
 */
export const slice9_shader = {
    vertexShader: SLICE9_VERTEX_SHADER,
    fragmentShader: SLICE9_FRAGMENT_SHADER
};
