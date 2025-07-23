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

export function calculate_distance_2d(pos1: vmath.vector3, pos2: vmath.vector3): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function swap<T extends Object>(obj: T, key1: keyof T, key2: keyof T) {
    const tmp = deepClone(obj[key1]);
    obj[key1] = deepClone(obj[key2]);
    obj[key2] = tmp;
}

// DEFOLD IMPLEMENTATION OF CONVERTING QUATERNIONS TO EULERS AND BACKWARD

const DEG_FACTOR = 180.0 / Math.PI;
const HALF_RAD_FACTOR = 0.008726646; // (Math.PI/180)/2

/**
 * Converts a quaternion into euler angles (r0, r1, r2), based on YZX rotation order.
 * To handle gimbal lock (singularity at r1 ~ +/- 90 degrees), the cut off is at r0 = +/- 88.85 degrees, which snaps to +/- 90.
 * The provided quaternion is expected to be normalized.
 * The error is guaranteed to be less than +/- 0.02 degrees
 * @param q0 first imaginary axis
 * @param q1 second imaginary axis
 * @param q2 third imaginary axis
 * @param q3 real part
 * @returns Euler angles in degrees and the same order as the specified rotation order [r0, r1, r2]
 */
export function quat_to_euler(q0: number, q1: number, q2: number, q3: number): [number, number, number] {
    // Early-out when the rotation axis is either X, Y or Z.
    // The reasons we make this distinction is that one-axis rotation is common (and cheaper), especially around Z in 2D games
    const mask = (q2 !== 0 ? 1 : 0) << 2 | (q1 !== 0 ? 1 : 0) << 1 | (q0 !== 0 ? 1 : 0);
    switch (mask) {
        case 0b000:
            return [0.0, 0.0, 0.0];
        case 0b001:
        case 0b010:
        case 0b100:
            {
                const r: [number, number, number] = [0.0, 0.0, 0.0];
                // the sum of the values yields one value, as the others are 0
                r[mask >> 1] = Math.atan2(q0 + q1 + q2, q3) * 2.0 * DEG_FACTOR;
                return r;
            }
    }

    const limit = 0.4999; // gimbal lock limit, corresponds to 88.85 degrees
    let r0: number, r1: number, r2: number;
    const test = q0 * q1 + q2 * q3;

    if (test > limit) {
        r1 = 2.0 * Math.atan2(q0, q3);
        r2 = Math.PI / 2;
        r0 = 0.0;
    } else if (test < -limit) {
        r1 = -2.0 * Math.atan2(q0, q3);
        r2 = -Math.PI / 2;
        r0 = 0.0;
    } else {
        const sq0 = q0 * q0;
        const sq1 = q1 * q1;
        const sq2 = q2 * q2;
        r1 = Math.atan2(2.0 * q1 * q3 - 2.0 * q0 * q2, 1.0 - 2.0 * sq1 - 2.0 * sq2);
        r2 = Math.asin(2.0 * test);
        r0 = Math.atan2(2.0 * q0 * q3 - 2.0 * q1 * q2, 1.0 - 2.0 * sq0 - 2.0 * sq2);
    }

    return [r0 * DEG_FACTOR, r1 * DEG_FACTOR, r2 * DEG_FACTOR];
}

/**
 * Converts euler angles (x, y, z) in degrees into a quaternion
 * The error is guaranteed to be less than 0.001.
 * @param x rotation around x-axis (deg)
 * @param y rotation around y-axis (deg)
 * @param z rotation around z-axis (deg)
 * @returns Quaternion as [x, y, z, w] describing an equivalent rotation (231 (YZX) rotation sequence).
 */
export function euler_to_quat(x: number, y: number, z: number): [number, number, number, number] {
    // Early-out when the rotation axis is either X, Y or Z.
    // The reasons we make this distinction is that one-axis rotation is common (and cheaper), especially around Z in 2D games
    const mask = (z !== 0 ? 1 : 0) << 2 | (y !== 0 ? 1 : 0) << 1 | (x !== 0 ? 1 : 0);
    switch (mask) {
        case 0b000:
            return [0.0, 0.0, 0.0, 1.0];
        case 0b001:
        case 0b010:
        case 0b100:
            {
                // the sum of the angles yields one angle, as the others are 0
                const ha = (x + y + z) * HALF_RAD_FACTOR;
                const q: [number, number, number, number] = [0.0, 0.0, 0.0, Math.cos(ha)];
                q[mask >> 1] = Math.sin(ha);
                return q;
            }
    }

    // Implementation based on:
    // http://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/19770024290.pdf
    // Rotation sequence: 231 (YZX)
    const t1 = y * HALF_RAD_FACTOR;
    const t2 = z * HALF_RAD_FACTOR;
    const t3 = x * HALF_RAD_FACTOR;

    const c1 = Math.cos(t1);
    const s1 = Math.sin(t1);
    const c2 = Math.cos(t2);
    const s2 = Math.sin(t2);
    const c3 = Math.cos(t3);
    const s3 = Math.sin(t3);
    const c1_c2 = c1 * c2;
    const s2_s3 = s2 * s3;

    return [
        s1 * s2 * c3 + s3 * c1_c2,       // x
        s1 * c2 * c3 + s2_s3 * c1,       // y
        -s1 * s3 * c2 + s2 * c1 * c3,    // z
        -s1 * s2_s3 + c1_c2 * c3         // w
    ];
}

export function clearParentSelection(parentId: number) {
    if (parentId !== -1) {
        const currentSelected = SelectControl.get_selected_list();
        const parentInSelected = currentSelected.find((mesh: any) => mesh.mesh_data.id === parentId);
        if (parentInSelected) {
            const filteredSelected = currentSelected.filter((mesh: any) => mesh.mesh_data.id !== parentId);
            SelectControl.set_selected_list(filteredSelected);
        }
    }
}