export function initButtons() {

    window.addEventListener('click', (event: any) => {
        
        const btn_menu = event.target.closest(".btn_menu");
        if (btn_menu) {
            const menu_section = btn_menu.closest(".menu_section");
            menu_section.classList.toggle("active")
        }
        
    });

}