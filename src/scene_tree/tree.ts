import { deepClone } from "../modules/utils";

declare global {
    const TreeControl: ReturnType<typeof TreeControlCreate>;
}

export function register_tree_control() {
    (window as any).TreeControl = TreeControlCreate();
}

export enum NodeAction {
    CTRL_X,
    CTRL_C,
    CTRL_V,
    CTRL_B,
    CTRL_D,
    rename,
    remove,
    add_box_empty,
    add_box,
    add_text,
    add_button,
    add_bar,
    add_scroll,
    add_sprite,
    add_label
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
    let listSelected: number[] = [];

    let _is_mousedown: boolean = false; // зажата ли при mousemove
    let _is_dragging: boolean = true; 
    let _is_moveItemDrag: boolean = false; // если начали тащить 
    let _is_editItem: boolean = false; // ренейм возможен только в одном случае 
    let _is_currentOnly: boolean = false; // когда кликаем по единственному и текущему элементу 

    const divTree: any = document.querySelector('#wr_tree');
    let treeItem: any = null;
    let currentDroppable: any = null;
    let itemDrag: any = null;
    let itemDrop: any = null;
    let isDrop: boolean = false;

    let hoverStart: number; // для добавления класса с задержкой
    let hoverEnd: number | null;
    let hoverTimer: ReturnType<typeof setTimeout>;

    let startY: number;  
    let startX: number;   
    let itemDragRenameId: number | null = null; // чтобы чекать DBLCLICK  или  при DELAY не выбрали ли другой элемент

    const menuContext: any = document.querySelector('.wr_menu__context');
    let mContextVisible: boolean = false;
    let boxDD: any = document.querySelector(".drag_and_drop"); // div таскания за мышью
    let ddVisible: boolean = false; //  видимость div перетаскивания 


    function draw_graph(getList: Item[], scene_name?: string, is_clear_state = false) {
        currentSceneName = scene_name ? scene_name : currentSceneName;
        treeList = deepClone(getList);
        contexts[currentSceneName] = is_clear_state ? {} : contexts[currentSceneName];
        contexts[currentSceneName] = contexts[currentSceneName] ? contexts[currentSceneName] : {};

        const renderList = buildTree(treeList);
        const html = getTreeHtml(renderList);
        divTree.innerHTML = html;

        updateDaD();
    }

