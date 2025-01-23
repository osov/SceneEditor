import { Vector3 } from "three";
import { NodeType } from "../render_engine/convert_types";
import { parseScene } from "./scene_parser";

const result = parseScene({
    name: "main",
    list: [
        {
            type: NodeType.GO,
            data: {
                id: 1,
                pid: 0,
                name: "test_go",
                position: new Vector3(0, 0, 0),
                rotation: new Vector3(0, 0, 0),
                scale: new Vector3(1, 1, 1)
            }
        }
    ]
});

console.log(result);

// TODO: compare with succesful result