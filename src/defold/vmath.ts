declare global {
    namespace vmath {
        export type vector3 = {
            x: number,
            y: number,
            z: number
        }

        export type quat = {
            x: number,
            y: number,
            z: number,
            w: number
        }

        export function vector3(): vmath.vector3
        export function vector3(n: number): vmath.vector3
        export function vector3(v1: vmath.vector3): vmath.vector3
        export function vector3(x: number, y: number, z: number): vmath.vector3
        export function length(v: vmath.vector3): number
        export function normalize(v: vmath.vector3): vmath.vector3
        export function dot(v1: vmath.vector3, v2: vmath.vector3): number
        export function cross(v1: vmath.vector3, v2: vmath.vector3): vmath.vector3
        export function mul_per_element(v1: vmath.vector3, v2: vmath.vector3): vmath.vector3
        export function lerp(t: number, v1: vmath.vector3, v2: vmath.vector3): vmath.vector3
        export function slerp(t: number, q1: vmath.quat, q2: vmath.quat): vmath.quat

        export function quat(): vmath.quat
        export function quat(q: vmath.quat): vmath.quat
        export function quat(x: number, y: number, z: number, w: number): vmath.quat
        export function quat_from_axis_angle(axis: vmath.vector3, angle: number): vmath.quat
        export function euler_to_quat(x: number, y: number, z: number): vmath.quat
        export function rotate(q: vmath.quat, v: vmath.vector3): vmath.vector3
    }
}

export function vmath_module() {
    function vector3_0() {
        return { x: 0, y: 0, z: 0 };
    }

    function vector3_1(n: number) {
        return { x: n, y: n, z: n };
    }

    function vector3_2(v1: vmath.vector3) {
        return { x: v1.x, y: v1.y, z: v1.z };
    }

    function vector3_3(x: number, y: number, z: number) {
        return { x, y, z };
    }

    function vector3(...args: any) {
        if (args.length == 1) {
            if (Number.isInteger(args[0]))
                return vector3_1(args[0]);
            else
                return vector3_2(args[0]);
        }
        if (args.length == 3) {
            return vector3_3(args[0], args[1], args[2]);
        }
        return vector3_0();
    }

    function length(v: vmath.vector3) {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }

    function normalize(v: vmath.vector3) {
        const len = length(v);
        if (len === 0) return vector3_0();
        return vector3(v.x / len, v.y / len, v.z / len);
    }

    function dot(v1: vmath.vector3, v2: vmath.vector3) {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }

    function cross(v1: vmath.vector3, v2: vmath.vector3) {
        return vector3(
            v1.y * v2.z - v1.z * v2.y,
            v1.z * v2.x - v1.x * v2.z,
            v1.x * v2.y - v1.y * v2.x
        );
    }

    function mul_per_element(v1: vmath.vector3, v2: vmath.vector3) {
        return vector3(v1.x * v2.x, v1.y * v2.y, v1.z * v2.z);
    }

    function lerp(t: number, v1: vmath.vector3, v2: vmath.vector3) {
        return vector3(
            v1.x + (v2.x - v1.x) * t,
            v1.y + (v2.y - v1.y) * t,
            v1.z + (v2.z - v1.z) * t
        );
    }

    function slerp(t: number, v1: vmath.vector3, v2: vmath.vector3) {
        let dot = vmath.dot(v1, v2);

        if (dot < 0) {
            v2 = vector3(-v2.x, -v2.y, -v2.z);
            dot = -dot;
        }

        if (dot > 0.9995) {
            return vector3(
                v1.x + (v2.x - v1.x) * t,
                v1.y + (v2.y - v1.y) * t,
                v1.z + (v2.z - v1.z) * t
            );
        }

        const theta = Math.acos(dot);
        const sinTheta = Math.sin(theta);
        const w1 = Math.sin((1 - t) * theta) / sinTheta;
        const w2 = Math.sin(t * theta) / sinTheta;

        return vector3(
            w1 * v1.x + w2 * v2.x,
            w1 * v1.y + w2 * v2.y,
            w1 * v1.z + w2 * v2.z
        );
    }

    function quat_0() {
        return { x: 0, y: 0, z: 0, w: 0 };
    }

    function quat_1(q: vmath.quat) {
        return { x: q.x, y: q.y, z: q.z, w: q.w };
    }

    function quat_2(x: number, y: number, z: number, w: number) {
        return { x, y, z, w };
    }

    function quat(...args: any) {
        if (args.length == 1) {
            return quat_1(args[0]);
        }
        if (args.length == 4) {
            return quat_2(args[0], args[1], args[2], args[3]);
        }
        return quat_0();
    }

    function quat_from_axis_angle(axis: vmath.vector3, angle: number) {
        const halfAngle = angle * 0.5;
        const s = Math.sin(halfAngle);
        return quat(
            axis.x * s,
            axis.y * s,
            axis.z * s,
            Math.cos(halfAngle)
        );
    }

    function euler_to_quat(x: number, y: number, z: number) {
        const cx = Math.cos(x * 0.5);
        const sx = Math.sin(x * 0.5);
        const cy = Math.cos(y * 0.5);
        const sy = Math.sin(y * 0.5);
        const cz = Math.cos(z * 0.5);
        const sz = Math.sin(z * 0.5);

        return quat(
            sx * cy * cz + cx * sy * sz,
            cx * sy * cz - sx * cy * sz,
            cx * cy * sz + sx * sy * cz,
            cx * cy * cz - sx * sy * sz
        );
    }

    function rotate(q: vmath.quat, v: vmath.vector3) {
        const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
        const vx = v.x, vy = v.y, vz = v.z;

        const ix = qw * vx + qy * vz - qz * vy;
        const iy = qw * vy + qz * vx - qx * vz;
        const iz = qw * vz + qx * vy - qy * vx;
        const iw = -qx * vx - qy * vy - qz * vz;

        return vector3(
            ix * qw + iw * -qx + iy * -qz - iz * -qy,
            iy * qw + iw * -qy + iz * -qx - ix * -qz,
            iz * qw + iw * -qz + ix * -qy - iy * -qx
        );
    }

    return {
        vector3, length, normalize, dot, cross, mul_per_element, lerp, slerp,
        quat, quat_from_axis_angle, euler_to_quat, rotate
    };
}