    function buildTree(list: any) {
        const treeMap: any = {};
        const tree: any = [];
        listSelected = []; // сбрасываем 

        const rootList = deepClone(list);
        log({ rootList });
        
        rootList.forEach((node: any) => {
            treeMap[node.id] = { ...node, children: [] };
            if(node?.selected == true) listSelected.push(node.id);
        });

        rootList.forEach((node: any) => {
            if (node.pid !== -2) {
                treeMap[node.pid].children.push(treeMap[node.id]);
            } else {
                tree.push(treeMap[node.id]);
            }
        });

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
        return `<a class="tree__item ${item?.selected ? 'selected' : ''}" ${setAttrs(item)}>
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
        if (icon === "text") return "letter_t";
        if (icon === "box") return "cube";
        return "cube";
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

    function onMouseDown(event: any) {

        if (mContextVisible && !event.target.closest('.menu__context a')) {
            menuContextClear();
        }
        if (!event.target.closest('.tree_div')) return;

        // event.preventDefault();
        if (event.button === 0 || event.button === 2) {
            if (event.button === 0) _is_mousedown = true; // ЛКМ

            const item = event.target.closest('a.tree__item.selected .tree__item_name[contenteditable="true"]');
            if(item) return;
            toggleClassSelected(event);

            startY = event.offset_y;
            startX = event.offset_x;
            treeItem = event.target.closest('.tree__item');

            if (treeItem && _is_dragging) {
                itemDrag = treeList.find(e => e.id === +treeItem?.getAttribute("data-id")) || null;
                console.log({ itemDrag });
                itemDragRenameId = itemDrag?.id || null;

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
                moveAt(event.offset_x, event.offset_y);
                myScrollTo(divTree, startY, event);

                // отмены не происходит, если выбрано больше одного
                if (Input.is_control() && listSelected?.length > 0) { 
                    treeItem?.classList.add("selected");
                }

                toggleCurrentBox(event.target.closest('.tree__item'));
                switchClassItem(event.target.closest('.tree__item'), event.offset_x, event.offset_y);
            }
        }
    }

    function onMouseUp(event: any) {
        // event.preventDefault(); // иногда отключается плавное сворачивание ...
        
        if (mContextVisible && event.target.closest('.menu__context a') && itemDrag && event.button === 0) {
            menuContextClick(event);
        }

        if (mContextVisible == false && (event.button === 0 || event.button === 2)) {

            if (!event.target.closest('.tree_div')) {
                if(itemDrag) myClear(); 
                itemDragRenameId = null;
                return;
            }
            _is_mousedown = false;
            
            if (event.button === 0) setContendEditAble(event); // ЛКМ
            sendListSelected(event);
            
            if (event.button === 2) {
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
                    if(movedList) {
                        log(`SYS_GRAPH_MOVED_TO`, movedList);
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
        console.log('clear');
        const items = document.querySelectorAll('.tree__item') as NodeListOf<HTMLLIElement>;
        items.forEach(i => { i.classList.remove('top', 'bg', 'bottom'); });
    }

    function isMove(offset_x: number, offset_y: number, startX: number, startY: number) {
        return Math.abs(offset_x - startX) > 12 || Math.abs(offset_y - startY) > 8;
    };

    function getMovedList(list: number[], drag: any, drop: any, type: string): any {
        // SYS_GRAPH_MOVED_TO: { pid: number, next_id: number, id_mesh_list: number[] }
        if(!list || !list.length || !drag || !drop || !type || !list.includes(drag?.id)) return null;

        if(type === 'top') {
            log('top')
            return { pid: drop?.pid, next_id: drop?.id, id_mesh_list: list };
        }
        if(type === 'bg') {
            log('bg')
            return itemDrop?.no_drop === true ? null : { pid: drop?.id, next_id: -1, id_mesh_list: list };
        }
        if (type === 'bottom') {
            log('bottom')
            const next_id = findNextIdItemByPid(drop?.id, drop?.pid) || -1;
            return { pid: drop?.pid, next_id: next_id, id_mesh_list: list };
        }

        return null;
    }

    function myScrollTo(block: HTMLElement, startY: number, event: any) {

        const scrollSpeed = 5;
        const tree_div_height: any = block?.clientHeight;   // Высота области для прокрутки
        const tree_height: any = block.querySelector('.tree')?.clientHeight;   // Высота содержимого

        const currentY = event.offset_y;
        const direction = currentY < startY ? -1 : 1;

        if (currentY < tree_div_height) {
            block.scrollBy(0, direction * scrollSpeed);
        } else if (currentY > tree_height - tree_div_height) {
            block.scrollBy(0, direction * scrollSpeed);
        }
    }

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
        if(itemDrop == null || itemDrag?.id == itemDrop?.id) {
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
            if (currentDroppable) {
                currentDroppable.classList.remove('droppable');
            }

            currentDroppable = droppableBelow

            if (currentDroppable && _is_moveItemDrag) { // cursor in current
                currentDroppable.classList.add('droppable');
            }
        }
    }

    // внутрь
    function putInside() {
        // a.tree__item.droppable  и  статус для добавления внутрь
        itemDrop = treeList.find(e => e.id === +currentDroppable?.getAttribute("data-id")) || null;

        if (
            (listSelected?.length == 1 && currentDroppable === treeItem) || 
            itemDrag?.no_drag === true
        ) {
            boxDD.classList.remove('active');
            isDrop = false;
        }
        else {
            if (ddVisible) boxDD.classList.add('pos');

            if (
                itemDrop?.no_drop === true && itemDrag || 
                (isChild(treeList, itemDrag.id, itemDrop.pid) && listSelected?.length == 1)
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

        if (
            (listSelected?.length == 1 && currentDroppable === treeItem) ||
            itemDrop?.pid < -2 ||
            itemDrag?.no_drag === true
        ) {
            boxDD.classList.remove('pos');
            isDrop = false;
        }
        else {
            if (ddVisible) boxDD.classList.add('pos');

            if (
                itemDrop?.pid === -2 || // root
                (isChild(treeList, itemDrag.id, itemDrop.pid) && listSelected?.length == 1) ||
                isParentNoDrop(treeList, itemDrag, itemDrop)
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

        return;
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

        const itemName = event.target.closest("a.tree__item.selected .tree__item_name");
        if (!itemName) return;
                
        setTimeout(() => { 
            if (itemDragRenameId != currentId) return; // тк setTimeout сверяем, что это тот же элемент
            preRename(currentId, itemName);
        }, 1200);

    }

    function preRename(currentId: number, itemName: any) {
        itemName.setAttribute("contenteditable", "true");
        itemName.focus();
        document.execCommand('selectAll', false, undefined);
        renameItem(currentId, itemName);
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
        itemsName.forEach(item => item?.removeAttribute("contenteditable"));

        // если зажата ctrl
        if (Input.is_control()) {

            if (listSelected.includes(currentId)) { // если он уже выделен - исключаем его
                const isOne = listSelected.length == 1 ? true : false;
                _is_dragging = listSelected.length > 1 ? true : false; // отключаем, если единственный выбранный
                currentItem.classList.remove("selected");
                listSelected = listSelected.filter((item) => item != currentId);
                _is_currentOnly = true; // текущий
                
                if(isOne) { // ctrl + 1 selected 
                    log(`EventBus.trigger('SYS_GRAPH_SELECTED', {list: ${[]}})`);
                    EventBus.trigger('SYS_GRAPH_SELECTED', {list: []});
                }
            }
            else {
                currentItem.classList.add("selected");
                listSelected.push(currentId);
            }

        }
        else { //  если НЕ зажата ctrl

            if (listSelected?.length == 0) {
                currentItem.classList.add("selected");
                listSelected = [currentId]; // add first elem
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
                    menuItems.forEach(item => {
                        item.classList.remove("selected");
                    });
                    currentItem.classList.add("selected");
                    listSelected = [currentId]; // остается один
                }

            } 

        }
    }

    function sendListSelected(event: any) {
        const btn = event.target.closest(".tree__btn");
        if (btn) return;
        
        if (!itemDrag) return;
        if (event.button === 2 && !event.target.closest("a.tree__item")) return;
        
        if (!_is_moveItemDrag) { // если движения Не было
            if(Input.is_control()) {
                log(`EventBus.trigger('SYS_GRAPH_SELECTED', {list: ${listSelected}})`);
                EventBus.trigger('SYS_GRAPH_SELECTED', {list: listSelected});
                return;
            }
            if(listSelected?.length > 1 && event.button === 0) {
                listSelected = [itemDrag?.id];
                log(`EventBus.trigger('SYS_GRAPH_SELECTED', {list: ${listSelected}})`);
                EventBus.trigger('SYS_GRAPH_SELECTED', {list: listSelected});
                return;
            }
            if (!_is_currentOnly && listSelected?.length <= 1) { // trigger   кроме текущего
                log(`EventBus.trigger('SYS_GRAPH_SELECTED', {list: ${listSelected}})`);
                EventBus.trigger('SYS_GRAPH_SELECTED', {list: listSelected});
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
            log(`EventBus.trigger('SYS_GRAPH_SELECTED', {list: ${listSelected}})`);
            EventBus.trigger('SYS_GRAPH_SELECTED', {list: listSelected});
            return;
        }
    }

    function getIdenticalNames(list: string[]): string[] {
        return list.filter((item, index) => list.indexOf(item) !== index);
    }
    
    function paintIdentical(): void {
        const listName: string[] = [];
        treeList.forEach((item) => listName.push(item?.name));
        const identicalNames = getIdenticalNames(listName);
        if(identicalNames.length == 0) return;
        const itemsName: NodeListOf<HTMLElement> = document.querySelectorAll('a.tree__item .tree__item_name');
        if(!itemsName) return;

        itemsName.forEach((item: any) => {
            if (identicalNames.includes(item?.textContent)) {
                item.classList.add("color_red");
                addClassActive(item.closest(".li_line"), item.closest(".tree__item")?.getAttribute("data-pid"));
            }
            else {
                item.classList.remove("color_red");
            }
        });
    }


    function paintSearchNode(className: string): void {
        const input:any = document.querySelector(".searchInTree");
        if (!input) return;
        const name = input?.value?.trim();
        if(!name) return;
        
        const spans = document.querySelectorAll('a.tree__item .tree__item_name');
        if(!spans) return;
        spans.forEach((s: any) => {
            s.classList.remove(className);
            if (name?.length > 0 && s.textContent.includes(name)) {
                s.classList.add(className);
            }
        });
    }

    function paintIdenticalLive(fieldSelector: string, selectorAll: string, className: string, delay: number): void {
        const field = document.querySelector(fieldSelector);
        if(!field) return;
        const idField = fieldSelector == ".searchInTree" ? -20 : field.closest(".tree__item")?.getAttribute("data-id");
        if(!idField) return;
        
        let timer: any;
        field.addEventListener('keyup', (event: any) => {

            const name = event.target?.value ? event.target?.value?.trim() : event.target?.textContent?.trim();
            if(name == null || name == undefined) return;
            
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
            if(name == null || name == undefined) return;

            if(name?.length == 0) {return;}
            
            log('SYS_GRAPH_CHANGE_NAME', { id, name });
            EventBus.trigger('SYS_GRAPH_CHANGE_NAME', { id, name });
        }

    }

    function toggleMenuContextItem() {
        menuContext.querySelectorAll("a[data-action]").forEach((item: any) => {
            item.classList.remove('not_active');
            
            if (item?.getAttribute("data-action") == "rename") {
                if (itemDrag?.no_rename || itemDrag?.id == -1)
                    item.classList.add('not_active');
            }
            
            if (item?.getAttribute("data-action") == "CTRL_X") {
                if (itemDrag?.no_remove || itemDrag?.id == -1)
                    item.classList.add('not_active');
            }
            
            if (item?.getAttribute("data-action") == "CTRL_C") {
                if (itemDrag?.id == -1)
                    item.classList.add('not_active');
            }
            
            if (item?.getAttribute("data-action") == "remove") {
                if (itemDrag?.no_remove || itemDrag?.id == -1)
                    item.classList.add('not_active');
            }

            
        });
    }

    function openMenuContext(event: any): void {
        if (!itemDrag) return;
        if (!event.target.closest(".tree__item")) return;

        mContextVisible = true;

        if (divTree.scrollHeight > divTree.clientHeight) {
            divTree.classList.add('no_scrolling');
        }

        toggleMenuContextItem();

        menuContext.classList.remove('bottom');
        menuContext.classList.add("active");
        menuContext.style.left = event.offset_x - 30 + 'px';

        if (menuContext.clientHeight + 30 > window.innerHeight) {
            menuContext.classList.add('bottom'); // делаем маленьким
        }

        if (menuContext.clientHeight + 30 > window.innerHeight) { // проверяем маленькое
            menuContext.style.top = '15px';
        }
        else if (event.offset_y + menuContext.clientHeight + 30 > window.innerHeight) {
            menuContext.classList.add('bottom');
            if (menuContext.clientHeight > event.offset_y) {
                menuContext.style.top = '15px';
            }
            else {
                menuContext.style.top = event.offset_y + 18 - menuContext.clientHeight + 'px';
            }
        } 
        else
            menuContext.style.top = event.offset_y - 5 + 'px';
       
    }



    function menuContextClick(event: any): void {
        const itemContext = event.target.closest(".menu__context a");
        if (!itemContext) return;
        const dataAction = itemContext?.getAttribute("data-action");
        if (!dataAction || itemContext.classList.contains('not_active')) return;
                
        if (dataAction == NodeAction[0]) {
            log(`SYS_GRAPH_KEY_COM_PRESSED , { id: ${itemDrag?.id}, list: ${listSelected} key: ${ NodeAction.CTRL_X } }`);
            EventBus.trigger('SYS_GRAPH_KEY_COM_PRESSED', { id: itemDrag?.id, list: listSelected, key: NodeAction.CTRL_X });
        }
        if (dataAction == NodeAction[1]) {
            log(`SYS_GRAPH_KEY_COM_PRESSED , { id: ${itemDrag?.id}, list: ${listSelected} key: ${ NodeAction.CTRL_C } }`);
            EventBus.trigger('SYS_GRAPH_KEY_COM_PRESSED', { id: itemDrag?.id, list: listSelected, key: NodeAction.CTRL_C });
        }
        if (dataAction == NodeAction[2]) {
            log(`SYS_GRAPH_KEY_COM_PRESSED , { id: ${itemDrag?.id}, list: ${listSelected} key: ${ NodeAction.CTRL_V } }`);
            EventBus.trigger('SYS_GRAPH_KEY_COM_PRESSED', { id: itemDrag?.id, list: listSelected, key: NodeAction.CTRL_V });
        }
        if (dataAction == NodeAction[3]) {
            log(`SYS_GRAPH_KEY_COM_PRESSED , { id: ${itemDrag?.id}, list: ${listSelected} key: ${ NodeAction.CTRL_B } }`);
            EventBus.trigger('SYS_GRAPH_KEY_COM_PRESSED', { id: itemDrag?.id, list: listSelected, key: NodeAction.CTRL_B });
        }
        if (dataAction == NodeAction[4]) {
            log(`SYS_GRAPH_KEY_COM_PRESSED , { id: ${itemDrag?.id}, list: ${listSelected} key: ${ NodeAction.CTRL_D } }`);
            EventBus.trigger('SYS_GRAPH_KEY_COM_PRESSED', { id: itemDrag?.id, list: listSelected, key: NodeAction.CTRL_D });
        }
        if (dataAction == NodeAction[5]) {
            const itemName = document.querySelector(`.tree__item[data-id='${itemDrag?.id}'] .tree__item_name`);
            if (!itemName || itemDrag?.no_rename) return;
            preRename(itemDrag?.id, itemName);
        }
        if (dataAction == NodeAction[6]) {
            log(`SYS_GRAPH_REMOVE, { id: ${itemDrag?.id}, list: ${listSelected} }`);
            EventBus.trigger('SYS_GRAPH_REMOVE', { id: itemDrag?.id, list: listSelected });
        }
        if (dataAction == NodeAction[7]) {
            log(`SYS_GRAPH_ADD, { id: ${itemDrag?.id}, list: ${listSelected}, type: ${NodeAction.add_box_empty} }`);
            EventBus.trigger('SYS_GRAPH_ADD', { id: itemDrag?.id, list: listSelected, type: NodeAction.add_box_empty });
        }
        if (dataAction == NodeAction[8]) {
            log(`SYS_GRAPH_ADD, { id: ${itemDrag?.id}, list: ${listSelected}, type: ${NodeAction.add_box} }`);
            EventBus.trigger('SYS_GRAPH_ADD', { id: itemDrag?.id, list: listSelected, type: NodeAction.add_box });
        }
        if (dataAction == NodeAction[9]) {
            log(`SYS_GRAPH_ADD, { id: ${itemDrag?.id}, list: ${listSelected}, type: ${NodeAction.add_text} }`);
            EventBus.trigger('SYS_GRAPH_ADD', { id: itemDrag?.id, list: listSelected, type: NodeAction.add_text });
        }
        if (dataAction == NodeAction[10]) {
            log(`SYS_GRAPH_ADD, { id: ${itemDrag?.id}, list: ${listSelected}, type: ${NodeAction.add_button} }`);
            EventBus.trigger('SYS_GRAPH_ADD', { id: itemDrag?.id, list: listSelected, type: NodeAction.add_button });
        }
        if (dataAction == NodeAction[11]) {
            log(`SYS_GRAPH_ADD, { id: ${itemDrag?.id}, list: ${listSelected}, type: ${NodeAction.add_bar} }`);
            EventBus.trigger('SYS_GRAPH_ADD', { id: itemDrag?.id, list: listSelected, type: NodeAction.add_bar });
        }
        if (dataAction == NodeAction[12]) {
            log(`SYS_GRAPH_ADD, { id: ${itemDrag?.id}, list: ${listSelected}, type: ${NodeAction.add_scroll} }`);
            EventBus.trigger('SYS_GRAPH_ADD', { id: itemDrag?.id, list: listSelected, type: NodeAction.add_scroll });
        }
        if (dataAction == NodeAction[13]) {
            log(`SYS_GRAPH_ADD, { id: ${itemDrag?.id}, list: ${listSelected}, type: ${NodeAction.add_sprite} }`);
            EventBus.trigger('SYS_GRAPH_ADD', { id: itemDrag?.id, list: listSelected, type: NodeAction.add_sprite });
        }
        if (dataAction == NodeAction[14]) {
            log(`SYS_GRAPH_ADD, { id: ${itemDrag?.id}, list: ${listSelected}, type: ${NodeAction.add_label} }`);
            EventBus.trigger('SYS_GRAPH_ADD', { id: itemDrag?.id, list: listSelected, type: NodeAction.add_label });
        }

        menuContextClear();
    }

    function menuContextClear(): void {
        divTree.classList.remove('no_scrolling');
        menuContext.classList.remove('active');
        menuContext.removeAttribute('style');
        mContextVisible = false;
    }

    function updateDaD(): void {

        // устанавливаем ширину для span.tree__item_bg
        const tree = divTree.querySelector('.tree');
        tree.style.setProperty('--tree_width', tree?.clientWidth + 'px'); 

        // раскрываем дерево с tree__item.selected
        if (listSelected?.length) {
            listSelected.forEach((id) => {
                const item = document.querySelector(`.tree__item[data-id="${id}"]`);
                if(item) {
                    addClassActive(item.closest(".li_line"), item.closest(".tree__item")?.getAttribute("data-pid"));
                }
            })
        }

        const li_lines: any = document.querySelectorAll('.li_line');
        addClassWithDelay(li_lines, 1200); // раскрываем дерево при переносе с delay

        // скрыть/раскрыть дерево
        treeBtnInit();

        // подсветка идентичных имен();
        paintIdentical(); 

        paintSearchNode("color_green");

    }

    // ВЕШАЕМ ОБРАБОТЧИКИ
    
    // поиск по дереву, вешаем обработчик  1 раз
    paintIdenticalLive(".searchInTree", "#wr_tree .tree__item_name", "color_green", 777);

    EventBus.on('SYS_INPUT_POINTER_UP', (event: any) => {
        // show/hide block menu
        const btn_menu = event.target.closest(".btn_menu");
        if (btn_menu) {
            const menu_section = btn_menu.closest(".menu_section");
            menu_section?.classList.remove("hide_menu");
            menu_section?.classList.toggle("active");
        }
    });

    let params = new URLSearchParams(document.location.search);
    let hide_menu = params.get("hide_menu"); 
    if(hide_menu != null) {
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
                log(`SYS_GRAPH_CLICKED, { id: ${itemId} }`);
                EventBus.trigger("SYS_GRAPH_CLICKED", { id: itemId });
            }
        }
    }, false);

    document.querySelector('#wr_tree, .menu__context')?.addEventListener('contextmenu', (event: any) => {
        event.preventDefault();
    });
    
    // document.addEventListener('mousedown', onMouseDown, false);
    EventBus.on('SYS_INPUT_POINTER_DOWN', onMouseDown);
    EventBus.on('SYS_INPUT_POINTER_MOVE', onMouseMove);
    EventBus.on('SYS_INPUT_POINTER_UP', onMouseUp);

    
    function setPopup(selector: string, type: string = 'open') {
        const popup = document.querySelector(selector);
        if (popup) {
            if(type == 'close') {
                popup.querySelector('.bgpopup')?.classList.remove('active');
                popup.querySelector('.popup')?.classList.remove('active');
            }
            if(type == 'open') {
                popup.querySelector('.bgpopup')?.classList.add('active');
                popup.querySelector('.popup')?.classList.add('active');
            }
        }
    }

    // setPopup('main_menu');

    return { draw_graph, setPopup };

}
