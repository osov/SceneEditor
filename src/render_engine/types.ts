import { Vector3 } from "three";

interface INodeBase {
    id: string;
    position: Vector3;
    scale: Vector3;
    rotation: Vector3;
}

interface IGuiNode extends INodeBase {
    enabled: boolean;
    visible: boolean;
    color: string; // hex формат #RRGGBB
    alpha: number; // 0..1
    width: number;
    height: number;
    pivot: number[]; // массив 2х чисел
}

interface IGuiBox extends IGuiNode {
    texture: string;
    atlas: string;
    slice_width: number;
    slice_height: number;
    stencil: boolean;
}

interface IGuiText extends IGuiNode {
    text: string;
    line_break:boolean;
    font:string;
    text_leading?:number;
    outline?:string; // hex формат #RRGGBB
    outline_alpha?:number; // 0..1
    shadow?:string; // hex формат #RRGGBB
    shadow_alpha?:number; // 0..1
}
/*
При конвертации данных:
-  width и height  в дефолде ставим size, 
- SizeMode = Manual
- inherit alpha - false
- slice_width - выставляем одинаковые числа для slice9 L/R
- slice_height - выставляем одинаковые числа для slice9 T/B
- pivot имеет массив 2х значения из вариантов -1, 0, 1
- если stencil = true, то задает Clipping Mode = Stencil
*/