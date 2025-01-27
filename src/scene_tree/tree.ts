// import { deepClone } from "../modules/utils";

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

let treeList: Item[] = [
    {
        id: 0,
        pid: -1,
        name: "root",
        visible: true,
        icon: "cube",
        no_drag: true,
        no_drop: false
    },
    {
        id: 1,
        pid: 0,
        name: "name 1",
        visible: true,
        icon: "cube",
        no_drag: false,
        no_drop: false
    },
    {
        id: 2,
        pid: 0,
        name: "name 2",
        visible: true,
        icon: "cube",
        no_drag: false,
        no_drop: false
    },
    {
        id: 3,
        pid: 0,
        name: "name 3",
        visible: true,
        icon: "cube",
        no_drag: false,
        no_drop: false
    },
    {
        id: 4,
        pid: 1,
        name: "name 4",
        visible: true,
        icon: "cube",
        no_drag: true,
        no_drop: true
    },
    {
        id: 5,
        pid: 1,
        name: "name 5",
        visible: true,
        icon: "cube",
        no_drag: false,
        no_drop: false
    },
    {
        id: 6,
        pid: 4,
        name: "name 6",
        visible: true,
        icon: "cube",
        no_drag: true,
        no_drop: true
    },
    {
        id: 41,
        pid: 4,
        name: "name 61",
        visible: true,
        icon: "cube",
        no_drag: false,
        no_drop: false
    },
    {
        id: 7,
        pid: 41,
        name: "name 7 name7777",
        visible: true,
        icon: "cube",
        no_drag: false,
        no_drop: false
    },
    {
        id: 8,
        pid: 41,
        name: "name 8",
        visible: true,
        icon: "cube",
        no_drag: false,
        no_drop: true
    },
    {
        id: 9,
        pid: 41,
        name: "name 9",
        visible: true,
        icon: "cube",
        no_drag: false,
        no_drop: false
    },
    {
        id: 10,
        pid: 5,
        name: "name 10",
        visible: true,
        icon: "cube",
        no_drag: false,
        no_drop: false
    },

];

export function renderTree() {

    const renderList = buildTree(treeList);
    const html = getTreeHtml(renderList);
    const divTree:any = document.querySelector('#wr_tree');
    divTree.innerHTML = html;
    const tree:any = divTree.querySelector('.tree');
    tree.style.setProperty('--tree_width', tree?.clientWidth + 'px');
    console.log({tree});
    // updateDaD();
}

