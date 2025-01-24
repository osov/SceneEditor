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
        },
        {
            type: NodeType.COLLECTION,
            data: {
                name: "test_collection",
                list: [
                    {
                        type: NodeType.GO,
                        data: {
                            // ISSUE: ids inside new collection begin from zero ?
                            id: 1,
                            pid: 0,
                            name: "test_go_inside_test_collection",
                            position: new Vector3(0, 0, 0),
                            rotation: new Vector3(0, 0, 0),
                            scale: new Vector3(1, 1, 1)
                        }
                    }
                ]
            }
        },
        {
            type: NodeType.GO,
            data: {
                id: 2,
                pid: 0,
                name: "test_go2",
                position: new Vector3(0, 0, 0),
                rotation: new Vector3(0, 0, 0),
                scale: new Vector3(1, 1, 1)
            }
        },
        {
            type: NodeType.GUI,
            data: {
                id: 3,
                pid: 0,
                name: "ui",

                // ISSUE: haven't this fields on GUI ?
                position: new Vector3(0, 0, 0),
                rotation: new Vector3(0, 0, 0),
                scale: new Vector3(1, 1, 1),
                enabled: true,
                visible: true,
                alpha: 1,
                pivot: [0, 0]
            }
        },
        {
            type: NodeType.GUI_BOX,
            data: {
                id: 4,
                pid: 3,
                name: "test_gui_box",
                position: new Vector3(0, 0, 0),
                rotation: new Vector3(0, 0, 0),
                scale: new Vector3(1, 1, 1),
                width: 100,
                height: 100,
                color: "#FFFFFF",
                texture: "test",
                atlas: "test.atlas",
                slice_width: 0,
                slice_height: 0,
                stencil: false,
                visible: true,
                enabled: true,
                alpha: 1,
                pivot: [0, 0]
            }
        }
    ]
});

console.log(result);

// TODO: compare with succesful result