import { Box3, DataTexture, Mesh, MeshBasicMaterial, NormalBlending, RGBAFormat, ShaderMaterial, SkinnedMesh, Texture, UnsignedByteType, Vector2, Vector3 } from "three";
import { EntityPlane } from "./entity_plane";
import { FLOAT_PRECISION, WORLD_SCALAR } from "../../config";
import { clone as skeleton_clone } from 'three/examples/jsm/utils/SkeletonUtils';
import { rgb2hex } from "@editor/defold/utils";
import { Services } from '@editor/core';
import { DC_LAYERS } from '@editor/engine/RenderService';
import { Property, PropertyType, type InspectorFieldDefinition } from "@editor/core/inspector";
import {
    serialize_material_uniforms,
    deserialize_material_uniforms,
    serialize_blending_if_changed
} from "./helpers/SerializationHelper";

export interface MultipleMaterialMeshSerializeData {
    mesh_name: string,
    materials: {
        [key in number]: { name: string, blending?: number, changed_uniforms?: { [key: string]: unknown } }
    }
    layers: number;
}

export class MultipleMaterialMesh extends EntityPlane {
    protected mesh_name = '';
    protected materials: ShaderMaterial[] = [];
    protected textures: string[][] = [];
    // Коэффициент нормализации масштаба FBX модели (чтобы итоговая высота была ~1 единица)
    protected normalize_scale = 1;

    protected default_material_name = 'model';

    constructor(id: number, width = 0, height = 0) {
        super(id);
        // NOTE: Оставляем GO_LAYER (0) включённым на родителе, чтобы Three.js
        // обходил детей при рендеринге. Без этого SkinnedMesh не будет рендериться,
        // потому что Three.js пропускает детей если родитель не на слое камеры.
        this.layers.enable(DC_LAYERS.RAYCAST_LAYER);
        this.set_size(width, height);
    }

    set_texture(name: string, atlas = '', index = 0, uniform_key = 'u_texture') {
        this.textures[index] = [name, atlas, uniform_key];
        const texture_data = Services.resources.get_texture(name, atlas);
        Services.resources.set_material_uniform_for_multiple_material_mesh(this, index, uniform_key, texture_data.texture);
    }

    get_texture(index = 0) {
        return this.textures[index];
    }

    set_scale(x: number, y: number): void {
        if (!this.children[0]) return;
        // Применяем normalize_scale для корректировки внутреннего масштаба FBX
        this.children[0].scale.setScalar(Math.max(x, y) * WORLD_SCALAR * this.normalize_scale);
        this.transform_changed();
    }

    get_scale(): Vector2 {
        if (!this.children[0]) return new Vector2(1 / WORLD_SCALAR, 1 / WORLD_SCALAR);
        // Возвращаем масштаб без учёта normalize_scale (пользовательский масштаб)
        return new Vector2(
            this.children[0].scale.x / (WORLD_SCALAR * this.normalize_scale),
            this.children[0].scale.y / (WORLD_SCALAR * this.normalize_scale)
        );
    }

    // NOTE: при сериализации и десериализации цвета может не быть материалов
    // Применяем цвет ко ВСЕМ материалам модели
    set_color(color: string) {
        if (this.materials.length === 0) return;
        for (let i = 0; i < this.materials.length; i++) {
            const mat = this.materials[i];
            if (mat.uniforms['u_color'] !== undefined) {
                Services.resources.set_material_uniform_for_multiple_material_mesh(this, i, 'u_color', color);
            }
        }
    }

    get_color() {
        if (this.materials.length == 0 || this.materials.length <= 0) return;
        if (!this.materials[0].uniforms['u_color']) {
            Services.logger.warn('Material has no u_color uniform', this.materials[0].name);
            return "#fff";
        }
        return rgb2hex(this.materials[0].uniforms['u_color'].value) as any;
    }

