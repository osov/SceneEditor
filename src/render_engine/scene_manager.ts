declare global {
    const SceneManager: ReturnType<typeof SceneManagerModule>;
}

export function register_scene_manager() {
    (window as any).SceneManager = SceneManagerModule();
}


export function SceneManagerModule(){


    return {};
}