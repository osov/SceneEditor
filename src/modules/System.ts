declare global {
    const System: ReturnType<typeof SystemModule>;
}

export function register_system() {
    (window as any).System = SystemModule();
}

function SystemModule() {

    function now() {
        return Math.floor(Date.now() / 1000);
    }

    function now_with_ms() {
        return Date.now() / 1000;
    }


    return { now, now_with_ms };
}