    set_material(name: string, index = 0) {
        if (!Services.resources.has_material_by_mesh_id(name, this.mesh_data.id, index)) {
            Services.resources.unlink_material_for_multiple_material_mesh(this.materials[index].name, this.mesh_data.id, index);
        }

        const material = Services.resources.get_material_by_mesh_id(name, this.mesh_data.id, index);
        if (!material) return;

        const u_color_value = material.uniforms['u_color']?.value;
        Services.logger.info('[MultipleMaterialMesh.set_material] Setting material:', name, 'index:', index, 'u_color:', u_color_value ? `(${u_color_value.x}, ${u_color_value.y}, ${u_color_value.z})` : 'undefined');

        this.materials[index] = material;
        let idx = 0;
        let applied = false;
        this.children[0].traverse((child: any) => {
            if ((child instanceof Mesh || child instanceof SkinnedMesh) && child.material) {
                Services.logger.info('[MultipleMaterialMesh.set_material] Found mesh at idx:', idx, 'child.name:', child.name, 'looking for index:', index);
                if (idx == index) {
                    child.material = material;
                    material.needsUpdate = true;
                    applied = true;
                    Services.logger.info('[MultipleMaterialMesh.set_material] Applied material to:', child.name);
                }
                idx++;
            }
        });
        if (!applied) {
            Services.logger.warn('[MultipleMaterialMesh.set_material] Material NOT applied! Total meshes found:', idx);
        }
    }

    get_materials() {
        return this.materials;
    }

    /**
     * Получить имя материала первого слота (для совместимости с Property.MATERIAL)
     */
    get_material_name(): string {
        return this.materials[0]?.name ?? '';
    }

    get_mesh_name() {
        return this.mesh_name;
    }

    set_mesh(name: string) {
        // Обработка пустого значения - очистка меша
        if (name === '') {
            this.mesh_name = '';
            this.materials = [];
            if (this.children.length > 0) {
                this.remove(this.children[0]);
            }
            return;
        }

        const src = Services.resources.get_model(name);
        if (src === undefined) {
            return Services.logger.error('[set_mesh] Model not found:', name, 'Available models:', Services.resources.get_all_models());
        }

        Services.logger.info('[set_mesh] Setting mesh:', name, 'Using material:', this.default_material_name);

        this.mesh_name = name;
        this.materials = [];

        const old_maps: Texture[] = [];

        // Собираем текстуры из ОРИГИНАЛЬНОЙ модели (до клонирования)
        // NOTE: Не проверяем map.image - изображение загружается асинхронно,
        // Three.js автоматически обновит рендеринг когда оно загрузится
        src.traverse((child: any) => {
            if ((child instanceof Mesh || child instanceof SkinnedMesh) && child.material) {
                const old_material = (child.material as MeshBasicMaterial);
                Services.logger.info('[set_mesh] Source material:', old_material.name, 'has map:', old_material.map != null);
                if (old_material.map != null) {
                    // Для FBX embedded текстур используем blob URL из image.src для превью
                    const texture_path = (old_material.map.image as HTMLImageElement | undefined)?.src ?? old_material.name;
                    Services.resources.add_texture(texture_path, 'mesh_' + name, old_material.map);
                    old_maps.push(old_material.map);
                    Services.logger.info('[set_mesh] Added texture from source material:', old_material.name, 'path:', texture_path);
                }
            }
        });

        const m = skeleton_clone(src);
        m.traverse((child: any) => {
            if ((child instanceof Mesh || child instanceof SkinnedMesh) && child.material) {
                const new_material = Services.resources.get_material_by_mesh_id(this.default_material_name, this.mesh_data.id);
                if (new_material === null || new_material === undefined) {
                    Services.logger.error('[set_mesh] Material not found:', this.default_material_name, 'Available materials:', Services.resources.get_all_materials());
                    return;
                }
                Services.logger.info('[set_mesh] Material applied:', new_material.name,
                    'uniforms:', Object.keys(new_material.uniforms),
                    'defines:', new_material.defines,
                    'isSkinnedMesh:', child instanceof SkinnedMesh);

                // Для SkinnedMesh вычисляем boneTexture - необходимо для ShaderMaterial с skinning
                if (child instanceof SkinnedMesh) {
                    const skinned = child;
                    // CRITICAL: ShaderMaterial требует boneTexture для skinning
                    // Без этого вызова шейдер не получит данные костей
                    if (skinned.skeleton !== null) {
                        skinned.skeleton.computeBoneTexture();
                        skinned.skeleton.update();
                    }
                    Services.logger.info('[set_mesh] SkinnedMesh skeleton:',
                        skinned.skeleton !== null ? 'present' : 'missing',
                        'bones:', skinned.skeleton?.bones?.length ?? 0,
                        'boneTexture:', skinned.skeleton?.boneTexture !== null ? 'present' : 'missing');
                }

                this.materials.push(new_material);
                child.material = new_material;
            }
        });

        if (this.children.length > 0)
            this.remove(this.children[0]);
        this.add(m);

        // Вычисляем bounding box для нормализации масштаба FBX модели
        // FBX модели могут иметь огромные внутренние масштабы (например, 4500 единиц высоты)
        // Нормализуем к ~1 единице высоты для корректного отображения в viewport
        const bbox = new Box3().setFromObject(m);
        const size = new Vector3();
        bbox.getSize(size);
        const model_height = size.y;

        if (model_height > 0) {
            // normalize_scale компенсирует размер модели И умножение на WORLD_SCALAR в set_scale
            // Цель: при user_scale = 1 модель имеет высоту TARGET_HEIGHT в scene space
            // TARGET_HEIGHT = 32 (как default size спрайта) чтобы модель была сопоставима с другими объектами
            // Формула set_scale: child.scale = user_scale * WORLD_SCALAR * normalize_scale
            // Высота в scene = model_height * child.scale
            // При user_scale = 1, хотим height = TARGET_HEIGHT:
            // normalize_scale = TARGET_HEIGHT / (model_height * WORLD_SCALAR)
            const TARGET_HEIGHT = 32; // Как default size спрайта
            this.normalize_scale = TARGET_HEIGHT / (model_height * WORLD_SCALAR);
            const final_height = model_height * WORLD_SCALAR * this.normalize_scale;
            Services.logger.info('[set_mesh] Model bounding box:',
                'size:', size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2),
                'normalize_scale:', this.normalize_scale.toFixed(6),
                'final_height_at_scale_1:', final_height.toFixed(2));
        } else {
            this.normalize_scale = 1;
            Services.logger.warn('[set_mesh] Model has zero height, using normalize_scale = 1');
        }

