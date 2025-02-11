import { BufferGeometry, ShaderMaterial, Points, BufferAttribute, Vector3, Color, InterleavedBufferAttribute } from "three";

export const shader = {
    vertexShader: `
    attribute vec2 uvOffset; // Смещение внутри атласа
    attribute vec2 uvScale;  // Размер текстуры в атласе
    attribute vec3 color;     // Цвет частицы
    attribute float size;     // Размер частицы
    attribute float rotation; // Поворот частицы

    varying vec4 vUv;
    varying vec3 vColor;
    varying float vRotation; 

    void main() {
        vUv = vec4(uvOffset.xy, uvScale.xy); ;
        vColor = color;
        vRotation = rotation; // Передаем поворот
        gl_PointSize = size; 
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }  
    `,

    fragmentShader: `
    uniform sampler2D u_texture;
    varying vec4 vUv;
    varying vec3 vColor;
    varying float vRotation; 

    vec2 rotateUV(vec2 uv, float angle) {
        float cosA = cos(angle);
        float sinA = sin(angle);
        uv -= vec2(0.5); // Центрируем координаты
        uv = mat2(cosA, -sinA, sinA, cosA) * uv; // Применяем матрицу поворота
        uv += vec2(0.5); // Возвращаем обратно
        return uv;
    }

    void main() {
        vec2 uv = gl_PointCoord; // Используем координаты внутри частицы
        uv = rotateUV(uv, vRotation); // Применяем поворот
        uv = vUv.xy + vUv.zw * uv; // Корректируем с учетом атласа
        vec4 texColor = texture2D(u_texture, uv);
        if (texColor.a < 0.1) discard; // Убираем прозрачные пиксели
        gl_FragColor = texColor * vec4(vColor, 1.0);
    }
    `
};


export function CreateParticlesPool(particleCount: number) {
    let attributes: { [key: string]: BufferAttribute | InterleavedBufferAttribute };
    let current_atlas = '';
    // Геометрия частиц
    const particles = new BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const uvOffsets = new Float32Array(particleCount * 2);
    const uvScales = new Float32Array(particleCount * 2);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const rotations = new Float32Array(particleCount);

    // Заполняем начальные данные
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;

        uvOffsets[i * 2] = 0;
        uvOffsets[i * 2 + 1] = 0;

        uvScales[i * 2] = 1;
        uvScales[i * 2 + 1] = 1;

        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;

        sizes[i] = 32.0;
        rotations[i] = 0;
    }

    // Добавляем атрибуты в геометрию
    particles.setAttribute("position", new BufferAttribute(positions, 3));
    particles.setAttribute("uvOffset", new BufferAttribute(uvOffsets, 2));
    particles.setAttribute("uvScale", new BufferAttribute(uvScales, 2));
    particles.setAttribute("color", new BufferAttribute(colors, 3));
    particles.setAttribute("size", new BufferAttribute(sizes, 1));
    particles.setAttribute("rotation", new BufferAttribute(rotations, 1));

    attributes = {
        position: particles.getAttribute("position"),
        uvOffset: particles.getAttribute("uvOffset"),
        uvScale: particles.getAttribute("uvScale"),
        color: particles.getAttribute("color"),
        size: particles.getAttribute("size"),
        rotation: particles.getAttribute("rotation"),
    };

    // Создаем материал с шейдерами
    const material = new ShaderMaterial({
        uniforms: { u_texture: { value: null } },
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
        //  transparent: true,
        depthTest: false,
    });
    const mesh = new Points(particles, material);

    function set_atlas(atlas = '') {
        current_atlas = atlas;
        const texture = ResourceManager.get_atlas( atlas);
        material.uniforms['u_texture'].value = texture;
        material.needsUpdate = true;
    }

    function set_texture(index: number, name: string,) {
        const texture_data = ResourceManager.get_texture(name, current_atlas);
        attributes.uvOffset.setXY(index, texture_data.uvOffset.x, texture_data.uvOffset.y);
        attributes.uvScale.setXY(index, texture_data.uvScale.x, texture_data.uvScale.y);
        attributes.uvOffset.needsUpdate = true;
        attributes.uvScale.needsUpdate = true;
    }

    function set_position(index: number, pos: Vector3, need_update = true) {
        attributes.position.setXYZ(index, pos.x, pos.y, pos.z);
        if (need_update)
            attributes.position.needsUpdate = true;
    }

    function set_size(index: number, size: number, need_update = true) {
        attributes.size.setX(index, size);
        if (need_update)
            attributes.size.needsUpdate = true;
    }

    function set_color(index: number, hex_color: string, need_update = true) {
        const color = new Color(hex_color);
        attributes.color.setXYZ(index, color.r, color.g, color.b);
        if (need_update)
            attributes.color.needsUpdate = true;
    }

    function set_rotation(index: number, rotation_deg: number, need_update = true) {
        attributes.rotation.setX(index, rotation_deg * Math.PI / 180);
        if (need_update)
            attributes.rotation.needsUpdate = true;
    }


    function updates() {
        mesh.geometry.attributes.position.needsUpdate = true;
    }

    return { mesh, set_atlas, set_texture, set_position, set_size, set_color, set_rotation, updates };
}