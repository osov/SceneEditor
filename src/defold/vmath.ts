declare global {
    namespace vmath {
        export type vector3 = {
            x: number,
            y: number,
            z: number
        }

        export type vector4 = {
            x: number,
            y: number,
            z: number,
            w: number
        }

        export type quaternion = number & {
            x: number,
            y: number,
            z: number,
            w: number,
        }

        export type matrix4 = number & {
            c0: vmath.vector4,
            c1: vmath.vector4,
            c2: vmath.vector4,
            c3: vmath.vector4,
            m01: number,
            m02: number,
            m03: number,
            m04: number,
            m11: number,
            m12: number,
            m13: number,
            m14: number,
            m21: number,
            m22: number,
            m23: number,
            m24: number,
            m31: number,
            m32: number,
            m33: number,
            m34: number,
        }

        export function vector3(): vmath.vector3
        export function vector3(n: number): vmath.vector3
        export function vector3(v1: vmath.vector3): vmath.vector3
        export function vector3(x: number, y: number, z: number): vmath.vector3

        export function vector4(): vmath.vector4
        export function vector4(n: number): vmath.vector4
        export function vector4(v1: vmath.vector4): vmath.vector4
        export function vector4(x: number, y: number, z: number, w: number): vmath.vector4
	    export function vector4(x: number, y: number, z: number, w: number): vmath.vector4
        
        export function matrix4(): vmath.matrix4

        export function matrix4_translation(position: vmath.vector3 | vmath.vector4): vmath.matrix4
        export function matrix4_rotation_x(angle: number): vmath.matrix4
        export function matrix4_rotation_y(angle: number): vmath.matrix4
        export function matrix4_rotation_z(angle: number): vmath.matrix4
        export function matrix_mul_vector(m: vmath.matrix4, v: vmath.vector4): vmath.vector4

        export function length(v: vmath.vector3): number
        export function normalize(v: vmath.vector3): vmath.vector3
        export function dot(v1: vmath.vector3, v2: vmath.vector3): number
        export function cross(v1: vmath.vector3, v2: vmath.vector3): vmath.vector3
        export function mul_per_element(v1: vmath.vector3, v2: vmath.vector3): vmath.vector3
        export function lerp(t: number, v1: vmath.vector3, v2: vmath.vector3): vmath.vector3
        export function slerp(t: number, q1: vmath.quaternion, q2: vmath.quaternion): vmath.quaternion

        export function quat(): vmath.quaternion
        export function quat(q: vmath.quaternion): vmath.quaternion
        export function quat(x: number, y: number, z: number, w: number): vmath.quaternion
        export function quat_from_axis_angle(axis: vmath.vector3, angle: number): vmath.quaternion
        export function euler_to_quat(x: number, y: number, z: number): vmath.quaternion
        export function rotate(q: vmath.quaternion, v: vmath.vector3): vmath.vector3
        export function quat_rotation_z(angle: number): vmath.quaternion
    }
}