        this.set_scale(1, 1);

        Services.logger.info('[set_mesh] Applying textures from FBX. old_maps count:', old_maps.length, 'materials count:', this.materials.length);

        // NOTE: Если текстур меньше чем материалов, создаем дефолтные белые текстуры
        // для отсутствующих слотов, чтобы модель была видна с u_color
        if (old_maps.length < this.materials.length) {
            Services.logger.info('[set_mesh] Creating default white textures for', this.materials.length - old_maps.length, 'materials without embedded textures');
            for (let i = old_maps.length; i < this.materials.length; i++) {
                const white_data = new Uint8Array([255, 255, 255, 255]);
                const default_texture = new DataTexture(white_data, 1, 1, RGBAFormat, UnsignedByteType);
                default_texture.needsUpdate = true;
                old_maps.push(default_texture);
            }
        }

        old_maps.forEach((map, index) => {
            Services.logger.info('[set_mesh] Applying texture at index:', index, 'map:', map);
            // NOTE: напрямую устанавливаем текстуру на материал, минуя систему копирования материалов
            // Это необходимо потому что текстура из FBX - это объект Texture, а не зарегистрированное имя
            if (this.materials[index] && this.materials[index].uniforms['u_texture']) {
                this.materials[index].uniforms['u_texture'].value = map;
                this.materials[index].needsUpdate = true;
                Services.logger.info('[set_mesh] Texture set directly on material:', this.materials[index].name);
            } else {
                Services.resources.set_material_uniform_for_multiple_material_mesh(this, index, 'u_texture', map);
            }
        });

