// https://github.com/agargaro/instanced-mesh/tree/master
// todo используется хак двойного размера для того чтобы BB считались верно при разном Pivot, а в шейдере уменьшаю размер в 2 раза 
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import { ShaderMaterial, Vector3, Color, PlaneGeometry, Vector2, Object3D, Vector4 } from "three";


export const slice9_shader = {
    vertexShader: `
    #include <instanced_pars_vertex>
    varying vec2 vUv;
    varying vec4 vUvData;
#ifdef USE_SLICE
    varying vec4 vSliceData; 
#endif
    #include <color_pars_vertex>

    void main() {
       #include <instanced_color_vertex>
       #include <instanced_vertex>
       vUv = uv; 
       vUvData = uvData;
#ifdef USE_SLICE
       vSliceData = sliceData;
#endif
       vec3 localPosition = position / vec3(vec2(2.), 1.0);
       vec4 offset = vec4(size_xy * (pivot - vec2(0.5, 0.5)), 0., 0.);
       gl_Position = projectionMatrix * modelViewMatrix * (instanceMatrix * vec4(localPosition,1.0) - offset);
    }  
    `,

    fragmentShader: `
    varying vec2 vUv;
    varying vec4 vUvData;
#ifdef USE_SLICE
    varying vec4 vSliceData; 
#endif
    #include <color_pars_fragment>
    uniform sampler2D u_texture;

#ifdef USE_SLICE
    float map(float value, float originalMin, float originalMax, float newMin, float newMax) {
        return (value - originalMin) / (originalMax - originalMin) * (newMax - newMin) + newMin;
    }

    float processAxis(float coord, float texBorder, float winBorder) {
        return (coord < winBorder) ? map(coord, 0.0, winBorder, 0.0, texBorder) :
            (coord > (1.0 - winBorder)) ? map(coord, 1.0 - winBorder, 1.0, 1.0 - texBorder, 1.0) :
            map(coord, winBorder, 1.0 - winBorder, texBorder, 1.0 - texBorder);
    }
#endif

    void main(void) {
#ifdef USE_SLICE
        vec2 newUV = vec2(
            processAxis(vUv.x, vSliceData.z, vSliceData.x),
            processAxis(vUv.y, vSliceData.w, vSliceData.y)
        );
#else
        vec2 newUV = vUv;
#endif
        newUV = vUvData.xy + newUV * vUvData.zw;
        vec4 color = texture2D(u_texture, newUV);
      //  if (color.a < 0.5) discard; 
        gl_FragColor = color * vec4(vColor, 1.);
    }`
};

const Z_AXIS = new Vector3(0, 0, 1);
const tmp_vec3 = new Vector3();

