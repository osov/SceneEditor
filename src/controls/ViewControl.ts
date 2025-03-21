declare global {
    const ViewControl: ReturnType<typeof ViewControlCreate>;
}

export function register_view_control() {
    (window as any).ViewControl = ViewControlCreate();
}

function ViewControlCreate() {

    function init() {

        EventBus.on('SYS_VIEW_INPUT_KEY_UP', (e: any) => {
            if (
                e.target?.closest("input") || 
                e.target?.closest("textarea") || 
                e.target?.closest('.tree__item_name[contenteditable="true"]')
            ) { return; }
            
            if (e.key == 'F2') {
                TreeControl.preRename();
            }
            
            if (e.key == 'f' || e.key == 'а') {
                CameraControl.focus();
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