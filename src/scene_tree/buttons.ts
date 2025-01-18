export function initButtons() {

    window.addEventListener('click', (event: any) => {
        
        const btn_menu = event.target.closest(".btn_menu");
        if (btn_menu) {
            const menu_section = btn_menu.closest(".menu_section");
            menu_section.classList.toggle("active")
        }
        
        const tree__btn = event.target.closest(".tree__btn");
        if (tree__btn) {
            tree__btn.classList.toggle("active")
        }
        
    });
    
    window.addEventListener('keyup', (event: any) => {

        const field = event.target.closest(".poisk_us");
        const links =  document.querySelectorAll(`#wr_tree li a`);
        links.forEach((a:any) => {
            a.classList.remove("color_green")
            if(field.value.trim().length > 0 && a.textContent.includes(field.value.trim()))
                a.classList.add("color_green")
        });
        
    });

}