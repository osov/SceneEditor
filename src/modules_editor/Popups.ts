import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';
import { deepClone } from "../modules/utils";

declare global {
    const Popups: ReturnType<typeof PopupsCreate>;
}

export function register_popups() {
    (window as any).Popups = PopupsCreate();
}

//  ****** Popups examples:  ******
/* 

toast: 
    Popups.toast.error('lorem ipsum dolor.....');

    Popups.toast.success('lorem ipsum dolor.....');

    Popups.toast.open({
        type: 'warning', // 'success', 'error', 'warning', 'info'
        message: 'lorem ipsum dolor.....'
    });

documentation: https://github.com/caroso1222/notyf#readme


Popups.open({
    type: "Notify",
    params: {title: "Notify", text: "lorem inpsum dolor....", button: "Ok", auto_close: true},
    callback: nameFunction   // (success: boolean) => void
});

Popups.open({
    type: "Confirm",
    params: {title: "Confirm", text: "lorem inpsum dolor?", button: "Yes", buttonNo: "No", auto_close: true},
    callback: nameFunction   // (success: boolean) => void
});

Popups.open({
    type: "Rename",
    params: {title: "Rename", button: "Ok", currentName: "currentName", auto_close: true},
    callback: nameFunction   // (success: boolean, name?: string) => void
});

Popups.open({
    type: "Layers", 
    params: { 
        title: "Layers",
        button: "Add", 
        list: [{id: "1", title: "Layer 1"}, {id: "2", title: "Layer 2", can_delete: true}]
    }, 
    callback: nameFunction   
    //  action: 'add'   (success: boolean, data?: {action: string, item: { id: string, title: string }) => void
    //  action: 'delete'   (success: boolean, data?: {action: string, itemId: string | number }) => void
});

Popups.open({
    type: "Select", 
    params: { 
        title: "SelectList",
        button: "", 
        list: [{id: "1", title: "Option 1"}, {id: "2", title: "Option 2", selected: true }],
        auto_close: true
    }, 
    callback: nameFunction   
    //  action: 'selected'   (success: boolean, data?: {action: string, itemId: string | number }) => void
});

*/


interface Notify {
    type: "Notify",
    params: { title: string, text: string, button: string, auto_close?: boolean },
    callback: (success: boolean) => void
}

interface Confirm {
    type: "Confirm",
    params: { title: string, text: string, button: string, buttonNo: string, auto_close?: boolean },
    callback: (success: boolean) => void
}

interface Rename {
    type: "Rename",
    params: { title: string, button: string, currentName?: string, auto_close?: boolean },
    callback: (success: boolean, name?: string) => void
}

interface Layers {
    type: "Layers",
    params: {
        title: string,
        button: string,
        list: LayerItem [],
    },
    callback: (success: boolean, data?: cbDataItem | cbDataId) => void
}

interface LayerItem {
    id: string,
    title: string,
    can_delete?: boolean
}

interface Select {
    type: "Select",
    params: {
        title: string,
        button: string,
        list: SelectItem [],
        auto_close?: boolean
    },
    callback: (success: boolean, data?: cbDataId) => void
}

interface SelectItem {
    id: string,
    title: string,
    selected?: boolean
}

interface cbDataId {
    action: string,
    itemId: string | number
}

interface cbDataItem {
    action: string,
    item: LayerItem 
}

