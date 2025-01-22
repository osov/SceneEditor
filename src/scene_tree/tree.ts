// import { deepClone } from "../modules/utils";

const treeList = [
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
        name: "name 7",
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
    let html = getTreeHtml(renderList);
    const divTree:any = document.querySelector('#wr_tree');
    divTree.innerHTML = html;
    
}

function buildTree(list: any) {
    const treeMap:any = {};
    const tree:any = [];

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
                        <a class="tree__item" data-id="${list.id}" data-pid="${list.pid}" data-icon="${list.icon}" data-no_drop="${list.no_drop}" data-no_drag="${list.no_drag}">
                            ${getTreeIcoHtml(list.icon)}
                            <span class="tree__item_name">${list.name}</span>
                        </a>
                        ${getTreeSubHtml(list?.children)}
                    </li>`;
    }
    else {
        result += `<li>
                        <a class="tree__item" data-id="${list.id}" data-pid="${list.pid}" data-icon="${list.icon}" data-no_drop="${list.no_drop}" data-no_drag="${list.no_drag}">
                            ${getTreeIcoHtml(list.icon)}
                            <span class="tree__item_name">${list.name}</span>
                        </a>
                    </li>`;
    }
    result += `</ul>`;
    return result;
}

function getTreeSubHtml(list:any){
    let result = `<ul class="tree_sub">`;
    list.forEach((item:any) => {
        if(item?.children.length) {
            result += getLiHtml(item);
        }
        else {
            result += getLiEmpty(item);
        }
    });
    result += `</ul>`;
    return result;
}

function getLiEmpty(e:any){
    return `<li>
                <a class="tree__item" data-id="${e.id}" data-pid="${e.pid}" data-icon="${e.icon}" data-no_drop="${e.no_drop}" data-no_drag="${e.no_drag}">
                    ${getTreeIcoHtml(e.icon)}
                    <span class="tree__item_name">${e.name}</span>
                </a>    
            </li>`;
}

function getLiHtml(e:any){
    let result = '';
    result = `<li class="li_line active">
                ${getTreeBtnHtml()}
                <a class="tree__item" data-id="${e.id}" data-pid="${e.pid}" data-icon="${e.icon}" data-no_drop="${e.no_drop}" data-no_drag="${e.no_drag}">
                    ${getTreeIcoHtml(e.icon)}
                    <span class="tree__item_name" contenteditable="true">${e.name}</span>
                </a>`;
    if(e?.children.length) {
        result += getTreeSubHtml(e?.children);
    }
    result += `</li>`;
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

function getTreeIcoHtml(icon: string){
    return `<span class="tree__ico"><svg class="svg_icon"><use href="./img/sprite.svg#${icon}"></use></svg></span>`;
}

function updateTreeList(){
    console.log(treeList);
    console.log(itemDrag, itemDrop);
    treeList.forEach((e) => {
        if (e.id === itemDrag.id) {
            e.pid = itemDrop.id;
        }
    });
    console.log(treeList);
}

let treeItem:any = null;
let currentDroppable:any = null;
// let shiftX:number = 0;
// let shiftY:number = 0;
let startPageX:number = 0;
let startPageY:number = 0;
const boxDD:any = document.querySelector(".drag_and_drop")
let itemDrag:any = {};
let itemDrop:any = {};

function onMouseDown(event:any) {
    // event.preventDefault();
    if(event.button === 0){

        treeItem = event.target.closest('.tree__item');
        
        if (treeItem) {
            console.log(boxDD);
            itemDrag = getItemObj(treeItem);
            console.log({itemDrag});
          

            if (itemDrag?.no_drag === false) {
                // shiftX = event.clientX - treeItem.getBoundingClientRect().left
                // shiftY = event.clientY - treeItem.getBoundingClientRect().top
                startPageX = event.pageX
                startPageY = event.pageY
                
                // document.body.append(treeItem)
                boxDD.classList.add('pos');
                boxDD.querySelector(".tree__item_name").innerText = itemDrag.name;
                boxDD.querySelector(".tree__ico use").setAttribute('href', `./img/sprite.svg#${itemDrag.icon}`);
                moveAt(event.pageX, event.pageY); // 
            }

        }

    }
}

function onMouseMove(event:any) {
    if(event.button === 0){
        
        // if (event.target.closest('.card.pos')) {  // с таким вариантом, курсор при быстром движении уходит за пределы карты 
        if (treeItem) {
            moveAt(event.pageX, event.pageY)
            let goalBox = getGoal(event)
            
            if (goalBox == false) return

            // переключаем блок цели
            if (goalBox.closest('.tree__item')) {
                toogleCurrentBox(goalBox.closest('.tree__item'), "a")
            }
            else if (goalBox.closest('.tree li')) {
                toogleCurrentBox(goalBox.closest('.tree li'), "li")
            }
        }
    }
}

function onMouseUp(event:any) {
    // event.preventDefault();
    if(event.button === 0){

        if (event.target.closest('.tree__item')) {
            console.log("Up ___ UP UP UP");
            
            // если бокс подсветился
            if (currentDroppable) {
                console.log('up: ', currentDroppable);
                
                // можно ли добавлять карту в бокс
                if(itemDrop?.no_drop === false) {
                    updateTreeList();
                    renderTree();
                }
                else {
                    // generateBox.append(treeItem)
                }
            }
            else {
                // generateBox.append(treeItem)
            }
    
        }
        
        boxDD?.classList.remove('pos')
        boxDD?.removeAttribute('style')
        // boxDD = false
        
    }
}

function moveAt(pageX:number, pageY:number) {
    // if(pageX !== startPageX || pageY !== startPageY) {
    //     boxDD.classList.add('viz')
    // }
        boxDD.style.left = pageX - 22 + 'px'
        boxDD.style.top = pageY + 'px'
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

function toogleCurrentBox(droppableBelow:any, type?:string) {
    // если элемент есть, сравниваем с текущим
    // console.log({currentDroppable});
    // console.log({droppableBelow});
    
    if (currentDroppable != droppableBelow) {
        if (currentDroppable) {
            currentDroppable.classList.remove('droppable')
        }

        currentDroppable = droppableBelow

        if (currentDroppable) {
            currentDroppable.classList.add('droppable');
            if(type == "li"){
                console.log("li:::");
                if(currentDroppable.querySelector(".tree__item") !== treeItem) {
                    const cdItem = currentDroppable.querySelector(".tree__item");
                    itemDrop = getItemObj(cdItem);
                    // console.log({itemDrop});
                    if(itemDrop?.no_drop === true && itemDrag) {
                        console.log('dropAb: ', itemDrop.name);
                        boxDD.classList.remove('active');
                    }
                    else {
                        boxDD.classList.add('active');
                    }
                }
            }
            else {
                if(currentDroppable !== treeItem) {
                    itemDrop = getItemObj(currentDroppable);
                    console.log("a:::");
                    if(itemDrop?.no_drop === true && itemDrag) {
                        console.log('dropAb: ', itemDrop.name);
                        boxDD.classList.remove('active');
                    }
                    else {
                        boxDD.classList.add('active');
                    }
                }
            }
            
            
        }
    }
}

function checkUp(currentBox:any, currentTreeItem:any){
    console.log(currentBox, currentTreeItem);
    return true
}

function getItemObj(html:any) {
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

// ********************** 0137 ***************************
document.addEventListener('mousedown', onMouseDown, false)
document.addEventListener('mousemove', onMouseMove, false)
document.addEventListener('mouseup', onMouseUp, false)
// ********************** 0137 ***************************