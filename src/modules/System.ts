declare global {
    const System: ReturnType<typeof SystemModule>;
}

export function register_system() {
    (window as any).System = SystemModule();
}

function SystemModule() {

    function now() {
        return Date.now() / 1000;
    }

    function now_int() {
        return Date.now();
    }

    function now_ms() {
        return Date.now();
    }

    function now_with_ms() {
        return Date.now() / 1000;
    }


    return { now, now_ms, now_with_ms, now_int };
}