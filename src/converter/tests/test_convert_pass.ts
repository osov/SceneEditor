import * as fs from 'fs';
import { Vector3 } from "three";
import { INodesList, NodeData, NodeType } from "../convert_types";
import { DefoldData, DefoldType, parseAtlas, parseScene } from "../scene_parser";
import { IBaseEntityData, IObjectTypes } from '../../render_engine/types';
import { TRecursiveDict } from '../../modules_editor/modules_editor_const';

import test_scene from './test_anim_scene.json';
import metadata from './test_anim_scene_project/assets/metadata.json';
import path from 'path';

pass();

function pass() {
    const scene_data = test_scene as IBaseEntityData[];

    const main = {
        name: "/main/main",
        list: [] as NodeData[]
    };

    convert(scene_data, main);

    const result: DefoldData[] = parseScene(main);

    const atlases: { [key: string]: string[] } = {};
    main.list.forEach((node) => {
        if (![NodeType.SPRITE, NodeType.GUI_BOX].includes(node.type)) {
            return;
        }

        let atlas = (node.data as any).atlas;
        const texture = (node.data as any).texture;

        if (atlas == undefined || texture == undefined) {
            return;
        }

        atlas = atlas.replace('/assets/', '').replace('.atlas', '');

        if (atlas == undefined || texture == undefined || texture == '') {
            return;
        }

        if (atlases[atlas] == undefined) {
            atlases[atlas] = [];
        }

        if (!atlases[atlas].includes(texture)) {
            atlases[atlas].push(texture);
        }
    });

    const metadata_atlases = (metadata.atlases as TRecursiveDict);
    if (metadata_atlases == undefined) {
        console.error('Not found metadata for atlases!');
        return;
    }

    for (const [atlas, textures] of Object.entries(atlases)) {

        const metadata_atlas = metadata_atlases[atlas == 'default' ? '' : atlas] as TRecursiveDict;
        if (metadata_atlas == undefined) {
            console.error('Not found metadata for atlas:', atlas);
            return;
        }

        result.push(parseAtlas({
            name: `/assets/${atlas}`,
            images: textures.map((texture) => {
                let texture_info = metadata_atlas[texture] as { path: string, minFilter: number, magFilter: number };
                if (texture_info == undefined) {
                    console.error('Not found metadata for texture:', texture);
                    return '';
                }
                const texture_path = `/assets/${texture_info.path}`;
                return `${texture_path}`;
            })
        }));
    }

    generateFiles(result, `${__dirname}/test_anim_scene_project`);
}

