declare global {
    const ViewControl: ReturnType<typeof ViewControlCreate>;
}

export function register_view_control() {
    (window as any).ViewControl = ViewControlCreate();
}

function ViewControlCreate() {

    function init() {
        //const geometry = new RingGeometry(4.5, 5, 12);
        //const material = new MeshBasicMaterial({ color: 0xffff00, side: DoubleSide });
        //const mesh = new Mesh(geometry, material); 
        //mesh.position.set(300, -200, 49);
        //mesh.scale.setScalar(5)
        //RenderEngine.scene.add(mesh);

        EventBus.on('SYS_VIEW_INPUT_KEY_UP', (e: any) => {
            if (
                e.target?.closest("input") || 
                e.target?.closest('.tree__item_name[contenteditable="true"]')
            ) { return; }
            
            if (e.key == 'F2') {
                TreeControl.preRename();
            }
            
            if (e.key == 'f' || e.key == 'а') {
                ActionsControl.focus();
            }
            
            if (Input.is_control() && (e.key == 'c' || e.key == 'с')) {
                ActionsControl.copy();
            }
            
            if (Input.is_control() && (e.key == 'x' || e.key == 'ч')) {
                ActionsControl.cut();
            }

            if (Input.is_control() && (e.key == 'v' || e.key == 'м')) {
                ActionsControl.paste();
            }

            if (Input.is_control() && (e.key == 'b' || e.key == 'и')) {
                ActionsControl.paste(true);
            }

            if (Input.is_control() && (e.key == 'd' || e.key == 'в')) {
                ActionsControl.duplication();
            }

            if (e.key == 'Delete') {
                ActionsControl.remove();
            }
            
        });
        
    }

    init();
    return {};
}