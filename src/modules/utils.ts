import { Vector, Circle, Segment } from "2d-geometry";
import { Vector3, Vector4 } from "three";

export const DP_TOL = 0.000001;
export const TAU = 2 * Math.PI;


export function get_hms() {
    var now = new Date();
    var hh: number | string = now.getHours();
    var mm: number | string = now.getMinutes();
    var ss: number | string = now.getSeconds();
    if (hh < 10)
        hh = '0' + hh;
    if (mm < 10)
        mm = '0' + mm;
    if (ss < 10)
        ss = '0' + ss;
    return hh + ":" + mm + ":" + ss;
}

export function get_dmy() {
    var now = new Date();
    var dd: number | string = now.getDate();
    var mo: number | string = now.getMonth() + 1;
    var yy = now.getFullYear().toString();
    if (mo < 10)
        mo = '0' + mo;
    if (dd < 10)
        dd = '0' + dd;
    return dd + "." + mo + "." + yy;
}

export function random_int(min: number, max: number) {
    // случайное число от min до (max+1)
    let rand = min + Math.random() * (max + 1 - min);
    return Math.floor(rand);
}

export function deepClone<T>(obj: T) {
    return JSON.parse(JSON.stringify(obj)) as T;
}

export function hexToRGB(hex: string): Vector3 {
    hex = hex.replace("#", "");

    let r, g, b;
    if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16) / 255;
        g = parseInt(hex.slice(2, 4), 16) / 255;
        b = parseInt(hex.slice(4, 6), 16) / 255;
    } else if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16) / 255;
        g = parseInt(hex[1] + hex[1], 16) / 255;
        b = parseInt(hex[2] + hex[2], 16) / 255;
    } else {
        console.error("Неправильный формат шестнадцатеричного цвета");
        return new Vector3(0, 0, 0); // Return black as fallback
    }

    return new Vector3(r, g, b);
}

export function rgbToHex(rgb: Vector3): string {
    const r = Math.round(rgb.x * 255);
    const g = Math.round(rgb.y * 255);
    const b = Math.round(rgb.z * 255);

    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length == 1 ? '0' + hex : hex;
    }).join('');
}

export function degToRad(degrees: number) {
    return degrees * (Math.PI / 180);
}

export function eulerToQuaternion(euler: Vector3) {
    const roll = degToRad(euler.x);
    const pitch = degToRad(euler.y);
    const yaw = degToRad(euler.z);

    const qx = Math.sin(roll / 2) * Math.cos(pitch / 2) * Math.cos(yaw / 2) - Math.cos(roll / 2) * Math.sin(pitch / 2) * Math.sin(yaw / 2);
    const qy = Math.cos(roll / 2) * Math.sin(pitch / 2) * Math.cos(yaw / 2) + Math.sin(roll / 2) * Math.cos(pitch / 2) * Math.sin(yaw / 2);
    const qz = Math.cos(roll / 2) * Math.cos(pitch / 2) * Math.sin(yaw / 2) - Math.sin(roll / 2) * Math.sin(pitch / 2) * Math.cos(yaw / 2);
    const qw = Math.cos(roll / 2) * Math.cos(pitch / 2) * Math.cos(yaw / 2) + Math.sin(roll / 2) * Math.sin(pitch / 2) * Math.sin(yaw / 2);

    return new Vector4(qx, qy, qz, qw);
}

export function json_parsable(str: string) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

export const get_keys = Object.keys as <T extends object>(obj: T) => (keyof T)[];

export function span_elem(text: string, class_list: string[] = []) {
    const elem = document.createElement("span");
    elem.classList.add(...class_list);
    elem.innerHTML = text;
    return elem;
}

export function two_lines_intersect(v1: Segment, v2: Segment) {
    const x1 = v1.start.x;
    const y1 = v1.start.y;
    const x2 = v1.end.x;
    const y2 = v1.end.y;
    const x3 = v2.start.x;
    const y3 = v2.start.y;
    const x4 = v2.end.x;
    const y4 = v2.end.y;

    // Check if none of the lines are of length 0
    if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
        return false
    }
    const denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))
    if (denominator === 0) {
        return false
    }
    let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
    let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator
    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
        return false
    }
    let x = x1 + ua * (x2 - x1)
    let y = y1 + ua * (y2 - y1)
    return { x, y }
}

export function circle_line_intersect(circle: Circle, line: Segment) {
    const v1 = { x: line.end.x - line.start.x, y: line.end.y - line.start.y };
    const v2 = { x: line.start.x - circle.center.x, y: line.start.y - circle.center.y };
    let b = v1.x * v2.x + v1.y * v2.y;
    let c = 2 * (v1.x * v1.x + v1.y * v1.y);
    b *= -2;
    let d = Math.sqrt(b * b - 2 * c * (v2.x * v2.x + v2.y * v2.y - circle.r * circle.r));
    if (isNaN(d)) {
        return [];
    }
    const u1 = (b - d) / c;
    const u2 = (b + d) / c;
    const ret = [];
    if (u1 <= 1 && u1 >= 0) {
        const retP1 = { x: line.start.x + v1.x * u1, y: line.start.y + v1.y * u1 };
        ret[0] = retP1;
    }
    if (u2 <= 1 && u2 >= 0) {
        const retP2 = { x: line.start.x + v1.x * u2, y: line.start.y + v1.y * u2 };
        ret[ret.length] = retP2;
    }
    return ret;
}

export function GT(x: number, y: number) {
    return x - y > DP_TOL
}

export function GE(x: number, y: number) {
    return x - y > -DP_TOL
}

export function LT(x: number, y: number) {
    return x - y < -DP_TOL;
}

export function LE(x: number, y: number) {
    return x - y < DP_TOL;
}

export function EQ_0(x: number) {
    return x < DP_TOL && x > -DP_TOL;
}

export function EQ(x: number, y: number) {
    return x - y < DP_TOL && x - y > -DP_TOL;
}

export function getObjectHash<T>(obj: T): string {
    const sortedObj = sortObjectDeep(obj);
    const str = JSON.stringify(sortedObj);
    return stringToHash(str);
}

function sortObjectDeep(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(sortObjectDeep);
    }

    const sortedKeys = Object.keys(obj).sort();
    const result: any = {};

    for (const key of sortedKeys) {
        if (key != 'renderTarget')
        result[key] = sortObjectDeep(obj[key]);
    }

    return result;
}

export function stringToHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}

export function getObjectDifferences<T>(obj1: T, obj2: T): { [key: string]: { old: any, new: any } } {
    const differences: { [key: string]: { old: any, new: any } } = {};

    const compareValues = (path: string, val1: any, val2: any) => {
        if (val1 === val2) return;

        if (typeof val1 !== typeof val2) {
            differences[path] = { old: val1, new: val2 };
            return;
        }

        if (typeof val1 === 'object' && val1 !== null && val2 !== null) {
            const keys1 = Object.keys(val1).sort();
            const keys2 = Object.keys(val2).sort();
            const allKeys = new Set([...keys1, ...keys2]);

            for (const key of allKeys) {
                const newPath = path ? `${path}.${key}` : key;
                if (!keys1.includes(key)) {
                    differences[newPath] = { old: undefined, new: val2[key] };
                } else if (!keys2.includes(key)) {
                    differences[newPath] = { old: val1[key], new: undefined };
                } else {
                    compareValues(newPath, val1[key], val2[key]);
                }
            }
        } else {
            differences[path] = { old: val1, new: val2 };
        }
    };

    compareValues('', obj1, obj2);
    return differences;
}