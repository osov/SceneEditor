import { deepClone } from "../modules/utils";

declare global {
    const Popups: ReturnType<typeof PopupsCreate>;
}

export function register_popups() {
    (window as any).Popups = PopupsCreate();
}

/* 
Popups.open({
    type: "Rename",
    params: {title: "Rename", button: "Ok", auto_close: true},
    callback: () => {}
});
*/
interface Rename {
    type: "Rename",
    params: { title: string, button: string, auto_close?: boolean },
    callback: Function
}

/* 
Popups.open({
    type: "Layers", 
    params: { 
        title: "Layers",
        button: "Add", 
        list: [{id: "1", title: "Layer 1"}, {id: "2", title: "Layer 2", can_delete: true}]
    }, 
    callback: () => {}
});
*/
interface Layers {
    type: "Layers",
    params: {
        title: string,
        button: string,
        list: LayerItem [],
    },
    callback: Function
}

interface LayerItem {
    id: string,
    title: string,
    can_delete?: boolean
}

function PopupsCreate() {

    function open(data: Rename | Layers) { 

        const popup = document.querySelector(`#popup${data?.type}`) as HTMLInputElement | null;
        if (!popup) return;

        const okBtn = popup.querySelector('.popup__okBtn') as HTMLInputElement | null;
        if (okBtn) { okBtn.textContent = data?.params?.button || 'Ok'; }
        
        const popupTitle = popup.querySelector('.popup__title span') as HTMLInputElement | null;
        if (popupTitle) { popupTitle.textContent = data?.params?.title; }
        
        const inputField = popup.querySelector('.popup__input') as HTMLInputElement | null;

        // if (data?.type == 'Layers') {
            const layer_list: LayerItem [] = (data?.type == 'Layers' && data?.params?.list) ? deepClone(data?.params?.list) : [];
            const wrLayersList = popup.querySelector('#LayersList') as HTMLElement | null;
            if (wrLayersList && data?.type == 'Layers') wrLayersList.innerHTML = getLayersHtml(layer_list);
        // }

        const closeBg = popup.querySelector('.bgpopup') as HTMLElement | null;
        const closeBtn = popup.querySelector('.popup__close') as HTMLElement | null;
        
        [closeBtn, closeBg].forEach((elem: any) => {
            if (elem) elem.addEventListener('click', closePopup);
        });
        
        function closePopup() {
            data?.callback(false);
            hidePopup(popup);
            if (okBtn) okBtn.removeEventListener('click', fClick);
            if (closeBg) closeBg.removeEventListener('click', closePopup);
            if (closeBtn) closeBtn.removeEventListener('click', closePopup);
        }
        
        if (okBtn) {
            okBtn.addEventListener('click', fClick);
        }
        
        function fClick() {
            if(!popup) return;

            if (data?.type == "Rename" && inputField && inputField.value.trim().length > 0) {
                data?.callback(true, inputField?.value.trim());
                inputField.value = '';
                if (data.params?.auto_close == true) {
                    hidePopup(popup);
                    if (okBtn) okBtn.removeEventListener('click', fClick);  
                }
            }

            if (data?.type == 'Layers' && wrLayersList && inputField && inputField.value.trim().length > 0) {
                log('Layers')
                const newItem: LayerItem = { id: Date.now().toString(), title: inputField?.value.trim(), can_delete: true };
                data?.callback(true, { action: 'add', item: newItem });
                layer_list.push(newItem);
                wrLayersList.innerHTML = getLayersHtml(layer_list);
                log(layer_list)
                inputField.value = '';
                wrLayersList.addEventListener('click', layerListClick);
            }
        }

        function removeItemLayer(id: string) {
            layer_list.splice(layer_list.findIndex((item: LayerItem) => item.id == id), 1);
            data?.callback(true, { action: 'delete', id: id });
            if (wrLayersList) wrLayersList.innerHTML = getLayersHtml(layer_list);
            log({layer_list, id})
        }

        function layerListClick(e: any) {
            const btnRemove = e.target.closest('.LayersList__item_remove');
            const btnId = btnRemove?.getAttribute('data-id');
            if (btnId) removeItemLayer(btnId);
            if (wrLayersList) wrLayersList.removeEventListener('click', fClick);
        }
        

        showPopup(popup);
    }

    function getLayersHtml(list: LayerItem []): string {
        let result = ``;
        list.forEach((item: LayerItem) => {
            result += `<div class="LayersList__item">
                            <span>${item.title}</span>
                            ${item?.can_delete ? getDeleteLayerItemHtml(item?.id) : ``}
                        </div>`;
        });
        return result;
    }

    function getDeleteLayerItemHtml(id: string): string {
        return `<a href="javascript:void(0);" class="LayersList__item_remove" tabindex="-1"  draggable="false" data-id="${id}">
                    <svg class="svg_icon"><use href="./img/sprite.svg#circle_close"></use></svg>
                </a>`;
    }

    function showPopup(popup: any): void {
        popup.querySelector('.bgpopup')?.classList.add('active');
        popup.querySelector('.popup')?.classList.add('active');
    }

    function hidePopup(popup: any): void {
        popup.querySelector('.bgpopup')?.classList.remove('active');
        popup.querySelector('.popup')?.classList.remove('active');
    }

    return { open };
}