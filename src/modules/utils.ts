import { Vector3, Vector4 } from "three";

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

export function deepClone(obj: any) {
    return JSON.parse(JSON.stringify(obj))
}

export function hexToRGB(hex: string): Vector3 {
    hex = hex.replace("#", "");

    let r, g, b;
    if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16) / 255;
        g = parseInt(hex.slice(2, 4), 16) / 255;
        b = parseInt(hex.slice(4, 6), 16) / 255;
    } else console.error("Неправильный формат шестнадцатеричного цвета");

    return new Vector3(r, g, b);
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