// Утилиты для работы с материалами

import { CanvasTexture, ShaderMaterial, Texture, Vector2, Vector3, Vector4, IUniform } from "three";
import { deepClone } from "../../modules/utils";
import { Services } from '@editor/core';
import { MaterialUniformType } from "../resource_manager";

export function copy_material(material: ShaderMaterial) {
    const copy = new ShaderMaterial({
        name: material.name,
        vertexShader: material.vertexShader,
        fragmentShader: material.fragmentShader,
        transparent: material.transparent,

        blending: material.blending,

        depthTest: material.depthTest,
        depthWrite: material.depthWrite,
        depthFunc: material.depthFunc,
        stencilWrite: material.stencilWrite,
        stencilRef: material.stencilRef,
        stencilFunc: material.stencilFunc,
        stencilZPass: material.stencilZPass,
        colorWrite: material.colorWrite,

        uniforms: {},
        defines: deepClone(material.defines || {})
    });

    for (const [key, uniform] of Object.entries(material.uniforms)) {
        if (uniform.value instanceof Texture || uniform.value instanceof CanvasTexture) {
            copy.uniforms[key] = { value: uniform.value };
        } else if (
            uniform.value instanceof Vector2 ||
            uniform.value instanceof Vector3 ||
            uniform.value instanceof Vector4
        ) {
            copy.uniforms[key] = { value: uniform.value.clone() };
        } else {
            copy.uniforms[key] = { value: deepClone(uniform.value) };
        }
    }
    return copy;
}

export function updateEachMaterialWhichHasTexture(texture: Texture) {
    const materials = Services.resources.get_all_materials();
    materials.forEach((material) => {
        const material_info = Services.resources.get_material_info(material);
        if (material_info === undefined) return;
        Object.entries(material_info.uniforms).forEach(([uniform_name, uniform]) => {
            const uniformTyped = uniform as { type?: string };
            if (uniformTyped.type === undefined || uniformTyped.type !== MaterialUniformType.SAMPLER2D) return;
            Object.values(material_info.instances).forEach((inst) => {
                if (inst.uniforms[uniform_name] !== undefined && inst.uniforms[uniform_name].value !== null) {
                    if ((inst.uniforms[uniform_name] as IUniform<Texture>).value.uuid !== texture.uuid) return;
                    inst.uniforms[uniform_name].value.needsUpdate = true;
                }
            });
        });
    });
}
