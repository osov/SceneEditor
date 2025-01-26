import { Vector3 } from "three";
import { NodeType } from "../render_engine/convert_types";
import { parsePrefab, parseScene } from "./scene_parser";

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
                            id: 0,
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
            type: NodeType.SPRITE,
            data: {
                id: 2,
                pid: 0,
                name: "test_sprite",
                position: new Vector3(0, 0, 0),
                rotation: new Vector3(0, 0, 0),
                scale: new Vector3(1, 1, 1),
                width: 100,
                height: 100,
                color: "#FFFFFF",
                texture: "test",
                atlas: "test.atlas",
                slice_width: 0,
                slice_height: 0
            }
        },
        {
            type: NodeType.LABEL,
            data: {
                id: 3,
                pid: 0,
                name: "test_lable",
                position: new Vector3(0, 0, 0),
                rotation: new Vector3(0, 0, 0),
                scale: new Vector3(1, 1, 1),
                width: 100,
                height: 100,
                text: "hello world",
                font: "test.ttf",
                line_break: true,
                outline: "#000000",
                shadow: "#000000",
                leading: 0.1
            }
        },
        {
            type: NodeType.SOUND,
            data: {
                name: "test",
                path: "test.ogg",
                loop: true,
                group: "master",
                gain: 1,
                pan: 1,
                speed: 1
            }
        },
        {
            type: NodeType.GUI,
            data: {
                id: 4,
                pid: 0,
                name: "ui"
            }
        },
        {
            type: NodeType.GUI_BOX,
            data: {
                id: 5,
                pid: 4,
                name: "test_gui_box",
                position: new Vector3(0, 0, 0),
                rotation: new Vector3(0, 0, 0),
                scale: new Vector3(1, 1, 1),
                width: 100,
                height: 100,
                color: "#FFFFFF",
                texture: "test",
                atlas: "./test.atlas",
                slice_width: 0,
                slice_height: 0,
                stencil: false,
                visible: true,
                enabled: true,
                alpha: 1,
                pivot: [1, 0]
            }
        },
        {
            type: NodeType.GUI_BOX,
            data: {
                id: 6,
                pid: 5,
                name: "test_child_gui_box",
                position: new Vector3(0, 0, 0),
                rotation: new Vector3(0, 0, 0),
                scale: new Vector3(1, 1, 1),
                width: 100,
                height: 100,
                color: "#FFFFFF",
                texture: "",
                atlas: "",
                slice_width: 0,
                slice_height: 0,
                stencil: false,
                visible: false,
                enabled: true,
                alpha: 1,
                pivot: [0, 0]
            }
        },
        {
            type: NodeType.GUI_TEXT,
            data: {
                id: 7,
                pid: 6,
                name: "test_gui_text",
                position: new Vector3(0, 0, 0),
                rotation: new Vector3(0, 0, 0),
                scale: new Vector3(1, 1, 1),
                width: 100,
                height: 100,
                text: "hello world from gui",
                font: "test.ttf",
                line_break: true,
                leading: 0.5,
                outline: "#FFFFFF",
                outline_alpha: 1,
                shadow: "#FFFFFF",
                shadow_alpha: 1,
                visible: true,
                enabled: true,
                alpha: 1,
                pivot: [0, 0]
            }
        },
        {
            type: NodeType.GO,
            data: {
                id: 8,
                pid: 1,
                name: "test_child_go",
                position: new Vector3(0, 0, 0),
                rotation: new Vector3(0, 0, 0),
                scale: new Vector3(1, 1, 1)
            }
        },
        // ISSUE: как это будет работать ?
        {
            type: NodeType.FACTORY,
            data: {
                name: "test_prefab",
                path: "./test_prefab.prefab"
            }
        }
    ]
});

// result.push(parse_prefab({}));

console.log(result);