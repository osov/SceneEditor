import { Color, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3 } from "three";

export const texture_shader = {
    vertexShader: `
    attribute vec4 instanceUv; 
    attribute vec3 instanceColor;  
    attribute vec3 instanceOffset;  
    attribute vec2 instanceSize;     
    attribute float instanceRotation; 
    attribute vec2 instancePivot; 

    varying vec2 vUv;
    varying vec4 vUvData;
    varying vec3 vColor;

    void main() {
        vUv = uv;
        vUvData = instanceUv;
        vColor = instanceColor;
        vec3 pivotAdjustedPosition = position - vec3(instancePivot - vec2(0.5, 0.5), 0.0);
        vec3 scaledPosition = pivotAdjustedPosition * vec3(instanceSize, 1.0);
        
        // Поворот (если нужно)
        float cosA = cos(instanceRotation);
        float sinA = sin(instanceRotation);
        mat2 rotMat = mat2(cosA, -sinA, sinA, cosA);
        scaledPosition.xy = rotMat * scaledPosition.xy;
    
        vec3 newPosition = scaledPosition + instanceOffset;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0 );
    }  
    `,

    fragmentShader: `
    varying vec2 vUv;
    varying vec3 vColor;
    varying vec4 vUvData;

    uniform sampler2D u_texture;
    void main() {

        vec2 newUV = vUvData.xy + vUv * vUvData.zw;
        gl_FragColor = texture2D(u_texture, newUV) * vec4(vColor, 1.);
    }
    `
};

export const slice9_shader = {
    vertexShader: `
    attribute vec4 instanceUv; 
    attribute vec3 instanceColor;  
    attribute vec3 instanceOffset;  
    attribute vec2 instanceSize;     
    attribute float instanceRotation; 
    attribute vec2 instancePivot; 
    attribute vec4 instanceSliceData; 

    varying vec2 vUv;
    varying vec4 vUvData;
    varying vec3 vColor;
    varying vec4 vSliceData;

    void main() {
        vUv = uv;
        vUvData = instanceUv;
        vColor = instanceColor;
        vSliceData = instanceSliceData;
        vec3 pivotAdjustedPosition = position - vec3(instancePivot - vec2(0.5, 0.5), 0.0);
        vec3 scaledPosition = pivotAdjustedPosition * vec3(instanceSize, 1.0);
        
        // Поворот (если нужно)
        float cosA = cos(instanceRotation);
        float sinA = sin(instanceRotation);
        mat2 rotMat = mat2(cosA, -sinA, sinA, cosA);
        scaledPosition.xy = rotMat * scaledPosition.xy;
    
        vec3 newPosition = scaledPosition + instanceOffset;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0 );
    }  
    `,

    fragmentShader: `
    varying vec2 vUv;
    varying vec3 vColor;
    varying vec4 vUvData;
    varying vec4 vSliceData;

    uniform sampler2D u_texture;

    float map(float value, float originalMin, float originalMax, float newMin, float newMax) {
        return (value - originalMin) / (originalMax - originalMin) * (newMax - newMin) + newMin;
    }

    float processAxis(float coord, float texBorder, float winBorder) {
        return (coord < winBorder) ? map(coord, 0.0, winBorder, 0.0, texBorder) :
            (coord > (1.0 - winBorder)) ? map(coord, 1.0 - winBorder, 1.0, 1.0 - texBorder, 1.0) :
            map(coord, winBorder, 1.0 - winBorder, texBorder, 1.0 - texBorder);
    }

    void main() {
        vec2 newUV = vec2(
            processAxis(vUv.x, vSliceData.z, vSliceData.x),
            processAxis(vUv.y, vSliceData.w, vSliceData.y)
        );
        newUV = vUvData.xy + newUV * vUvData.zw;
        gl_FragColor = texture2D(u_texture, newUV) * vec4(vColor, 1.);
    }
    `
};

