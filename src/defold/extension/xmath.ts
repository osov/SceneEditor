declare global {
    namespace xmath {
        /**
       * Add one vector to another.
       * @param v_in_place - The vector to modify in place.
       * @param v1 - The first vector.
       * @param v2 - The second vector.
       */
        function add(v_in_place: vmath.vector3 | vmath.vector4, v1: vmath.vector3 | vmath.vector4, v2: vmath.vector3 | vmath.vector4): void;

        /**
         * Subtract one vector from another.
         * @param v_in_place - The vector to modify in place.
         * @param v1 - The first vector.
         * @param v2 - The second vector.
         */
        function sub(v_in_place: vmath.vector3 | vmath.vector4, v1: vmath.vector3 | vmath.vector4, v2: vmath.vector3 | vmath.vector4): void;

        /**
         * Multiply a vector by a scalar.
         * @param v_in_place - The vector to modify in place.
         * @param v - The vector.
         * @param n - The scalar.
         */
        function mul(v_in_place: vmath.vector3 | vmath.vector4, v: vmath.vector3 | vmath.vector4, n: number): void;

        /**
         * Divide a vector by a scalar.
         * @param v_in_place - The vector to modify in place.
         * @param v - The vector.
         * @param n - The scalar.
         */
        function div(v_in_place: vmath.vector3 | vmath.vector4, v: vmath.vector3 | vmath.vector4, n: number): void;

        /**
         * Calculate the cross product of two vectors.
         * @param v_in_place - The vector to modify in place.
         * @param v1 - The first vector.
         * @param v2 - The second vector.
         */
        function cross(v_in_place: vmath.vector3, v1: vmath.vector3, v2: vmath.vector3): void;

        /**
         * Perform element-wise multiplication between two vectors.
         * @param v_in_place - The vector to modify in place.
         * @param v1 - The first vector.
         * @param v2 - The second vector.
         */
        function mul_per_elem(v_in_place: vmath.vector3 | vmath.vector4, v1: vmath.vector3 | vmath.vector4, v2: vmath.vector3 | vmath.vector4): void;

        /**
         * Normalize a vector.
         * @param v_in_place - The vector to modify in place.
         * @param v1 - The vector to normalize.
         */
        function normalize(v_in_place: vmath.vector3 | vmath.vector4, v1: vmath.vector3 | vmath.vector4): void;


        /**
        * Linearly interpolate between two vectors orvmath.quaternions.
        * @param v_in_place - The input vector orvmath.quaternion to be changed.
        * @param t - The interpolation factor.
        * @param v1 - The start vector orvmath.quaternion.
        * @param v2 - The end vector orvmath.quaternion.
        */
        function lerp(v_in_place: vmath.vector3 | vmath.vector4, t: number, v1: vmath.vector3 | vmath.vector4, v2: vmath.vector3 | vmath.vector4): void;


        /**
         * Set the value of a matrix to the identity matrix or copy another matrix.
         * @param m_in_place - The input matrix.
         * @param m1 - The matrix to copy (optional).
         */
        function matrix(m_in_place: vmath.matrix4, m1?: vmath.matrix4): void;

        /**
         * Set the value of a matrix for rotation around the z-axis.
         * @param m_in_place - The input matrix.
         * @param angle - The angle in radians.
         */
        function matrix_rotation_z(m_in_place: vmath.matrix4, angle: number): void;

        /**
         * Set the value of a matrix for translation.
         * @param m_in_place - The input matrix.
         * @param position - The position vector.
         */
        function matrix_translation(m_in_place: vmath.matrix4, position: vmath.vector3 | vmath.vector4): void;
    }


}

