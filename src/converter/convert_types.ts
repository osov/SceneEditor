import { Vector3 } from "three";


export enum NodeType {
    GO,
    SPRITE,
    LABEL,
    SOUND,
    SPINE_MODEL,
    SCRIPT,
    FACTORY,
    COLLECTION_PROXY,
    COLLECTION_FACTORY,
    COLLECTION,
    GUI,
    GUI_BOX,
    GUI_TEXT,
    GUI_SPINE
}

// для создания данных коллекции
export interface INodesList {
    list: NodeData[];
    name: string;
}

export interface NodeData {
    type: NodeType;
    data: NodeDataType;
}

export type NodeDataType = INodesList | INodeEmpty | ISprite | ILabel | ISpineModel | ISound | IGui | IGuiNode | IGuiBox | IGuiText | IGuiSpine | IExtDependencies;

/*
    type - варианты - gui, gui_box, gui_text, sprite, label, go_empty(INodeEmpty), sound, [script, factory, collection_factory, collection_proxy], 
    data - один из интерфейсов перечисленных ниже

    при создании объекта gui создается гуи файл с содержимым дочерних элементов, состоящих из гуи и соответственно в коллекцию подключается этот гуи файл как мы обычно прописываем в своих играх = гошка ui + ссылка на файл гуи,
    при этом туда же прописывается атласы и шрифты на основе анализа зависимостей, те может быть у нас 3 атласа, но в этом гуи используется 1 лишь то один и подключаем, аналогично со шрифтом,
    а также сюда создаем файл для гуи логики с таким же именем и подключаем к этому гуи
    
    при создании [script, factory, collection_factory, collection_proxy] - IExtDependices создаем гошку в корне(с указанным именем), в которую помещаем ссылку на объект данного типа
   
    при создании ISprite или ILabel создаем отдельно гошку с заданным имененм, в которую помещаем соответствующий компонент с именем по умолчанию для компонентов 

    соответственно нужен метод для создания конкретных данных под определенные файлы: .go, .collection, .gui
   
*/

export interface INodeEmpty {
    id: number; // не для дефолда
    pid: number;  // не для дефолда
    name: string; // в дефолде это будет id
    position: Vector3;
    scale: Vector3;
    rotation: Vector3;
}

export interface INodeBase extends INodeEmpty {
    width: number;
    height: number;
    color: string; // hex формат #RRGGBB
}

export interface IGui {
    id: number;
    pid: number;
    name: string;
}

export interface IGuiNode extends INodeBase {
    enabled: boolean;
    visible: boolean;
    color: string; // hex формат #RRGGBB
    alpha: number; // 0..1
    pivot: number[]; // массив 2х чисел
}

export interface IGuiBox extends IGuiNode {
    texture?: string; // имя изображения в атласе
    atlas?: string; // путь до .atlas
    slice_width: number;
    slice_height: number;
    stencil: boolean;
}

export interface IGuiText extends IGuiNode {
    text: string;
    font: string; // путь до .ttf
    line_break: boolean;
    leading?: number;
    outline?: string; // hex формат #RRGGBB
    outline_alpha?: number; // 0..1
    shadow?: string; // hex формат #RRGGBB
    shadow_alpha?: number; // 0..1
}

export interface IGuiSpine extends IGuiNode {
    spine_scene: string;
    default_animation: string;
    skin: string;
}

export interface ISound {
    name: string;
    path: string; // путь до .ogg
    loop: boolean;
    group: string;
    gain: number;
    pan: number;
    speed: number;
}

export interface ISprite extends INodeBase {
    texture: string; // имя изображения в атласе
    atlas: string; // путь до .atlas
    slice_width: number;
    slice_height: number;
    // важное замечание, тк тут есть переданное свойство color то чтобы не разбивать батчинг будем потом использовать вертексные атрибуты https://defold.com/examples/material/vertexcolor/
    // и менять материал на другой, но пока на текущем этапе тупо используем базовый
}

export interface ILabel extends INodeBase {
    text: string;
    font: string;
    line_break: boolean;
    outline: string; // hex формат #RRGGBB
    shadow: string; // hex формат #RRGGBB
    leading: number;
    // материал должен быть label-df
}

export interface ISpineModel extends INodeEmpty {
    spine_scene: string;
    default_animation: string;
    skin: string;
}

export enum PrefabComponentType {
    SPRITE,
    LABEL
}

export type PrefabDataType = ISprite | ILabel;

export interface IPrefabData {
    type: PrefabComponentType;
    data: PrefabDataType;
}

export interface IPrefab {
    name: string;
    data: IPrefabData[];
}

export enum ExtDependenceType {
    COLLECTION_PROXY,
    COLLECTION_FACTORY,
    GO_FACTORY
}

export interface IExtDependencies {
    name: string;
    type: ExtDependenceType;
    path: string; // путь до .scene или .go
}

export interface IAtlas {
    name: string;
    images: string[]; // пути до пнгшек
}

export interface IFont {
    font: string;
    size: number;
    outline_width?: number;
    outline_alpha?: number;
    shadow_x?: number;
    shadow_y?: number;
    shadow_alpha?: number;
    shadow_blur?: number;
    alpha?: number;
}

export interface ISpineScene {
    name: string;
    json: string; // путь до .spinejson
    atlas: string; // путь до .atlas
}

/*
При конвертации данных:
- если свойства не указаны(undefined|null) то ставим дефолтные значения
- свойство name соответствует в дефолде id
- а вот свойство id здесь нужно лишь для соответствия дочерний/родительский элемент, pid - это ид родителя
-  width и height  в дефолде ставим size, 
- SizeMode = Manual
- inherit alpha - false
- slice_width - выставляем одинаковые числа для slice9 L/R
- slice_height - выставляем одинаковые числа для slice9 T/B
- pivot имеет массив 2х значения из вариантов -1, 0, 1
- если stencil = true, то задает Clipping Mode = Stencil

*/