/**
 * TreeControl - UI контрол для отображения иерархии сцены
 *
 * Управляет деревом объектов, drag-drop, контекстное меню.
 */

import { deepClone } from "../modules/utils";
import { contextMenuItem } from "./ContextMenu";
import { NodeAction, NodeActionGui, NodeActionGo, worldGo, worldGui, componentsGo, ParamsTexture } from "../shared/types";
import { IObjectTypes } from '../render_engine/types';
import { Vector2, Mesh } from "three";
import { ASSET_SCENE_GRAPH, TDictionary } from "./modules_editor_const";
import { DEFOLD_LIMITS } from "../config";
import { ComponentType } from "../render_engine/components/container_component";
import { Services } from '@editor/core';

// Alias для совместимости
type paramsTexture = ParamsTexture;

// Типы для Three.js объектов
interface TreeMeshObject {
    type?: string;
    mesh_data?: { id: number };
    worldToLocal(v: { x: number; y: number; z: number }): { x: number; y: number; z: number };
}

// Декларации глобальных объектов (legacy контролы - пока остаются как globals)
// ActionsControl имеет методы, которых нет в DI ActionsService
declare const ActionsControl: {
    from_the_same_world(list: unknown[], treeList: unknown[]): boolean;
    is_valid_action(item: unknown, itemSelected?: unknown[], flag1?: boolean, flag2?: boolean): boolean;
    copy_mesh_list: unknown[];
    paste(flag1?: boolean, flag2?: boolean): unknown[];
    add_gui_container(params: unknown): void;
    add_gui_box(params: unknown): void;
    add_gui_text(params: unknown): void;
    add_go_container(params: unknown): void;
    add_go_sprite_component(params: unknown): void;
    add_go_label_component(params: unknown): void;
    add_go_model_component(params: unknown): void;
    add_go_animated_model_component(params: unknown): void;
    add_go_audio_component(params: unknown): void;
    add_component(params: unknown, type: number): void;
    add_go_with_sprite_component(params: unknown): void;
};
declare const AssetControl: {
    go_to_dir(dir: string, create?: boolean): Promise<boolean>;
    select_file(path: string): void;
    loadPartOfSceneInPos(path: string, pos: unknown): unknown;
};
declare const ControlManager: {
    draw_graph(): void;
    update_graph(): void;
};

declare global {
    const TreeControl: ReturnType<typeof TreeControlCreate>;
}

export function register_tree_control() {
    (window as any).TreeControl = TreeControlCreate();
}
interface Item {
    id: number;
    pid: number; // parent id родителя или 0 если это верх иерархии
    name: string;
    visible: boolean; // визуально отображаем чуть затемненным(что отключено)
    selected?: boolean; // выделен ли
    icon: string; // значок
    no_drag?: boolean; // нельзя брать тащить
    no_drop?: boolean; // нельзя положить внутрь
    no_rename?: boolean; // нельзя переименовывать(нужно будет для префабов например или корня сцены)
    no_remove?: boolean; // нельзя удалить
}

export type TreeItem = Item;

interface Contexts {
    [scene: string]: { [id: number]: boolean };
}

interface ChangesInfo {
    structureChanged: boolean;
    modifiedItems: Item[];
    newItems: Item[];
    deletedItems: number[];
};

