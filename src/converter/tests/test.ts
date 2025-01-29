import * as fs from 'fs';
import { Vector3 } from "three";
import { ExtDependenceType, NodeType, PrefabComponentType } from "../../render_engine/convert_types";
import { DefoldType, parseAtlas, parseFont, parsePrefab, parseScene } from "../scene_parser";

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
                atlas: "/main/test.atlas",
                slice_width: 0,
                slice_height: 0
            }
        },
        {
            type: NodeType.LABEL,
            data: {
                id: 3,
                pid: 0,
                name: "test_label",
                position: new Vector3(0, 0, 0),
                rotation: new Vector3(0, 0, 0),
                scale: new Vector3(1, 1, 1),
                width: 100,
                height: 100,
                color: "#FFFFFF",
                text: "hello world",
                font: "/main/test.ttf",
                line_break: true,
                outline: "#000000",
                shadow: "#000000",
                leading: 0.1
            }
        },
        {
            type: NodeType.SOUND,
            data: {
                name: "test_sound",
                path: "/main/test.ogg",
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
                name: "/main/ui"
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
                atlas: "test.atlas",
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
        {
            type: NodeType.FACTORY,
            data: {
                name: "test_prefab",
                type: ExtDependenceType.GO_FACTORY,
                path: "/main/test_prefab.prefab"
            }
        },
        {
            type: NodeType.COLLECTION_PROXY,
            data: {
                name: "test_collection_proxy",
                type: ExtDependenceType.COLLECTION_PROXY,
                path: "/main/test_collection.scene"
            }
        },
        {
            type: NodeType.COLLECTION_FACTORY,
            data: {
                name: "test_collection_factory",
                type: ExtDependenceType.COLLECTION_FACTORY,
                path: "/main/test_collection.scene"
            }
        }
    ]
});

result.push(parsePrefab({
    name: "/main/test_prefab",
    data: [
        {
            type: PrefabComponentType.SPRITE,
            data: {
                id: 0,
                pid: 0,
                name: "test_prefab_sprite",
                position: new Vector3(0, 0, 0),
                rotation: new Vector3(0, 0, 0),
                scale: new Vector3(1, 1, 1),
                width: 100,
                height: 100,
                color: "#FFFFFF",
                texture: "test",
                atlas: "/main/test.atlas",
                slice_width: 0,
                slice_height: 0
            }
        },
        {
            type: PrefabComponentType.LABEL,
            data: {
                id: 0,
                pid: 0,
                name: "test_prefab_lable",
                position: new Vector3(0, 200, 0),
                rotation: new Vector3(0, 0, 0),
                scale: new Vector3(1, 1, 1),
                width: 1000,
                height: 100,
                color: "#FFFFFF",
                text: "hello world",
                font: "/main/test.ttf",
                line_break: true,
                outline: "#000000",
                shadow: "#000000",
                leading: 0.7
            }

        }
    ]
}));

result.push(parseAtlas({
    name: "main/test",
    images: [
        "main/test.png"
    ]
}));

result.push(parseFont({
    font: "/main/test.ttf",
    size: 80
}));

for (const file of result) {
    switch (file.type) {
        case DefoldType.COLLECTION:
            fs.writeFile(`${__dirname}/test_project/main/${file.name}.collection`, file.data, (err: NodeJS.ErrnoException | null) => {
                if (err) console.error(err);
                else console.log(`Succeful created ${file.name}.collection`);
            });
            break;
        case DefoldType.GO:
            fs.writeFile(`${__dirname}/test_project/${file.name}.go`, file.data, (err: NodeJS.ErrnoException | null) => {
                if (err) console.error(err);
                else console.log(`Succeful created ${file.name}.go`);
            });
            break;
        case DefoldType.GUI:
            fs.writeFile(`${__dirname}/test_project/${file.name}.gui`, file.data, (err: NodeJS.ErrnoException | null) => {
                if (err) console.error(err);
                else console.log(`Succeful created ${file.name}.gui`);
            });
            break;
        case DefoldType.ATLAS:
            fs.writeFile(`${__dirname}/test_project/${file.name}.atlas`, file.data, (err: NodeJS.ErrnoException | null) => {
                if (err) console.error(err);
                else console.log(`Succeful created ${file.name}.atlas`);
            });
            break;
        case DefoldType.FONT:
            fs.writeFile(`${__dirname}/test_project/${file.name}.font`, file.data, (err: NodeJS.ErrnoException | null) => {
                if (err) console.error(err);
                else console.log(`Succeful created ${file.name}.font`);
            });
            break;
    }
}