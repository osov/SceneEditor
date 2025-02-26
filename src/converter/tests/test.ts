import * as fs from 'fs';
import { Vector3 } from "three";
import { ExtDependenceType, NodeType, PrefabComponentType } from "../convert_types";
import { DefoldType, parseAtlas, parseFont, parsePrefab, parseScene, parseSpineScene } from "../scene_parser";

const result = parseScene({
    name: "/main/main",
    list: [
        {
            type: NodeType.GO,
            data: {
                id: 1,
                pid: 0,
                name: "test_go",
                position: new Vector3(0, 50, 0),
                rotation: new Vector3(0, 0, 0),
                scale: new Vector3(1, 1, 1)
            }
        },
        {
            type: NodeType.COLLECTION,
            data: {
                name: "/collections/test_collection",
                list: [
                    {
                        type: NodeType.GO,
                        data: {
                            id: 1,
                            pid: 0,
                            name: "test_go_inside_test_collection",
                            position: new Vector3(0, 0, 0),
                            rotation: new Vector3(0, 0, 90),
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
                texture: "test2",
                atlas: "/assets/test.atlas",
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
                position: new Vector3(270, 0, 0),
                rotation: new Vector3(0, 0, 45),
                scale: new Vector3(1, 1, 1),
                width: 100,
                height: 100,
                color: "#FFFFFF",
                text: "hello world",
                font: "/assets/test.ttf",
                line_break: true,
                outline: "#000000",
                shadow: "#000000",
                leading: 0.7
            }
        },
        {
            type: NodeType.SOUND,
            data: {
                name: "test_sound",
                path: "/assets/test.ogg",
                loop: true,
                group: "master",
                gain: 0.7,
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
                rotation: new Vector3(0, 0, -45),
                scale: new Vector3(1, 1, 1),
                width: 100,
                height: 100,
                color: "#FFFFFF",
                texture: "test",
                atlas: "/assets/test.atlas",
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
                width: 300,
                height: 100,
                color: "#FFFFFF",
                slice_width: 0,
                slice_height: 0,
                stencil: false,
                visible: false,
                enabled: true,
                alpha: 1,
                pivot: [1, -1]
            }
        },
        {
            type: NodeType.GUI_TEXT,
            data: {
                id: 7,
                pid: 6,
                name: "test_gui_text",
                position: new Vector3(55, 0, 0),
                rotation: new Vector3(0, 0, 45),
                scale: new Vector3(1, 1, 1),
                width: 100,
                height: 100,
                text: "hello world from gui",
                font: "/assets/test.font",
                line_break: true,
                leading: 0.5,
                color: "#FF0000",
                outline: "#FFFFFF",
                outline_alpha: 1,
                shadow: "#FFFFFF",
                shadow_alpha: 1,
                visible: true,
                enabled: true,
                alpha: 1,
                pivot: [0, 1]
            }
        },
        {
            type: NodeType.GUI_SPINE,
            data: {
                id: 10,
                pid: 4,
                name: "firework_gui",
                position: new Vector3(0, 200, 0),
                rotation: new Vector3(0, 0, 0),
                scale: new Vector3(1, 1, 1),
                width: 300,
                height: 100,
                color: "#FFFFFF",
                spine_scene: "/assets/firework/firework.spinescene",
                default_animation: "firework",
                skin: "",
                stencil: false,
                visible: true,
                enabled: true,
                alpha: 1,
                pivot: [1, -1]
            }
        },
        {
            type: NodeType.GUI_SPINE,
            data: {
                id: 12,
                pid: 4,
                name: "dog_gui",
                position: new Vector3(200, 0, 0),
                rotation: new Vector3(0, 0, 0),
                scale: new Vector3(0.5, 0.5, 1),
                width: 300,
                height: 100,
                color: "#FFFFFF",
                spine_scene: "/assets/dog/dog.spinescene",
                default_animation: "idle",
                skin: "",
                stencil: false,
                visible: true,
                enabled: true,
                alpha: 1,
                pivot: [1, -1]
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
                name: "test_factory",
                type: ExtDependenceType.GO_FACTORY,
                path: "/main/test_prefab.prefab"
            }
        },
        {
            type: NodeType.COLLECTION_PROXY,
            data: {
                name: "test_collection_proxy",
                type: ExtDependenceType.COLLECTION_PROXY,
                path: "/collections/test_other_scene.scene"
            }
        },
        {
            type: NodeType.COLLECTION_FACTORY,
            data: {
                name: "test_collection_factory",
                type: ExtDependenceType.COLLECTION_FACTORY,
                path: "/collections/test_collection.scene"
            }
        },
        {
            type: NodeType.SPINE_MODEL,
            data: {
                id: 9,
                pid: 0,
                name: "firework_model",
                position: new Vector3(360, 550, 0),
                rotation: new Vector3(0, 0, 0),
                scale: new Vector3(1, 1, 1),
                spine_scene: "/assets/firework/firework.spinescene",
                default_animation: "firework",
                skin: ""
            }
        },
        {
            type: NodeType.SPINE_MODEL,
            data: {
                id: 11,
                pid: 0,
                name: "dog_model",
                position: new Vector3(480, 0, 0),
                rotation: new Vector3(0, 0, 0),
                scale: new Vector3(0.5, 0.5, 1),
                spine_scene: "/assets/dog/dog.spinescene",
                default_animation: "idle",
                skin: ""
            }
        },
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
                rotation: new Vector3(0, 0, 45),
                scale: new Vector3(1, 2, 1),
                width: 200,
                height: 100,
                color: "#FFFFFF",
                texture: "test",
                atlas: "/assets/test.atlas",
                slice_width: 10,
                slice_height: 5
            }
        },
        {
            type: PrefabComponentType.LABEL,
            data: {
                id: 0,
                pid: 0,
                name: "test_prefab_lable",
                position: new Vector3(0, 230, 0),
                rotation: new Vector3(180, 0, 45),
                scale: new Vector3(1, 1, 2),
                width: 1000,
                height: 100,
                color: "#FF0000",
                text: "hello world",
                font: "/assets/test.ttf",
                line_break: true,
                outline: "#FFFFFF",
                shadow: "#000000",
                leading: 0.7
            }

        }
    ]
}));