export function CreateInstanceMesh2Pool(count: number) {
    let current_atlas = '';
    const mesh_data: {
        position: Vector3,
        scale: Vector3,
        rotation: number,
        size: Vector2,
        pivot: Vector2,
        textures_size: Vector2,
        slice: Vector2,
        color: string,
        texture: string
    }[] = [];
    const geometry = new PlaneGeometry(2, 2);


    for (let i = 0; i < count; i++) {
        mesh_data.push({
            position: new Vector3(0, 0, 0),
            scale: new Vector3(1, 1, 1),
            rotation: 0,
            size: new Vector2(1, 1),
            pivot: new Vector2(0.5, 0.5),
            textures_size: new Vector2(1, 1),
            slice: new Vector2(0, 0),
            color: '#fff',
            texture: '',
        });
    }


    // Создаем материал с шейдерами
    const material = new ShaderMaterial({
        uniforms: { u_texture: { value: null } },
        vertexShader: slice9_shader.vertexShader,
        fragmentShader: slice9_shader.fragmentShader,
        transparent: true,
        defines: { USE_SLICE: '' }
    });
    const mesh = new InstancedMesh2(geometry, material, { createEntities: !true, capacity: count });
    mesh.initUniformsPerInstance({ vertex: { uvData: 'vec4', sliceData: 'vec4', pivot: 'vec2', size_xy: 'vec2' } });

    mesh.addInstances(count, (e) => { });

    for (let i = 0; i < count; i++) {
        mesh.setColorAt(i, new Color(mesh_data[0].color));
        set_pivot(i, mesh_data[0].pivot.x, mesh_data[0].pivot.y);
    }

    const dummy = new Object3D();

    function set_atlas(atlas = '') {
        current_atlas = atlas;
        const texture = ResourceManager.get_atlas(atlas);
        material.uniforms['u_texture'].value = texture;
        material.needsUpdate = true;
    }

    function set_texture(index: number, name: string) {
        const texture_data = ResourceManager.get_texture(name, current_atlas);
        mesh_data[index].textures_size.set(texture_data.size.x, texture_data.size.y);
        mesh_data[index].texture = name;
        mesh.setUniformAt(index, 'uvData', new Vector4(texture_data.uvOffset.x, texture_data.uvOffset.y, texture_data.uvScale.x, texture_data.uvScale.y));
    }

    function make_matrix(index: number) {
        dummy.setRotationFromAxisAngle(Z_AXIS, mesh_data[index].rotation * Math.PI / 180);
        tmp_vec3.copy(mesh_data[index].scale);
        tmp_vec3.x *= mesh_data[index].size.x;
        tmp_vec3.y *= mesh_data[index].size.y;
        dummy.scale.copy(tmp_vec3);
        dummy.position.copy(mesh_data[index].position);
        dummy.updateMatrix();
        return dummy.matrix;
    }

    function set_pivot(index: number, x: number, y: number) {
        mesh_data[index].pivot.set(x, y);
        mesh.setUniformAt(index, 'pivot', new Vector2(x, y));
    }

    function set_position(index: number, pos: Vector3) {
        mesh_data[index].position.copy(pos);
        mesh.setMatrixAt(index, make_matrix(index));
        mesh.computeBoundingSphere()
    }

    function set_scale(index: number, scale_x: number, scale_y: number) {
        mesh_data[index].scale.set(scale_x, scale_y, 1);
        mesh.setMatrixAt(index, make_matrix(index));
        set_size(index, mesh_data[index].size.x, mesh_data[index].size.y);
        mesh.setUniformAt(index, 'size_xy', new Vector2(mesh_data[index].scale.x * mesh_data[index].size.x, mesh_data[index].scale.y * mesh_data[index].size.y));
        mesh.computeBoundingSphere()
    }

    function set_size(index: number, size_x: number, size_y: number) {
        //set_scale(index, size_x, size_y);
        if (size_x < 1)
            size_x = 1;
        if (size_y < 1)
            size_y = 1;
        mesh_data[index].size.set(size_x, size_y);
        mesh.setMatrixAt(index, make_matrix(index));
        mesh.setUniformAt(index, 'size_xy', new Vector2(mesh_data[index].scale.x * mesh_data[index].size.x, mesh_data[index].scale.y * mesh_data[index].size.y));
       // mesh.setUniformAt(index, 'size_xy', new Vector2(size_x, size_y));
        update_slice(index);
        mesh.computeBoundingSphere()
    }

    function set_rotation(index: number, rotation_deg: number) {
        mesh_data[index].rotation = rotation_deg;
        mesh.setMatrixAt(index, make_matrix(index));
    }

    function set_color(index: number, hex_color: string) {
        const color = new Color(hex_color);
        mesh.setColorAt(index, color);
    }

    function set_slice(index: number, width: number, height: number) {
        mesh_data[index].slice.set(width, height);
        update_slice(index);
    }

    function update_slice(index: number) {
        const m = mesh_data[index];
        const width = m.slice.x;
        const height = m.slice.y;
        const size_x = m.size.x;
        const size_y = m.size.y;
        const u_dimensions_x = width / size_x;
        const u_dimensions_y = height / size_y;
        const u_border_x = width / m.textures_size.x;
        const u_border_y = height / m.textures_size.y;
        mesh.setUniformAt(index, 'sliceData', new Vector4(u_dimensions_x, u_dimensions_y, u_border_x, u_border_y));
    }

    return { mesh, set_atlas, set_texture, set_position, set_size, set_color, set_rotation, set_slice , set_scale};
}