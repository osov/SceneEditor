// import { deepClone } from "../modules/utils";
import { NodeAction } from "@editor/shared";
import { get_asset_control } from "@editor/controls/AssetControl";
import { Services } from '@editor/core';

/** Тип ContextMenu */
export type ContextMenuType = ReturnType<typeof ContextMenuCreate>;

/** Модульный instance для использования через импорт */
let contextmenu_instance: ContextMenuType | undefined;

/** Получить instance ContextMenu */
export function get_contextmenu(): ContextMenuType {
    if (contextmenu_instance === undefined) {
        throw new Error('ContextMenu не инициализирован. Вызовите register_contextmenu() сначала.');
    }
    return contextmenu_instance;
}

export function register_contextmenu() {
    contextmenu_instance = ContextMenuCreate();
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

        // call the scene context menu
        const menu_scene_btn = e.target.closest(".menu_scene_btn");
        if (menu_scene_btn) open(getContextMenuSceneItems(), e, menuContextSceneClick);
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
            Services.logger.debug('not dataAction or not_active');
            return;
        }

        myCb(true, dataAction);
        hideContextMenu();
    }

    function isVisible() {
        return mContextVisible;
    }

    function getContextMenuSceneItems(): MenuItem[] {
        const cm_list: MenuItem[] = [];
        cm_list.push({
            text: 'Сцена', children: [
                { text: 'создать', action: NodeAction.new_scene },
                { text: 'сохранить', action: NodeAction.scene_save },
                { text: 'сохранить как', action: NodeAction.scene_save_as },
            ]
        });
        return cm_list;
    }

    function menuContextSceneClick(success: boolean, action?: number | string): void { 
        if (!success || action == undefined || action == null) return;

        const current_dir = localStorage.getItem("current_dir") || '';

        if (action == NodeAction.new_scene) {
            get_asset_control().new_scene_popup(current_dir);
        }

        if (action == NodeAction.scene_save) {
            get_asset_control().save_current_scene();
        }

        if (action == NodeAction.scene_save_as) {
            get_asset_control().new_scene_popup(current_dir, true, true);
        }
    }

    Services.event_bus.on('input:pointer_down', onMouseDown);
    Services.event_bus.on('input:pointer_up', onMouseUp);

    return { open, isVisible };
}