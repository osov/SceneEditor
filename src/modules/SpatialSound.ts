declare global {
    const SpatialSound: ReturnType<typeof SpatialSoundModule>;
}

export function register_spatial_sound() {
    (window as any).SpatialSound = SpatialSoundModule();
}

function SpatialSoundModule() {
    return {};
}