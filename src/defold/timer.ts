import { TDictionary } from "../modules_editor/modules_editor_const";

declare global {
    namespace timer {
        export function delay(delay: number, callback: (self: any, handle: any, time_elapsed: number) => void): any;
        export function cancel(handle: any): void;
    }
}

export function timer_module() {
    let nextHandle = 1;
    const activeTimers: TDictionary<{
        callback: (self: any, handle: any, time_elapsed: number) => void,
        startTime: number,
        delay: number,
        repeat: boolean
    }> = {};

    function init() {
        EventBus.on('SYS_ON_UPDATE', (e) => {
            Object.entries(activeTimers).forEach(([handle, timer]) => {
                timer.startTime += e.dt;
                if (timer.startTime >= timer.delay) {
                    timer.callback(null, handle, timer.startTime / 1000);
                    if (timer.repeat) timer.startTime = 0;
                    else delete activeTimers[handle];
                }
            });
        });
    }

    function delay(delay: number, repeat: boolean, callback: (self: any, handle: any, time_elapsed: number) => void) {
        const handle = nextHandle++;
        activeTimers[handle] = {
            callback,
            startTime: 0,
            delay: delay,
            repeat: repeat
        };
        return handle;
    }

    function cancel(handle: any): boolean {
        if (!activeTimers[handle])
            return false;
        delete activeTimers[handle];
        return true;
    }

    init();
    return {
        delay,
        cancel
    };
}
