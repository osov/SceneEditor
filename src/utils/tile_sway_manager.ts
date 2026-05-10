import { Slice9Mesh } from "../render_engine/objects/slice9";
import { is_base_mesh } from "../render_engine/helpers/utils";
import { ShaderMaterial } from "three";

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
    linked: LinkedSwayItem[];
}

interface LinkedSwayItem {
    mesh: Slice9Mesh;
    original_material: ShaderMaterial;
    sway_material: ShaderMaterial;
}

const LINKED_SWAY_VERTEX_SHADER = `
attribute vec4 uvData;
attribute vec3 color;

#ifdef USE_SLICE
attribute vec4 sliceData;
varying vec4 vSliceData;
#endif

uniform float u_time;
uniform float u_amplitude;
uniform float u_frequency;
uniform float u_inv_strength;
varying vec2 vUv;
varying vec4 vUvData;
varying vec3 vColor;

void main() {
    vColor = color;
    vUv = uv;
    vUvData = uvData;

#ifdef USE_SLICE
    vSliceData = sliceData;
#endif

    float strength = abs(smoothstep(0.0, 1.0, vUv.y) - u_inv_strength);
    float amplitude = u_amplitude * strength;
    float phaseOffset = vUv.x + vUv.y;

    float offsetX = sin(u_time * u_frequency + phaseOffset * 1.0) * amplitude;
    float offsetY = sin(u_time * u_frequency + phaseOffset * 2.0) * amplitude * 0.3;
    float tilt = sin(u_time * 0.3 + position.y * 5.0) * 0.1;

    vec3 newPosition = position;
    newPosition += vec3(offsetX + tilt, offsetY, 0.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

function resolve_linked_slice9(mesh: Slice9Mesh) {
    const links = Array.isArray(mesh.userData.linked_objects) ? mesh.userData.linked_objects : [];
    const result: Slice9Mesh[] = [];

    for (const link of links) {
        let linked_mesh: any = null;
        const id_by_url = link.url ? SceneManager.get_mesh_id_by_url(link.url) : undefined;
        if (id_by_url != undefined)
            linked_mesh = SceneManager.get_mesh_by_id(id_by_url);
        if (!linked_mesh && link.id != undefined)
            linked_mesh = SceneManager.get_mesh_by_id(link.id);

        if (linked_mesh instanceof Slice9Mesh && is_base_mesh(linked_mesh))
            result.push(linked_mesh);
    }

    return result;
}

export function createTileSwayManager(cfg: TileSwayManagerConfig) {
    const frequency = cfg.frequency ?? 3;
    const speed = cfg.speed ?? 5;
    const max_amplitude = cfg.max_amplitude ?? 1;
    const effect_time = cfg.effect_time ?? 1.0;
    const active_map = new Map<Slice9Mesh, SwayItem>();

    function get_shader_time(mesh: Slice9Mesh) {
        const uniform = mesh.material?.uniforms?.u_time;
        return typeof uniform?.value == 'number' ? uniform.value : System.now_with_ms();
    }

    function apply_linked_sway(it: SwayItem) {
        const time = get_shader_time(it.mesh);
        for (const linked of it.linked) {
            linked.sway_material.uniforms.u_time.value = time;
            linked.sway_material.uniforms.u_frequency.value = frequency;
            linked.sway_material.uniforms.u_amplitude.value = it.amplitude;
            linked.sway_material.uniforms.u_inv_strength.value = 0;
        }
    }

    function restore_linked_sway(it: SwayItem) {
        for (const linked of it.linked) {
            linked.mesh.material = linked.original_material;
            linked.sway_material.dispose();
        }
    }

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
                apply_linked_sway(it);
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
                apply_linked_sway(it);
            }
        }
        for (const mesh of to_remove) {
            const item = active_map.get(mesh);
            if (item)
                restore_linked_sway(item);
            deactivate(mesh, false);
            active_map.delete(mesh);
        }
    }

    function is_active(mesh: Slice9Mesh) {
        return active_map.has(mesh);
    }

    function activate_one(mesh: Slice9Mesh, added: number, linked: Slice9Mesh[] = []) {
        if (active_map.has(mesh))
            return;
        const tex_atlas = mesh.get_texture();
        const saved_alpha = mesh.get_alpha();
        mesh.set_material(cfg.material);
        mesh.set_texture(tex_atlas[0], tex_atlas[1]);
        mesh.set_alpha(saved_alpha);
        ResourceManager.set_material_uniform_for_mesh(mesh, 'u_frequency', frequency);
        ResourceManager.set_material_uniform_for_mesh(mesh, 'u_amplitude', 0);
        active_map.set(mesh, {
            mesh,
            added,
            amplitude: 0,
            saved_alpha,
            linked: linked.map(item => {
                const original_material = item.material as ShaderMaterial;
                const sway_material = original_material.clone();
                sway_material.vertexShader = LINKED_SWAY_VERTEX_SHADER;
                sway_material.uniforms.u_time = { value: get_shader_time(mesh) };
                sway_material.uniforms.u_frequency = { value: frequency };
                sway_material.uniforms.u_amplitude = { value: 0 };
                sway_material.uniforms.u_inv_strength = { value: 0 };
                sway_material.needsUpdate = true;
                item.material = sway_material;
                return { mesh: item, original_material, sway_material };
            })
        });
    }

    function activate(mesh: Slice9Mesh) {
        const added = System.now_with_ms();
        const linked = Array.from(new Set(resolve_linked_slice9(mesh)))
            .filter(item => item !== mesh);

        activate_one(mesh, added, linked);
    }

    function deactivate(mesh: Slice9Mesh, with_del = true) {
        const item = active_map.get(mesh);
        if (!item)
            return;
        restore_linked_sway(item);
        const tex_atlas = mesh.get_texture();
        mesh.set_material('slice9');
        mesh.set_texture(tex_atlas[0], tex_atlas[1]);
        mesh.set_alpha(item.saved_alpha);
        if (with_del)
            active_map.delete(mesh);
    }

    return { update, activate, deactivate };
}