export function CreateInstanceBufferPool(count: number) {
    let current_atlas = '';
    const textures_size: Vector2[] = [];
    const slices_data: Vector2[] = [];
    const baseGeometry = new PlaneGeometry(1, 1);
    const instancedGeometry = new InstancedBufferGeometry();
    instancedGeometry.setAttribute("position", baseGeometry.getAttribute("position"));
    instancedGeometry.setAttribute("uv", baseGeometry.getAttribute("uv"));
    instancedGeometry.setIndex(baseGeometry.getIndex()); // Копируем индексы вершин


    // Создаем буферы для инстанс-атрибутов
    const offsets = new Float32Array(count * 3);
    const uv_data = new Float32Array(count * 4); // uv
    const sizes = new Float32Array(count * 2); // Размеры (ширина, высота)
    const rotations = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const slice_data = new Float32Array(count * 4);
    const pivots = new Float32Array(count * 2);
    // Заполняем буферы данными
    for (let i = 0; i < count; i++) {
        offsets[i * 3] = 0;
        offsets[i * 3 + 1] = 0;
        offsets[i * 3 + 2] = 0;

        sizes[i * 2] = 1;
        sizes[i * 2 + 1] = 1;

        textures_size.push(new Vector2(1, 1));
        slices_data.push(new Vector2(0, 0));

        rotations[i] = 0;

        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;

        uv_data[i * 4] = 0;
        uv_data[i * 4 + 1] = 0;
        uv_data[i * 4 + 2] = 1;
        uv_data[i * 4 + 3] = 1;

        slice_data[i * 4] = 0;
        slice_data[i * 4 + 1] = 0;
        slice_data[i * 4 + 2] = 1;
        slice_data[i * 4 + 3] = 1;

        pivots[i * 2] = 0;
        pivots[i * 2 + 1] = 0;
    }

    // Добавляем атрибуты в `InstancedBufferGeometry`
    instancedGeometry.setAttribute("instanceSliceData", new InstancedBufferAttribute(slice_data, 4));
    instancedGeometry.setAttribute("instanceUv", new InstancedBufferAttribute(uv_data, 4));
    instancedGeometry.setAttribute("instanceOffset", new InstancedBufferAttribute(offsets, 3));
    instancedGeometry.setAttribute("instanceSize", new InstancedBufferAttribute(sizes, 2));
    instancedGeometry.setAttribute("instanceRotation", new InstancedBufferAttribute(rotations, 1));
    instancedGeometry.setAttribute("instanceColor", new InstancedBufferAttribute(colors, 3));
    instancedGeometry.setAttribute("instancePivot", new InstancedBufferAttribute(pivots, 2));

    // Создаем `ShaderMaterial`
    const material = new ShaderMaterial({
        vertexShader: texture_shader.vertexShader,
        fragmentShader: texture_shader.fragmentShader,
        transparent: true,
        depthTest: false,
        uniforms: { u_texture: { value: null } }
    });

    // Создаем `Mesh`
    const mesh = new Mesh(instancedGeometry, material);
    mesh.frustumCulled = false;

    function set_atlas(atlas = '') {
        current_atlas = atlas;
       
        const texture = ResourceManager.get_atlas(atlas);
        material.uniforms['u_texture'].value = texture;
        material.needsUpdate = true;
    }

    function set_texture(index: number, name: string,) {
        const texture_data = ResourceManager.get_texture(name, current_atlas);
        textures_size[index].set(texture_data.size.x, texture_data.size.y);
        instancedGeometry.getAttribute("instanceUv").setXYZW(index, texture_data.uvOffset.x, texture_data.uvOffset.y, texture_data.uvScale.x, texture_data.uvScale.y);
        instancedGeometry.getAttribute("instanceUv").needsUpdate = true;
    }

    function set_position(index: number, pos: Vector3, need_update = true) {
        instancedGeometry.getAttribute('instanceOffset').setXYZ(index, pos.x, pos.y, pos.z);
        if (need_update)
            instancedGeometry.getAttribute('instanceOffset').needsUpdate = true;
    }

    function set_size(index: number, size_x: number, size_y: number, need_update = true) {
        instancedGeometry.getAttribute('instanceSize').setXY(index, size_x, size_y);
        update_slice(index);
        if (need_update)
            instancedGeometry.getAttribute('instanceSize').needsUpdate = true;
    }

    function set_color(index: number, hex_color: string, need_update = true) {
        const color = new Color(hex_color);
        instancedGeometry.getAttribute('instanceColor').setXYZ(index, color.r, color.g, color.b);
        if (need_update)
            instancedGeometry.getAttribute('instanceColor').needsUpdate = true;
    }

    function set_rotation(index: number, rotation_deg: number, need_update = true) {
        instancedGeometry.getAttribute('instanceRotation').setX(index, rotation_deg * Math.PI / 180);
        if (need_update)
            instancedGeometry.getAttribute('instanceRotation').needsUpdate = true;
    }

    function set_slice(index: number, width: number, height: number) {
        slices_data[index].set(width, height);
        let fp = '';
        let vp = '';
        if (width > 0 || height > 0){
            fp = slice9_shader.fragmentShader;
            vp = slice9_shader.vertexShader;
        }
        else {
            fp = texture_shader.fragmentShader;
            vp = texture_shader.vertexShader;
        }
        if (material.fragmentShader != fp || material.vertexShader != vp) {
            material.fragmentShader = fp;
            material.vertexShader = vp;
            material.needsUpdate = true;
        }
        update_slice(index);
    }

    function update_slice(index: number) {
        const width = slices_data[index].x;
        const height = slices_data[index].y;
        const size_x = instancedGeometry.getAttribute('instanceSize').getX(index);
        const size_y = instancedGeometry.getAttribute('instanceSize').getY(index);
        const u_dimensions_x = width / size_x;
        const u_dimensions_y = height / size_y;
        const u_border_x = width / textures_size[index].x;
        const u_border_y = height / textures_size[index].y;
        instancedGeometry.getAttribute('instanceSliceData').setXYZW(index, u_dimensions_x, u_dimensions_y, u_border_x, u_border_y);
        instancedGeometry.getAttribute('instanceSliceData').needsUpdate = true;
    }

    return { mesh, set_atlas, set_texture, set_position, set_size, set_color, set_rotation, set_slice };

}