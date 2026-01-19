// Интерфейс для объектов с наследуемой альфой

/**
 * Интерфейс для GUI элементов с поддержкой наследования alpha
 */
export interface IAlphaInheritable {
    get_raw_alpha(): number;
    get_alpha(): number;
    set_alpha(value: number): void;
    isInheredAlpha(): boolean;
    setInheredAlpha(value: boolean): void;
}

/**
 * Проверяет, является ли объект наследуемым по alpha
 */
export function is_alpha_inheritable(obj: unknown): obj is IAlphaInheritable {
    return obj !== null &&
           typeof obj === 'object' &&
           'get_raw_alpha' in obj &&
           'isInheredAlpha' in obj;
}