export function xmath_module() {
    function add(v_in_place: vmath.vector3 | vmath.vector4, v1: vmath.vector3 | vmath.vector4, v2: vmath.vector3 | vmath.vector4) {
        v_in_place.x = v1.x + v2.x;
        v_in_place.y = v1.y + v2.y;
        v_in_place.z = v1.z + v2.z;
        if ('w' in v_in_place && 'w' in v1 && 'w' in v2)
            v_in_place.w = v1.w + v2.w;
    }

    function sub(v_in_place: vmath.vector3 | vmath.vector4, v1: vmath.vector3 | vmath.vector4, v2: vmath.vector3 | vmath.vector4) {
        v_in_place.x = v1.x - v2.x;
        v_in_place.y = v1.y - v2.y;
        v_in_place.z = v1.z - v2.z;
        if ('w' in v_in_place && 'w' in v1 && 'w' in v2)
            v_in_place.w = v1.w - v2.w;
    }

    function mul(v_in_place: vmath.vector3 | vmath.vector4, v: vmath.vector3 | vmath.vector4, n: number) {
        v_in_place.x = v.x * n;
        v_in_place.y = v.y * n;
        v_in_place.z = v.z * n;
        if ('w' in v_in_place && 'w' in v)
            v_in_place.w = v.w * n;
    }

    function div(v_in_place: vmath.vector3 | vmath.vector4, v: vmath.vector3 | vmath.vector4, n: number) {
        v_in_place.x = v.x / n;
        v_in_place.y = v.y / n;
        v_in_place.z = v.z / n;
        if ('w' in v_in_place && 'w' in v)
            v_in_place.w = v.w / n;
    }

    function cross(v_in_place: vmath.vector3, v1: vmath.vector3, v2: vmath.vector3) {
        v_in_place.x = v1.y * v2.z - v1.z * v2.y;
        v_in_place.y = v1.z * v2.x - v1.x * v2.z;
        v_in_place.z = v1.x * v2.y - v1.y * v2.x;
    }

    function mul_per_elem(v_in_place: vmath.vector3 | vmath.vector4, v1: vmath.vector3 | vmath.vector4, v2: vmath.vector3 | vmath.vector4) {
        v_in_place.x = v1.x * v2.x;
        v_in_place.y = v1.y * v2.y;
        v_in_place.z = v1.z * v2.z;
        if ('w' in v_in_place && 'w' in v1 && 'w' in v2)
            v_in_place.w = v1.w * v2.w;
    }

    function normalize(v_in_place: vmath.vector3 | vmath.vector4, v1: vmath.vector3 | vmath.vector4) {
        const len = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z + ((v1 as vmath.vector4).w || 0) * ((v1 as vmath.vector4).w || 0));
        v_in_place.x = v1.x / len;
        v_in_place.y = v1.y / len;
        v_in_place.z = v1.z / len;
        if ('w' in v_in_place && 'w' in v1)
            v_in_place.w = v1.w / len;
    }

    function lerp(v_in_place: vmath.vector3 | vmath.vector4, t: number, v1: vmath.vector3 | vmath.vector4, v2: vmath.vector3 | vmath.vector4): void {
        v_in_place.x = v1.x + (v2.x - v1.x) * t;
        v_in_place.y = v1.y + (v2.y - v1.y) * t;
        v_in_place.z = v1.z + (v2.z - v1.z) * t;
        if ('w' in v_in_place && 'w' in v1 && 'w' in v2)
            v_in_place.w = v1.w + (v2.w - v1.w) * t;
    }

    function matrix(m_in_place: vmath.matrix4) {
        m_in_place.c0.x = 1;
        m_in_place.c0.y = 0;
        m_in_place.c0.z = 0;
        m_in_place.c0.w = 0;

        m_in_place.c1.x = 0;
        m_in_place.c1.y = 1;
        m_in_place.c1.z = 0;
        m_in_place.c1.w = 0;

        m_in_place.c2.x = 0;
        m_in_place.c2.y = 0;
        m_in_place.c2.z = 1;
        m_in_place.c2.w = 0;

        m_in_place.c3.x = 0;
        m_in_place.c3.y = 0;
        m_in_place.c3.z = 0;
        m_in_place.c3.w = 1;

        m_in_place.m01 = 1;
        m_in_place.m02 = 0;
        m_in_place.m03 = 0;
        m_in_place.m04 = 0;
        m_in_place.m11 = 0;
        m_in_place.m12 = 1;
        m_in_place.m13 = 0;
        m_in_place.m14 = 0;
        m_in_place.m21 = 0;
        m_in_place.m22 = 0;
        m_in_place.m23 = 1;
        m_in_place.m24 = 0;
        m_in_place.m31 = 0;
        m_in_place.m32 = 0;
        m_in_place.m33 = 0;
        m_in_place.m34 = 1;
    }

    function matrix_translation(m_in_place: vmath.matrix4, position: vmath.vector3 | vmath.vector4) {
        matrix(m_in_place);

        m_in_place.c3.x = position.x;
        m_in_place.c3.y = position.y;
        m_in_place.c3.z = position.z;

        m_in_place.m31 = position.x;
        m_in_place.m32 = position.y;
        m_in_place.m33 = position.z;
    }

    function matrix_rotation_z(m_in_place: vmath.matrix4, angle: number) {
        matrix(m_in_place);
        const cos = Math.cos(-angle);
        const sin = Math.sin(-angle);

        m_in_place.c0.x = cos;
        m_in_place.c0.y = sin;
        m_in_place.c1.x = -sin;
        m_in_place.c1.y = cos;
        
        m_in_place.m01 = cos;
        m_in_place.m02 = -sin;
        m_in_place.m11 = sin;
        m_in_place.m12 = cos;
    }

    return { add, sub, mul, div, cross, mul_per_elem, normalize, lerp, matrix_translation };
}