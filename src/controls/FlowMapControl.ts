export function register_flow_map_control() {
    (window as any).FlowMapControl = FlowMapControlCreate();
}

function FlowMapControlCreate() {
    function init() {
        //  EventBus.trigger('SYS_VIEW_INPUT_KEY_UP', { key: e.key, target: e.target }, false);
    }

    return {
        init
    }
}


function CreateDrawCanvas(canvas_size: number, brush_size = 40, flow_strength = 0.8) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas_size;
    canvas.height = canvas_size;
    const ctx = canvas.getContext("2d")!;
    // Начальный цвет (нейтральный flow-map цвет)
    ctx.fillStyle = "rgb(128, 128, 0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    function draw(x: number, y: number, dx: number, dy: number) {
        let len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
            dx /= len;
            dy /= len;
        }

        let centerR = Math.floor((dx * flow_strength + 1) * 127.5);
        let centerG = Math.floor((dy * flow_strength + 1) * 127.5);
        let centerB = 128; // Нейтральный цвет

        let imageData = ctx.getImageData(x - brush_size, y - brush_size, brush_size * 2, brush_size * 2);
        let data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            let px = (i / 4) % (brush_size * 2);
            let py = Math.floor(i / 4 / (brush_size * 2));

            let dist = Math.sqrt((px - brush_size) ** 2 + (py - brush_size) ** 2) / brush_size;
            if (dist > 1) continue;

            let fade = 1 - dist; // Чем дальше от центра, тем меньше влияние

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

    function exportImage() {
        return canvas.toDataURL();
    }

    function getCanvas() {
        return canvas;
    }

    return { draw, exportImage, getCanvas };
}