function PopupsCreate() {

    function open(data: Notify | Confirm | Rename | Layers | Select) {
        const popup = document.querySelector(`#popup${data?.type}`) as HTMLInputElement | null;
        if (!popup) return;

        const okBtn = popup.querySelector('.popup__okBtn') as HTMLInputElement | null;
        if (okBtn) { okBtn.textContent = data?.params?.button || okBtn.textContent; }

        const noBtn = popup.querySelector('.popup__noBtn') as HTMLInputElement | null;
        if (noBtn && data?.type == 'Confirm') { noBtn.textContent = data?.params?.buttonNo || noBtn.textContent; }
        
        const popupTitle = popup.querySelector('.popup__title span') as HTMLInputElement | null;
        if (popupTitle) { popupTitle.textContent = data?.params?.title; }

        const popupText = popup.querySelector('.popup__text') as HTMLInputElement | null;
        if (popupText && (data?.type == 'Notify' || data?.type == 'Confirm')) { popupText.textContent = data?.params?.text || popupText.textContent; }
        
        const inputField = popup.querySelector('.popup__input') as HTMLInputElement | null;
        if (inputField && data?.type == 'Rename') { inputField.value = data?.params?.currentName ? data?.params?.currentName : ''; }

        // if (data?.type == 'Layers') {
            const layer_list: LayerItem [] = (data?.type == 'Layers' && data?.params?.list) ? deepClone(data?.params?.list) : [];
            const wrLayersList = popup.querySelector('#LayersList') as HTMLElement | null;
            if (wrLayersList && data?.type == 'Layers') { 
                wrLayersList.innerHTML = getLayersHtml(layer_list);
                wrLayersList.addEventListener('click', layerListClick);
            }
        // }

        // if (data?.type == 'Select') {
            const select_list: SelectItem [] = (data?.type == 'Select' && data?.params?.list) ? data?.params?.list : [];
            const wrSelectList = popup.querySelector('#popupSelectList') as HTMLInputElement | null;
            if (wrSelectList && data?.type == 'Select') wrSelectList.innerHTML = getSelectHtml(select_list);
        // }

        const closeBg = popup.querySelector('.bgpopup') as HTMLElement | null;
        const closeBtn = popup.querySelector('.popup__close') as HTMLElement | null;
        
        const closeListBtns = data?.type == 'Confirm' ? [closeBg, closeBtn, noBtn] : [closeBg, closeBtn];
        closeListBtns.forEach((elem: any) => {
            if (elem) elem.addEventListener('click', closePopup);
        });
        
        function closePopup() {
            data?.callback(false);
            hidePopup(popup);
            clearClickBtn()
        }

        function clearClickBtn() {
            if (okBtn) okBtn.removeEventListener('click', fClick);
            if (noBtn) noBtn.removeEventListener('click', closePopup);
            if (closeBg) closeBg.removeEventListener('click', closePopup);
            if (closeBtn) closeBtn.removeEventListener('click', closePopup);
            if (wrLayersList) wrLayersList.removeEventListener('click', layerListClick);
        }
        
        if (okBtn) {
            okBtn.addEventListener('click', fClick);
        }
        
        function fClick() {
            if(!popup) return;

            if (data?.type == "Notify") {
                data?.callback(true);
                if (data.params?.auto_close == true) {
                    hidePopup(popup);
                    clearClickBtn();  
                }
            }

            if (data?.type == "Confirm") {
                data?.callback(true);
                if (data.params?.auto_close == true) {
                    hidePopup(popup);
                    clearClickBtn();
                }
            }

            if (data?.type == "Rename" && inputField && inputField.value.trim().length > 0) {
                data?.callback(true, inputField?.value.trim());
                inputField.value = '';
                if (data.params?.auto_close == true) {
                    hidePopup(popup);
                    clearClickBtn();  
                }
            }

            if (data?.type == 'Layers' && wrLayersList && inputField && inputField.value.trim().length > 0) {
                const newItem: LayerItem = { id: Date.now().toString(), title: inputField?.value.trim(), can_delete: true };
                data?.callback(true, { action: 'add', item: newItem });
                layer_list.push(newItem);
                wrLayersList.innerHTML = getLayersHtml(layer_list);
                inputField.value = '';
            }

            if (data?.type == 'Select' && wrSelectList) {
                const itemSelected = select_list.findIndex((item: SelectItem) => item.id == wrSelectList?.value);
                if (wrSelectList?.value && itemSelected > -1) {
                    data?.callback(true, { action: 'selected', itemId: select_list[itemSelected]?.id });
                    if (data.params?.auto_close == true) {
                        hidePopup(popup);
                        clearClickBtn();  
                    }
                }
            }

        }

        function removeItemLayer(id: string) {
            layer_list.splice(layer_list.findIndex((item: LayerItem) => item.id == id), 1);
            if (data?.type == 'Layers') data?.callback(true, { action: 'delete', itemId: id });
            if (wrLayersList) wrLayersList.innerHTML = getLayersHtml(layer_list);
        }

        function layerListClick(e: any) {
            const btnRemove = e.target.closest('.LayersList__item_remove');
            const btnId = btnRemove?.getAttribute('data-id');
            if (btnId) removeItemLayer(btnId);
        }
        

        showPopup(popup);
    }

    function getLayersHtml(list: LayerItem []): string {
        let result = ``;
        list.forEach((item: LayerItem) => {
            result += `<div class="LayersList__item">
                            <span>${item.title}</span>
                            ${item?.can_delete ? getDeleteLayerItemHtml(item?.id) : ''}
                        </div>`;
        });
        return result;
    }
    
    function getDeleteLayerItemHtml(id: string): string {
        return `<a href="javascript:void(0);" class="LayersList__item_remove" tabindex="-1"  draggable="false" data-id="${id}">
                    <svg class="svg_icon"><use href="./img/sprite.svg#circle_close"></use></svg>
                </a>`;
    }
    
    function getSelectHtml(list: SelectItem []): string {
        let result = `<option value="" selected disabled hidden>Choose here</option>`;
        list.forEach((item: SelectItem) => {
            result += `<option value="${item?.id}" ${item?.selected == true ? 'selected' : ''}>${item.title}</option>`;
        });
        return result;
    }

    function showPopup(popup: any): void {
        popup.querySelector('.bgpopup')?.classList.add('active');
        popup.querySelector('.popup')?.classList.add('active');
    }

    function hidePopup(popup: any): void {
        popup.querySelector('.bgpopup')?.classList.remove('active');
        popup.querySelector('.popup')?.classList.remove('active');
    }

    const toast = new Notyf({
        duration: 3000,
        position: {
            x: 'right',
            y: 'bottom',
        },
        types: [
            {
                type: 'success',
                background: '#3dc763',
            },
            {
                type: 'info',
                background: '#72728d',
                dismissible: true
            },
            {
                type: 'error',
                background: 'indianred',
                dismissible: true
            },
            {
                type: 'warning',
                background: 'orange',
                icon: {
                        className: 'material-icons',
                        tagName: 'i',
                        text: 'warning'
                    }
            },
        ]
    });


    return { open, toast };
}