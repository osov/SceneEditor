export function initButtons() {

    window.addEventListener('click', (event: any) => {
        
        const btn_menu = event.target.closest(".btn_menu");
        if (btn_menu) {
            const menu_section = btn_menu.closest(".menu_section");
            menu_section.classList.toggle("active")
        }
        
        // slideUp/slideDown for tree
        const tree__btn = event.target.closest(".tree__btn");
        if (tree__btn) {
            const li = tree__btn.closest("li");
            const treeSub = li.querySelector(".tree_sub");
            treeSub.style.height = 'auto';
            const heightSub = treeSub.clientHeight + 'px';
            treeSub.style.height = heightSub;
            if (li.classList.contains('active')) {
                setTimeout(() => { treeSub.style.height = '0px'; }, 0);
                li.classList.remove('active');
            }
            else {
                treeSub.style.height = '0px';
                setTimeout(() => { treeSub.style.height = heightSub; }, 0);
                li.classList.add('active');
            }
            setTimeout(() => { treeSub.removeAttribute('style'); }, 160);
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