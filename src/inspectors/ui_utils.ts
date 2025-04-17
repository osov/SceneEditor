import { Texture, Vector2 } from "three";
import { IBaseMeshAndThree, IObjectTypes } from "../render_engine/types";


export function get_selected_one_mesh() {
    const selected_list = SelectControl.get_selected_list();
    if (selected_list.length != 1)
        return;
    const mesh = selected_list[0];
    if (mesh.type != IObjectTypes.GO_SPRITE_COMPONENT)
        return;
    return mesh;
}


export function get_hash_by_mesh(mesh: IBaseMeshAndThree) {
    let key = mesh.name;
    if (mesh.userData && mesh.userData.tile)
        key = mesh.userData.tile.x + '.' + mesh.userData.tile.y;
    return key;
}


export function get_mesh_by_hash(key: string) {
    let m!: IBaseMeshAndThree;
    RenderEngine.scene.traverse((child) => {
        const k = get_hash_by_mesh(child as IBaseMeshAndThree);
        if (k == key)
            m = child as IBaseMeshAndThree;
    });
    return m;
}


const last_pos = new Vector2();
export function get_raycast_point_uv(x: number, y: number, mesh: IBaseMeshAndThree) {
    const raycaster = RenderEngine.raycaster;
    const camera = RenderEngine.camera;
    raycaster.setFromCamera(new Vector2(x, y), camera);
    raycaster.layers.enable(RenderEngine.DC_LAYERS.RAYCAST_LAYER);
    const list = raycaster.intersectObject(mesh);
    if (last_pos.x == 0 && last_pos.y == 0)
        last_pos.set(x, y);
    if (list.length > 0)
        return list[0].uv!;
    else
        return null;
}

export function set_raycast_last_pos(x: number, y: number) {
    last_pos.set(x, y);
}

export function get_name_atlas_by_texture(tex:Texture){
    const all = ResourceManager.get_all_textures();
    for (let i = 0; i < all.length; i++) {
        if (all[i].data.texture == tex)
            return all[i].atlas + '/' +  all[i].name; 
    }
    return '';
}

export function CreateDrawCanvas(size_x: number, size_y: number, brush_size = 40, fillColor = "rgb(0, 0, 0)") {
    const canvas = document.createElement("canvas");
    canvas.width = size_x;
    canvas.height = size_y;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    function set_size(size: number) {
        brush_size = size / 10;
    }

    function draw(x: number, y: number, colors: number[]) {
        x *= size_x;
        y *= size_y;

        let imageData = ctx.getImageData(x - brush_size, y - brush_size, brush_size * 2, brush_size * 2);
        let data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            let px = (i / 4) % (brush_size * 2);
            let py = Math.floor(i / 4 / (brush_size * 2));

            let dist = Math.sqrt((px - brush_size) ** 2 + (py - brush_size) ** 2) / brush_size;
            if (dist > 1) continue;

            let fade = 1 - dist;

            let oldR = data[i];
            let oldG = data[i + 1];
            let oldB = data[i + 2];

            let newR = Math.floor(colors[0] * fade + oldR * (1 - fade));
            let newG = Math.floor(colors[1] * fade + oldG * (1 - fade));
            let newB = Math.floor(colors[2] * fade + oldB * (1 - fade));

            data[i] = newR;
            data[i + 1] = newG;
            data[i + 2] = newB;
        }

        ctx.putImageData(imageData, x - brush_size, y - brush_size);
    }

    function draw_flow(x: number, y: number, dx: number, dy: number,flow_strength:number) {
        x *= size_x;
        y *= size_y;
        let len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
            dx /= len;
            dy /= len;
        }

        let centerR = Math.floor((dx * flow_strength + 1) * 127.5);
        let centerG = Math.floor((dy * flow_strength + 1) * 127.5);
        let centerB = (dx == 0 && dy == 0) ? 0 : 128;
        let imageData = ctx.getImageData(x - brush_size, y - brush_size, brush_size * 2, brush_size * 2);
        let data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            let px = (i / 4) % (brush_size * 2);
            let py = Math.floor(i / 4 / (brush_size * 2));

            let dist = Math.sqrt((px - brush_size) ** 2 + (py - brush_size) ** 2) / brush_size;
            if (dist > 1) continue;

            let fade = 1 - dist;

            let oldR = data[i];
            let oldG = data[i + 1];

            let newR = Math.floor(centerR * fade + oldR * (1 - fade));
            let newG = Math.floor(centerG * fade + oldG * (1 - fade));

            data[i] = newR;
            data[i + 1] = newG;
            data[i + 2] = centerB;
        }

        ctx.putImageData(imageData, x - brush_size, y - brush_size);
    }

    function loadTexture(texture: Texture, callback?: () => void) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            if (callback) callback();
        };

        // Проверяем, есть ли источник изображения
        if (texture.image && texture.image.src) {
            img.src = texture.image.src;
        } else {
            console.warn("Текстура не содержит изображение или источник.");
        }
    }

    function getCanvas() {
        return canvas;
    }

    return { draw, draw_flow, getCanvas, loadTexture, set_size };
}

export type IDrawCanvas = ReturnType<typeof CreateDrawCanvas>;