function buildTree(list: any) {
    const treeMap:any = {};
    const tree:any = [];

    // проиндексировали для сортировки
    for (let i = 0; i < list.length; i++) {
        list[i].index = i;        
    }
    
    list.forEach((node:any) => {
        treeMap[node.id] = { ...node, children: [] };
    });    

    list.forEach((node:any) => {
        if (node.pid !== -1) {
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
            result += `<li class="li_line active">
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
    return `<a class="tree__item" data-id="${item.id}" data-pid="${item.pid}" data-index="${item.index}" data-icon="${item.icon}" data-no_drop="${item.no_drop}" data-no_drag="${item.no_drag}">
                <span class="tree__item_bg"></span>
                ${getTreeIcoHtml(item.icon)}
                <span class="tree__item_name" >${item.name}</span>
            </a>`;
}

function getTreeIcoHtml(icon: string){
    return `<span class="tree__ico"><svg class="svg_icon"><use href="./img/sprite.svg#${icon}"></use></svg></span>`;
}

function updateTreeList(type?:string):void{
    console.log(treeList);
    console.log(itemDrag, itemDrop);
    
    if(type === "a") {
        console.log('type a');
        updatePid(treeList, itemDrag, itemDrop);
    }

    if(type === "li"){
        console.log("li");
        updatePid(treeList, itemDrag, itemDrop, true);
    }

}

// поместить после айдишного
function updatePid(list:Item[], drag:any, drop:any, li?:boolean): void {
    const bid = li ? drop?.id : findLastIdItemByPid(drop?.id) || drop?.id;
    let leftList:any = [];
    let rightList:any = [];
    let dragItem = {};
    let mySwitch = 1;

    list.forEach((e:Item) => {

        if (e.id === drag?.id) dragItem = {...e, pid: li ? drop?.pid : drop?.id}; // li or a 
        else {
            if (mySwitch) {
                leftList.push(e);
            }
            else {
                rightList.push(e);
            }
        }

        if (e.id === bid) { mySwitch = 0; }
       
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

// получить дочерние 1-уровня
function getListOnePid(list: Item[], pid: number): Item[] | undefined {
    return list.filter(item => item.pid === pid);
}

function findIndexById(array: Item[], id: number): number {
    for (let i = 0; i < array.length; i++) {
        if (array[i].id === id) {
            return i;
        }
    }
    return -1;
}

let treeItem:any = null;
let currentDroppable:any = null;
// let shiftX:number = 0;
// let shiftY:number = 0;
let startPageX:number = 0;
let startPageY:number = 0;
let ddVisible:boolean = false;
const boxDD:any = document.querySelector(".drag_and_drop")
let itemDrag:any = {};
let itemDrop:any = {};
let isDrop:boolean = false;

let hoverStart: number;
let hoverEnd: number | null;
let hoverTimer: NodeJS.Timeout;


function onMouseDown(event:any) {
    // event.preventDefault();
    if(event.button === 0){

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
                // shiftX = event.clientX - treeItem.getBoundingClientRect().left
                // shiftY = event.clientY - treeItem.getBoundingClientRect().top
                startPageX = event.pageX
                startPageY = event.pageY
                
                // document.body.append(treeItem)
                
                boxDD.querySelector(".tree__item_name").innerText = itemDrag.name;
                boxDD.querySelector(".tree__ico use").setAttribute('href', `./img/sprite.svg#${itemDrag.icon}`);
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
            let goalBox = getGoal(event)
            
            if (goalBox == false) return

            // переключаем блок цели
            if (goalBox.closest('.tree__item')) {
                toggleCurrentBox(event, goalBox.closest('.tree__item'), "a")
            }
            else if (goalBox.closest('.tree li')) {
                toggleCurrentBox(event, goalBox.closest('.tree li'), "li")
            }
        }
    }
}

function onMouseUp(event:any) {
    // event.preventDefault();
    // mousedown = false;
    // setTimeout(()=>movement = false, 10);

    if(event.button === 0){
        removeClassWithDelay(currentDroppable, 1500); // 

        // блок цели
        if (event.target.closest('.tree__item') && currentDroppable) {
            if(isDrop && itemDrop?.no_drop === false){
                updateTreeList("a");
                renderTree();
                // myClear();
                console.log("done a");
                
            }
        }
        else if (event.target.closest('.tree li') && currentDroppable) {
            if(isDrop){
                updateTreeList("li");
                renderTree();
                // myClear();
                console.log("done li");
                
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
        const items = document.querySelectorAll('.tree li');
        items.forEach(i => i.classList.remove('top', 'bg', 'bottom'));
}

function switchClassItem(elem:any, pageY:number, pageX:number): void {
    if(!elem) return;
    const item = elem.closest('.tree li') as HTMLLIElement | null;
    if(!item) return;

    const itemTop = item.getBoundingClientRect().top;
    const mouseY = pageY;
    const mouseX = pageX;

    const items = document.querySelectorAll('.tree li') as NodeListOf<HTMLLIElement>;
    items.forEach(i => { i.classList.remove('top', 'bg', 'bottom'); });

    const itemLeft: number = +item.getBoundingClientRect().left;
    const itemRight: number = +item.getBoundingClientRect().left + +item.clientWidth;

    if(
        mouseY > itemTop && 
        mouseX > itemLeft && 
        mouseX < itemRight
    ) {
        // вычисляем по высоте
        if(mouseY < itemTop + item.clientHeight * 0.2) {
            item.classList.add('top');
        }
        else if(mouseY < itemTop + item.clientHeight * 0.8) {
            item.classList.add('bg');
        }
        else if(mouseY < itemTop + item.clientHeight) {
            item.classList.add('bottom');
        }
        else {
            item.classList.remove('top', 'bg', 'bottom');
        }
    }
    else {
        item.classList.remove('top', 'bg', 'bottom');
    }
    
}

function moveAt(pageX:number, pageY:number) {
        boxDD.style.left = pageX - 22 + 'px'
        boxDD.style.top = pageY + 'px'
        boxDD.querySelector(".tree__item_name").innerText = `${pageY} : ${pageX} __ ${itemDrag.name}`;
        switchClassItem(currentDroppable, pageY, pageX);
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

function isNext(dragI:Item, dropI:Item) : boolean {
    if(dragI.pid !== dropI.pid) return false;

    const childs = getListOnePid(treeList, dragI.pid);
    if(!childs) return false; 

    for (let i = 0; i < childs.length; i++) {
        if(dropI.id === childs[i].id) {
            if(childs[i + 1]?.id === dragI.id) {
                console.log('isNext: true', childs[i + 1]);
                return true;
            }
        }
    }
    return false;
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

function toggleCurrentBox(event:any, droppableBelow:any, typeGoal:string) {
    // если элемент есть, сравниваем с текущим
    
    if (currentDroppable != droppableBelow) {
        if (currentDroppable) {
            currentDroppable.classList.remove('droppable')
        }

        currentDroppable = droppableBelow

        if (currentDroppable) {
            if(typeGoal == "li") {

                // если дерево скрыто - 
                if(currentDroppable.classList.contains('li_line')) {
                    // currentDroppable.classList.add('active');
                    addClassWithDelay(currentDroppable, 1500);
                
                    currentDroppable.addEventListener('mouseout', () => {
                        removeClassWithDelay(currentDroppable, 1500);
                    });
                }
                
                // статус и li.droppable для добавления рядом
                const cdItem = currentDroppable.querySelector(".tree__item");
                itemDrop = getItemObj(cdItem);

                if(
                    cdItem === treeItem || 
                    isNext(itemDrag, itemDrop) || 
                    itemDrop?.pid < 0
                ) { 
                    boxDD.classList.remove('pos');
                    isDrop = false; 
                }
                else {
                    if(ddVisible){}
                        boxDD.classList.add('pos');

                    // если не  root 
                    if(itemDrop.pid >= 0) {
                        currentDroppable.classList.add('droppable');
                    }

                    if(
                        // itemDrop?.no_drop === true || 
                        isChild(treeList, itemDrag.id, itemDrop.pid) || 
                        isParentNoDrop(treeList, itemDrag, itemDrop)
                    ) {
                        boxDD.classList.remove('active');
                        isDrop = false;
                    }
                    else {
                        boxDD.classList.add('active');
                        isDrop = true;
                    }

                }
            }
            else {
                // a.tree__item.droppable  и  статус для добавления внутрь
                if(currentDroppable === treeItem || itemDrag?.no_drag === true) { 
                    boxDD.classList.remove('pos'); 
                    isDrop = false; 
                }
                else {
                    if(ddVisible)
                        boxDD.classList.add('pos');

                    currentDroppable.classList.add('droppable');
                    itemDrop = getItemObj(currentDroppable);
                    if(itemDrop?.no_drop === true && itemDrag || isChild(treeList, itemDrag.id, itemDrop.pid)) {
                        boxDD.classList.remove('active');
                        isDrop = false;
                    }
                    else {
                        boxDD.classList.add('active');
                        isDrop = true;
                    }
                }
            }
            
            
        }
    }
}


function getItemObj(html:any) {
    return {
        id: +html.getAttribute("data-id"),
        pid: +html.getAttribute("data-pid"),
        index: +html.getAttribute("data-index"),
        name: html.querySelector(".tree__item_name").innerText,
        visible: html.getAttribute("data-visible"),
        icon: html.getAttribute("data-icon"),
        no_drag: html.getAttribute("data-no_drag") === "true" ? true : false,
        no_drop: html.getAttribute("data-no_drop") === "true" ? true : false,
    }
}

function addClassWithDelay(elem: HTMLElement, delay: number) {
    
    if (elem.classList.contains('active')) return;

    hoverStart = Date.now();
    hoverEnd = null;
    
    hoverTimer = setTimeout(() => {
        if (hoverEnd === null) {
            elem.classList.add('active');
        }
    }, delay);
}

function removeClassWithDelay(elem: HTMLElement, delay: number) {
    // const elem = event.target as HTMLElement;
    // console.log('elem', elem);
    if (elem?.classList.contains('active')) return;
    if (elem === null) return;


    hoverEnd = Date.now();
    const hoverTime: number = hoverEnd - hoverStart;
    clearTimeout(hoverTimer);
    if (hoverTime < delay) {
        elem.classList.remove('active');
    }

}

// // ********************** 0137 ***************************
document.addEventListener('mousedown', onMouseDown, false)
document.addEventListener('mousemove', onMouseMove, false)
document.addEventListener('mouseup', onMouseUp, false)
// // ********************** 0137 ***************************

function updateDaD(): void {
    // const menuItems: NodeListOf<HTMLElement> = document.querySelectorAll('ul.tree li, ul.tree li a');
    // let draggedItem: HTMLElement | null = null;

    // menuItems.forEach(item => {
    //     item.addEventListener('mousedown', onMouseDown, false)
    //     item.addEventListener('mousemove', onMouseMove, false)
    //     item.addEventListener('mouseup', onMouseUp, false)
    // });
    // ********************** 0137 ***************************
// document.addEventListener('mousedown', onMouseDown, false)
// document.addEventListener('mousemove', onMouseMove, false)
// document.addEventListener('mouseup', onMouseUp, false)
// ********************** 0137 ***************************


    // const btns: NodeListOf<HTMLElement> = document.querySelectorAll('ul.tree .tree__btn');
    // btns.forEach(btn => {
    //     // slideUp/slideDown for tree
    //     btn.addEventListener('click', (event: Event) => {
    //         event.preventDefault();
    //         event.stopPropagation();
    //         console.log("click::1");

    //         const tree__btn = (event.target as HTMLElement).closest(".tree__btn");
    //         if (tree__btn) {
    //             console.log("click::::tree__btn");
                
    //             const li = (tree__btn as HTMLElement).closest("li");
    //             const treeSub = li.querySelector(".tree_sub") as HTMLElement;
    //             treeSub.style.height = 'auto';
    //             const heightSub = treeSub.clientHeight + 'px';
    //             treeSub.style.height = heightSub;
    //             if (li.classList.contains('active')) {
    //                 setTimeout(() => { treeSub.style.height = '0px'; }, 0);
    //                 li.classList.remove('active');
    //             } else {
    //                 treeSub.style.height = '0px';
    //                 setTimeout(() => { treeSub.style.height = heightSub; }, 0);
    //                 li.classList.add('active');
    //             }
    //             setTimeout(() => { treeSub.removeAttribute('style'); }, 160);
    //         }
    //     });
    // });

}

