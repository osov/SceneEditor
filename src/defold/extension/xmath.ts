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

    return { add, sub, mul, div, cross, mul_per_elem, normalize, lerp };
}