        this.transform_changed();
    }

    serialize() {
        // NOTE: кусок serialize из EntityPlane, без get_color
        const data: any = {};
        const size = this.get_size();
        const pivot = this.get_pivot();

        // NOTE: только если не 32 * WORLD_SCALAR
        if (size.x !== 32 * WORLD_SCALAR || size.y !== 32 * WORLD_SCALAR) {
            data.size = size.toArray().map(value => Number(value.toFixed(FLOAT_PRECISION)));
        }

        // NOTE: только если не (0.5, 0.5)
        if (pivot.x !== 0.5 || pivot.y !== 0.5) {
            data.pivot = pivot;
        }
        data.materials = [];
        data.mesh_name = this.mesh_name;

        this.materials.forEach((material, idx) => {
            const info: { name: string, blending?: number, changed_uniforms?: { [key: string]: unknown } } = {
                name: material.name,
            };

            const blending = serialize_blending_if_changed(material.blending, NormalBlending);
            if (blending !== undefined) {
                info.blending = blending;
            }

            const material_info = Services.resources.get_material_info(material.name);
            if (material_info === undefined) return;

            const hash = Services.resources.get_material_hash_by_mesh_id(material.name, this.mesh_data.id, idx);
            if (hash === undefined) return;

            // Сериализация изменённых uniforms через хелпер
            const texture_data = this.get_texture(idx);
            const uniforms = serialize_material_uniforms(
                material,
                material_info,
                hash,
                (uniform_key) => uniform_key === 'u_texture' && texture_data !== undefined
                    ? [texture_data[1] || '', texture_data[0] || '']
                    : ['', '']
            );
            if (uniforms !== undefined) {
                info.changed_uniforms = uniforms;
            }

            data.materials[idx] = info;
        });

        let mask = 0;
        this.traverse((m) => {
            if (["Mesh", "SkinnedMesh"].includes(m.type))
                mask = m.layers.mask;
        });
        if (mask != 0)
            data.layers = mask;

        return data;
    }

    deserialize(data: MultipleMaterialMeshSerializeData) {
        if (data.mesh_name) {
            this.set_mesh(data.mesh_name);
        }

        for (const [idx, info] of Object.entries(data.materials)) {
            const index = parseInt(idx);

            if (info.name !== 'default') {
                this.set_material(info.name, index);
            }

            if (info.blending !== undefined) {
                Services.resources.set_material_property_for_multiple_mesh(this, index, 'blending', info.blending);
            }

            // Десериализация uniforms через хелпер
            if (info.changed_uniforms !== undefined) {
                deserialize_material_uniforms(
                    info.changed_uniforms,
                    info.name,
                    (name, atlas, uniform_key) => this.set_texture(name, atlas, index, uniform_key),
                    (key, value) => Services.resources.set_material_uniform_for_multiple_material_mesh(this, index, key, value)
                );
            }
        }

        // NOTE: layers: 0 означает что нет слоёв и меш не будет виден
        // Применяем только если layers > 0, иначе используем дефолтный слой 0 (GO_LAYER)
        if (data.layers != undefined && data.layers > 0) {
            this.traverse((m) => {
                if (["Mesh", "SkinnedMesh"].includes(m.type))
                    m.layers.mask = data.layers;
            });
        }

        // NOTE: кусок deserialize из EntityPlane без set_color
        this.set_pivot(0.5, 0.5, false);
        this.set_size(32 * WORLD_SCALAR, 32 * WORLD_SCALAR);

        if ((data as any).pivot) {
            this.set_pivot((data as any).pivot.x, (data as any).pivot.y, false);
        }
        if ((data as any).size) {
            this.set_size((data as any).size[0], (data as any).size[1]);
        }

        // NOTE: для обратной совместимости, после пересохранения всех сцен которые содежат модели, можно удалить
        const scales = (data as any).scales;
        if (scales) {
            scales.forEach((scale: Vector3, idx: number) => {
                if (this.children[idx])
                    this.children[idx].scale.copy(scale);
            });
        }
    }

    /**
     * Получить список названий материалов
     */
    get_material_names(): string[] {
        return this.materials.map(m => m.name);
    }

    /**
     * MultipleMaterialMesh использует базовые поля инспектора
     * NOTE: Графические поля (COLOR, TEXTURE, MATERIAL) убраны так как
     * get_color() возвращает undefined при пустом массиве materials
     */
    override get_inspector_fields(): InspectorFieldDefinition[] {
        return [
            ...super.get_inspector_fields(),
            // Масштаб модели
            { group: 'model', property: Property.MODEL_SCALE, type: PropertyType.NUMBER, params: { min: 0.01, step: 0.1 } },
            // NOTE: Property.MATERIAL убран - материал выбирается через слоты (Property.SLOT_MATERIAL)
        ];
    }
} 