function TreeControlCreate() {
    let treeList: Item[] = [];
    const contexts: Contexts = {};
    let currentSceneName: string = "root";
    let prevListSelected: number[] = [];
    let listSelected: number[] = [];
    let cutList: number[] = [];
    let shiftAnchorId: number | null = null; // якорь для Shift-выбора

    let _is_mousedown: boolean = false; // зажата ли при mousemove
    let _is_dragging: boolean = true;
    let _is_moveItemDrag: boolean = false; // если начали тащить 
    let _is_editItem: boolean = false; // ренейм возможен только в одном случае 
    let _is_currentOnly: boolean = false; // когда кликаем по единственному и текущему элементу 

    const divTree: any = document.querySelector('#wr_tree');
    let treeItem: any = null;
    let currentDroppable: any = null;
    let copyItemDrag: any = null;
    let itemDrag: any = null;
    let itemDrop: any = null;
    let isDrop: boolean = false;
    let countMove: number = 0;

    let hoverStart: number; // для добавления класса с задержкой
    let hoverEnd: number | null;
    let hoverTimer: ReturnType<typeof setTimeout>;

    let canBeOpened: boolean = false;

    let startY: number;
    let startX: number;
    let itemDragRenameId: number | null = null; // чтобы чекать DBLCLICK  или  при DELAY не выбрали ли другой элемент

    let boxDD: any = document.querySelector(".drag_and_drop"); // div таскания за мышью
    let ddVisible: boolean = false; //  видимость div перетаскивания 

    let elementCache: TDictionary<HTMLElement> = {}; // кэш элементов по ID
    let currentDropPosition: string | null = null; // текущая позиция drop (top, bottom, bg)


    function init() {
        paintIdenticalLive(".searchInTree", "#wr_tree .tree__item_name", "color_green", 777);
        canvasDropTexture();

        let params = new URLSearchParams(document.location.search);
        let hide_menu = params.get("hide_menu");
        if (hide_menu != null) {
            const menu_section = document.querySelectorAll(".menu_section");
            menu_section.forEach((ms: any) => {
                ms?.classList.add("hide_menu");
                ms?.classList.remove("active");
            })
        }

        document.addEventListener('dblclick', (e: any) => {
            const item = e.target.closest('.tree__item');
            if (item) {
                const itemId = item?.getAttribute('data-id');
                if (itemId) {
                    itemDragRenameId = null;
                    //log(`SYS_GRAPH_CLICKED, { id: ${itemId} }`);
                    Services.event_bus.emit("SYS_GRAPH_CLICKED", { id: itemId });
                }
            }
        }, false);

        document.querySelector('#wr_tree')?.addEventListener('contextmenu', (event: any) => {
            event.preventDefault();
        });

        subscribe();
    }

    function subscribe() {
        Services.event_bus.on('SYS_GRAPH_ACTIVE', updateActive);
        Services.event_bus.on('SYS_GRAPH_VISIBLE', updateVisible);

        // document.addEventListener('mousedown', onMouseDown, false);
        Services.event_bus.on('SYS_INPUT_POINTER_DOWN', onMouseDown);
        Services.event_bus.on('SYS_INPUT_POINTER_MOVE', onMouseMove);
        Services.event_bus.on('SYS_INPUT_POINTER_UP', onMouseUp);
        Services.event_bus.on('SYS_VIEW_INPUT_KEY_DOWN', onKeyDown);

        Services.event_bus.on('SYS_MESH_REMOVE_AFTER', () => {
            treeList.forEach(item => {
                const parent = getElementById(item.id)?.closest('li') as HTMLElement;
                if (parent == undefined) return;
                cleanupEmptyParent(parent);
            });
        });

        // NOTE: очищаем выделение items которые не являются IBaseMeshAndThree когда очищается список в SelectControl
        Services.event_bus.on('SYS_CLEAR_SELECT_MESH_LIST', () => {
            for (const item_id of listSelected) {
                const element = document.querySelector(`.tree__item[data-id="${item_id}"]`) as HTMLElement;
                if (element) element.classList.remove('selected');
            }
            listSelected = [];
        });
    }

    // NOTE: нужно для items которые не являются IBaseMeshAndThree, так как SceneManager.get_mesh_by_id при SYS_GRAPH_SELECTED в ControlManager не найдет их и они не будут выбраны для SelectControl потому что он с ними и не работает, как следствие они не передадуться в отрисовку дерева, поэтому их контролируем отдельно/дополнительно
    function set_selected_items(list: number[]) {
        for (const item_id of list) {
            const element = document.querySelector(`.tree__item[data-id="${item_id}"]`) as HTMLElement;
            if (element) element.classList.add('selected');
        }
        listSelected = list;
    }

    function draw_graph(list: Item[], scene_name?: string, is_hide_allSub = false, is_clear_state = false, is_load_scene = false) {
        const newTreeList = deepClone(list);
        const oldTreeList = deepClone(treeList);
        // NOTE: Пропускаем обновление, если данные не изменились
        const hasChanges = hasUpdate(newTreeList, oldTreeList);
        if (!hasChanges && !is_clear_state) {
            return;
        }

        currentSceneName = scene_name ? scene_name : currentSceneName;
        treeList = newTreeList;

        contexts[currentSceneName] = is_clear_state ? {} : contexts[currentSceneName];
        contexts[currentSceneName] = contexts[currentSceneName] ? contexts[currentSceneName] : {};

        if (!isTreeExists() || is_clear_state || is_load_scene) setupTree(treeList, is_hide_allSub);
        else updateTree(treeList, oldTreeList);

        // Синхронизация с новым SceneGraphService через bridge
        Services.event_bus.emit('SYS_TREE_DRAW_GRAPH', { list: treeList });

        scrollToLastSelected();
    }

    function isItemsEqual(item1: Item, item2: Item): boolean {
        return item1.name === item2.name &&
            item1.pid === item2.pid &&
            item1.selected === item2.selected &&
            item1.icon === item2.icon &&
            item1.visible === item2.visible &&
            item1.no_drag === item2.no_drag &&
            item1.no_drop === item2.no_drop &&
            item1.no_rename === item2.no_rename &&
            item1.no_remove === item2.no_remove;
    }

    function hasUpdate(newList: Item[], oldList: Item[]): boolean {
        if (newList.length !== oldList.length) return true;

        const oldMap: TDictionary<Item> = {};
        const newMap: TDictionary<Item> = {};

        oldList.forEach(item => {
            oldMap[item.id] = item;
        });

        newList.forEach(item => {
            newMap[item.id] = item;
        });

        for (const id in newMap) {
            const newItem = newMap[id];
            const oldItem = oldMap[id];
            if (!oldItem) return true;

            if (!isItemsEqual(newItem, oldItem)) {
                return true;
            }
        }

        for (const id in oldMap) {
            if (!newMap[id]) return true;
        }

        const oldGroups: TDictionary<Item[]> = {};
        const newGroups: TDictionary<Item[]> = {};

        oldList.forEach(item => {
            if (!oldGroups[item.pid]) oldGroups[item.pid] = [];
            oldGroups[item.pid].push(item);
        });

        newList.forEach(item => {
            if (!newGroups[item.pid]) newGroups[item.pid] = [];
            newGroups[item.pid].push(item);
        });

        for (const pid in newGroups) {
            const oldGroup = oldGroups[pid] || [];
            const newGroup = newGroups[pid];

            if (oldGroup.length !== newGroup.length) {
                return true;
            }

            const oldPositions: TDictionary<number> = {};
            const newPositions: TDictionary<number> = {};

            oldGroup.forEach((item, index) => {
                oldPositions[item.id] = index;
            });

            newGroup.forEach((item, index) => {
                newPositions[item.id] = index;
            });

            for (const itemId in oldPositions) {
                if (oldPositions[itemId] !== newPositions[itemId]) {
                    return true;
                }
            }
        }

        return false;
    }

    function isTreeExists() {
        return divTree.querySelector('.tree');
    }

    function setupTree(list: Item[], is_hide_allSub: boolean) {
        const renderList = is_hide_allSub ? buildTree(list, currentSceneName) : buildTree(list);
        const html = getTreeHtml(renderList);
        divTree.innerHTML = html;
        const btns = divTree.querySelectorAll('.tree__btn') as NodeListOf<HTMLElement>;
        btns.forEach(btn => {
            addTreeBtnEventListener(btn);
        });
        const li_lines = divTree.querySelectorAll('.li_line') as NodeListOf<HTMLElement>;
        li_lines.forEach(li => {
            addHoverDelayEventListener(li);
        });
        // NOTE: проходимся по документу и собираем созданые элементы
        setupElementCache();
    }

    function buildTree(list: any, sceneName?: string) {
        const treeMap: any = {};
        const tree: any = [];
        prevListSelected = deepClone(listSelected);
        listSelected = []; // сбрасываем 

        const rootList = deepClone(list);

        rootList.forEach((node: any) => {
            treeMap[node.id] = { ...node, children: [] };
            if (node?.selected == true) listSelected.push(node.id);
        });

        rootList.forEach((node: any) => {
            if (node.pid != -2) {
                treeMap[node.pid].children.push(treeMap[node.id]);
            } else {
                tree.push(treeMap[node.id]);
            }
        });

        if (sceneName) {
            Object.values(treeMap).forEach((node: any) => {
                if (node?.children.length) {
                    contexts[sceneName][+node.id] = false; // все sub tree скрыты   is_hide_allSub = true
                }
            });
        }

        return tree;
    }

    function updateTree(list: Item[], oldList: Item[]) {
        if (!isTreeExists()) return;

        prevListSelected = deepClone(listSelected);
        listSelected = [];

        list.forEach(item => {
            if (item.selected) {
                listSelected.push(item.id);
            }
        });

        const changes = getChanges(list, oldList);

        if (changes.deletedItems.length > 0) {
            removeDeletedItems(list);
        }

        changes.newItems.forEach(item => {
            createNewTreeItem(item);
        });

        if (changes.structureChanged)
            updateStructure(list);

        changes.modifiedItems.forEach(item => {
            updateItem(item);
        });

        openTreeWithSelected();

        paintIdentical();
        paintSearchNode("color_green");

        // вешаем обработчики для дроп текстуры
        toggleEventListenerTexture();
    }

    function getChanges(newList: Item[], oldList: Item[]): ChangesInfo {
        const oldMap: TDictionary<Item> = {};
        const newMap: TDictionary<Item> = {};

        oldList.forEach(item => { oldMap[item.id] = item; });
        newList.forEach(item => { newMap[item.id] = item; });

        const modifiedItems: Item[] = [];
        const newItems: Item[] = [];
        const deletedItems: number[] = [];

        let structureChanged = false;
        for (const id in newMap) {
            const newItem = newMap[id];
            const oldItem = oldMap[id];

            // NOTE: проверяем на добавление элемента

            if (!oldItem) newItems.push(newItem);
            else {
                // NOTE: проверяем на изменение родителя
                if (newItem.pid != oldItem.pid) {
                    structureChanged = true;
                }

                // NOTE: проверяем на изменение свойств
                if (!isItemsEqual(newItem, oldItem)) {
                    modifiedItems.push(newItem);
                }
            }
        }

        for (const id in oldMap) {
            if (!newMap[id]) {
                deletedItems.push(Number(id));
                structureChanged = true;
            }
        }

        const oldGroups: TDictionary<Item[]> = {};
        const newGroups: TDictionary<Item[]> = {};

        oldList.forEach(item => {
            if (!oldGroups[item.pid]) oldGroups[item.pid] = [];
            oldGroups[item.pid].push(item);
        });

        newList.forEach(item => {
            if (!newGroups[item.pid]) newGroups[item.pid] = [];
            newGroups[item.pid].push(item);
        });

        for (const pid in newGroups) {

            // NOTE: проверяем на изменение размера группы

            const oldGroup = oldGroups[pid] || [];
            const newGroup = newGroups[pid];

            if (oldGroup.length != newGroup.length) {
                structureChanged = true;
                break;
            }

            // NOTE: проверяем на изменение порядка в группе

            const oldPositions: TDictionary<number> = {};
            const newPositions: TDictionary<number> = {};

            oldGroup.forEach((item, index) => { oldPositions[item.id] = index; });
            newGroup.forEach((item, index) => { newPositions[item.id] = index; });

            for (const itemId in oldPositions) {
                if (oldPositions[itemId] != newPositions[itemId]) {
                    structureChanged = true;
                    break;
                }
            }

            if (structureChanged) break;
        }

        return {
            structureChanged,
            modifiedItems,
            newItems,
            deletedItems
        };
    }

    function updateItem(item: Item) {
        const existingItem = getElementById(item.id);

        if (!existingItem) {
            const existingInDOM = document.querySelector(`.tree__item[data-id="${item.id}"]`) as HTMLElement;
            if (existingInDOM) {
                elementCache[item.id] = existingInDOM;
                updateItemAttributes(existingInDOM, item);
                updateItemClasses(existingInDOM, item);
                return;
            }

            createNewTreeItem(item);
            return;
        }

        const nameElement = existingItem.querySelector('.tree__item_name');
        if (nameElement && nameElement.textContent != item.name) {
            nameElement.textContent = item.name;
        }

        const iconElement = existingItem.querySelector('.tree__ico use');
        if (iconElement) {
            iconElement.setAttribute('href', `./img/sprite.svg#${getIdIco(item.icon)}`);
        }

        updateItemAttributes(existingItem, item);
        updateItemClasses(existingItem, item);

        elementCache[item.id] = existingItem;
    }

    function createNewTreeItem(item: Item) {
        const hasChildren = treeList.some(child => child.pid === item.id);
        const existingElement = getElementById(item.id);
        if (existingElement) return;

        const existingInDOM = document.querySelector(`.tree__item[data-id="${item.id}"]`) as HTMLElement;
        if (existingInDOM) {
            elementCache[item.id] = existingInDOM;
            return;
        }

        if (hasChildren) {
            const itemWithChildren: any = { ...item, children: [] };
            itemWithChildren.children = getChildrenRecursive(item.id);

            const itemHtml = getTreeItemHtml(itemWithChildren);
            const childrenHtml = getTreeSubHtml(itemWithChildren.children);

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = `<li class="li_line active">${getTreeBtnHtml()}${itemHtml}${childrenHtml}</li>`;
            const newItem = tempDiv.firstElementChild as HTMLElement;

            const parentElement = findParentElement(item.pid);
            if (parentElement) {
                insertItemInCorrectPosition(parentElement, newItem, item);

                const btn = newItem.querySelector('.tree__btn') as HTMLElement;
                if (btn) {
                    addTreeBtnEventListener(btn);
                }

                addHoverDelayEventListener(newItem as HTMLElement);

                const treeItemElement = newItem.querySelector('.tree__item') as HTMLElement;
                if (treeItemElement) {
                    elementCache[item.id] = treeItemElement;
                }
            }
        } else {
            const itemHtml = getTreeItemHtml(item);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = itemHtml;
            const newItem = tempDiv.firstElementChild as HTMLElement;

            const parentElement = findParentElement(item.pid);
            if (parentElement) {
                insertItemInCorrectPosition(parentElement, newItem, item);
                const liElement = newItem.closest('li');
                if (liElement && liElement.classList.contains('li_line')) {
                    addHoverDelayEventListener(liElement as HTMLElement);
                }

                elementCache[item.id] = newItem;
            }
        }
    }

    function getChildrenRecursive(parentId: number): any[] {
        const children = treeList.filter(child => child.pid === parentId);
        return children.map(child => {
            const childWithChildren: any = { ...child, children: [] };
            const hasGrandChildren = treeList.some(grandChild => grandChild.pid === child.id);
            if (hasGrandChildren) {
                childWithChildren.children = getChildrenRecursive(child.id);
            }
            return childWithChildren;
        });
    }

    function findParentElement(pid: number): HTMLElement | null {
        if (pid == -2) {
            return divTree.querySelector('.tree > li');
        }

        const parentItem = document.querySelector(`.tree__item[data-id="${pid}"]`);
        if (!parentItem) return null;

        const parentLi = parentItem.closest('li');
        if (!parentLi) return null;

        let treeSub = parentLi.querySelector('.tree_sub');
        if (!treeSub) {
            treeSub = document.createElement('ul');
            treeSub.className = 'tree_sub';
            parentLi.appendChild(treeSub);

            if (!parentLi.querySelector('.tree__btn')) {
                const btnHtml = getTreeBtnHtml();
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = btnHtml;
                const btn = tempDiv.firstElementChild as HTMLElement;
                parentLi.insertBefore(btn, parentLi.firstChild);
                parentLi.classList.add('active');
                addTreeBtnEventListener(btn);
                if (parentLi.classList.contains('li_line')) {
                    addHoverDelayEventListener(parentLi as HTMLElement);
                }
            }
        }

        return treeSub as HTMLElement;
    }

    function insertItemInCorrectPosition(parentElement: HTMLElement, newItem: HTMLElement, item: Item) {
        if (newItem.tagName === 'LI') {
            const siblings = treeList.filter(sibling => sibling.pid === item.pid);
            const itemIndex = siblings.findIndex(sibling => sibling.id === item.id);

            if (itemIndex === -1) {
                parentElement.appendChild(newItem);
                return;
            }

            const nextSibling = siblings[itemIndex + 1];
            if (nextSibling) {
                const nextElement = parentElement.querySelector(`.tree__item[data-id="${nextSibling.id}"]`)?.closest('li');
                if (nextElement) {
                    parentElement.insertBefore(newItem, nextElement);
                    return;
                }
            }

            parentElement.appendChild(newItem);
        } else {
            const li = document.createElement('li');
            li.appendChild(newItem);

            const siblings = treeList.filter(sibling => sibling.pid === item.pid);
            const itemIndex = siblings.findIndex(sibling => sibling.id === item.id);

            if (itemIndex === -1) {
                parentElement.appendChild(li);
                return;
            }

            const nextSibling = siblings[itemIndex + 1];
            if (nextSibling) {
                const nextElement = parentElement.querySelector(`.tree__item[data-id="${nextSibling.id}"]`)?.closest('li');
                if (nextElement) {
                    parentElement.insertBefore(li, nextElement);
                    return;
                }
            }

            parentElement.appendChild(li);
        }
    }

    function updateItemAttributes(element: HTMLElement, item: Item) {
        const attrs = setAttrs(item);
        const attrRegex = /data-(\w+)="([^"]*)"/g;
        let match;
        while ((match = attrRegex.exec(attrs)) !== null) {
            element.setAttribute(`data-${match[1]}`, match[2]);
        }
    }

    function updateItemClasses(element: HTMLElement, item: Item) {
        if (item.selected) {
            element.classList.add('selected');
        } else {
            element.classList.remove('selected');
        }
        if (cutList.includes(item.id)) {
            element.classList.add('isCut');
        } else {
            element.classList.remove('isCut');
        }
    }

    function removeDeletedItems(currentList: Item[]) {
        const existingItems = document.querySelectorAll('.tree__item') as NodeListOf<HTMLLIElement>;
        const currentIds: TDictionary<boolean> = {};
        currentList.forEach(item => {
            currentIds[item.id] = true;
        });

        existingItems.forEach(item => {
            const itemId = Number(item.getAttribute('data-id') || '0');
            if (!currentIds[itemId]) {
                const li = item.closest('li');
                if (li) {
                    li.remove();
                }
                delete elementCache[itemId];
            }
        });
    }

    function updateStructure(list: Item[]) {
        const itemMap: TDictionary<Item> = {};
        list.forEach(item => {
            itemMap[item.id] = item;
        });

        // NOTE: группируем по pid
        const parentGroups: TDictionary<Item[]> = {};
        list.forEach(item => {
            if (!parentGroups[item.pid]) {
                parentGroups[item.pid] = [];
            }
            parentGroups[item.pid]!.push(item);
        });

        // NOTE: определяем правильный порядок обновления (от корня к листьям)
        const sortedParentIds = getTopologicalOrder(parentGroups, itemMap);

        // NOTE: обновляем структуру для каждого pid в правильном порядке
        for (const parentId of sortedParentIds) {
            if (parentGroups[parentId]) {
                updateParentStructure(Number(parentId), parentGroups[parentId]!, itemMap);
            }
        }

        list.forEach(item => {
            const parent = getElementById(item.id)?.closest('li') as HTMLElement;
            if (parent == undefined) return;
            cleanupEmptyParent(parent);
        });
    }

    function getTopologicalOrder(parentGroups: TDictionary<Item[]>, itemMap: TDictionary<Item>): number[] {
        const parentIds = Object.keys(parentGroups).map(Number);
        const visited = new Set<number>();
        const tempVisited = new Set<number>();
        const result: number[] = [];

        function visit(parentId: number) {
            if (tempVisited.has(parentId)) {
                return;
            }

            if (visited.has(parentId)) {
                return;
            }

            tempVisited.add(parentId);

            const children = parentGroups[parentId] || [];
            for (const child of children) {
                const childId = child.id;
                if (parentGroups[childId]) {
                    visit(childId);
                }
            }

            tempVisited.delete(parentId);
            visited.add(parentId);
            result.push(parentId);
        }

        for (const parentId of parentIds) {
            if (!visited.has(parentId)) {
                visit(parentId);
            }
        }

        result.sort((a, b) => {
            const levelA = getItemLevelInTree(a, itemMap);
            const levelB = getItemLevelInTree(b, itemMap);
            return levelA - levelB;
        });

        return result;
    }

    function getItemLevelInTree(itemId: number, itemMap: TDictionary<Item>): number {
        let level = 0;
        let currentId = itemId;

        while (currentId !== -2 && currentId !== 0) {
            const item = itemMap[currentId];
            if (!item) break;
            currentId = item.pid;
            level++;
        }

        return level;
    }

    function updateParentStructure(parentId: number, children: Item[], itemMap: TDictionary<Item>) {
        if (parentId == -2) return;

        const parentElement = getElementById(parentId)?.closest('li');
        if (!parentElement) return;

        let treeSub = parentElement.querySelector('.tree_sub');

        // NOTE: если нету, то создаем
        if (!treeSub) {
            treeSub = document.createElement('ul');
            treeSub.className = 'tree_sub';
            parentElement.appendChild(treeSub);
            if (!parentElement.querySelector('.tree__btn')) {
                const btnHtml = getTreeBtnHtml();
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = btnHtml;
                const btn = tempDiv.firstElementChild as HTMLElement;
                parentElement.insertBefore(btn, parentElement.firstChild);
                parentElement.classList.add('active');
                addTreeBtnEventListener(btn);
                if (parentElement.classList.contains('li_line')) {
                    addHoverDelayEventListener(parentElement as HTMLElement);
                }
            }
        }

        // NOTE: определяем контейнер для вставки элементов
        const insertContainer = treeSub;
        const currentElements = Array.from(insertContainer.children) as HTMLElement[];

        children.forEach((child, index) => {
            const childElement = getElementById(child.id)?.closest('li') as HTMLElement;
            if (!childElement) {
                const existingElement = document.querySelector(`.tree__item[data-id="${child.id}"]`) as HTMLElement;
                if (existingElement) {
                    const existingLi = existingElement.closest('li');
                    if (existingLi && existingLi.parentElement !== insertContainer) {
                        const targetIndex = Math.min(index, insertContainer.children.length);
                        if (targetIndex == insertContainer.children.length) {
                            insertContainer.appendChild(existingLi);
                        } else {
                            insertContainer.insertBefore(existingLi, insertContainer.children[targetIndex]);
                        }
                    }
                } else createNewTreeItem(child);
                return;
            }

            if (childElement.parentElement == insertContainer) {
                const currentIndex = Array.from(insertContainer.children).indexOf(childElement);
                if (currentIndex == index) return;
            }

            const targetIndex = Math.min(index, insertContainer.children.length);
            if (targetIndex == insertContainer.children.length) insertContainer.appendChild(childElement);
            else insertContainer.insertBefore(childElement, insertContainer.children[targetIndex]);
        });

        currentElements.forEach(el => {
            const itemElement = el.querySelector('.tree__item');
            if (!itemElement) return;

            const itemId = Number(itemElement.getAttribute('data-id') || '0');
            const item = itemMap[itemId];

            if (!item || item.pid != parentId) {
                el.remove();
                delete elementCache[itemId];
            }
        });

        cleanupEmptyParent(parentElement);
    }

    function getTreeHtml(e: any) {
        const list = Array.isArray(e) ? e[0] : e;
        let result = `<ul id="treeDemo" class="tree">`;
        if (list?.children.length) {
            result += `<li class="active">
                            ${getTreeBtnHtml()}
                            ${getTreeItemHtml(list)}
                            ${getTreeSubHtml(list?.children)}
                        </li>`;
        }
        else {
            result += `<li>
                            ${getTreeItemHtml(list)}
                        </li>`;
        }
        result += `</ul>`;
        return result;
    }

    function getTreeSubHtml(list: any) {
        let result = `<ul class="tree_sub">`;
        list.forEach((item: any) => {
            if (item?.children.length) {
                result += `<li class="li_line ${contexts[currentSceneName][item.id] == false ? '' : 'active'}">
                                ${getTreeBtnHtml()}
                                ${getTreeItemHtml(item)}
                                ${getTreeSubHtml(item?.children)}
                            </li>`;
            }
            else {
                result += `<li>
                                ${getTreeItemHtml(item)}
                            </li>`;
            }
        });
        result += `</ul>`;
        return result;
    }

    function getTreeBtnHtml() {
        return `<span class="tree__btn">
                    <svg class="svg_icon">
                        <use class="use_trglF" href="./img/sprite.svg#triangle_filled"></use>
                        <use class="use_trgl" href="./img/sprite.svg#triangle"></use>
                    </svg>
                </span>`;
    }

    function getTreeItemHtml(item: any) {
        return `<a class="tree__item ${item?.selected ? 'selected' : ''} ${cutList.includes(item.id) ? 'isCut' : ''}" ${setAttrs(item)}>
                    <span class="tree__item_bg"></span>
                    ${getTreeIcoHtml(item.icon)}
                    <span class="tree__item_name">${item.name}</span>
                </a>`;
    }

    function setAttrs(item: Item): string {
        if (!item) return '';
        let result = '';
        result += item?.id ? ` data-id="${item.id}" ` : '';
        result += item?.pid ? ` data-pid="${item.pid}" ` : '';
        result += item?.icon ? ` data-icon="${item.icon}" ` : '';
        result += item?.visible ? ` data-visible="${item.visible}" ` : '';
        result += item?.no_drop ? ` data-no_drop="${item.no_drop}" ` : '';
        result += item?.no_drag ? ` data-no_drag="${item.no_drag}" ` : '';
        result += item?.no_rename ? ` data-no_rename="${item.no_rename}" ` : '';
        result += item?.no_remove ? ` data-no_remove="${item.no_remove}" ` : '';
        return result;
    }

    function getTreeIcoHtml(icon: string) {
        return `<span class="tree__ico"><svg class="svg_icon"><use href="./img/sprite.svg#${getIdIco(icon)}"></use></svg></span>`;
    }

    function getIdIco(icon: string) {
        if (!icon) return "cube";
        if (icon === "scene") return "cubes_stacked";

        if (icon == IObjectTypes.GUI_CONTAINER) return "box_align_top_left";
        if (icon == IObjectTypes.GUI_BOX) return "rectangle";
        if (icon == IObjectTypes.GUI_TEXT) return "typography";

        if (icon == IObjectTypes.GO_CONTAINER) return "cube";
        if (icon == IObjectTypes.GO_SPRITE_COMPONENT) return "texture";
        if (icon == IObjectTypes.GO_LABEL_COMPONENT) return "tag";
        if (icon == IObjectTypes.GO_ANIMATED_MODEL_COMPONENT) return "box_model";

        if (icon == IObjectTypes.EMPTY) return "percentage_0";
        if (icon == IObjectTypes.ENTITY) return "ghost_3";
        if (icon == IObjectTypes.SLICE9_PLANE) return "photo_sensor";
        if (icon == IObjectTypes.TEXT) return "letter_t";

        return "cube";
    }

    function scrollToElemInParent(parentBlock: HTMLElement, elem: any) {
        if (!parentBlock || !elem || isElementInViewport(parentBlock, elem)) return;

        if (parentBlock.scrollHeight + 52 > window.innerHeight) {
            elem.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }

    function isElementInViewport(parentBlock: HTMLElement, elem: HTMLElement): boolean {
        if (!parentBlock || !elem) return false;

        const parentRect = parentBlock.getBoundingClientRect();
        const elemRect = elem.getBoundingClientRect();

        const padding = 20;

        return elemRect.top >= parentRect.top + padding &&
            elemRect.bottom <= parentRect.bottom - padding;
    }

    function scrollToLastSelected() {
        const selectedItems = treeList.filter(item => item.selected);
        const idLastSelected = selectedItems.find(item => !prevListSelected.includes(item.id))?.id;
        if (idLastSelected == undefined) return;

        const lastSelected = document.querySelector(`.tree__item[data-id="${idLastSelected}"]`);
        if (!lastSelected) return;
        scrollToElemInParent(divTree, lastSelected);
    }

    function findNextIdItemByPid(id: number, pid: number): number | undefined {
        const listPid = treeList.filter(e => e.pid === pid);
        for (let i = 0; i < listPid.length - 1; i++) {
            if (listPid[i]?.id === id) {
                return listPid[i + 1]?.id || listPid[i]?.id;
            }
        }
        return undefined;
    }

    function getItemsBetween(startId: number, endId: number): number[] {
        const result: number[] = [];
        const flatItems = getFlatItemsList();

        if (flatItems.length == 0) {
            return [startId, endId];
        }

        const startIndex = flatItems.findIndex(item => item.id == startId);
        const endIndex = flatItems.findIndex(item => item.id == endId);

        if (startIndex == -1 || endIndex == -1) {
            return [startId, endId];
        }

        const minIndex = Math.min(startIndex, endIndex);
        const maxIndex = Math.max(startIndex, endIndex);

        const startItem = flatItems[startIndex];
        const endItem = flatItems[endIndex];
        const commonLevel = getCommonHierarchyLevel(startItem, endItem, flatItems);

        for (let i = minIndex; i <= maxIndex; i++) {
            const item = flatItems[i];

            if (canIncludeInHierarchicalSelection(item, startItem, endItem, commonLevel, flatItems)) {
                result.push(item.id);
            }
        }

        return result;
    }

    function getCommonHierarchyLevel(startItem: Item, endItem: Item, flatItems: Item[]): number {
        if (startItem.pid == endItem.pid) {
            return getItemLevel(startItem, flatItems);
        }

        const startAncestors = getAncestors(startItem, flatItems);
        const endAncestors = getAncestors(endItem, flatItems);

        for (let i = 0; i < startAncestors.length; i++) {
            const ancestor = startAncestors[i];
            if (endAncestors.some(endAncestor => endAncestor.id === ancestor.id)) {
                return getItemLevel(ancestor, flatItems);
            }
        }

        return 0;
    }

    function getItemLevel(item: Item, flatItems: Item[]): number {
        let level = 0;
        let currentItem = item;

        while (currentItem.pid !== -2 && currentItem.pid !== 0) {
            const parent = flatItems.find(p => p.id === currentItem.pid);
            if (!parent) break;
            currentItem = parent;
            level++;
        }

        return level;
    }

    function getAncestors(item: Item, flatItems: Item[]): Item[] {
        const ancestors: Item[] = [];
        let currentItem = item;

        while (currentItem.pid !== -2 && currentItem.pid !== 0) {
            const parent = flatItems.find(p => p.id === currentItem.pid);
            if (!parent) break;
            ancestors.push(parent);
            currentItem = parent;
        }

        return ancestors;
    }

    function canIncludeInHierarchicalSelection(
        item: Item,
        startItem: Item,
        endItem: Item,
        commonLevel: number,
        flatItems: Item[]
    ): boolean {
        const itemLevel = getItemLevel(item, flatItems);

        if (itemLevel == commonLevel) {
            return true;
        }

        if (itemLevel > commonLevel) {
            let parent = item;
            let currentLevel = itemLevel;
            while (currentLevel > commonLevel) {
                const parentItem = flatItems.find(p => p.id === parent.pid);
                if (!parentItem) break;
                parent = parentItem;
                currentLevel--;
            }

            const parentInRange = isItemInRange(parent, startItem, endItem, flatItems);
            const parentExpanded = isParentExpanded(parent.id);
            return parentInRange && parentExpanded;
        }

        return false;
    }

    function isItemInRange(item: Item, startItem: Item, endItem: Item, flatItems: Item[]): boolean {
        const startIndex = flatItems.findIndex(i => i.id === startItem.id);
        const endIndex = flatItems.findIndex(i => i.id === endItem.id);
        const itemIndex = flatItems.findIndex(i => i.id === item.id);

        if (startIndex === -1 || endIndex === -1 || itemIndex === -1) {
            return false;
        }

        const minIndex = Math.min(startIndex, endIndex);
        const maxIndex = Math.max(startIndex, endIndex);
        return itemIndex >= minIndex && itemIndex <= maxIndex;
    }

    function isParentExpanded(parentId: number): boolean {
        const parentElement = getElementById(parentId);
        if (!parentElement) return false;

        const parentLi = parentElement.closest('li');
        if (!parentLi) return false;

        return parentLi.classList.contains('active');
    }

    function getFlatItemsList(): Item[] {
        const result: Item[] = [];

        // NOTE: Получаем все элементы дерева в правильном порядке из DOM
        const treeItems = document.querySelectorAll('.tree__item') as NodeListOf<HTMLElement>;
        treeItems.forEach(item => {
            const idAttr = item.getAttribute('data-id');
            const pidAttr = item.getAttribute('data-pid');
            const name = item.querySelector('.tree__item_name')?.textContent || '';
            const icon = item.getAttribute('data-icon') || '';
            const visible = item.getAttribute('data-visible') === 'true';
            const no_drag = item.getAttribute('data-no_drag') === 'true';
            const no_drop = item.getAttribute('data-no_drop') === 'true';
            const no_rename = item.getAttribute('data-no_rename') === 'true';
            const no_remove = item.getAttribute('data-no_remove') === 'true';

            if (idAttr != null) {
                result.push({
                    id: +idAttr,
                    pid: pidAttr ? +pidAttr : 0,
                    name,
                    visible,
                    icon,
                    no_drag,
                    no_drop,
                    no_rename,
                    no_remove
                });
            }
        });

        return result;
    }

    function onMouseDown(event: any) {
        // if (mContextVisible && !event.target.closest('.menu__context a')) {
        //     menuContextClear();
        // }

        if (!event.target.closest('.tree_div')) return;

        // event.preventDefault();
        if (event.button == 0 || event.button == 2) {
            if (event.button == 0) _is_mousedown = true; // ЛКМ

            const item = event.target.closest('a.tree__item.selected .tree__item_name[contenteditable="true"]');
            if (item) return;

            toggleClassSelected(event);

            startY = event.offset_y;
            startX = event.offset_x;
            treeItem = event.target.closest('.tree__item');

            if (treeItem && _is_dragging) {
                itemDrag = treeList.find(e => e.id === +treeItem?.getAttribute("data-id")) || null;
                //console.log({ itemDrag });
                itemDragRenameId = itemDrag?.id || null;
                copyItemDrag = deepClone(itemDrag);

                if (!itemDrag?.no_drag) {
                    boxDD.querySelector(".tree__item_name").innerText = itemDrag.name;
                    boxDD.querySelector(".tree__ico use").setAttribute('href', `./img/sprite.svg#${getIdIco(itemDrag?.icon)}`);
                }
            }
        }
    }

    function onMouseMove(event: any) {
        if (_is_mousedown) { // ЛКМ зажата
            _is_moveItemDrag = _is_moveItemDrag ? true : isMove(event.offset_x, event.offset_y, startX, startY); // начало движения было

            if (treeItem && _is_dragging) {
                countMove++;
                const canMove = ActionsControl.from_the_same_world(listSelected, treeList);
                if (!canMove && countMove == 2) {
                    Popups.toast.open({
                        type: 'info',
                        message: 'Нельзя одновременно перемещать элементы из GUI и GO!'
                    });
                }
                if (canMove) moveAt(event.offset_x, event.offset_y);
                // scrollToWhileMoving(divTree, startY, event);

                // отмены не происходит, если выбрано больше одного
                if (Input.is_control() && listSelected?.length > 0) {
                    treeItem?.classList.add("selected");
                }

                if (canMove) {
                    toggleCurrentBox(event.target.closest('.tree__item'));
                    switchClassItem(event.target.closest('.tree__item'), event.offset_x, event.offset_y);
                }
            }
        }
    }

    function onMouseUp(event: any) {
        // event.preventDefault(); // иногда отключается плавное сворачивание ...

        // if (mContextVisible && event.target.closest('.menu__context a') && itemDrag && event.button === 0) {
        //     // menuContextClick(event);
        //     log('menuContextClick')
        // }

        // show/hide block menu
        const btn_menu = event.target.closest(".btn_menu");
        if (btn_menu) {
            const menu_section = btn_menu.closest(".menu_section");
            menu_section?.classList.remove("hide_menu");
            menu_section?.classList.toggle("active");
        }

        if ((event.button === 0 || event.button === 2)) {

            if (event.target.closest('.filemanager') && itemDrag && listSelected.length == 1) {
                Services.event_bus.emit("SYS_GRAPH_DROP_IN_ASSETS", listSelected[0]);
            }

            if (!event.target.closest('.tree_div')) {
                if (itemDrag) сlear();
                itemDragRenameId = null;
                return;
            }

            _is_mousedown = false;

            if (event.button == 0) setContendEditAble(event); // ЛКМ
            sendListSelected(event);

            if (event.button == 2) {
                openMenuContext(event);
                return;
            }

            if (!itemDrag || !itemDrop) {
                сlear();
                return;
            }

            toggleCurrentBox(event.target.closest('.tree__item'));
            switchClassItem(event.target.closest('.tree__item'), event.offset_x, event.offset_y);

            if (event.target.closest('.tree__item') && currentDroppable && isDrop) {
                const posInItem = getPosMouseInBlock(event.target.closest('.tree__item'), event.offset_x, event.offset_y);
                if (posInItem) {
                    const movedList = getMovedList(listSelected, itemDrag, itemDrop, posInItem);
                    if (movedList) {
                        // log(`SYS_GRAPH_MOVED_TO`, movedList);
                        Services.event_bus.emit("SYS_GRAPH_MOVED_TO", movedList);

                        if (listSelected.length === 1 && itemDrag) {
                            shiftAnchorId = itemDrag.id;
                        }
                    }
                }
            }

            сlear();
        }
    }

    function сlear(): void {
        ddVisible = false;
        boxDD.classList.remove('pos')
        boxDD.removeAttribute('style')
        currentDroppable?.classList.remove('droppable')
        _is_moveItemDrag = false;
        _is_editItem = false;
        _is_currentOnly = false;
        currentDropPosition = null;
        treeItem = null;
        itemDrag = null;
        itemDrop = null;
        isDrop = false;
        countMove = 0;
        const items = document.querySelectorAll('.tree__item') as NodeListOf<HTMLLIElement>;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            item.classList.remove('top', 'bg', 'bottom');
        }
    }

    function isMove(offset_x: number, offset_y: number, startX: number, startY: number) {
        return Math.abs(offset_x - startX) > 12 || Math.abs(offset_y - startY) > 8;
    };

    function getMovedList(list: number[], drag: any, drop: any, type: string): any {
        if (!list || !list.length || !drag || !drop || !type || !list.includes(drag?.id)) return null;

        if (!hasPositionChanged(drag, drop, type)) return null;

        if (type === 'top') {
            return { pid: drop?.pid, next_id: drop?.id, id_mesh_list: list };
        }
        if (type === 'bg') {
            return itemDrop?.no_drop === true ? null : { pid: drop?.id, next_id: -1, id_mesh_list: list };
        }
        if (type === 'bottom') {
            const next_id = findNextIdItemByPid(drop?.id, drop?.pid) || -1;
            return { pid: drop?.pid, next_id: next_id, id_mesh_list: list };
        }

        return null;
    }

    function hasPositionChanged(drag: any, drop: any, type: string): boolean {
        if (drag?.id === drop?.id) return false;

        if (type === 'bg') {
            return drag?.pid !== drop?.id;
        } else {
            if (drag?.pid !== drop?.pid) return true;

            // const siblings = treeList.filter(item => item.pid === drag.pid);
            // const dragIndex = siblings.findIndex(item => item.id === drag.id);
            // const dropIndex = siblings.findIndex(item => item.id === drop.id);

            // if (type === 'top') {
            //     return dropIndex < dragIndex;
            // } else if (type === 'bottom') {
            //     return dropIndex > dragIndex;
            // }
        }

        return true;
    }

    // function scrollToWhileMoving(block: HTMLElement, startY: number, event: any) {
    //     const scrollSpeed = 8;
    //     const tree_div_height = block?.clientHeight;   // Высота области для прокрутки
    //     // const tree_height = block.querySelector('.tree')?.clientHeight;   // Высота содержимого

    //     // const currentY = event.clientY - block.getBoundingClientRect().top;
    //     const currentY = event.offset_y;
    //     const direction = currentY < startY ? -1 : 1;

    //     const topThreshold = tree_div_height * 0.15; // Верхние 15% от высоты блока
    //     const bottomThreshold = tree_div_height - tree_div_height * 0.07; // Нижние 7% от высоты блока

    //     if (currentY < topThreshold) {
    //         block.scrollBy(0, -scrollSpeed); // Прокрутка вверх
    //     } else if (currentY > bottomThreshold) {
    //         block.scrollBy(0, scrollSpeed); // Прокрутка вниз
    //     }
    // }

    function switchClassItem(elem: any, pageX: number, pageY: number): void {
        if (!elem) return;

        const items = document.querySelectorAll('.tree__item') as NodeListOf<HTMLLIElement>;
        items.forEach(i => { i.classList.remove('top', 'bg', 'bottom'); });

        const posInItem = getPosMouseInBlock(elem, pageX, pageY);
        if (!posInItem) {
            elem.classList.remove('top', 'bg', 'bottom');
            currentDropPosition = null;
            return;
        }

        elem.classList.add(posInItem);
        currentDropPosition = posInItem;
        canBeOpened = false;
        // log('posInItem', posInItem);
        if (posInItem === 'top' || posInItem === 'bottom') putAround();
        if (posInItem === 'bg') {
            canBeOpened = true;
            putInside();
        }

    }

    function getPosMouseInBlock(elem: any, pageX: number, pageY: number): string | false {
        if (!elem) return false;
        const item = elem.classList.contains('tree__item') ? elem : elem.closest('.tree__item') as HTMLLIElement | null;
        if (!item) return false;
        const itemBg = item.querySelector('.tree__item_bg') as HTMLLIElement | null;
        if (!itemBg) return false;

        const mouseY = pageY;
        const mouseX = pageX;

        const itemTop: number = +item.getBoundingClientRect().top;
        const itemBottom: number = +itemTop + item.clientHeight;
        const itemLeft: number = +itemBg.getBoundingClientRect().left;
        const itemRight: number = +itemLeft + +itemBg.clientWidth;

        const headItem: number = +itemTop + (item.clientHeight * 0.2); // нижняя граница области для линии top
        const footItem: number = +itemTop + (item.clientHeight * 0.8); // верхняя граница области для линии bottom

        if (
            mouseX >= itemLeft &&
            mouseX <= itemRight
        ) {
            // вычисляем по высоте
            if (mouseY >= itemTop && mouseY <= headItem) return "top";
            if (mouseY >= footItem && mouseY <= itemBottom) return "bottom";
            if (mouseY > headItem && mouseY < footItem) return "bg";
            else return false;
        }
        else {
            return false;
        }
    }

    function moveAt(pageX: number, pageY: number) {
        if (itemDrop == null || itemDrag?.id == itemDrop?.id) {
            ddVisible = false;
            boxDD.classList.remove('pos');
            return;
        }
        if (treeItem && _is_dragging && !itemDrag?.no_drag) {
            ddVisible = true;
            boxDD.classList.add('pos');
            boxDD.style.left = pageX - 22 + 'px'
            boxDD.style.top = pageY + 'px'
        }
    }

    function isParentNoDrop(list: Item[], drag: Item, drop: Item): boolean {
        // внутри родителя можно перемещать...
        if (drag.pid === drop.pid) {
            return false;
        }
        else {
            // если разные родители
            const parent = list.find(item => item.id === drop.pid);
            if (parent && parent?.no_drop === true) {
                return true;
            }
        }

        return false;
    }

    function isChild(list: Item[], parentId: number, currentPid: number): boolean {
        let step = currentPid;

        while (step > -1) {
            const parent = list.find(item => item.id === step);
            if (!parent) return false;

            if (parent.id === parentId) return true;
            step = parent.pid
        }

        return false;
    }

    function toggleCurrentBox(droppableBelow: any) {
        // если элемент есть, сравниваем с текущим
        if (currentDroppable != droppableBelow) {
            if (currentDroppable)
                currentDroppable.classList.remove('droppable');
            currentDroppable = droppableBelow
            if (currentDroppable && _is_moveItemDrag)// cursor in current
                currentDroppable.classList.add('droppable');
        }
    }

    // внутрь
    function putInside() {
        // a.tree__item.droppable  и  статус для добавления внутрь
        itemDrop = treeList.find(e => e.id === +currentDroppable?.getAttribute("data-id")) || null;

        const itemSelected = treeList.filter((e: any) => e.id == listSelected[0]);
        const canBeMoved = ActionsControl.is_valid_action(itemDrop, itemSelected, true, true);

        if (
            (listSelected?.length == 1 && currentDroppable === treeItem)
            || itemDrag?.no_drag === true
            || canBeMoved == false
        ) {
            currentDroppable.classList.remove('success');
            boxDD.classList.remove('active');
            isDrop = false;
        }
        else {
            if (ddVisible) boxDD.classList.add('pos');

            if (
                (itemDrop?.no_drop === true && itemDrag)
                || (isChild(treeList, itemDrag.id, itemDrop.pid) && listSelected?.length == 1)
            ) {
                boxDD.classList.remove('active');
                currentDroppable.classList.remove('success');
                isDrop = false;
            }
            else {
                boxDD.classList.add('active');
                currentDroppable.classList.add('success');
                isDrop = true;
            }
        }
    }

    // рядом
    function putAround() {
        // статус и li.droppable для добавления рядом
        itemDrop = treeList.find(e => e.id === +currentDroppable?.getAttribute("data-id")) || null;

        const listSelectedFull = treeList.filter((e: any) => listSelected.includes(e.id));
        const parentDrop = treeList.filter((e: any) => e.id == itemDrop?.pid);
        const canBeMoved = ActionsControl.is_valid_action(parentDrop[0], listSelectedFull, false, true);

        if (
            (listSelected?.length == 1 && currentDroppable === treeItem)
            || itemDrop?.pid < -2
            || itemDrag?.no_drag === true
            || canBeMoved == false
        ) {
            currentDroppable.classList.remove('success');
            boxDD.classList.remove('pos');
            isDrop = false;
        }
        else {
            if (ddVisible) boxDD.classList.add('pos');

            const shouldBlockDrop =
                itemDrop?.pid === -2 // root
                || (isChild(treeList, itemDrag.id, itemDrop.pid) && listSelected?.length == 1)
                || (currentDropPosition === 'bottom' && isParentNoDrop(treeList, itemDrag, itemDrop));

            if (shouldBlockDrop) {
                boxDD.classList.remove('active');
                currentDroppable.classList.remove('success');
                isDrop = false;
            }
            else {
                boxDD.classList.add('active');
                currentDroppable.classList.add('success');
                isDrop = true;
            }

        }
    }

    function addHoverDelayEventListener(element: HTMLElement, delay = 1200) {
        element.addEventListener('mouseover', () => {
            if (element?.classList.contains('active')) return;
            if (!itemDrag) return;

            hoverStart = Date.now();
            hoverEnd = null;

            hoverTimer = setTimeout(() => {
                if (hoverEnd == null && canBeOpened) {
                    element.classList.add('active');
                    updateContexts(contexts, currentSceneName, element, true);
                    paintIdentical();
                }
            }, delay);
        });

        element.addEventListener('mouseout', () => {
            if (element?.classList.contains('active')) return;
            if (!itemDrag) return;

            hoverEnd = Date.now();
            const hoverTime = hoverEnd - hoverStart;

            clearTimeout(hoverTimer);

            if (hoverTime < delay) {
                element.classList.remove('active');
                updateContexts(contexts, currentSceneName, element, false);
            }
        });
    }

    function updateContexts(contexts: Contexts, scene: string, li: HTMLElement, state: boolean): void {
        const itemId = li.querySelector("a.tree__item")?.getAttribute("data-id");
        if (itemId == null || itemId == undefined) return;
        contexts[scene][+itemId] = state;
    }

    function addClassActive(eLi: any, itemPid: any): void {
        if (!eLi) return;
        if (!itemPid || itemPid <= -1) return;

        const liPid = eLi.querySelector("a.tree__item")?.getAttribute("data-pid");
        if (liPid && liPid == itemPid) {
            const liLine = eLi?.closest("ul")?.closest(".li_line");
            if (!liLine) return;
            if (!liLine?.classList.contains("active")) {
                liLine.classList.add("active");
                updateContexts(contexts, currentSceneName, liLine, true);
            }
            addClassActive(liLine?.closest("ul")?.closest(".li_line"), itemPid);
        }
        else {
            if (!eLi?.classList.contains("active")) {
                eLi.classList.add("active");
                updateContexts(contexts, currentSceneName, eLi, true);
            }
            addClassActive(eLi?.closest("ul")?.closest(".li_line"), itemPid);
        }
    }

    function addTreeBtnEventListener(btn: HTMLElement) {
        // slideUp/slideDown for tree
        btn.addEventListener('click', () => {
            const li = btn.closest("li");
            if (li == null) return;
            const treeSub = li.querySelector(".tree_sub") as HTMLElement;
            if (treeSub == null) return;

            treeSub.style.height = 'auto';
            const heightSub = treeSub.clientHeight + 'px';
            treeSub.style.height = heightSub;
            if (li.classList.contains('active')) {
                setTimeout(() => { treeSub.style.height = '0px'; }, 0);
                li.classList.remove('active');
                updateContexts(contexts, currentSceneName, li, false);
            } else {
                treeSub.style.height = '0px';
                setTimeout(() => { treeSub.style.height = heightSub; }, 0);
                li.classList.add('active');
                updateContexts(contexts, currentSceneName, li, true);
                paintIdentical();
            }
            setTimeout(() => { treeSub.removeAttribute('style'); }, 160);
        });
    }

    function setContendEditAble(event: any) {
        if (_is_moveItemDrag) return; // если движение было 

        if (!_is_editItem) return; // если выбран НЕ 1

        if (itemDrag?.no_rename) return; // разрешено ли редактирование

        const currentItem = event.target.closest("a.tree__item.selected");
        if (!currentItem) return;

        const currentId = +currentItem?.getAttribute("data-id");
        if (!currentId) return;

        setTimeout(() => {
            //log({itemDragRenameId, currentId})
            if (itemDragRenameId != currentId) return; // тк setTimeout сверяем, что это тот же элемент
            preRename();
        }, 1200);

    }

    function preRename() {
        if (!copyItemDrag) return;
        const itemName = document.querySelector(`.tree__item[data-id='${copyItemDrag?.id}'] .tree__item_name`) as HTMLLIElement | null;
        if (!itemName || copyItemDrag?.no_rename) return;

        itemName.setAttribute("contenteditable", "true");
        itemName.focus();
        document.execCommand('selectAll', false, undefined);
        renameItem(copyItemDrag?.id, itemName);
    }

    function toggleClassSelected(event: any) {
        _is_dragging = true;

        const btn = event.target.closest(".tree__btn");
        if (btn) return;

        const currentItem = event.target.closest("a.tree__item");
        if (!currentItem) return;

        const currentId = +currentItem?.getAttribute("data-id");
        if (!currentId) return;

        const itemsName: NodeListOf<HTMLElement> = document.querySelectorAll('a.tree__item .tree__item_name');
        for (let i = 0; i < itemsName.length; i++) {
            itemsName[i]?.removeAttribute("contenteditable");
        }

        if (Input.is_control()) { // NOTE: если зажата ctrl
            if (listSelected.includes(currentId)) {
                const isOne = listSelected.length == 1 ? true : false;
                _is_dragging = listSelected.length > 1 ? true : false;
                currentItem.classList.remove("selected");
                listSelected = listSelected.filter((item) => item != currentId);
                _is_currentOnly = true;

                if (isOne) Services.event_bus.emit('SYS_GRAPH_SELECTED', { list: [] });
            }
            else {
                currentItem.classList.add("selected");
                listSelected.push(currentId);
            }
            shiftAnchorId = currentId;
        } else if (Input.is_shift() && listSelected.length > 0) { // NOTE: если зажата shift
            const itemsToSelect = getItemsBetween(shiftAnchorId || listSelected[0], currentId);

            for (let i = 0; i < itemsToSelect.length; i++) {
                const id = itemsToSelect[i];
                if (!listSelected.includes(id)) {
                    const item = getElementById(id);
                    if (item) {
                        item.classList.add("selected");
                        listSelected.push(id);
                    }
                }
            }
        } else { // NOTE:  если НЕ зажата ctrl и НЕ зажата shift (или shift без выбранных элементов)
            if (listSelected?.length == 0) {
                currentItem.classList.add("selected");
                listSelected = [currentId];
            }
            else {
                if (listSelected.includes(currentId)) {
                    if (listSelected?.length == 1) {
                        _is_editItem = true;
                    }
                    _is_currentOnly = true;
                }
                else {
                    const menuItems: NodeListOf<HTMLElement> = document.querySelectorAll('a.tree__item');
                    for (let i = 0; i < menuItems.length; i++) {
                        menuItems[i].classList.remove("selected");
                    }
                    currentItem.classList.add("selected");
                    listSelected = [currentId];

                }
            }

            shiftAnchorId = currentId;
        }
    }

    function sendListSelected(event: any) {
        const btn = event.target.closest(".tree__btn");
        if (btn) return;

        if (!itemDrag) return;
        if (event.button == 2 && !event.target.closest("a.tree__item")) return;

        if (!_is_moveItemDrag) { // если движения Не было
            if (Input.is_control()) {
                //log(`Services.event_bus.emit('SYS_GRAPH_SELECTED', {list: ${listSelected}})`);
                Services.event_bus.emit('SYS_GRAPH_SELECTED', { list: listSelected });
                return;
            }
            if (Input.is_shift()) {
                Services.event_bus.emit('SYS_GRAPH_SELECTED', { list: listSelected });
                return;
            }
            if (listSelected?.length > 1 && event.button == 0) {
                listSelected = [itemDrag?.id];
                //log(`Services.event_bus.emit('SYS_GRAPH_SELECTED', {list: ${listSelected}})`);
                Services.event_bus.emit('SYS_GRAPH_SELECTED', { list: listSelected });
                return;
            }
            if (!_is_currentOnly && listSelected?.length <= 1) { // trigger   кроме текущего
                //log(`Services.event_bus.emit('SYS_GRAPH_SELECTED', {list: ${listSelected}})`);
                Services.event_bus.emit('SYS_GRAPH_SELECTED', { list: listSelected });
                return;
            }

        }

        // если движение было
        if (Input.is_control() && _is_currentOnly) {
            if (!listSelected.includes(itemDrag?.id)) {
                listSelected.push(itemDrag?.id);
            }
            return;
        }

        if (!_is_currentOnly && listSelected?.length <= 1 && !isDrop) {
            // log(`Services.event_bus.emit('SYS_GRAPH_SELECTED', {list: ${listSelected}})`);
            Services.event_bus.emit('SYS_GRAPH_SELECTED', { list: listSelected });
            return;
        }
    }

    function getIdenticalNames(list: string[]): string[] {
        return list.filter((item, index) => list.indexOf(item) !== index);
    }

    function openTreeWithSelected() {
        const selectedItems = treeList.filter(item => item.selected);
        if (selectedItems.length) {
            selectedItems.forEach((item) => {
                const element = getElementById(item.id);
                if (element) {
                    addClassActive(element.closest(".li_line"), element.closest(".tree__item")?.getAttribute("data-pid"));
                }
            })
        }
    }

    // подсветка идентичных: TreeControl.paintIdentical(true); true - с раскрытием
    function paintIdentical(expand: boolean = false): void {
        const listName: string[] = [];
        treeList.forEach((item) => listName.push(item?.name));
        const identicalNames = getIdenticalNames(listName);
        if (identicalNames.length == 0) return;
        const itemsName: NodeListOf<HTMLElement> = document.querySelectorAll('a.tree__item .tree__item_name');
        if (!itemsName) return;

        itemsName.forEach((item: any) => {
            if (identicalNames.includes(item?.textContent)) {
                item.classList.add("color_red");
                if (expand) addClassActive(item.closest(".li_line"), item.closest(".tree__item")?.getAttribute("data-pid")); // раскрываем все, где есть идентичные имена
            }
            else {
                item.classList.remove("color_red");
            }
        });
    }

    function paintSearchNode(className: string): void {
        const input: any = document.querySelector(".searchInTree");
        if (!input) return;
        const name = input?.value?.trim();
        if (!name) return;

        const spans = document.querySelectorAll('a.tree__item .tree__item_name');
        if (!spans) return;
        spans.forEach((s: any) => {
            s.classList.remove(className);
            if (name?.length > 0 && s.textContent.includes(name)) {
                s.classList.add(className);
            }
        });
    }

    function paintIdenticalLive(fieldSelector: string, selectorAll: string, className: string, delay: number): void {
        const field = document.querySelector(fieldSelector);
        if (!field) return;
        const idField = fieldSelector == ".searchInTree" ? -20 : field.closest(".tree__item")?.getAttribute("data-id");
        if (!idField) return;

        let timer: any;
        field.addEventListener('keyup', (event: any) => {

            const name = event.target?.value ? event.target?.value?.trim() : event.target?.textContent?.trim();
            if (name == null || name == undefined) return;

            clearTimeout(timer);

            timer = setTimeout(() => {
                const spans = document.querySelectorAll(selectorAll);
                spans.forEach((s: any) => {
                    s.classList.remove(className);
                    const id_s = s.closest(".tree__item")?.getAttribute("data-id");
                    const rename = name?.length > 0 && s?.textContent == name && id_s != idField;
                    const search = name?.length > 0 && s.textContent.includes(name);
                    const is_paint = fieldSelector == ".searchInTree" ? search : rename;
                    if (is_paint) {
                        s.classList.add(className);
                        addClassActive(s.closest(".li_line"), s.closest(".tree__item")?.getAttribute("data-pid"));
                        scrollToElemInParent(divTree, s); // скролим до элемента
                    }
                });
            }, delay); //  поиск с паузой

        });
    }

    function renameItem(id: number, itemName: any): void {
        if (!itemName && !id) return;

        // подсвечиваем имя если не уникальное
        paintIdenticalLive(`.tree__item[data-id='${id}'] .tree__item_name`, "#wr_tree .tree__item_name", "color_red", 555);

        itemName.addEventListener('blur', fBlur);
        itemName.addEventListener('keypress', fKeypress);

        function fKeypress(e: any) {
            if (e.key === 'Enter') {
                e.preventDefault();
                fBlur();
            }
        }

        function fBlur() {
            itemName.removeEventListener('blur', fBlur);
            itemName.removeEventListener('keypress', fKeypress);
            itemName.removeAttribute('contenteditable');

            const name = itemName?.value ? itemName?.value?.trim() : itemName?.textContent?.trim();
            if (name == null || name == undefined) return;

            if (name?.length == 0) { return; }

            //log('SYS_GRAPH_CHANGE_NAME', { id, name });
            Services.event_bus.emit('SYS_GRAPH_CHANGE_NAME', { id, name });
        }

    }

    function getItemCM(text: string, action: number): contextMenuItem {
        let not_active = false;

        if (action == NodeAction.rename)
            if (itemDrag?.no_rename || itemDrag?.id == -1) not_active = true;

        if (action == NodeAction.CTRL_X || action == NodeAction.remove)
            if (itemDrag?.no_remove || itemDrag?.id == -1) not_active = true;

        if (action == NodeAction.CTRL_C || action == NodeAction.CTRL_D)
            if (itemDrag?.id == -1) not_active = true;

        if (action == NodeAction.CTRL_V) {
            let canPaste = ActionsControl.is_valid_action(itemDrag) == false;
            if (itemDrag?.pid == -1) {
                // если itemDrag в корне сцены, то canPaste c учетом asChild
                const copyList = ActionsControl.copy_mesh_list;
                canPaste = ActionsControl.is_valid_action(itemDrag, copyList, true) == false;
            }
            if (itemDrag?.id == -1) not_active = true;
            else if (canPaste) not_active = true;
        }

        if (action == NodeAction.CTRL_B) {
            const canPaste = ActionsControl.is_valid_action(itemDrag) == false;
            if (itemDrag?.id == -1) {
                if (canPaste) not_active = true;
            }
            else { if (itemDrag?.no_drop || canPaste) not_active = true; }
        }

        // внутри component ничего нельзя создавать
        // if (NodeAction.add_component_spline == action) not_active = true;
        // запрещено все кроме удаления и дублирования
        if (itemDrag?.icon.indexOf('component') > -1 && ![NodeAction.remove, NodeAction.CTRL_D].includes(action)) not_active = true;

        // можно только удалить для базовой сущности
        if (itemDrag?.icon == "base_entity" && action != NodeAction.remove) not_active = true;

        if (DEFOLD_LIMITS) {
            // внутри Go нельзя создавать gui
            if (NodeActionGui.includes(action) && worldGo.includes(itemDrag?.icon)) not_active = true;

            // внутри Gui нельзя создавать Go
            if (NodeActionGo.includes(action) && worldGui.includes(itemDrag?.icon)) not_active = true;

            // внутри gui_container нельзя создавать gui_container
            if (action == NodeAction.add_gui_container && worldGui.includes(itemDrag?.icon)) not_active = true;

            // внутри sprite\label\model ничего нельзя создавать
            if ([...NodeActionGui, ...NodeActionGo].includes(action) && componentsGo.includes(itemDrag?.icon)) not_active = true;

            // в корне можно создавать только  GO_CONTAINER \ GUI_CONTAINER
            const blackList = [
                NodeAction.add_gui_box,
                NodeAction.add_gui_text,
                NodeAction.add_go_sprite_component,
                NodeAction.add_go_label_component,
                NodeAction.add_go_model_component,
                NodeAction.add_go_animated_model_component,
                NodeAction.add_go_audio_component
            ];
            if (itemDrag?.id == -1 && blackList.includes(action)) not_active = true;
        }

        return { text, action, not_active };
    }

    function getContextMenuItems(): contextMenuItem[] {
        const cm_list: contextMenuItem[] = [];
        cm_list.push(getItemCM('Переименовать', NodeAction.rename));
        cm_list.push(getItemCM('Вырезать', NodeAction.CTRL_X));
        cm_list.push(getItemCM('Копировать', NodeAction.CTRL_C));

        cm_list.push(getItemCM('Вставить', NodeAction.CTRL_V));
        cm_list.push(getItemCM('Вставить дочерним', NodeAction.CTRL_B));

        cm_list.push(getItemCM('Дублировать', NodeAction.CTRL_D));
        cm_list.push(getItemCM('Удалить', NodeAction.remove));
        cm_list.push({ text: 'line' });

        cm_list.push({
            text: 'Создать UI', children: [
                getItemCM('Добавить контейнер', NodeAction.add_gui_container),
                getItemCM('Добавить блок', NodeAction.add_gui_box),
                getItemCM('Добавить текст', NodeAction.add_gui_text),
                { text: 'line' },
                {
                    text: 'Расширенные', children: [
                        getItemCM('Добавить кнопку', -5),
                        getItemCM('Добавить прогресс бар', -5),
                        getItemCM('Добавить скрол', -5),
                    ]
                },
            ]
        });

        cm_list.push({ text: 'line' });
        cm_list.push({
            text: 'Game', children: [
                getItemCM('Добавить контейнер', NodeAction.add_go_container),
                getItemCM('Добавить спрайт', NodeAction.add_go_sprite_component),
                getItemCM('Добавить надпись', NodeAction.add_go_label_component),
                getItemCM('Добавить модель', NodeAction.add_go_model_component),
                getItemCM('Добавить аним-модель', NodeAction.add_go_animated_model_component),
                getItemCM('Добавить звук', NodeAction.add_go_audio_component),
            ]
        });


        cm_list.push({ text: 'line' });
        cm_list.push({
            text: 'Компонент', children: [
                getItemCM('Сплайн', NodeAction.add_component_spline),
                getItemCM('Движение', NodeAction.add_component_mover),
            ]
        });

        return cm_list;
    }

    function openMenuContext(event: any): void {
        if (!itemDrag) return;
        if (!event.target.closest(".tree__item")) return;

        // запрет скроллинга при контекстном меню
        if (divTree.scrollHeight > divTree.clientHeight) {
            divTree.classList.add('no_scrolling');
        }

        ContextMenu.open(getContextMenuItems(), event, menuContextClick);
    }

    function setCutList(is_clear: boolean = false) {
        if (!is_clear) {
            cutList = deepClone(listSelected);
            addClassIsCut();
        }
        else {
            cutList.length = 0;
        }
    }

    function addClassIsCut() {
        if (cutList.length == 0) return;
        cutList.forEach((i) => {
            const item = getElementById(i);
            if (item) item.classList.add('isCut');
        })
    }

    function menuContextClick(success: boolean, action?: number | string): void {
        divTree.classList.remove('no_scrolling');

        if (!success || action == undefined || action == null || !copyItemDrag) return;

        if (action == NodeAction.CTRL_X) {
            Services.actions.cut();
        }
        if (action == NodeAction.CTRL_C) {
            Services.actions.copy();
        }
        if (action == NodeAction.CTRL_V) {
            // isDuplication для возможности вставки в корень из меню
            ActionsControl.paste(false, copyItemDrag?.id == -1);
        }
        if (action == NodeAction.CTRL_B) {
            // isDuplication для возможности вставки в корень из меню
            ActionsControl.paste(true, copyItemDrag?.id == -1);
        }
        if (action == NodeAction.CTRL_D) {
            Services.actions.duplicate();
        }
        if (action == NodeAction.rename) {
            preRename();
        }
        if (action == NodeAction.remove) {
            Services.actions.delete_selected();
        }
        if (action == NodeAction.add_gui_container) {
            ActionsControl.add_gui_container({ pid: copyItemDrag?.id, pos: get_position_view() });
        }
        if (action == NodeAction.add_gui_box) {
            ActionsControl.add_gui_box({ pid: copyItemDrag?.id, texture: '2', atlas: '', pos: get_position_view(), size: { w: 128, h: 40 } });
        }
        if (action == NodeAction.add_gui_text) {
            ActionsControl.add_gui_text({ pid: copyItemDrag?.id, pos: get_position_view() });
        }
        if (action == NodeAction.add_go_container) {
            ActionsControl.add_go_container({ pid: copyItemDrag?.id, pos: get_position_view() });
        }
        if (action == NodeAction.add_go_sprite_component) {
            ActionsControl.add_go_sprite_component({ pid: copyItemDrag?.id, texture: 'arrow1', atlas: 'example_atlas', pos: get_position_view(), size: { w: 64, h: 64 } });
        }
        if (action == NodeAction.add_go_label_component) {
            ActionsControl.add_go_label_component({ pid: copyItemDrag?.id, pos: get_position_view() });
        }
        if (action == NodeAction.add_go_model_component) {
            ActionsControl.add_go_model_component({ pid: copyItemDrag?.id, pos: get_position_view() });
        }
        if (action == NodeAction.add_go_animated_model_component) {
            ActionsControl.add_go_animated_model_component({ pid: copyItemDrag?.id, pos: get_position_view() });
        }
        if (action == NodeAction.add_go_audio_component) {
            ActionsControl.add_go_audio_component({ pid: copyItemDrag?.id, pos: get_position_view() });
        }
        if (action == NodeAction.add_component_spline) {
            ActionsControl.add_component({ pid: copyItemDrag?.id, pos: get_position_view() }, ComponentType.SPLINE);
        }
        if (action == NodeAction.add_component_mover) {
            ActionsControl.add_component({ pid: copyItemDrag?.id, pos: get_position_view() }, ComponentType.MOVER);
        }

        copyItemDrag = null;
    }

    function get_position_view() {
        const list = Services.selection.selected as TreeMeshObject[];
        const cx = (0.5) * 2 - 1;
        const cy = - 0.5 * 2 + 1;
        if (list.length == 0) {
            const wp = Camera.screen_to_world(cx, cy);
            return new Vector2(wp.x, wp.y);
        }
        if (list.length == 1) {
            if (!Camera.is_visible(list[0] as unknown as Mesh)) {
                const wp = Camera.screen_to_world(cx, cy);
                const lp = list[0].worldToLocal(wp);
                return new Vector2(lp.x, lp.y);
            }
        }
        return new Vector2();
    }

    function toggleEventListenerTexture(add: boolean = true) {
        const selector = '.tree__item[data-icon="scene"], .tree__item[data-icon="go"], .tree__item[data-icon="gui"], .tree__item[data-icon="box"], .tree__item[data-icon="text"]';
        const listDrop = document.querySelectorAll(selector);
        if (listDrop) {
            listDrop.forEach((item) => {
                if (add) {
                    const noDrop = item.getAttribute('data-no_drop');
                    if (!noDrop) {
                        item.addEventListener("dragover", allowDropTexture);
                        item.addEventListener("dragleave", onDragLeaveTexture);
                        item.addEventListener("drop", onDropTexture);
                    }
                }
                else {
                    item.removeEventListener("dragover", allowDropTexture);
                    item.removeEventListener("dragleave", onDragLeaveTexture);
                    item.removeEventListener("drop", onDropTexture);
                }
            });
        }
    }

    function allowDropTexture(event: any) {
        event.preventDefault();
        const item = event.target.closest('.tree__item');
        if (item) item.classList.add('drop_texture');
    }

    function onDragLeaveTexture(event: any) {
        event.preventDefault();
        const item = event.target.closest('.tree__item');
        if (item) item.classList.remove('drop_texture');
    }

    function onDropTexture(event: any) {
        event.preventDefault();
        const item = event.target.closest('.tree__item');
        if (!item) return;
        item.classList.remove('drop_texture');
        const icon = item.getAttribute('data-icon');
        const itemId = item.getAttribute('data-id');
        if (!icon || !itemId) return;

        addNodeTexture(event, false, icon, itemId);
    }

    function getMousePos(event: any) {
        const canvas = document.querySelector(`canvas#scene`)!;
        const mp_n = new Vector2();
        mp_n.set((event.pageX / canvas.clientWidth) * 2 - 1, - (event.pageY / canvas.clientHeight) * 2 + 1);
        return Camera.screen_to_world(mp_n.x, mp_n.y) || {};
    }

    function canvasDropTexture() {
        const canvas = document.querySelector(`canvas#scene`)!;
        canvas.addEventListener("dragover", (e) => e.preventDefault());
        canvas.addEventListener("drop", onDropTextureCanvas);
    }

    function onDropTextureCanvas(event: any) {
        event.preventDefault();
        addNodeTexture(event, true);
    }

    function addNodeTexture(event: any, isPos: boolean, icon: string = '', id: number = -1) {
        const data = event.dataTransfer.getData("text/plain");

        // Перетаскиваемый ассет может быть не текстурой, а сохранённым в файл .scn графом сцены
        const asset_type = event.dataTransfer.getData("asset_type");
        if (asset_type == ASSET_SCENE_GRAPH) {
            const mouseUpPos = getMousePos(event);
            const path = event.dataTransfer.getData("path");
            AssetControl.loadPartOfSceneInPos(path, mouseUpPos);
            ControlManager.update_graph();
            return;
        }

        if (data.length == 0 || data.includes('undefined/undefined')) {
            Popups.toast.open({ type: 'info', message: "Нет текстуры!" });
            return;
        }

        const list = Services.selection.selected as TreeMeshObject[];
        if (list.length > 1 && isPos) {
            Popups.toast.open({ type: 'info', message: "Для этого действия нужно выбрать только 1 объект!" });
            return;
        }

        const nType = isPos && list.length > 0 ? list[0]?.type : icon;
        const mouseUpPos = getMousePos(event);
        const nPos = isPos && mouseUpPos ? new Vector2(mouseUpPos?.x, mouseUpPos?.y) : new Vector2(0, 0);
        const nId = isPos && list.length > 0 && list[0]?.mesh_data !== undefined ? list[0].mesh_data.id : id;

        const arrSize = event.dataTransfer.getData("textureSize").split("x");
        const tWidth = +arrSize[0];
        const tHeight = +arrSize[1];
        const arrData = data.split("/");
        const pt: paramsTexture = {
            pid: nId,
            texture: arrData[1],
            atlas: arrData[0],
            size: { w: tWidth || 128, h: tHeight || 128 },
            pos: nPos
        }

        const noDrop = treeList.find((i) => i.id == pt.pid && i.no_drop);
        if (noDrop) {
            Popups.toast.open({ type: 'info', message: "В текущий объект запрещено добавлять дочерние!" });
            return;
        }

        const go = ['scene', IObjectTypes.GO_CONTAINER];
        if ((list.length == 0 && isPos) || (nType !== undefined && go.includes(nType))) {
            if (!DEFOLD_LIMITS)
                ActionsControl.add_go_sprite_component(pt);
            else
                ActionsControl.add_go_with_sprite_component(pt);

            return;
        }

        if (nType !== undefined && worldGui.includes(nType)) {
            ActionsControl.add_gui_box(pt);
            return;
        }

        Popups.toast.open({ type: 'info', message: "Этому объекту нельзя добавлять текстуру!" });
    }

    function updateDataVisible(id: number, value: string) {
        const item = getElementById(id);
        if (item) item.setAttribute("data-visible", value);
    }

    function updateActive(e: any) {
        const { list, state } = e;
        list.forEach((item: { id: number, visible: boolean }) => {
            if (!state) { updateDataVisible(item.id, 'false'); return; }

            let isVisible: string = 'true';
            const parentIncludes = checkParentsVisible(item.id, list);
            const parentIsVisible = checkParentsVisible(item.id);
            const parentIncludesLS = checkParentsVisible(item.id, [], listSelected);

            if (parentIsVisible) {
                if (!parentIncludes || item.visible == false) isVisible = 'false';
                if (parentIncludes) isVisible = parentIncludesLS ? 'false' : 'true';
            }
            else isVisible = 'true';

            updateDataVisible(item.id, isVisible);
        });
    }

    function checkParentsVisible(id: number, ids: { id: number, visible: boolean }[] = [], ls: number[] = []): boolean {
        const item = treeList.find((i) => i.id == id);
        if (!item) return false;
        if (item.pid == -1) return false;
        const parent = treeList.find((i) => i.id == item.pid);
        if (!parent) return false;

        if (ls.length > 0) {
            if (ls.includes(parent.id)) {
                const pr = treeList.find((i) => i.id == parent.pid);
                if (!pr || pr.id == -1) return false;
                return parent.visible == false ? true : false;
            }
            return checkParentsVisible(parent.id, [], ls);
        }

        if (ids.length > 0) {
            if (ids.find((i) => i.id == parent.id)) return true;
            return checkParentsVisible(parent.id, ids);
        }

        if (parent.visible == false) return true;
        return checkParentsVisible(parent.id);
    }

    function updateVisible(e: any) {
        const { list, state } = e;
        list.forEach((id: number) => {
            updateDataVisible(id, state);
        });
    }

    function setupElementCache() {
        clearCache();
        const items = document.querySelectorAll('.tree__item') as NodeListOf<HTMLElement>;
        items.forEach(item => {
            const id = Number(item.getAttribute('data-id') || '0');
            if (id) {
                elementCache[id] = item;
            }
        });
    }

    function getElementById(id: number): HTMLElement | null {
        const cachedElement = elementCache[id];
        if (cachedElement) {
            // NOTE: доп проверка
            if (document.contains(cachedElement)) return cachedElement;
            else delete elementCache[id];
        }
        const element = document.querySelector(`.tree__item[data-id="${id}"]`) as HTMLElement;
        if (element)
            elementCache[id] = element;
        return element;
    }

    function clearCache() {
        elementCache = {};
    }


    function cleanupEmptyParent(parentElement: HTMLElement) {
        //console.log('cleanupEmptyParent', parentElement);
        const treeSub = parentElement.querySelector('.tree_sub');
        if (treeSub && treeSub.children.length === 0) {
            treeSub.remove();
            const btn = parentElement.querySelector('.tree__btn');
            if (btn) btn.remove();
            parentElement.classList.remove('active');
            const itemId = parentElement.querySelector('.tree__item')?.getAttribute('data-id');
            if (itemId && contexts[currentSceneName]) {
                contexts[currentSceneName][+itemId] = false;
            }
        }
    }

    function onKeyDown(event: any) {
        if (!((event.target as HTMLElement)!.closest('.tree_div') || (event.target as HTMLElement)!.tagName == 'BODY'))
            return;

        if ((event.target as HTMLElement)?.closest('.tree__item_name[contenteditable="true"]')) {
            return;
        }

        const currentElement = getCurrentActiveElement();
        if (!currentElement && (event.target as HTMLElement)?.closest('.tree_div')) {
            const firstElement = document.querySelector('.tree__item') as HTMLElement;
            if (firstElement) {
                selectElement(firstElement);
            }
        }

        switch (event.key) {
            case 'ArrowUp':
                navigateToPrevious();
                break;
            case 'ArrowDown':
                navigateToNext();
                break;
            case 'ArrowLeft':
                navigateToParent();
                break;
        }
    }

    function navigateToPrevious() {
        const currentElement = getCurrentActiveElement();
        if (!currentElement) {
            const firstElement = document.querySelector('.tree__item') as HTMLElement;
            if (firstElement) {
                selectElement(firstElement);
            }
            return;
        }

        const previousElement = getPreviousElement(currentElement);
        if (previousElement && previousElement.closest('.tree__item')?.getAttribute('data-id') != '-1') {
            selectElement(previousElement);
        }
    }

    function navigateToNext() {
        const currentElement = getCurrentActiveElement();
        if (!currentElement) {
            const firstElement = document.querySelector('.tree__item') as HTMLElement;
            if (firstElement) {
                selectElement(firstElement);
            }
            return;
        }

        const nextElement = getNextElement(currentElement);
        if (nextElement) {
            selectElement(nextElement);
        }
    }

    function navigateToParent() {
        const currentElement = getCurrentActiveElement();
        if (!currentElement) return;

        const parentElement = getParentElement(currentElement);
        if (parentElement && parentElement.closest('.tree__item')?.getAttribute('data-id') != '-1') {
            selectElement(parentElement);
        }
    }

    function getCurrentActiveElement(): HTMLElement | null {
        const selectedElement = document.querySelector('.tree__item.selected') as HTMLElement;
        if (selectedElement) return selectedElement;

        const focusedElement = document.activeElement?.closest('.tree__item') as HTMLElement;
        if (focusedElement) return focusedElement;

        const firstElement = document.querySelector('.tree__item') as HTMLElement;
        if (firstElement) return firstElement;

        return null;
    }

    function getPreviousElement(currentElement: HTMLElement): HTMLElement | null {
        const allElements = Array.from(document.querySelectorAll('.tree__item')) as HTMLElement[];
        const currentIndex = allElements.indexOf(currentElement);

        if (currentIndex <= 0) return null;

        for (let i = currentIndex - 1; i >= 0; i--) {
            const element = allElements[i];
            if (isElementVisible(element)) {
                return element;
            }
        }

        return null;
    }

    function getNextElement(currentElement: HTMLElement): HTMLElement | null {
        const allElements = Array.from(document.querySelectorAll('.tree__item')) as HTMLElement[];
        const currentIndex = allElements.indexOf(currentElement);

        if (currentIndex === -1 || currentIndex >= allElements.length - 1) return null;

        for (let i = currentIndex + 1; i < allElements.length; i++) {
            const element = allElements[i];
            if (isElementVisible(element)) {
                return element;
            }
        }

        return null;
    }

    function getParentElement(currentElement: HTMLElement): HTMLElement | null {
        const currentId = Number(currentElement.getAttribute('data-id'));
        if (!currentId) return null;

        const currentItem = treeList.find(item => item.id === currentId);
        if (!currentItem || currentItem.pid === -2) return null;

        const parentElement = document.querySelector(`.tree__item[data-id="${currentItem.pid}"]`) as HTMLElement;
        return parentElement;
    }

    function isElementVisible(element: HTMLElement): boolean {
        let parent = element.parentElement;
        let idx = 0;
        while (parent) {
            if (idx != 0 && parent.classList.contains('li_line') && !parent.classList.contains('active')) {
                return false;
            }
            parent = parent.parentElement;
            idx++;
        }
        return true;
    }

    function selectElement(element: HTMLElement) {
        const allElements = document.querySelectorAll('.tree__item');
        allElements.forEach(el => el.classList.remove('selected'));

        element.classList.add('selected');

        const elementId = Number(element.getAttribute('data-id'));
        if (elementId) {
            listSelected = [elementId];
            shiftAnchorId = elementId;

            Services.event_bus.emit('SYS_GRAPH_SELECTED', { list: listSelected });
        }

        if (!isElementInViewport(divTree, element)) {
            scrollToElemInParent(divTree, element);
        }

        element.focus();
    }

    init();
    return { set_selected_items, draw_graph, preRename, setCutList, paintIdentical };
}