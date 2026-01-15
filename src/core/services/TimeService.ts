/**
 * Сервис времени
 *
 * Предоставляет функции для работы со временем:
 * - Текущее время в секундах и миллисекундах
 * - Измерение производительности
 */

/** Интерфейс сервиса времени */
export interface ITimeService {
    /** Текущее время в секундах (с дробной частью) */
    now(): number;
    /** Текущее время в миллисекундах (целое число) */
    now_ms(): number;
    /** Алиас для now() - время в секундах с миллисекундной точностью */
    now_with_ms(): number;
    /** Алиас для now_ms() - время в миллисекундах */
    now_int(): number;
}

/** Параметры создания сервиса */
interface TimeServiceParams {
    // Пока без параметров, но структура для расширения
}

/**
 * Создать сервис времени
 */
export function create_time_service(_params: TimeServiceParams = {}): ITimeService {
    function now(): number {
        return Date.now() / 1000;
    }

    function now_ms(): number {
        return Date.now();
    }

    function now_with_ms(): number {
        return Date.now() / 1000;
    }

    function now_int(): number {
        return Date.now();
    }

    return {
        now,
        now_ms,
        now_with_ms,
        now_int,
    };
}
