// import { deepClone } from "../modules/utils";

declare global {
    const ContextMenu: ReturnType<typeof ContextMenuCreate>;
}

export function register_contextmenu() {
    (window as any).ContextMenu = ContextMenuCreate();
}

//  ****** ContextMenu example: ******
/* 
import { NodeAction } from "./ActionsControl";

const list: contextMenuItem [] = [
    { text: 'Переименовать', action: NodeAction.rename },
    { text: 'Вырезать', action: NodeAction.CTRL_X, not_active: true },       //  not_active: true  -   Не кликабельный 
    { text: 'Копировать', action: NodeAction.CTRL_C },
    { text: 'Удалить', action: NodeAction.remove },
    { text: 'line' },                                                        //  'line'   - когда нужно разделить линией 
    { text: 'Создать UI', children: [                                        
        { text: 'Добавить блок', action: NodeAction.add_gui_box },
        { text: 'Добавить текст', action: NodeAction.add_gui_text },
        { text: 'line' },
        { text: 'Расширенные', children: [                                   // children: [{}, ..., {} ]
            { text: 'Добавить кнопку', action: NodeAction.add_button },
            { text: 'Добавить скрол', action: NodeAction.add_scroll },
        ] },
    ] }
];

ContextMenu.open(
    list,
    event,           // event.offset_x   event.offset_y
    nameFunction     // (success: boolean, action?: number | string) => void
);

ContextMenu.open(treeContextMenu, event, menuContextClick);


*/

interface MenuItem {
    text: string,                 //  text: 'line'   - когда нужно разделить линией 
    action?: number | string,     //  action: NodeAction.rename
    not_active?: boolean,         //  true - НЕ кликабельные элементы
    children?: MenuItem [],
};

export type contextMenuItem = MenuItem;

function ContextMenuCreate() {

    const menuContext = document.querySelector('.wr_menu__context') as HTMLElement;

    if (menuContext) menuContext?.addEventListener('contextmenu', (event: any) => {
        event.preventDefault();
    });

    let mContextVisible: boolean = false;
    let myCb: (success: boolean, action?: number | string) => void;

    function open(list: any, event: any, callback: (success: boolean, action?: number | string) => void): void {
        if (!list || list.length == 0) return;

        if (!menuContext) return;

        myCb = callback;

        const html = getMenuHtml(list);
        if (html?.length) {
            menuContext.innerHTML = html;
            showContextMenu(event);
        }

    }

    function getMenuHtml(list: any, sub?: boolean) {
        if (!list || list.length == 0) return '';
            
        let result = `<ul class="${sub ? 'menu__context_sub' : 'menu__context'}">`;
        list.forEach((item: any) => {
            if (item?.text == 'line') result += getLiLine();
            else if (item?.children?.length) result += getLiChildren(item);
            else result += getLiDefault(item);
        });
        result += `</ul>`;
        return result;
    }

    function getLiChildren(item: any): string {
        return `<li>
                    <a href="javascript:void(0)" draggable="false">
                        <span>${item.text}</span>
                        <span class="menu__context_arrow"><svg class="svg_icon"><use href="./img/sprite.svg#chevron_right"></use></svg></span>
                    </a>
                    ${getMenuHtml(item?.children, true)}
                </li>`;
    }

    function getLiLine(): string {
        return `<li class="menu__context_separator"><a href="javascript:void(0)" draggable="false"><span></span></a></li>`
    }

    function getLiDefault(item: any): string {
        return `<li><a href="javascript:void(0)" data-action="${item.action}" draggable="false" ${item?.not_active == true ? 'class="not_active"' : ''}><span>${item.text}</span></a></li>`;
    }
    
    function hideContextMenu(): void {
        menuContext.classList.remove('active');
        menuContext.removeAttribute('style');
        menuContext.innerHTML = '';
        mContextVisible = false;
    }

    function showContextMenu(event: any): void {

        menuContext.classList.remove('bottom');
        menuContext.classList.add("active");
        menuContext.style.left = event.offset_x + 10 + 'px';

        mContextVisible = true;

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

    function onMouseDown(e: any) {
        if (mContextVisible && !e.target.closest('.wr_menu__context .menu__context a')) {
            myCb(false);
            hideContextMenu();
        }
    }

    function onMouseUp(e: any) {
        if (mContextVisible && e.target.closest('.wr_menu__context .menu__context a') && e.button === 0) {
            menuContextClick(e);
        }
    }

    function menuContextClick(e: any): void {
        const itemContext = e.target.closest(".wr_menu__context .menu__context a");
        if (!itemContext) { 
            myCb(false);
            hideContextMenu()
            return;
        }

        const dataAction = itemContext?.getAttribute("data-action");
        if (!dataAction || itemContext.classList.contains('not_active')) {
            log('not dataAction or not_active')
            return;
        }

        myCb(true, dataAction);
        hideContextMenu();
    }

    EventBus.on('SYS_INPUT_POINTER_DOWN', onMouseDown);
    EventBus.on('SYS_INPUT_POINTER_UP', onMouseUp);

    return { open };
}