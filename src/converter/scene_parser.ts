import { encodeSound } from "./defold_encoder";

// TODO: parse.scene for test

const test = encodeSound({ sound: "assets/sound/home.ogg" });
console.log(test);