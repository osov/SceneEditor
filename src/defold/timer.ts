declare global {
    namespace timer {
        export function delay(delay: number, repeat: boolean, callback: (self: any, handle: any, time_elapsed: number) => void): any;
        export function cancel(handle: any): boolean;
    }
}

export function timer_module() {
    const timeoutHandles: ReturnType<typeof setTimeout>[] = [];
    const intervalHandles: ReturnType<typeof setInterval>[] = [];

    function delay(delay: number, repeat: boolean, callback: (self: any, handle: any, time_elapsed: number) => void): any {
        if (repeat) {
            let startTime = Date.now();
            const handle = setInterval(() => {
                const timeElapsed = Date.now() - startTime;
                callback(null, handle, timeElapsed);
                startTime = Date.now();
            }, delay);
            intervalHandles.push(handle);
            return handle;
        }

        const startTime = Date.now();
        const handle = setTimeout(() => {
            const timeElapsed = Date.now() - startTime;
            callback(null, handle, timeElapsed);
        }, delay);
        timeoutHandles.push(handle);
        return handle;
    }

    function cancel(handle: any): boolean {
        if (timeoutHandles.includes(handle)) {
            clearTimeout(handle);
            timeoutHandles.splice(timeoutHandles.indexOf(handle), 1);
            return true;
        }

        if (intervalHandles.includes(handle)) {
            clearInterval(handle);
            return true;
        }

        return false;
    }

    return {
        delay,
        cancel
    };
}