function convert(data: IBaseEntityData[], nodes: INodesList) {
    data.forEach((entity) => {
        const mesh = entity.other_data as any;
        switch (entity.type) {
            case IObjectTypes.GO_CONTAINER:
                nodes.list.push({
                    type: NodeType.GO,
                    data: {
                        id: entity.id,
                        pid: entity.pid,
                        name: entity.name,
                        position: new Vector3().fromArray(entity.position),
                        rotation: new Vector3().fromArray(entity.rotation),
                        scale: new Vector3().fromArray(entity.scale)
                    }
                });
                break;

            case IObjectTypes.GO_SPRITE_COMPONENT:
                const sprite_info = mesh?.material_uniforms?.u_texture;
                const sprite_atlas = sprite_info ? sprite_info.split('/')[0] : '';
                const sprite_texture = sprite_info ? sprite_info.split('/')[1] : '';
                nodes.list.push({
                    type: NodeType.SPRITE,
                    data: {
                        id: entity.id,
                        pid: entity.pid,
                        name: entity.name,
                        position: new Vector3().fromArray(entity.position),
                        rotation: new Vector3().fromArray(entity.rotation),
                        scale: new Vector3().fromArray(entity.scale),
                        width: mesh.size ? mesh.size[0] : 100,
                        height: mesh.size ? mesh.size[1] : 100,
                        color: mesh.color,
                        texture: sprite_texture,
                        atlas: `/assets/${sprite_atlas != '' ? sprite_atlas : 'default'}.atlas`,
                        slice_width: mesh.slice_width,
                        slice_height: mesh.slice_height
                    }
                });
                break;

            case IObjectTypes.GO_LABEL_COMPONENT:
                nodes.list.push({
                    type: NodeType.LABEL,
                    data: {
                        id: entity.id,
                        pid: entity.pid,
                        name: entity.name,
                        position: new Vector3().fromArray(entity.position),
                        rotation: new Vector3().fromArray(entity.rotation),
                        scale: new Vector3().fromArray(entity.scale),
                        width: mesh.size ? mesh.size[0] : 100,
                        height: mesh.size ? mesh.size[1] : 100,
                        color: mesh.color,
                        text: mesh.text,
                        font: `/assets/${mesh.font}.font`,
                        line_break: true,
                        outline: "#000000",
                        shadow: "#000000",
                        leading: 0.7
                    }
                });
                break;

            case IObjectTypes.GUI_CONTAINER:
                nodes.list.push({
                    type: NodeType.GUI,
                    data: {
                        id: entity.id,
                        pid: entity.pid,
                        name: `/main/${entity.name}`,
                    }
                });
                break;

            case IObjectTypes.GUI_BOX:
                const box_info = mesh?.material_uniforms?.u_texture;
                const box_atlas = box_info ? box_info.split('/')[0] : undefined;
                const box_texture = box_info ? box_info.split('/')[1] : undefined;
                nodes.list.push({
                    type: NodeType.GUI_BOX,
                    data:
                    {
                        id: entity.id,
                        pid: entity.pid,
                        name: entity.name,
                        position: new Vector3().fromArray(entity.position),
                        rotation: new Vector3().fromArray(entity.rotation),
                        scale: new Vector3().fromArray(entity.scale),
                        width: mesh.size[0],
                        height: mesh.size[1],
                        color: mesh.color,
                        texture: box_texture,
                        atlas: box_atlas ? `/assets/${box_atlas != '' ? box_atlas : 'default'}.atlas` : undefined,
                        slice_width: mesh.slice_width,
                        slice_height: mesh.slice_height,
                        stencil: false,
                        visible: entity.visible,
                        enabled: true,
                        alpha: 1,
                        pivot: mesh.pivot ? [mesh.pivot.x, mesh.pivot.y] : [0.5, 0.5]
                    }
                });
                break;

            case IObjectTypes.GUI_TEXT:
                nodes.list.push({
                    type: NodeType.GUI_TEXT,
                    data: {
                        id: entity.id,
                        pid: entity.pid,
                        name: entity.name,
                        position: new Vector3().fromArray(entity.position),
                        rotation: new Vector3().fromArray(entity.rotation),
                        scale: new Vector3().fromArray(entity.scale),
                        width: mesh.size ? mesh.size[0] : 100,
                        height: mesh.size ? mesh.size[1] : 100,
                        text: mesh.text,
                        font: `/assets/${mesh.font}.font`,
                        line_break: true,
                        leading: 0.5,
                        color: mesh.color,
                        outline: "#FFFFFF",
                        outline_alpha: 1,
                        shadow: "#FFFFFF",
                        shadow_alpha: 1,
                        visible: entity.visible,
                        enabled: true,
                        alpha: 1,
                        pivot: mesh.pivot ? [mesh.pivot.x, mesh.pivot.y] : [0.5, 0.5]
                    }
                });
                break;
        }

        if (entity.children) {
            convert(entity.children, nodes);
        }
    });
}

function generateFiles(data: DefoldData[], path_to_project: string) {
    for (const file of data) {
        switch (file.type) {
            case DefoldType.COLLECTION:
                const path_to_file = `${path_to_project}/${file.name}.collection`;
                fs.mkdir(path.dirname(path_to_file), { recursive: true }, (err: NodeJS.ErrnoException | null) => {
                    if (err) console.error(err);
                    fs.writeFile(path_to_file, file.data, (err: NodeJS.ErrnoException | null) => {
                        if (err) console.error(err);
                        else console.log(`Succeful created ${file.name}.collection`);
                    });
                });
                break;
            case DefoldType.GO:
                fs.writeFile(`${path_to_project}/${file.name}.go`, file.data, (err: NodeJS.ErrnoException | null) => {
                    if (err) console.error(err);
                    else console.log(`Succeful created ${file.name}.go`);
                });
                break;
            case DefoldType.GUI:
                fs.writeFile(`${path_to_project}/${file.name}.gui`, file.data, (err: NodeJS.ErrnoException | null) => {
                    if (err) console.error(err);
                    else console.log(`Succeful created ${file.name}.gui`);
                });
                break;
            case DefoldType.ATLAS:
                fs.writeFile(`${path_to_project}/${file.name}.atlas`, file.data, (err: NodeJS.ErrnoException | null) => {
                    if (err) console.error(err);
                    else console.log(`Succeful created ${file.name}.atlas`);
                });
                break;
            case DefoldType.FONT:
                fs.writeFile(`${path_to_project}/${file.name}.font`, file.data, (err: NodeJS.ErrnoException | null) => {
                    if (err) console.error(err);
                    else console.log(`Succeful created ${file.name}.font`);
                });
                break;
            case DefoldType.SPINE:
                fs.writeFile(`${path_to_project}/${file.name}.spinescene`, file.data, (err: NodeJS.ErrnoException | null) => {
                    if (err) console.error(err);
                    else console.log(`Succeful created ${file.name}.spinescene`);
                });
                break;
        }
    }
}