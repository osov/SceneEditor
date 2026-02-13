// Общие утилиты: math, popup

import { Services } from '@editor/core';

export function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}

export function rand_int(a: number, b: number) {
    return math.random(a, b);
}

export function rand_float(a: number, b: number) {
    const mul = 1000;
    return rand_int(a * mul, b * mul) / mul;
}

export function error_popup(message: string) {
    Services.popups.open({
        type: "Notify",
        params: { title: "Ошибка", text: message, button: "Ok", auto_close: true },
        callback: () => { }
    });
}
