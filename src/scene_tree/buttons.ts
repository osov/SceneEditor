export function initButtons() {

    window.addEventListener('click', (event: any) => {
        
        const btn_menu = event.target.closest(".btn_menu");
        if (btn_menu) {
            const menu_section = btn_menu.closest(".menu_section");
            menu_section.classList.toggle("active")
        }
        
    });
    
    window.addEventListener('keyup', (event: any) => {

        const field = event.target.closest(".poisk_us");
        const spans =  document.querySelectorAll(`#wr_tree li .tree__item_name`);
        spans.forEach((s:any) => {
            s.classList.remove("color_green")
            if(field?.value.trim()?.length > 0 && s.textContent.includes(field?.value.trim()))
                s.classList.add("color_green")
        });
        
    });

}