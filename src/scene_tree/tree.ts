import { deepClone } from "../modules/utils";

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
    selected?:boolean; // выделен ли
    icon: string; // значок
    no_drag?: boolean; // нельзя брать тащить
    no_drop?: boolean; // нельзя положить внутрь
    no_rename?: boolean; // нельзя переименовывать(нужно будет для префабов например или корня сцены)
    no_remove?: boolean; // нельзя удалить
}

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
            no_drag: true,
            no_drop: false
        }
    ];
    const contexts: Contexts = {};
    let currentSceneName:string = defaultList[0].name ? defaultList[0].name : "root";

    const divTree:any = document.querySelector('#wr_tree');
    let treeItem:any = null;
    let currentDroppable:any = null;
    let itemDrag:any = {};
    let itemDrop:any = {};
    let isDrop:boolean = false;
    
    let hoverStart: number; // для добавления класса с задержкой
    let hoverEnd: number | null;
    let hoverTimer: ReturnType<typeof setTimeout>;
    
    let startY:number; // при перетаскивании для прокрутки tree 

    let boxDD:any = document.querySelector(".drag_and_drop"); // div таскания за мышью
    let ddVisible:boolean = false; //  видимость div перетаскивания 


    function renderTree() {
        const getList = SceneManager.make_graph();
        treeList = treeList.length ? deepClone(treeList) : deepClone(getList);
    
        contexts[currentSceneName] = contexts[currentSceneName] ? contexts[currentSceneName] : {};
        
        const renderList = buildTree(treeList);
        const html = getTreeHtml(renderList);
        divTree.innerHTML = html;
        const tree = divTree.querySelector('.tree');
        tree.style.setProperty('--tree_width', tree?.clientWidth + 'px');
    
        const li_lines:any = document.querySelectorAll('.li_line');
        addClassWithDelay(li_lines, 1200);
        updateDaD();
    }
    
    function buildTree(list: any) {
        const treeMap:any = {};
        const tree:any = [];
        
        const rootList = [defaultList[0], ...list];
        console.log({rootList});
       
        rootList.forEach((node:any) => {
            treeMap[node.id] = { ...node, children: [] };
        });    
    
        rootList.forEach((node:any) => {
            if (node.pid !== -2) {
                treeMap[node.pid].children.push(treeMap[node.id]);
            } else {
                tree.push(treeMap[node.id]);
            }
        });
    
        return tree;
    }
    
    function getTreeHtml(e:any){
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
    
    function getTreeSubHtml(list:any){
        let result = `<ul class="tree_sub">`;
        list.forEach((item:any) => {
            if(item?.children.length) {
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
    
    function getTreeBtnHtml(){
        return `<span class="tree__btn">
                    <svg class="svg_icon">
                        <use class="use_trglF" href="./img/sprite.svg#triangle_filled"></use>
                        <use class="use_trgl" href="./img/sprite.svg#triangle"></use>
                    </svg>
                </span>`;
    }
    
    function getTreeItemHtml(item:any){
        return `<a class="tree__item" ${setAttrs(item)} >
                    <span class="tree__item_bg"></span>
                    ${getTreeIcoHtml(item.icon)}
                    <span class="tree__item_name" >${item.name}</span>
                </a>`;
    }
    
    function setAttrs(item: Item): string { 
        if(!item) return '';
        let result = '';
        result += item?.id ? ` data-id="${item.id}" ` : '';
        result += item?.pid ? ` data-pid="${item.pid}" ` : '';
        result += item?.icon ? ` data-icon="${item.icon}" ` : '';
        result += item?.visible ? ` data-visible="${item.visible}" ` : '';
        result += item?.no_drop ? ` data-no_drop="${item.no_drop}" ` : '';
        result += item?.no_drag ? ` data-no_drag="${item.no_drag}" ` : '';
        return result;
    }
    
    function getItemObj(html:any):Item {
        return {
            id: +html.getAttribute("data-id"),
            pid: +html.getAttribute("data-pid"),
            name: html.querySelector(".tree__item_name").innerText,
            visible: html.getAttribute("data-visible"),
            icon: html.getAttribute("data-icon"),
            no_drag: html.getAttribute("data-no_drag") === "true" ? true : false,
            no_drop: html.getAttribute("data-no_drop") === "true" ? true : false,
        }
    }
    
    function getTreeIcoHtml(icon: string){
        return `<span class="tree__ico"><svg class="svg_icon"><use href="./img/sprite.svg#${getIdIco(icon)}"></use></svg></span>`;
    }
    
    function getIdIco(icon: string){
        if(!icon) return "cube";
        if(icon === "scene") return "cubes_stacked";
        if(icon === "text") return "letter_t";
        if(icon === "box") return "cube";
        return "cube";
    }
    
    function updateTreeList(type?:string):void{
        console.log(treeList);
        console.log(itemDrag, itemDrop);
        
        if(type === "top"){
            console.log("top");
            updatePid(treeList, itemDrag, itemDrop, "top");
        }
        else if(type === "bottom"){
            console.log("bottom");
            updatePid(treeList, itemDrag, itemDrop, "bottom");
        }
        else {
            console.log('type a');
            updatePid(treeList, itemDrag, itemDrop);
        }
    
    }
    
    // поместить после айдишного
    function updatePid(list:Item[], drag:any, drop:any, li?:boolean | string): void {
        const bid = li ? drop?.id : findLastIdItemByPid(drop?.id) || drop?.id;
        let leftList:any = [];
        let rightList:any = [];
        let dragItem = {};
        let mySwitch = 1;
    
        list.forEach((e:Item) => {
    
            if (li && li === "top") { // if top то item попадет в rightList
                if (e.id === bid) { mySwitch = 0; } 
            }
            
            if (e.id === drag?.id) dragItem = {...e, pid: li ? drop?.pid : drop?.id}; // li or a 
            else {
                if (mySwitch) {
                    leftList.push(e);
                }
                else {
                    rightList.push(e);
                }
            }
    
            if (e.id === bid) { mySwitch = 0; } // if li.bottom or a (тк для а всегда в конец)
           
        });
    
        treeList = [...leftList, dragItem, ...rightList];
        console.log(treeList);
        
    }
    
    // Функция для поиска последнего элемента по pid
    function findLastIdItemByPid(pid: number): number | undefined {
        for (let i = treeList.length - 1; i > 0; i--) {
            if (treeList[i].pid === pid) {
                return treeList[i].id;
            }
        }
        return undefined;
    }
    
    function onMouseDown(event:any) {
        // event.preventDefault();
        if(event.button === 0){
    
            startY = event.clientY;
            treeItem = event.target.closest('.tree__item');
            
            if (treeItem) {
                ddVisible = true;
                itemDrag = getItemObj(treeItem);
                console.log({itemDrag});
              
                if (itemDrag?.no_drag === true) {
                    treeItem = null;
                    ddVisible = false;
                    itemDrag = {}
                }
                else {                    
                    boxDD.querySelector(".tree__item_name").innerText = itemDrag.name;
                    boxDD.querySelector(".tree__ico use").setAttribute('href', `./img/sprite.svg#${getIdIco(itemDrag?.icon)}`);
                    moveAt(event.pageX, event.pageY); // 
                }
    
            }
    
        }
    }
    
    function onMouseMove(event:any) {
        // event.preventDefault();
        // event.stopPropagation();
    
        if(event.button === 0){
            
            // if (event.target.closest('.card.pos')) {  // с таким вариантом, курсор при быстром движении уходит за пределы карты 
            if (treeItem) {
                moveAt(event.pageX, event.pageY)
                myScrollTo(divTree, startY, event);
                let goalBox = getGoal(event)
                
                if (!goalBox) return
    
                // переключаем блок цели
                if (goalBox.closest('.tree__item')) {
                    toggleCurrentBox(goalBox.closest('.tree__item'), event.pageX, event.pageY);
                    switchClassItem(goalBox.closest('.tree__item'), event.pageX, event.pageY);
                }
                // else {
                //     const items = document.querySelectorAll('.tree__item') as NodeListOf<HTMLLIElement>;
                //     items.forEach(i => { i.classList.remove('top', 'bg', 'bottom'); });
                // }
            }
        }
    }
    
    function onMouseUp(event:any) {
        // event.preventDefault();
        // mousedown = false;
        // setTimeout(()=>movement = false, 10);
    
        if(event.button === 0) {
    
            if (event.target.closest('.tree__item') && currentDroppable) {
    
                const posInItem = getPosMouseInBlock(event.target.closest('.tree__item'), event.pageX, event.pageY);
                if(!posInItem) {
                    myClear();
                    return;
                }
    
                if(posInItem === 'bg') {
    
                    if(isDrop && itemDrop?.no_drop === false) {
                        updateTreeList("a");
                        renderTree();
                        console.log("done bg");
                    }
                }
                else if(posInItem === 'top' || posInItem === 'bottom') {
                    if(isDrop){
                        updateTreeList(posInItem);
                        renderTree();
                    }
                }
                else { 
                    myClear();
                }
    
            }
    
            myClear();
    
        }
    }
    
    function myClear():void {
                            // clear
            // ddVisible = false;
            boxDD.classList.remove('pos')
            boxDD.removeAttribute('style')
            currentDroppable?.classList.remove('droppable')
            treeItem = null;
            itemDrag = null;
            itemDrop = null;
            isDrop = false;
            console.log('clear');
            const items = document.querySelectorAll('.tree__item') as NodeListOf<HTMLLIElement>;
            items.forEach(i => { i.classList.remove('top', 'bg', 'bottom'); });
    }
    
    function myScrollTo(block: HTMLElement, startY:number, event:any) {
    
        const scrollSpeed = 5;  
        const tree_div_height:any = block?.clientHeight;   // Высота области для прокрутки
        const tree_height:any = block.querySelector('.tree')?.clientHeight;   // Высота содержимого
        
        const currentY = event.clientY;
        const direction = currentY < startY ? -1 : 1;
    
        if (currentY < tree_div_height) {
            block.scrollBy(0, direction * scrollSpeed);
        } else if (currentY > tree_height - tree_div_height) {
            block.scrollBy(0, direction * scrollSpeed);
        }
    }
    
    function switchClassItem(elem:any, pageX:number, pageY :number): void {
    
        if(!elem) return;
        
        const items = document.querySelectorAll('.tree__item') as NodeListOf<HTMLLIElement>;
        items.forEach(i => { i.classList.remove('top', 'bg', 'bottom'); });
    
        const posInItem = getPosMouseInBlock(elem, pageX, pageY);
        if(!posInItem) return;
    
        if(posInItem === 'bg') {
            elem.classList.add('bg');
            forA(); 
        }
        else if(posInItem === 'top') {
            elem.classList.add('top'); 
            forLi();
        }
        else if(posInItem === 'bottom') { 
            elem.classList.add('bottom');
            forLi();
        }
        else { 
            elem.classList.remove('top', 'bg', 'bottom');
        }
    
    }
    
    
    function getPosMouseInBlock(elem:any, pageX:number, pageY :number): string | false {
        if(!elem) return false;
        const item = elem.classList.contains('tree__item') ? elem : elem.closest('.tree__item') as HTMLLIElement | null;
        if(!item) return false;
        const itemBg = item.querySelector('.tree__item_bg') as HTMLLIElement | null;
        if(!itemBg) return false;
    
        const itemTop = item.getBoundingClientRect().top;
        const mouseY = pageY;
        const mouseX = pageX;
    
        const itemLeft: number = +itemBg.getBoundingClientRect().left;
        const itemRight: number = +itemLeft + +itemBg.clientWidth;
    
        if(
            mouseY > itemTop && 
            mouseX > itemLeft && 
            mouseX < itemRight
        ) {
            // вычисляем по высоте
            if(mouseY < itemTop + item.clientHeight * 0.2) return "top";
            else if(mouseY < itemTop + item.clientHeight * 0.8) return "bg";
            else if(mouseY < itemTop + item.clientHeight) return "bottom";
            else return false;
        }
        else {
            return false;
        }
    }
    
    function moveAt(pageX:number, pageY:number) {
            boxDD.style.left = pageX - 22 + 'px'
            boxDD.style.top = pageY + 'px'
            boxDD.querySelector(".tree__item_name").innerText = `${itemDrag.name}`;
            // boxDD.querySelector(".tree__item_name").innerText = `${pageY} : ${pageX} __ ${itemDrag.name}`;
            // switchClassItem(currentDroppable, pageY, pageX);
    }
    
    function getGoal(event:any) {
        // treeItem.hidden = true  // скрываем карту
        // получаем элемент под мышью
        let elemBelow = document.elementFromPoint(event.clientX, event.clientY)
        // treeItem.hidden = false  // показываем карту
    
        return elemBelow ? elemBelow : false
        // если элемент .box возвращаем его
        // return elemBelow.closest('.box') ? elemBelow : false
    }
    
    function isParentNoDrop(list: Item[], drag: Item, drop: Item): boolean {
    
        // внутри родителя можно перемещать...
        if(drag.pid === drop.pid){
            return false;
        } 
        else {
            // если разные родители
            const parent = list.find(item => item.id === drop.pid);
            if(parent && parent?.no_drop === true) {
                return true;
            }
        }
    
        return false;
    }
    
    function isChild(list: Item[], parentId: number, currentPid: number): boolean {
    
        let step =  currentPid;   
    
        while(step > -1) {
            const parent = list.find(item => item.id === step);
            if (!parent) return false; 
    
            if(parent.id === parentId) return true;
            step = parent.pid
        }
    
        return false;
    }
    
    function toggleCurrentBox(droppableBelow:any, pageX: number, pageY: number) {
        // если элемент есть, сравниваем с текущим
        
        if (currentDroppable != droppableBelow) {
            if (currentDroppable) {
                currentDroppable.classList.remove('droppable')
            }
    
            currentDroppable = droppableBelow
    
            if (currentDroppable) {
    
                boxDD.classList.add('pos');
                // switchClassItem(currentDroppable, pageX, pageY);
                
            }
        }
    }
    
    // внутрь
    function forA() {
        // a.tree__item.droppable  и  статус для добавления внутрь
        if(currentDroppable === treeItem || itemDrag?.no_drag === true) { 
            boxDD.classList.remove('active');
            isDrop = false; 
        }
        else {
            if(ddVisible)
                boxDD.classList.add('pos');
    
            currentDroppable.classList.add('droppable');
            itemDrop = getItemObj(currentDroppable);
    
            if(itemDrop?.no_drop === true && itemDrag || isChild(treeList, itemDrag.id, itemDrop.pid)) {
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
    function forLi() {
        // статус и li.droppable для добавления рядом
        // const cdItem = currentDroppable.querySelector(".tree__item");
        itemDrop = getItemObj(currentDroppable);
    
        if(
            currentDroppable === treeItem || 
            itemDrop?.pid < -2
        ) { 
            boxDD.classList.remove('pos');
            isDrop = false; 
        }
        else {
            if(ddVisible){}
                boxDD.classList.add('pos');
    
            if(
                // itemDrop?.no_drop === true || 
                itemDrop?.pid === -2 || // root
                isChild(treeList, itemDrag.id, itemDrop.pid) || 
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
    
    // если hover / mousemove на tree__item больше delay, то добавляем класс active
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
        if(itemId === null || itemId === undefined) return;
        contexts[scene][+itemId] = state; // save state tree_sub
    }

    function removeClassActive(eLi: any, itemPid: any): void {
        if(!eLi) return;
        if(!itemPid || itemPid <= -1) return;

        const liPid = eLi.querySelector("a.tree__item")?.getAttribute("data-pid");
        if(liPid && liPid === itemPid) {
            const liLine = eLi?.closest("ul")?.closest(".li_line");
            if(!liLine) return;
            if (!liLine?.classList.contains("active")) { 
                liLine.classList.add("active"); 
            }
            removeClassActive(liLine?.closest("ul")?.closest(".li_line"), itemPid);
        }
        else {
            if (!eLi?.classList.contains("active")) { 
                eLi.classList.add("active"); 
            }
            removeClassActive(eLi?.closest("ul")?.closest(".li_line"), itemPid);
        }

        return;
    }
    

    function SearchInTree() {
        // поиск по дереву 
        const fieldSearchInTree = document.querySelector(".searchInTree");
        if(fieldSearchInTree) {
            let timer:any;
            fieldSearchInTree.addEventListener('keyup', (event: any) => {

                clearTimeout(timer);

                timer = setTimeout(() => {
                    const spans =  document.querySelectorAll(`#wr_tree span.tree__item_name`);
                    spans.forEach((s:any) => {
                        s.classList.remove("color_green")
                        if(event.target?.value.trim()?.length > 0 && s.textContent.includes(event.target?.value.trim())) {
                            s.classList.add("color_green");
                            removeClassActive(s.closest(".li_line"), s.closest(".tree__item")?.getAttribute("data-pid"));
                        }
                    });
                }, 777); //  поиск спаузой
                
            });
        }
    }
    
    // вешаем обработчики
    function updateDaD(): void {

        SearchInTree();

        // 
        const btns: NodeListOf<HTMLElement> = document.querySelectorAll('ul.tree .tree__btn');
        btns.forEach(btn => {
            // slideUp/slideDown for tree
            btn.addEventListener('click', (event: Event) => {
                // event.preventDefault();
                // event.stopPropagation();
                const li = (btn as HTMLElement).closest("li");
                if(li === null) return;
                const treeSub = li.querySelector(".tree_sub") as HTMLElement;
                if(treeSub === null) return;
    
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


        // const menuItems: NodeListOf<HTMLElement> = document.querySelectorAll('a.tree__item');
        // let draggedItem: HTMLElement | null = null;
    
        // menuItems.forEach(item => {
        //     item.addEventListener('mousedown', onMouseDown, false)
        //     item.addEventListener('mousemove', onMouseMove, false)
        //     item.addEventListener('mouseup', onMouseUp, false)
        // });
    
    }

    // // ********************** 0137 ***************************
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('mouseup', onMouseUp, false);
    // // ********************** 0137 ***************************

    

    renderTree();   
    
}
