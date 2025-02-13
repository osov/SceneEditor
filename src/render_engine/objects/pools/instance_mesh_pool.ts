import { ShaderMaterial, BufferAttribute, Vector3, Color, InterleavedBufferAttribute, InstancedMesh, PlaneGeometry, Vector2, Object3D, InstancedBufferAttribute, Matrix4, Quaternion, Euler } from "three";

const shader = {
    vertexShader: `
        attribute vec4 uvData; 
        attribute vec2 instancePivot; 
        attribute vec2 instanceSize; 

#ifdef USE_SLICE
        attribute vec4 sliceData; 
        varying vec4 vSliceData; 
#endif
        varying vec2 vUv;
        varying vec4 vUvData;
        varying vec3 vColor; 

     void main() {
        vUv = uv; 
        vUvData = uvData;
#ifdef USE_SLICE
        vSliceData = sliceData;
#endif
        vColor = instanceColor;
        vec3 pivotAdjustedPosition = position - vec3(instancePivot - vec2(0.5, 0.5), 0.0);
        vec3 localPosition = pivotAdjustedPosition * vec3(instanceSize, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(localPosition, 1.);
    }  
    `,

    fragmentShader: `
      uniform sampler2D u_texture;
      varying vec2 vUv;
      varying vec4 vUvData;
      varying vec3 vColor;
#ifdef USE_SLICE 
      varying vec4 vSliceData; 
       
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
          //if (color.a < 0.5) discard; 
          gl_FragColor = color * vec4(vColor, 1.);
      }`
};

const Z_AXIS = new Vector3(0, 0, 1);
const tmp_quaternion = new Quaternion();
const tmp_euler = new Euler();

export function CreateInstanceMeshPool(count: number) {
    let attributes: { [key: string]: BufferAttribute | InterleavedBufferAttribute };
    const mesh_data: { position: Vector3, scale: Vector3, rotation: number }[] = [];
    let current_atlas = '';
    const textures_size: Vector2[] = [];
    const slices_data: Vector2[] = [];
    const geometry = new PlaneGeometry(1, 1);
    const uvData = new Float32Array(count * 4);
    const slice_data = new Float32Array(count * 4);
    const sizes = new Float32Array(count * 2);
    const pivots = new Float32Array(count * 2);

    for (let i = 0; i < count; i++) {
        uvData[i * 4] = 0;
        uvData[i * 4 + 1] = 0;
        uvData[i * 4 + 2] = 1;
        uvData[i * 4 + 3] = 1;
        slice_data[i * 4] = 0;
        slice_data[i * 4 + 1] = 0;
        slice_data[i * 4 + 2] = 1;
        slice_data[i * 4 + 3] = 1;
        sizes[i * 2] = 1;
        sizes[i * 2 + 1] = 1;
        pivots[i * 2] = 0.5;
        pivots[i * 2 + 1] = 0.5;
        textures_size.push(new Vector2(1, 1));
        slices_data.push(new Vector2(0, 0));
        mesh_data.push({ position: new Vector3(0, 0, 0), scale: new Vector3(1, 1, 1), rotation: 0 });
    }
    geometry.setAttribute("uvData", new InstancedBufferAttribute(uvData, 4));
    geometry.setAttribute("sliceData", new InstancedBufferAttribute(slice_data, 4));
    geometry.setAttribute("instanceSize", new InstancedBufferAttribute(sizes, 2));
    geometry.setAttribute("instancePivot", new InstancedBufferAttribute(pivots, 2));
    attributes = {
        sizes: geometry.getAttribute("instanceSize"),
        uvData: geometry.getAttribute("uvData"),
        sliceData: geometry.getAttribute("sliceData"),
        pivots: geometry.getAttribute("instancePivot"),
    };

    // Создаем материал с шейдерами
    const material = new ShaderMaterial({
        uniforms: { u_texture: { value: null } },
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
        transparent: true,
    });
    const mesh = new InstancedMesh(geometry, material, count);
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

    function make_matrix(index: number) {
        dummy.setRotationFromAxisAngle(Z_AXIS, mesh_data[index].rotation * Math.PI / 180);
        dummy.scale.copy(mesh_data[index].scale);
        dummy.position.copy(mesh_data[index].position);
        dummy.updateMatrix();
        return dummy.matrix;
    }

    function set_position(index: number, pos: Vector3) {
        mesh_data[index].position.copy(pos);
        mesh.setMatrixAt(index, make_matrix(index));
        mesh.instanceMatrix.needsUpdate = true;
    }

    function set_scale(index: number, scale_x: number, scale_y: number) {
        mesh_data[index].scale.set(scale_x, scale_y, 1);
        mesh.setMatrixAt(index, make_matrix(index));
        mesh.instanceMatrix.needsUpdate = true;
        set_size(index, attributes.sizes.getX(index), attributes.sizes.getY(index));
    }

    function set_size(index: number, size_x: number, size_y: number) {
        if (size_x < 1)
            size_x = 1;
        if (size_y < 1)
            size_y = 1;
        attributes.sizes.setXY(index, size_x, size_y);
        attributes.sizes.needsUpdate = true;
        update_slice(index);
    }

    function set_rotation(index: number, rotation_deg: number) {
        mesh_data[index].rotation = rotation_deg;
        mesh.setMatrixAt(index, make_matrix(index));
        mesh.instanceMatrix.needsUpdate = true;
    }

    function set_color(index: number, hex_color: string) {
        const color = new Color(hex_color);
        mesh.setColorAt(index, color);
        mesh.instanceColor!.needsUpdate = true;
    }

    function set_slice(index: number, width: number, height: number) {
        slices_data[index].set(width, height);
        update_slice(index);
    }

    function set_pivot(index: number, x: number, y: number) {
        attributes.pivots.setXY(index, x, y);
        attributes.pivots.needsUpdate = true;
    }

    function set_matrix(index: number, m4: Matrix4) {
        // если неравномерный масштаб, то обратно собрать матрицу невозможно, а также при разборе ее вернет не совсем верные данные
        m4.decompose(mesh_data[index].position, tmp_quaternion, mesh_data[index].scale);
        const euler = tmp_euler.setFromQuaternion(tmp_quaternion);
        mesh_data[index].rotation = euler.z * 180 / Math.PI;
        mesh.setMatrixAt(index, m4);
        mesh.instanceMatrix.needsUpdate = true;
    }
    

    function update_slice(index: number) {
        const width = slices_data[index].x;
        const height = slices_data[index].y;
        if (width > 0 && height > 0) {
            const size_x = attributes.sizes.getX(index);
            const size_y = attributes.sizes.getY(index);
            const u_dimensions_x = width / size_x;
            const u_dimensions_y = height / size_y;
            const u_border_x = width / textures_size[index].x;
            const u_border_y = height / textures_size[index].y;
            attributes.sliceData.setXYZW(index, u_dimensions_x, u_dimensions_y, u_border_x, u_border_y);
            attributes.sliceData.needsUpdate = true;
            if (material.defines['USE_SLICE'] == undefined) {
                material.defines['USE_SLICE'] = '';
                material.needsUpdate = true;
            }
        }
        else {
            if (material.defines['USE_SLICE'] != undefined) {
                delete material.defines['USE_SLICE'];
                material.needsUpdate = true;
            }
        }
    }

    return { mesh, set_atlas, set_texture, set_matrix, set_position, set_pivot, set_scale, set_size, set_color, set_rotation, set_slice };
}