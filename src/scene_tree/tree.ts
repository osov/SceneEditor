// import { deepClone } from "../modules/utils";

const treeList = [
    {
        id: 0,
        pid: -1,
        name: "root",
        visible: true,
        icon: "cube",
        no_drag: true,
        no_drop: true
    },
    {
        id: 1,
        pid: 0,
        name: "name 1",
        visible: true,
        icon: "cube",
        no_drag: true,
        no_drop: true
    },
    {
        id: 2,
        pid: 0,
        name: "name 2",
        visible: true,
        icon: "cube",
        no_drag: true,
        no_drop: true
    },
    {
        id: 3,
        pid: 0,
        name: "name 3",
        visible: true,
        icon: "cube",
        no_drag: true,
        no_drop: true
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
        no_drag: true,
        no_drop: true
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
        no_drag: true,
        no_drop: true
    },
    {
        id: 7,
        pid: 41,
        name: "name 7",
        visible: true,
        icon: "cube",
        no_drag: true,
        no_drop: true
    }

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
        result += `<li class="active">`;
        result += `<div class="tree__item">
                        ${getTreeBtnHtml()}
                        ${getTreeIcoHtml(list.icon)}
                        <a>${list.name}</a>
                    </div>`;
        result += getTreeSubHtml(list?.children);
        result += `</li>`;

    }
    else {
        result += `<li>
                    <div class="tree__item">
                        ${getTreeIcoHtml(list.icon)}
                        <a>${list.name}</a>
                    </div
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
                <div class="tree__item">
                    ${getTreeIcoHtml(e.icon)}
                    <a>${e.name}</a>
                </div>    
            </li>`;
}

function getLiHtml(e:any){
    let result = '';
    result = `<li class="li_line active">
                <div class="tree__item">
                    ${getTreeBtnHtml()}
                    ${getTreeIcoHtml(e.icon)}
                    <a contenteditable="true">${e.name}</a>
                </div>`;
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