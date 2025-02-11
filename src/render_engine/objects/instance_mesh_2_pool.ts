// https://github.com/agargaro/instanced-mesh/tree/master
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import { ShaderMaterial, BufferAttribute, Vector3, Color, InterleavedBufferAttribute, PlaneGeometry, Vector2, Object3D, Matrix4, InstancedBufferAttribute } from "three";

export const texture_shader = {
vertexShader: `
    #include <instanced_pars_vertex>

    attribute vec3 instanceColor; 
    attribute vec4 uvData; 

    varying vec2 vUv;
    varying vec4 vUvData;
    #include <color_pars_vertex>

    void main() {
        #include <instanced_color_vertex>
        #include <instanced_vertex>

        vUv = uv; 
        vUvData = uvData;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    }  
`,

fragmentShader: `
    varying vec2 vUv;
    varying vec4 vUvData;
    #include <color_pars_fragment>
    uniform sampler2D u_texture;
    void main(void) {
        vec2 newUV = vUvData.xy + vUv * vUvData.zw;
        vec4 color = texture2D(u_texture, newUV);
        if (color.a < 0.5) discard; 
        gl_FragColor = color * vec4(vColor, 1.);
    }
`
}





export const slice9_shader = {
vertexShader: `
    #include <instanced_pars_vertex>
    attribute vec4 uvData; 
    attribute vec4 sliceData; 

    varying vec2 vUv;
    varying vec4 vUvData;
    varying vec4 vSliceData; 
    #include <color_pars_vertex>

    void main() {
       #include <instanced_color_vertex>
       #include <instanced_vertex>
       vUv = uv; 
       vUvData = uvData;
       vSliceData = sliceData;
       gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position,1.0);
    }  
    `,

fragmentShader: `
    varying vec2 vUv;
    varying vec4 vUvData;
    varying vec4 vSliceData; 
    #include <color_pars_fragment>
    uniform sampler2D u_texture;

    float map(float value, float originalMin, float originalMax, float newMin, float newMax) {
        return (value - originalMin) / (originalMax - originalMin) * (newMax - newMin) + newMin;
    }

    float processAxis(float coord, float texBorder, float winBorder) {
        return (coord < winBorder) ? map(coord, 0.0, winBorder, 0.0, texBorder) :
            (coord > (1.0 - winBorder)) ? map(coord, 1.0 - winBorder, 1.0, 1.0 - texBorder, 1.0) :
            map(coord, winBorder, 1.0 - winBorder, texBorder, 1.0 - texBorder);
    }


    void main(void) {
        vec2 newUV = vec2(
            processAxis(vUv.x, vSliceData.z, vSliceData.x),
            processAxis(vUv.y, vSliceData.w, vSliceData.y)
        );
        newUV = vUvData.xy + newUV * vUvData.zw;
        vec4 color = texture2D(u_texture, newUV);
        if (color.a < 0.5) discard; 
        gl_FragColor = color * vec4(vColor, 1.);
    }`
};


export function CreateInstanceMesh2Pool(count: number, is_slice_9 = true) {
    let attributes: { [key: string]: BufferAttribute | InterleavedBufferAttribute };
    let current_atlas = '';
    const textures_size: Vector2[] = [];
    const slices_data: Vector2[] = [];
    const size_data: Vector2[] = [];
    const geometry = new PlaneGeometry(1, 1);
    const uvData = new Float32Array(count * 4);
    const slice_data = new Float32Array(count * 4);


    for (let i = 0; i < count; i++) {
        uvData[i * 4] = 0;
        uvData[i * 4 + 1] = 0;
        uvData[i * 4 + 2] = 1;
        uvData[i * 4 + 3] = 1;
        slice_data[i * 4] = 0;
        slice_data[i * 4 + 1] = 0;
        slice_data[i * 4 + 2] = 1;
        slice_data[i * 4 + 3] = 1;
        textures_size.push(new Vector2(1, 1));
        slices_data.push(new Vector2(0, 0));
        size_data.push(new Vector2(1, 1));
    }
    geometry.setAttribute("uvData", new InstancedBufferAttribute(uvData, 4));
    geometry.setAttribute("sliceData", new InstancedBufferAttribute(slice_data, 4));
    attributes = {
        uvData: geometry.getAttribute("uvData"),
        sliceData: geometry.getAttribute("sliceData"),
    };

    // Создаем материал с шейдерами
    const material = new ShaderMaterial({
        uniforms: { u_texture: { value: null } },
        vertexShader: is_slice_9 ? slice9_shader.vertexShader : texture_shader.vertexShader,
        fragmentShader: is_slice_9 ? slice9_shader.fragmentShader : texture_shader.fragmentShader,
        transparent: true,
    });
    const mesh = new InstancedMesh2(geometry, material, { createEntities: !true, capacity: count });
    mesh.addInstances(count, (e) => { });
    mesh.perObjectFrustumCulled = false; // иначе при сортировке(обрезка видимости атрибуты назначаются чужим элементам и они неправильные)

    const clr = new Color(1, 1, 1);
    for (let i = 0; i < count; i++)
        mesh.setColorAt(i, clr);

    const dummy = new Object3D();

    function set_atlas(atlas = '') {
        current_atlas = atlas;
        const texture = ResourceManager.get_atlas(atlas);
        material.uniforms['u_texture'].value = texture;
        material.needsUpdate = true;
    }

    function set_texture(index: number, name: string,) {
        const texture_data = ResourceManager.get_texture(name, current_atlas);
        textures_size[index].set(texture_data.size.x, texture_data.size.y);
        attributes.uvData.setXYZW(index, texture_data.uvOffset.x, texture_data.uvOffset.y, texture_data.uvScale.x, texture_data.uvScale.y);
        attributes.uvData.needsUpdate = true;
    }

    function set_position(index: number, pos: Vector3) {
        const mtx4 = new Matrix4();
        mesh.getMatrixAt(index, mtx4);
        dummy.position.copy(pos);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
    }

    function set_size(index: number, size_x: number, size_y: number) {
        size_data[index].set(size_x, size_y);
        const mtx4 = new Matrix4();
        mesh.getMatrixAt(index, mtx4);
        dummy.scale.set(size_x, size_y, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        update_slice(index);
    }

    function set_color(index: number, hex_color: string) {
        const color = new Color(hex_color);
        mesh.setColorAt(index, color);
    }

    function set_rotation(index: number, rotation_deg: number) {
        const mtx4 = new Matrix4();
        mesh.getMatrixAt(index, mtx4);
        dummy.rotation.z = rotation_deg * Math.PI / 180;
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
    }

    function set_slice(index: number, width: number, height: number) {
        slices_data[index].set(width, height);
        update_slice(index);
    }

    function update_slice(index: number) {
        const width = slices_data[index].x;
        const height = slices_data[index].y;
        const size_x = size_data[index].x;
        const size_y = size_data[index].y;
        const u_dimensions_x = width / size_x;
        const u_dimensions_y = height / size_y;
        const u_border_x = width / textures_size[index].x;
        const u_border_y = height / textures_size[index].y;
        attributes.sliceData.setXYZW(index, u_dimensions_x, u_dimensions_y, u_border_x, u_border_y);
        attributes.sliceData.needsUpdate = true;
    }

    return { mesh, set_atlas, set_texture, set_position, set_size, set_color, set_rotation, set_slice };
}