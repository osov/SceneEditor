declare global {
    namespace math {
        export function ceil(x: number): number;
        export function pow(x: number, y: number): number;
        export function abs(x: number): number;
        export function cos(x: number): number;
        export function sin(x: number): number;
        export function rad(x: number): number;
        export function random(m: number, n: number): number;
        export function floor(x: number): number;
        export function sqrt(x: number): number;
        export function tan(x: number): number;
        export function asin(x: number): number;
        export function acos(x: number): number;
        export function atan(x: number): number;
        export function atan2(y: number, x: number): number;
        export function deg(x: number): number;
        export function min(...x: number[]): number;
        export function max(...x: number[]): number;
        export function sign(x: number): number;
        export function pi(): number;
    }
}

export function math_module() {
    function ceil(x: number) {
        return Math.ceil(x);
    }

    function pow(x: number, y: number) {
        return Math.pow(x, y);
    }

    function abs(x: number) {
        return Math.abs(x);
    }

    function cos(x: number) {
        return Math.cos(x);
    }

    function sin(x: number) {
        return Math.sin(x);
    }

    function rad(x: number) {
        return Math.PI * x / 180;
    }

    function random(m: number = 0, n: number = 1) {
        const minCeiled = Math.ceil(m);
        const maxFloored = Math.floor(n);
        return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
    }

    function floor(x: number) {
        return Math.floor(x);
    }

    function sqrt(x: number) {
        return Math.sqrt(x);
    }

    function tan(x: number) {
        return Math.tan(x);
    }

    function asin(x: number) {
        return Math.asin(x);
    }

    function acos(x: number) {
        return Math.acos(x);
    }

    function atan(x: number) {
        return Math.atan(x);
    }

    function atan2(y: number, x: number) {
        return Math.atan2(y, x);
    }

    function deg(x: number) {
        return x * 180 / Math.PI;
    }

    function min(...x: number[]) {
        return Math.min(...x);
    }

    function max(...x: number[]) {
        return Math.max(...x);
    }

    function sign(x: number) {
        return Math.sign(x);
    }

    const pi = Math.PI;

    return {
        ceil, pow, abs, cos, sin, rad, random,
        floor, sqrt, tan, asin, acos, atan, atan2,
        deg, min, max, sign, pi
    };
}