export function vmath_module() {
    /**
        m01, m02, m03, m04
        m11, m12, m13, m14
        m21, m22, m23, m24
        m31, m32, m33, m34

        c0(m01, m11, m21, m31)
        c1(m02, m12, m22, m32)
        c2(m03, m13, m23, m33)
        c3(m04, m14, m24, m34)
     */
    function matrix4() {
        return {
            c0: vector4(1, 0, 0, 0),
            c1: vector4(0, 1, 0, 0),
            c2: vector4(0, 0, 1, 0),
            c3: vector4(0, 0, 0, 1),
            m01: 1, m02: 0, m03: 0, m04: 0,
            m11: 0, m12: 1, m13: 0, m14: 0,
            m21: 0, m22: 0, m23: 1, m24: 0,
            m31: 0, m32: 0, m33: 0, m34: 1,
        }
    }

    function matrix4_translation(position: vmath.vector3 | vmath.vector4) {
        const x = position.x;
        const y = position.y;
        const z = position.z;
        return {
            c0: vector4(1, 0, 0, 0),
            c1: vector4(0, 1, 0, 0),
            c2: vector4(0, 0, 1, 0),
            c3: vector4(x, y, z, 1),
            m01: 1, m02: 0, m03: 0, m04: x,
            m11: 0, m12: 1, m13: 0, m14: y,
            m21: 0, m22: 0, m23: 1, m24: z,
            m31: 0, m32: 0, m33: 0, m34: 1,
        }
    }

    function matrix4_rotation_x(angle: number) {
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        return {
            c0: vector4(1, 0, 0, 0),
            c1: vector4(0, cos, sin, 0),
            c2: vector4(0, -sin, cos, 0),
            c3: vector4(0, 0, 0, 1),
            m01: 1, m02: 0, m03: 0, m04: 0,
            m11: 0, m12: cos, m13: -sin, m14: 0,
            m21: 0, m22: sin, m23: cos, m24: 0,
            m31: 0, m32: 0, m33: 0, m34: 1,
        }
    }

    function matrix4_rotation_y(angle: number) {
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        return {
            c0: vector4(cos, 0, -sin, 0),
            c1: vector4(0, 1, 0, 0),
            c2: vector4(sin, 0, 1, 0),
            c3: vector4(0, 0, 0, 1),
            m01: cos, m02: 0, m03: sin, m04: 0,
            m11: 0, m12: 1, m13: 0, m14: 0,
            m21: -sin, m22: 0, m23: cos, m24: 0,
            m31: 0, m32: 0, m33: 0, m34: 1,
        }
    }

    function matrix4_rotation_z(angle: number) {
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);
        return {
            c0: vector4(cos, sin, 0, 0),
            c1: vector4(-sin, cos, 0, 0),
            c2: vector4(0, 0, 1, 0),
            c3: vector4(0, 0, 0, 1),
            m01: cos, m02: -sin, m03: 0, m04: 0,
            m11: sin, m12: cos, m13: 0, m14: 0,
            m21: 0, m22: 0, m23: 1, m24: 0,
            m31: 0, m32: 0, m33: 0, m34: 1,
        }
    }

    function matrix_mul_vector(m: vmath.matrix4, v: vmath.vector4) {
        return {
            x: m.m01 * v.x + m.m02 * v.y + m.m03 * v.z + m.m04 * v.w,
            y: m.m11 * v.x + m.m12 * v.y + m.m13 * v.z + m.m14 * v.w,
            z: m.m21 * v.x + m.m22 * v.y + m.m23 * v.z + m.m24 * v.w,
            w: m.m31 * v.x + m.m32 * v.y + m.m33 * v.z + m.m34 * v.w,
        }
    }

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
            if (Number.isFinite(args[0]))
                return vector3_1(args[0]);
            else
                return vector3_2(args[0]);
        }
        if (args.length == 3) {
            return vector3_3(args[0], args[1], args[2]);
        }
        return vector3_0();
    }

    function vector4_0() {
        return { x: 0, y: 0, z: 0, w: 0 };
    }

    function vector4_1(n: number) {
        return { x: n, y: n, z: n, w: n };
    }

    function vector4_2(v1: vmath.vector4) {
        return { x: v1.x, y: v1.y, z: v1.z, w: v1.w };
    }

    function vector4_4(x: number, y: number, z: number, w: number) {
        return { x, y, z, w };
    }

    function vector4(...args: any) {
        if (args.length == 1) {
            if (Number.isFinite(args[0]))
                return vector4_1(args[0]);
            else
                return vector4_2(args[0]);
        }
        if (args.length == 4) {
            return vector4_4(args[0], args[1], args[2], args[3]);
        }
        return vector4_0();
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

    function quat_1(q: vmath.quaternion) {
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

    function rotate(q: vmath.quaternion, v: vmath.vector3) {
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

    function quat_rotation_z(angle: number) {
        const halfAngle = angle * 0.5;
        const s = Math.sin(halfAngle);
        return quat(0, 0, s, Math.cos(halfAngle));
    }

    return {
        vector3, vector4, length, normalize, dot, cross, mul_per_element, lerp, slerp,
        quat, quat_from_axis_angle, euler_to_quat, rotate, quat_rotation_z,
        matrix4, matrix4_translation, matrix4_rotation_x, matrix4_rotation_y, matrix4_rotation_z,
        matrix_mul_vector
    };
}