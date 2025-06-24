export function degToRad(degrees: number) {
    return degrees * (Math.PI / 180);
}

export function radToDeg(rad: number) {
    return rad / (Math.PI / 180);
}

export function eulerToQuaternion(euler: vmath.vector3) {
    const roll = degToRad(euler.x);
    const pitch = degToRad(euler.y);
    const yaw = degToRad(euler.z);

    const qx = Math.sin(roll / 2) * Math.cos(pitch / 2) * Math.cos(yaw / 2) - Math.cos(roll / 2) * Math.sin(pitch / 2) * Math.sin(yaw / 2);
    const qy = Math.cos(roll / 2) * Math.sin(pitch / 2) * Math.cos(yaw / 2) + Math.sin(roll / 2) * Math.cos(pitch / 2) * Math.sin(yaw / 2);
    const qz = Math.cos(roll / 2) * Math.cos(pitch / 2) * Math.sin(yaw / 2) - Math.sin(roll / 2) * Math.sin(pitch / 2) * Math.cos(yaw / 2);
    const qw = Math.cos(roll / 2) * Math.cos(pitch / 2) * Math.cos(yaw / 2) + Math.sin(roll / 2) * Math.sin(pitch / 2) * Math.sin(yaw / 2);

    return vmath.vector4(qx, qy, qz, qw);
}

