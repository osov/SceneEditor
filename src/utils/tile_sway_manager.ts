import { Slice9Mesh } from "../render_engine/objects/slice9";

export interface TileSwayManagerConfig {
    material: string;
    frequency?: number;
    speed?: number;
    max_amplitude?: number;
    effect_time?: number;
}

interface SwayItem {
    added: number;
    amplitude: number;
    mesh: Slice9Mesh;
    saved_alpha: number;
}

export function createTileSwayManager(cfg: TileSwayManagerConfig) {
    const frequency = cfg.frequency ?? 3;
    const speed = cfg.speed ?? 5;
    const max_amplitude = cfg.max_amplitude ?? 1;
    const effect_time = cfg.effect_time ?? 1.0;
    const active_map = new Map<Slice9Mesh, SwayItem>();

    function update(dt: number) {
        const now = System.now_with_ms();
        const to_remove: Slice9Mesh[] = [];
        for (const [mesh, it] of active_map) {
            if (it.added + effect_time < now) {
                let val = it.amplitude - dt * speed;
                if (val < 0)
                    val = 0;
                it.amplitude = val;
                ResourceManager.set_material_uniform_for_mesh(mesh, 'u_amplitude', val);
                if (val == 0)
                    to_remove.push(mesh);
            } else {
                let val = it.amplitude + dt * speed;
                if (val > max_amplitude)
                    val = max_amplitude;
                if (val < max_amplitude) {
                    it.amplitude = val;
                    ResourceManager.set_material_uniform_for_mesh(mesh, 'u_amplitude', val);
                }
            }
        }
        for (const mesh of to_remove) {
            deactivate(mesh, false);
            active_map.delete(mesh);
        }
    }

    function is_active(mesh: Slice9Mesh) {
        return active_map.has(mesh);
    }

    function activate(mesh: Slice9Mesh) {
        if (active_map.has(mesh))
            return;
        const tex_atlas = mesh.get_texture();
        const saved_alpha = mesh.get_alpha();
        mesh.set_material(cfg.material);
        mesh.set_texture(tex_atlas[0], tex_atlas[1]);
        mesh.set_alpha(saved_alpha);
        ResourceManager.set_material_uniform_for_mesh(mesh, 'u_frequency', frequency);
        ResourceManager.set_material_uniform_for_mesh(mesh, 'u_amplitude', 0);
        active_map.set(mesh, { mesh, added: System.now_with_ms(), amplitude: 0, saved_alpha });
    }

    function deactivate(mesh: Slice9Mesh, with_del = true) {
        const item = active_map.get(mesh);
        if (!item)
            return;
        const tex_atlas = mesh.get_texture();
        mesh.set_material('slice9');
        mesh.set_texture(tex_atlas[0], tex_atlas[1]);
        mesh.set_alpha(item.saved_alpha);
        if (with_del)
            active_map.delete(mesh);
    }

    return { update, activate, deactivate };
}
