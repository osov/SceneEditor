import { deepClone } from "../modules/utils";
import { contextMenuItem } from "../modules_editor/ContextMenu";
import { NodeAction, NodeActionGui, NodeActionGo, worldGo, worldGui, componentsGo, paramsTexture } from "./ActionsControl";
import { IObjectTypes } from '../render_engine/types';
import { Vector2 } from "three";
import { ASSET_SCENE_GRAPH } from "../modules_editor/modules_editor_const";
import { DEFOLD_LIMITS } from "../config";
import { ComponentType } from "../render_engine/components/container_component";

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

function TreeControlCreate() {
    let treeList: Item[] = [];
    let defaultList: Item[] = [
        {
            id: -1,
            pid: -2,
            name: "root",
            visible: true,
            icon: "scene",
            // selected: true,
            no_drag: true,
            no_drop: false
        }
    ];
    const contexts: Contexts = {};
    let currentSceneName: string = defaultList[0]?.name ? defaultList[0]?.name : "root";
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

    let startY: number;
    let startX: number;
    let itemDragRenameId: number | null = null; // чтобы чекать DBLCLICK  или  при DELAY не выбрали ли другой элемент

    let boxDD: any = document.querySelector(".drag_and_drop"); // div таскания за мышью
    let ddVisible: boolean = false; //  видимость div перетаскивания 

    let elementCache: Map<number, HTMLElement> = new Map(); // кэш элементов по ID

    function init() {
        // ВЕШАЕМ ОБРАБОТЧИКИ

        // поиск по дереву, вешаем обработчик  1 раз
        paintIdenticalLive(".searchInTree", "#wr_tree .tree__item_name", "color_green", 777);

        // drop texture
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
                    EventBus.trigger("SYS_GRAPH_CLICKED", { id: itemId });
                }
            }
        }, false);

        document.querySelector('#wr_tree')?.addEventListener('contextmenu', (event: any) => {
            event.preventDefault();
        });

        subscribe();
    }

    function subscribe() {
        EventBus.on('SYS_GRAPH_ACTIVE', updateActive);
        EventBus.on('SYS_GRAPH_VISIBLE', updateVisible);

        // document.addEventListener('mousedown', onMouseDown, false);
        EventBus.on('SYS_INPUT_POINTER_DOWN', onMouseDown);
        EventBus.on('SYS_INPUT_POINTER_MOVE', onMouseMove);
        EventBus.on('SYS_INPUT_POINTER_UP', onMouseUp);
    }

    function draw_graph(getList: Item[], scene_name?: string, is_hide_allSub = false, is_clear_state = false) {
        // NOTE: проверка на наличие изменений в дереве для того чтобы его обновить
        const newTreeList = deepClone(getList);
        const needsUpdate = needsTreeUpdate(newTreeList, treeList);

        // NOTE: Пропускаем обновление, если данные не изменились
        if (!needsUpdate && !is_clear_state) {
            return;
        }

        currentSceneName = scene_name ? scene_name : currentSceneName;
        treeList = newTreeList;

        contexts[currentSceneName] = is_clear_state ? {} : contexts[currentSceneName];
        contexts[currentSceneName] = contexts[currentSceneName] ? contexts[currentSceneName] : {};

        clearCache();

        const renderList = is_hide_allSub ? buildTree(treeList, currentSceneName) : buildTree(treeList);
        const html = getTreeHtml(renderList);
        divTree.innerHTML = html;
        updateDaD();
        scrollToLastSelected();
    }

    function needsTreeUpdate(newList: Item[], oldList: Item[]): boolean {
        if (newList.length != oldList.length) return true;
        for (let i = 0; i < Math.min(newList.length, oldList.length); i++) {
            if (newList[i].id != oldList[i].id ||
                newList[i].name != oldList[i].name ||
                newList[i].pid != oldList[i].pid ||
                newList[i].selected != oldList[i].selected) {
                return true;
            }
        }
        return false;
    }

    function buildTree(list: any, sneceName?: string) {
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
            if (node.pid !== -2) {
                treeMap[node.pid].children.push(treeMap[node.id]);
            } else {
                tree.push(treeMap[node.id]);
            }
        });

        if (sneceName) {
            Object.values(treeMap).forEach((node: any) => {
                if (node?.children.length) {
                    contexts[sneceName][+node.id] = false; // все sub tree скрыты   is_hide_allSub = true
                }
            });
        }

        return tree;
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
        if (!parentBlock || !elem) return;

        if (parentBlock.scrollHeight + 52 > window.innerHeight) {
            elem.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }

    function scrollToLastSelected() {
        const idLastSelected = listSelected.find((i: number) => !prevListSelected.includes(i));
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

        const startIndex = flatItems.findIndex(item => item.id === startId);
        const endIndex = flatItems.findIndex(item => item.id === endId);

        if (startIndex === -1 || endIndex === -1) {
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
        const parentElement = document.querySelector(`.tree__item[data-id="${parentId}"]`);
        if (!parentElement) return false;

        const parentLi = parentElement.closest('li');
        if (!parentLi) return false;

        return parentLi.classList.contains('active');
    }

    function getFlatItemsList(): Item[] {
        const result: Item[] = [];

        const visibleItems = document.querySelectorAll('a.tree__item') as NodeListOf<HTMLElement>;
        visibleItems.forEach(item => {
            const idAttr = item.getAttribute('data-id');
            const pidAttr = item.getAttribute('data-pid');
            const name = item.querySelector('.tree__item_name')?.textContent || '';
            const icon = item.getAttribute('data-icon') || '';
            const visible = item.getAttribute('data-visible') === 'true';
            const no_drag = item.getAttribute('data-no_drag') === 'true';
            const no_drop = item.getAttribute('data-no_drop') === 'true';
            const no_rename = item.getAttribute('data-no_rename') === 'true';
            const no_remove = item.getAttribute('data-no_remove') === 'true';

            if (idAttr !== null) {
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
        if (event.button === 0 || event.button === 2) {
            if (event.button === 0) _is_mousedown = true; // ЛКМ

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
                EventBus.trigger("SYS_GRAPH_DROP_IN_ASSETS", listSelected[0]);
            }

            if (!event.target.closest('.tree_div')) {
                if (itemDrag) myClear();
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
                myClear();
                return;
            }

            toggleCurrentBox(event.target.closest('.tree__item'));
            switchClassItem(event.target.closest('.tree__item'), event.offset_x, event.offset_y);

            if (event.target.closest('.tree__item') && currentDroppable && isDrop) {
                const posInItem = getPosMouseInBlock(event.target.closest('.tree__item'), event.offset_x, event.offset_y);
                if (posInItem) {
                    const movedList = getMovedList(listSelected, itemDrag, itemDrop, posInItem);
                    if (movedList) {
                        //log(`SYS_GRAPH_MOVED_TO`, movedList);
                        EventBus.trigger("SYS_GRAPH_MOVED_TO", movedList);
                    }
                }
            }

            myClear();
        }
    }

    function myClear(): void {
        ddVisible = false;
        boxDD.classList.remove('pos')
        boxDD.removeAttribute('style')
        currentDroppable?.classList.remove('droppable')
        _is_moveItemDrag = false;
        _is_editItem = false;
        _is_currentOnly = false;
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
        clearCache();
    }

    function isMove(offset_x: number, offset_y: number, startX: number, startY: number) {
        return Math.abs(offset_x - startX) > 12 || Math.abs(offset_y - startY) > 8;
    };

    function getMovedList(list: number[], drag: any, drop: any, type: string): any {
        // SYS_GRAPH_MOVED_TO: { pid: number, next_id: number, id_mesh_list: number[] }
        if (!list || !list.length || !drag || !drop || !type || !list.includes(drag?.id)) return null;

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
            return;
        }

        elem.classList.add(posInItem);
        if (posInItem === 'top' || posInItem === 'bottom') putAround();
        if (posInItem === 'bg') putInside();

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

            if (
                itemDrop?.pid === -2 // root
                || (isChild(treeList, itemDrag.id, itemDrop.pid) && listSelected?.length == 1)
                || isParentNoDrop(treeList, itemDrag, itemDrop)
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

    // если mousemove на tree__item больше delay, то добавляем класс active
    function addClassWithDelay(list: HTMLElement[], delay: number) {

        list.forEach((element: HTMLElement) => {
            element.addEventListener('mouseover', () => {
                if (element?.classList.contains('active')) return;
                if (!itemDrag) return;

                hoverStart = Date.now();
                hoverEnd = null;

                hoverTimer = setTimeout(() => {
                    if (hoverEnd === null) {
                        element.classList.add('active');
                        updateContexts(contexts, currentSceneName, element, true); // save state tree_sub
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
                    updateContexts(contexts, currentSceneName, element, false); // save state tree_sub
                }
            });
        });

    }

    function updateContexts(contexts: Contexts, scene: string, li: HTMLElement, state: boolean): void {
        const itemId = li.querySelector("a.tree__item")?.getAttribute("data-id");
        if (itemId === null || itemId === undefined) return;
        contexts[scene][+itemId] = state; // save state tree_sub
    }

    function addClassActive(eLi: any, itemPid: any): void {
        if (!eLi) return;
        if (!itemPid || itemPid <= -1) return;

        const liPid = eLi.querySelector("a.tree__item")?.getAttribute("data-pid");
        if (liPid && liPid === itemPid) {
            const liLine = eLi?.closest("ul")?.closest(".li_line");
            if (!liLine) return;
            if (!liLine?.classList.contains("active")) {
                liLine.classList.add("active");
                updateContexts(contexts, currentSceneName, liLine, true); // save state tree_sub
            }
            addClassActive(liLine?.closest("ul")?.closest(".li_line"), itemPid);
        }
        else {
            if (!eLi?.classList.contains("active")) {
                eLi.classList.add("active");
                updateContexts(contexts, currentSceneName, eLi, true); // save state tree_sub
            }
            addClassActive(eLi?.closest("ul")?.closest(".li_line"), itemPid);
        }
    }

    function treeBtnInit() {
        const btns: NodeListOf<HTMLElement> = document.querySelectorAll('ul.tree .tree__btn');
        btns.forEach(btn => {
            // slideUp/slideDown for tree
            btn.addEventListener('click', () => {
                const li = (btn as HTMLElement).closest("li");
                if (li === null) return;
                const treeSub = li.querySelector(".tree_sub") as HTMLElement;
                if (treeSub === null) return;

                treeSub.style.height = 'auto';
                const heightSub = treeSub.clientHeight + 'px';
                treeSub.style.height = heightSub;
                if (li.classList.contains('active')) {
                    setTimeout(() => { treeSub.style.height = '0px'; }, 0);
                    li.classList.remove('active');
                    updateContexts(contexts, currentSceneName, li, false); // save state tree_sub
                } else {
                    treeSub.style.height = '0px';
                    setTimeout(() => { treeSub.style.height = heightSub; }, 0);
                    li.classList.add('active');
                    updateContexts(contexts, currentSceneName, li, true); // save state tree_sub
                }
                setTimeout(() => { treeSub.removeAttribute('style'); }, 160);
            });
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

        // если зажата ctrl
        if (Input.is_control()) {
            if (listSelected.includes(currentId)) { // если он уже выделен - исключаем его
                const isOne = listSelected.length == 1 ? true : false;
                _is_dragging = listSelected.length > 1 ? true : false; // отключаем, если единственный выбранный
                currentItem.classList.remove("selected");
                listSelected = listSelected.filter((item) => item != currentId);
                _is_currentOnly = true; // текущий

                if (isOne) { // ctrl + 1 selected 
                    EventBus.trigger('SYS_GRAPH_SELECTED', { list: [] });
                }
            }
            else {
                currentItem.classList.add("selected");
                listSelected.push(currentId);
            }

            shiftAnchorId = currentId;
        }
        else if (Input.is_shift() && listSelected.length > 0) {
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

            shiftAnchorId = currentId;
        }
        else { //  если НЕ зажата ctrl и НЕ зажата shift (или shift без выбранных элементов)
            if (listSelected?.length == 0) {
                currentItem.classList.add("selected");
                listSelected = [currentId]; // add first elem
                shiftAnchorId = currentId; // Устанавливаем якорь при первом выборе
            }
            else {
                if (listSelected.includes(currentId)) {
                    if (listSelected?.length == 1) { // если 1 и текущий
                        _is_editItem = true; // разрешаем редактировать
                    }
                    _is_currentOnly = true; // текущий
                }
                else {
                    const menuItems: NodeListOf<HTMLElement> = document.querySelectorAll('a.tree__item');
                    for (let i = 0; i < menuItems.length; i++) {
                        menuItems[i].classList.remove("selected");
                    }
                    currentItem.classList.add("selected");
                    listSelected = [currentId]; // остается один
                    shiftAnchorId = currentId; // Устанавливаем якорь при новом выборе
                }
            }
        }
    }

    function sendListSelected(event: any) {
        const btn = event.target.closest(".tree__btn");
        if (btn) return;

        if (!itemDrag) return;
        if (event.button == 2 && !event.target.closest("a.tree__item")) return;

        if (!_is_moveItemDrag) { // если движения Не было
            if (Input.is_control()) {
                //log(`EventBus.trigger('SYS_GRAPH_SELECTED', {list: ${listSelected}})`);
                EventBus.trigger('SYS_GRAPH_SELECTED', { list: listSelected });
                return;
            }
            if (Input.is_shift()) {
                EventBus.trigger('SYS_GRAPH_SELECTED', { list: listSelected });
                return;
            }
            if (listSelected?.length > 1 && event.button == 0) {
                listSelected = [itemDrag?.id];
                //log(`EventBus.trigger('SYS_GRAPH_SELECTED', {list: ${listSelected}})`);
                EventBus.trigger('SYS_GRAPH_SELECTED', { list: listSelected });
                return;
            }
            if (!_is_currentOnly && listSelected?.length <= 1) { // trigger   кроме текущего
                //log(`EventBus.trigger('SYS_GRAPH_SELECTED', {list: ${listSelected}})`);
                EventBus.trigger('SYS_GRAPH_SELECTED', { list: listSelected });
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
            // log(`EventBus.trigger('SYS_GRAPH_SELECTED', {list: ${listSelected}})`);
            EventBus.trigger('SYS_GRAPH_SELECTED', { list: listSelected });
            return;
        }
    }

    function getIdenticalNames(list: string[]): string[] {
        return list.filter((item, index) => list.indexOf(item) !== index);
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
            EventBus.trigger('SYS_GRAPH_CHANGE_NAME', { id, name });
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
            const item = document.querySelector(`a.tree__item[data-id="${i}"]`)
            if (item) item.classList.add('isCut');
        })
    }

    function menuContextClick(success: boolean, action?: number | string): void {
        divTree.classList.remove('no_scrolling');

        if (!success || action == undefined || action == null || !copyItemDrag) return;

        if (action == NodeAction.CTRL_X) {
            ActionsControl.cut();
        }
        if (action == NodeAction.CTRL_C) {
            ActionsControl.copy();
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
            ActionsControl.duplication();
        }
        if (action == NodeAction.rename) {
            preRename();
        }
        if (action == NodeAction.remove) {
            ActionsControl.remove();
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
        const list = SelectControl.get_selected_list();
        const cx = (0.5) * 2 - 1;
        const cy = - 0.5 * 2 + 1;
        if (list.length == 0) {
            const wp = Camera.screen_to_world(cx, cy);
            return new Vector2(wp.x, wp.y);
        }
        if (list.length == 1) {
            if (!Camera.is_visible(list[0])) {
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

        const list = SelectControl.get_selected_list();
        if (list.length > 1 && isPos) {
            Popups.toast.open({ type: 'info', message: "Для этого действия нужно выбрать только 1 объект!" });
            return;
        }

        const nType = isPos && list.length ? list[0]?.type : icon;
        const mouseUpPos = getMousePos(event);
        const nPos = isPos && mouseUpPos ? new Vector2(mouseUpPos?.x, mouseUpPos?.y) : new Vector2(0, 0);
        const nId = isPos ? list[0]?.mesh_data.id : id;

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
        if ((list.length == 0 && isPos) || go.includes(nType)) {
            if (!DEFOLD_LIMITS)
                ActionsControl.add_go_sprite_component(pt);
            else
                ActionsControl.add_go_with_sprite_component(pt);

            return;
        }

        if (worldGui.includes(nType)) {
            ActionsControl.add_gui_box(pt);
            return;
        }

        Popups.toast.open({ type: 'info', message: "Этому объекту нельзя добавлять текстуру!" });
    }

    function updateDataVisible(id: number, value: string) {
        const item = document.querySelector(`.tree__item[data-id="${id}"]`);
        if (item) item.setAttribute("data-visible", value);
    }

    function updateActive(e: any) {
        const { list, state } = e;
        list.forEach((item: { id: number, visible: boolean }) => {
            if (!state) { updateDataVisible(item.id, 'false'); return; }

            let isVisible: string = 'true';
            const parentIncludes = checkParentsVisible(item.id, list); // список изменяемых, включая дочерние
            const parentIsVisible = checkParentsVisible(item.id); // скрытые родители
            const parentIncludesLS = checkParentsVisible(item.id, [], listSelected); // есть ли у выделенных скрытые родители

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

        // есть ли у выделенных скрытые родители
        if (ls.length > 0) {
            if (ls.includes(parent.id)) {
                const pr = treeList.find((i) => i.id == parent.pid);
                if (!pr || pr.id == -1) return false;
                return parent.visible == false ? true : false;
            }
            return checkParentsVisible(parent.id, [], ls);
        }

        // список изменяемых, включая дочерние
        if (ids.length > 0) {
            if (ids.find((i) => i.id == parent.id)) return true;
            return checkParentsVisible(parent.id, ids);
        }

        // есть ли скрытые родители
        if (parent.visible == false) return true;
        return checkParentsVisible(parent.id);
    }

    function updateVisible(e: any) {
        const { list, state } = e;
        list.forEach((id: number) => {
            updateDataVisible(id, state);
        });
    }

    function updateDaD(): void {
        // раскрываем дерево с tree__item.selected
        if (listSelected?.length) {
            listSelected.forEach((id) => {
                const item = document.querySelector(`.tree__item[data-id="${id}"]`);
                if (item) {
                    addClassActive(item.closest(".li_line"), item.closest(".tree__item")?.getAttribute("data-pid"));
                }
            })
        }

        const li_lines: any = document.querySelectorAll('.li_line');
        addClassWithDelay(li_lines, 1200); // раскрываем дерево при переносе с delay

        // скрыть/раскрыть дерево
        treeBtnInit();

        // подсветка идентичных имен;
        paintIdentical();

        paintSearchNode("color_green");

        // вешаем обработчики для дроп текстуры
        toggleEventListenerTexture();
    }

    // NOTE: оптимизированная функция для работы с DOM через кэш элементов
    function getElementById(id: number): HTMLElement | null {
        if (elementCache.has(id))
            return elementCache.get(id) || null;
        const element = document.querySelector(`.tree__item[data-id="${id}"]`) as HTMLElement;
        if (element)
            elementCache.set(id, element);
        return element;
    }

    function clearCache() {
        elementCache.clear();
    }

    init();
    return { draw_graph, preRename, setCutList, paintIdentical };
}
