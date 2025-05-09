import { Slice9Mesh } from "../render_engine/objects/slice9";

interface GrassItem {
    added: number;
    amlitude: number;
    mesh: Slice9Mesh;
}

export function createGrassManager() {
    let active_list: GrassItem[] = [];
    const effect_time = 1.0;
    const speed = 5;
    const max_amplitude = 1;

    function update(dt: number) {
        const now = System.now_with_ms();
        for (let i = active_list.length - 1; i >= 0; i--) {
            const it = active_list[i];
            if (it.added + effect_time < now) {
                let val = it.amlitude - dt * speed;
                if (val < 0)
                    val = 0;
                it.amlitude = val;
                ResourceManager.set_material_uniform_for_mesh(it.mesh, 'u_amplitude', val);
                if (val == 0) {
                    deactivate(it.mesh, false);
                    active_list.splice(i, 1);
                }
            }
            else {
                let val = it.amlitude + dt * speed;
                if (val > max_amplitude)
                    val = max_amplitude;
                if (val < max_amplitude) {
                    it.amlitude = val;
                    ResourceManager.set_material_uniform_for_mesh(it.mesh, 'u_amplitude', val);
                }
            }
        }
    }

    function is_actived(mesh: Slice9Mesh) {
        for (const it of active_list) {
            if (it.mesh == mesh) {
                return true;
            }
        }
        return false;
    }

    function activate(mesh: Slice9Mesh) {
        if (is_actived(mesh))
            return;
        const tex_atlas = mesh.get_texture();
        mesh.set_material('grass');
        mesh.set_texture(tex_atlas[0], tex_atlas[1]);
        ResourceManager.set_material_uniform_for_mesh(mesh, 'u_frequency', 3);
        ResourceManager.set_material_uniform_for_mesh(mesh, 'u_amplitude', 0);
        active_list.push({ mesh, added: System.now_with_ms(), amlitude: 0 });
    }

    function deactivate(mesh: Slice9Mesh, with_del = true) {
        if (!is_actived(mesh))
            return;
        const tex_atlas = mesh.get_texture();
        mesh.set_material('slice9');
        mesh.set_texture(tex_atlas[0], tex_atlas[1]);
        if (with_del) {
            for (let i = active_list.length - 1; i >= 0; i--) {
                const it = active_list[i];
                if (it.mesh == mesh) {
                    active_list.splice(i, 1);
                    break;
                }
            }
        }
    }





    return { update, activate, deactivate };
}