result.push(parseAtlas({
    name: "assets/test",
    images: [
        "/assets/test.png",
        "/assets/subdir/test2.png"
    ]
}));

result.push(parseAtlas({
    name: "assets/firework/firework",
    images: [
        "/assets/firework/images/ball_2_big.png",
        "/assets/firework/images/Firework_01.png",
        "/assets/firework/images/Firework_02.png",
        "/assets/firework/images/Firework_03.png",
        "/assets/firework/images/Firework_04.png",
        "/assets/firework/images/Firework_05.png",
        "/assets/firework/images/Firework_06.png",
        "/assets/firework/images/Firework_07.png",
        "/assets/firework/images/Firework_08.png",
        "/assets/firework/images/Firework_09.png",
        "/assets/firework/images/Firework_10.png",
        "/assets/firework/images/Firework_11.png",
        "/assets/firework/images/Firework_12.png",
        "/assets/firework/images/Firework_13.png",
        "/assets/firework/images/Firework_14.png",
        "/assets/firework/images/Firework_15.png",
        "/assets/firework/images/Firework_16.png",
        "/assets/firework/images/Firework_17.png",
        "/assets/firework/images/Firework_18.png",
        "/assets/firework/images/Firework_19.png",
        "/assets/firework/images/Firework_20.png",
        "/assets/firework/images/Firework_21.png",
        "/assets/firework/images/Firework_22.png",
        "/assets/firework/images/Firework_23.png",
        "/assets/firework/images/Firework_24.png",
        "/assets/firework/images/Firework_25.png",
        "/assets/firework/images/Firework_26.png",
        "/assets/firework/images/Firework_27.png",
        "/assets/firework/images/Firework_28.png",
        "/assets/firework/images/Firework_29.png",
        "/assets/firework/images/Firework_30.png",
    ]
}));

result.push(parseSpineScene({
    name: "assets/firework/firework",
    json: "/assets/firework/firework.spinejson",
    atlas: "/assets/firework/firework.atlas"

}));

result.push(parseFont({
    font: "/assets/test.ttf",
    outline_width: 1,
    outline_alpha: 1,
    shadow_x: 100,
    shadow_alpha: 1,
    shadow_blur: 1,
    alpha: 1,
    size: 80
}));

result.push(...parseScene({
    name: "/collections/test_other_scene",
    list: [
        {
            type: NodeType.GO,
            data: {
                id: 1,
                pid: 0,
                name: "test_go",
                position: new Vector3(0, 50, 0),
                rotation: new Vector3(0, 0, 0),
                scale: new Vector3(1, 1, 1)
            }
        }
    ]
}));

for (const file of result) {
    switch (file.type) {
        case DefoldType.COLLECTION:
            fs.writeFile(`${__dirname}/test_project/${file.name}.collection`, file.data, (err: NodeJS.ErrnoException | null) => {
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
        case DefoldType.SPINE:
            fs.writeFile(`${__dirname}/test_project/${file.name}.spinescene`, file.data, (err: NodeJS.ErrnoException | null) => {
                if (err) console.error(err);
                else console.log(`Succeful created ${file.name}.spinescene`);
            });
            break;
    }
}