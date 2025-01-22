import { encodeSound } from "./defold_encoder";

/*

export interface IDefoldCollection {
    name: string
}

export interface IDefoldGo { }
export interface IDefoldSprite { }
export interface IDefoldGui { }
export interface IDefoldGuiNode { }
export interface IDefoldAtlas { }
export interface IDefoldTexture { }

export interface IDefoldSound {
    sound: string,
    looping?: number
}

*/

const test = encodeSound({ sound: "123123", looping: 1, bug: 1 });
console.log(test);