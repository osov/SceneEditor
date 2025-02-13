// todo логика не дописана, тк не проверена поддержка везде DataTexture FloatType(именно он не везде доступен)
import { BufferGeometry, PlaneGeometry, BufferAttribute, Quaternion, DataTexture, RGBAFormat, FloatType, ShaderMaterial, Vector2, Mesh, Color, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const shader = {
    vertexShader: `
        attribute float objectIndex;

        uniform sampler2D dataTexture;
        uniform vec2 textureSize;

        varying vec3 vColor;
        varying vec2 vUv;
        varying vec4 vUvData;

        vec3 applyQuaternionToVector(vec4 q, vec3 v) {
            return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
        }

        void main() {
            //vec2 uv = vec2(objectIndex / textureSize.x, 0.5);
            vUv = uv;

            // Читаем данные из текстуры (все 12 значений)
            vec4 d1 = texelFetch(dataTexture, ivec2(int(objectIndex*3.) + 0, 0), 0);
            vec4 d2 = texelFetch(dataTexture, ivec2(int(objectIndex*3.) + 1, 0), 0);
            vec4 d3 = texelFetch(dataTexture, ivec2(int(objectIndex*3.) + 2, 0), 0);
            
            // x, y, z, qx,    qy, qz, qw, sx,   sy, r, g, b

            vec3 offset = d1.xyz; // x, y, z
            vec4 q = vec4(d1.w, d2.xyz); // qx, qy, qz, qw
            vec2 scale = vec2(d2.w, d3.x); // sx, sy
            vColor = d3.yzw; // r, g, b

            // Применяем масштаб
            vec3 transformed = position * vec3(scale, 1.0);

            // Применяем поворот
           transformed = applyQuaternionToVector(q, transformed);

            // Добавляем позицию
            transformed += offset;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
        }
`,

    fragmentShader: `
    uniform sampler2D u_texture;
    varying vec3 vColor;
    varying vec2 vUv;
    void main() {
         vec4 color = texture2D(u_texture, vUv);
         gl_FragColor = color* vec4(vColor, 1.0);
     }
`
}

export function CreateMergedGemetryPool(count: number) {
    const mesh_data: { position: Vector3, scale: Vector3, size: Vector2, rotation: number, pivot: Vector2, slices_data: Vector2, textures_size: Vector2 }[] = [];
    let current_atlas = '';
    // Создаем массив геометрий
    const geometries: BufferGeometry[] = [];
    const dataArray = new Float32Array(count * 4 * 3); // x, y, z, qx,  qy, qz, qw, sx,  sy, r, g, b

    for (let i = 0; i < count; i++) {
        const clonedGeometry = new PlaneGeometry(1, 1);
        const vertex_count = clonedGeometry.attributes.position.count;
        // Индексы объектов
        const objectIndex = new Float32Array(vertex_count).fill(i);
        clonedGeometry.setAttribute('objectIndex', new BufferAttribute(objectIndex, 1));

        mesh_data.push({
            position: new Vector3(0, 0, 0),
            scale: new Vector3(1, 1, 1),
            size: new Vector2(1, 1),
            pivot: new Vector2(0.5, 0.5),
            rotation: 0,
            slices_data: new Vector2(0, 0),
            textures_size: new Vector2(1, 1),
        });

        geometries.push(clonedGeometry);

        // Заполняем данные в массив
        const offset = i * 12;

        // **Позиция**
        dataArray[offset + 0] = 0; // x
        dataArray[offset + 1] = 0;         // y
        dataArray[offset + 2] = 0;    // z

        // **Кватернион (поворот)**
        const quaternion = new Quaternion();
        dataArray[offset + 3] = quaternion.x;
        dataArray[offset + 4] = quaternion.y;
        dataArray[offset + 5] = quaternion.z;
        dataArray[offset + 6] = quaternion.w;

        // **Масштаб**
        dataArray[offset + 7] = 1;  // sx
        dataArray[offset + 8] = 1;  // sy

        // **Цвет**
        dataArray[offset + 9] =1; // R
        dataArray[offset + 10] = 1; // G
        dataArray[offset + 11] = 1; // B
    }

    // Объединяем геометрии
    const mergedGeometry = mergeGeometries(geometries);

    // **Создаем единую текстуру**
    const dataTexture = new DataTexture(dataArray, count * 3, 1, RGBAFormat, FloatType);
    dataTexture.needsUpdate = true;

    // **Шейдерный материал**
    const material = new ShaderMaterial({
        uniforms: {
            u_texture: { value: null },
            dataTexture: { value: dataTexture },
            textureSize: { value: new Vector2(count * 3, 1) }
        },
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
    });

    // Создаем `Mesh`
    const mesh = new Mesh(mergedGeometry, material);

    function set_atlas(atlas = '') {
        current_atlas = atlas;
        const texture = ResourceManager.get_atlas(atlas);
        material.uniforms['u_texture'].value = texture;
        material.needsUpdate = true;
    }

    function set_texture(index: number, name: string,) {
        const texture_data = ResourceManager.get_texture(name, current_atlas);
        mesh_data[index].textures_size.set(texture_data.size.x, texture_data.size.y);
        //attributes.uvData.setXYZW(index, texture_data.uvOffset.x, texture_data.uvOffset.y, texture_data.uvScale.x, texture_data.uvScale.y);
    }


    function set_position(index: number, pos: Vector3) {
        mesh_data[index].position.copy(pos);
        dataArray[12*index] = pos.x;
        dataArray[12*index + 1] = pos.y;
        dataArray[12*index + 2] = pos.z;
        dataTexture.needsUpdate = true;
    }

    function set_scale(index: number, scale_x: number, scale_y: number) {
        mesh_data[index].scale.set(scale_x, scale_y, 1);
        dataArray[12*index + 7] = scale_x;  // sx
        dataArray[12*index + 8] = scale_y;  // sy
        dataTexture.needsUpdate = true;
        set_size(index, mesh_data[index].size.x, mesh_data[index].size.y);
    }

    function set_size(index: number, size_x: number, size_y: number) {
        if (size_x < 1)
            size_x = 1;
        if (size_y < 1)
            size_y = 1;
        mesh_data[index].size.set(size_x, size_y);
        update_slice(index);
    }

    function set_rotation(index: number, rotation_deg: number) {
        mesh_data[index].rotation = rotation_deg;
    }

    function set_color(index: number, hex_color: string) {
        const color = new Color(hex_color);
    }

    function set_slice(index: number, width: number, height: number) {
        mesh_data[index].slices_data.set(width, height);
        update_slice(index);
    }

    function set_pivot(index: number, x: number, y: number) {
        mesh_data[index].pivot.set(x, y);
    }


    function update_slice(index: number) {
        const width = mesh_data[index].slices_data.x;
        const height = mesh_data[index].slices_data.y;
        if (width > 0 && height > 0) {
            const size_x = mesh_data[index].size.x;
            const size_y = mesh_data[index].size.y;
            const u_dimensions_x = width / size_x;
            const u_dimensions_y = height / size_y;
            const u_border_x = width / mesh_data[index].textures_size.x;
            const u_border_y = height / mesh_data[index].textures_size.y;
            //attributes.sliceData.setXYZW(index, u_dimensions_x, u_dimensions_y, u_border_x, u_border_y);
            if (!mesh.material.defines['USE_SLICE']) {
                mesh.material.defines['USE_SLICE'] = '';
                mesh.material.needsUpdate = true;
            }
        }
        else {
            if (mesh.material.defines['USE_SLICE']) {
                delete mesh.material.defines['USE_SLICE'];
                mesh.material.needsUpdate = true;
            }
        }
    }
    return { mesh, set_atlas, set_texture, set_position, set_scale, set_size, set_rotation, set_color, set_slice, set_pivot };
}