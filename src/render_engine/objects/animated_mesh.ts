import { AnimationAction, AnimationMixer, MeshBasicMaterial, ShaderMaterial, Texture } from "three";
import { IObjectTypes } from "../types";
import { clone as skeleton_clone } from 'three/examples/jsm/utils/SkeletonUtils';
import { EntityPlane } from "./entity_plane";
import { get_file_name } from "../helpers/utils";
import { MaterialUniformType } from "../resource_manager";

interface SerializeData {
	materials: {
		[key in number]: { name: string, changed_uniforms?: string[] }
	},
	mesh_name: string,
	animations: { name: string, alias: string }[],
	current_animation: string,
	texture: {
		name: string,
		atlas: string
	},
	scales: {
		x: number,
		y: number,
		z: number
	}[]
}

export class AnimatedMesh extends EntityPlane {
	public type = IObjectTypes.GO_MODEL_COMPONENT;
	private mixer = new AnimationMixer(this);
	private animations_list: { [k: string]: AnimationAction } = {};
	private animation_aliases: { [k: string]: string } = {};
	private activeAction: AnimationAction | null = null;
	private lastAction: AnimationAction | null = null;
	private mesh_name = '';
	private materials: ShaderMaterial[] = [];

	constructor(id: number, width = 0, height = 0) {
		super(id);
		this.layers.disable(RenderEngine.DC_LAYERS.GO_LAYER);
		this.layers.enable(RenderEngine.DC_LAYERS.RAYCAST_LAYER);
		this.set_size(width, height);
		EventBus.on('SYS_ON_UPDATE', this.on_mixer_update.bind(this));
	}

	set_texture(name: string, atlas = '', index = 0) {
		super.set_texture(name, atlas);
		const texture_data = ResourceManager.get_texture(name, atlas);
		ResourceManager.set_material_uniform_for_animated_mesh(this, index, 'u_texture', texture_data.texture);
	}

	set_material(name: string, index = 0) {
		if (!ResourceManager.has_material_by_mesh_id(name, this.mesh_data.id, index)) {
			ResourceManager.unlink_material_for_animated_mesh(this.materials[index].name, this.mesh_data.id, index);
		}

		const material = ResourceManager.get_material_by_mesh_id(name, this.mesh_data.id, index);
		if (!material) return;

		this.materials[index] = material;
		(this.children[0].children[index] as any).material = material;
	}

	get_materials() {
		return this.materials;
	}

	set_mesh(name: string) {
		const src = ResourceManager.get_model(name);
		if (!src)
			return Log.error('Mesh not found', name);
		this.mesh_name = name;

		// NOTE: ресетим все поля (если выбрали новый меш)
		this.materials = [];
		this.animations_list = {};
		this.activeAction = null;
		this.lastAction = null;

		const old_maps: Texture[] = [];
		const m = skeleton_clone(src);
		m.traverse((child) => {
			if ((child as any).material) {
				const old_material = ((child as any).material as MeshBasicMaterial);
				if (old_material.map && old_material.map.image) {
					ResourceManager.add_texture(old_material.name, 'mesh_' + name, old_material.map);
					log('Texture added', old_material.name, 'mesh_' + name);
					old_maps.push(old_material.map);
				}

				const new_material = ResourceManager.get_material_by_mesh_id('anim', this.mesh_data.id)!;
				this.materials.push(new_material);
				(child as any).material = new_material;

				// NOTE: для теста
				this.materials.push(new_material);
				this.materials.push(new_material);
				this.materials.push(new_material);
			}
		});
		m.scale.setScalar(0.2);
		if (this.children.length > 0)
			this.remove(this.children[0]);
		this.add(m);

		// NOTE: востанавливаем текстуры
		old_maps.forEach((map, index) => {
			ResourceManager.set_material_uniform_for_animated_mesh(this, index, 'u_texture', map);
		});

		// NOTE: для чего сдесь была проверка ? если задать новый меш этому же обьекту, то не сможем проигрывать анимацию
		// if (!this.mixer)
		this.mixer = new AnimationMixer(m);
		this.transform_changed();
	}

	get_mesh_name() {
		return this.mesh_name;
	}

	on_mixer_update(e: { dt: number }) {
		if (this.mixer)
			this.mixer.update(e.dt);
		for (let i = 0; i < this.materials.length; i++) {
			ResourceManager.set_material_uniform_for_original(this.materials[i].name, 'offsetZ', this.position.z);
		}
	}

	add_animation(name: string, alias = '') {
		const clip = ResourceManager.find_animation(name, this.mesh_name);
		if (!clip)
			return Log.error('Animation not found', name);
		const animationAction = this.mixer.clipAction(clip.clip)
		const final_alias = alias == '' ? name : alias;
		this.animations_list[final_alias] = animationAction;
		if (alias != '') {
			this.animation_aliases[alias] = name;
		}
		if (Object.keys(this.animations_list).length == 1) {
			this.activeAction = animationAction;
			animationAction.play();
		}
	}

	get_animation_list() {
		return this.animations_list;
	}

	set_animation(alias: string, offset = 0) {
		if (this.animations_list[alias]) {
			const toAction = this.animations_list[alias];
			if (toAction != this.activeAction) {
				this.lastAction = this.activeAction;
				this.activeAction = toAction;
				const t = 0.3;
				this.lastAction!.fadeOut(t);
				this.activeAction.reset();
				this.activeAction.fadeIn(t);
				this.activeAction.startAt(offset);
				this.activeAction.play();
			}
		}
	}

	get_animation() {
		return Object.keys(this.animations_list).find(key => this.animations_list[key] == this.activeAction) || '';
	}

	serialize() {
		const data = { ... super.serialize() };
		data.materials = [];
		data.mesh_name = this.mesh_name;
		data.animations = [];
		data.current_animation = this.get_animation();

		data.scales = this.children.map(child => child.scale.clone());

		// Get texture info from current texture if it exists
		if (this.materials.length > 0 && this.materials[0].uniforms.u_texture.value) {
			const texture = this.materials[0].uniforms.u_texture.value as Texture;
			const texture_name = get_file_name((texture as any).path || '');
			const atlas = ResourceManager.get_atlas_by_texture_name(texture_name) || '';
			data.texture = {
				name: texture_name,
				atlas: atlas
			};
		}

		// Serialize animations using their original names
		for (const [alias, action] of Object.entries(this.animations_list)) {
			const clip = action.getClip();
			// If this animation has an alias, use the original name from animation_aliases
			const animName = this.animation_aliases[alias] || clip.name;
			data.animations.push({ name: animName, alias });
		}

		this.materials.forEach((material, idx) => {
			const info: { name: string, changed_uniforms?: { [key: string]: any } } = {
				name: material.name
			};

			const material_info = ResourceManager.get_material_info(material.name);
			if (!material_info) return null;

			const hash = ResourceManager.get_material_hash_by_mesh_id(material.name, this.mesh_data.id, idx);
			if (!hash) return data;

			const changed_uniforms = material_info.material_hash_to_changed_uniforms[hash];
			if (!changed_uniforms) return data;

			const modifiedUniforms: { [key: string]: any } = {};
			for (const uniformName of changed_uniforms) {
				if (material.uniforms[uniformName]) {
					const uniform = material.uniforms[uniformName];
					if (uniform.value instanceof Texture) {
						// For texture uniforms, save the texture name and atlas instead of the full Texture object
						const texture_name = get_file_name((uniform.value as any).path || '');
						const atlas = ResourceManager.get_atlas_by_texture_name(texture_name) || '';
						modifiedUniforms[uniformName] = `${atlas}/${texture_name}`;
					} else {
						modifiedUniforms[uniformName] = uniform.value;
					}
				}
			}

			if (Object.keys(modifiedUniforms).length > 0) {
				info.changed_uniforms = modifiedUniforms;
			}

			data.materials[idx] = info;
		});

		return data;
	}

	deserialize(data: SerializeData) {
		super.deserialize(data);

		// Set mesh if it exists
		if (data.mesh_name) {
			this.set_mesh(data.mesh_name);
		}

		// Add animations
		if (data.animations) {
			for (const animation of data.animations) {
				this.add_animation(animation.name, animation.alias);
			}
		}

		// Set current animation if it exists
		if (data.current_animation) {
			// Find the alias for the current animation if it exists
			const alias = Object.entries(this.animation_aliases).find(([_, name]) => name === data.current_animation)?.[0] || data.current_animation;
			this.set_animation(alias);
		}

		// Set texture if it exists
		if (data.texture) {
			this.set_texture(data.texture.name, data.texture.atlas);
		}

		// Set scale if it exists
		if (data.scales) {
			data.scales.forEach((scale, idx) => {
				this.children[idx].scale.copy(scale);
			});
		}

		for (const [idx, info] of Object.entries(data.materials)) {
			const index = parseInt(idx);

			if (info.name != 'default') {
				this.set_material(info.name, index);
			}

			// NOTE: применяем измененные uniforms, если они есть
			if (info.changed_uniforms) {
				for (const [key, value] of Object.entries(info.changed_uniforms)) {
					const material_info = ResourceManager.get_material_info(info.name);
					if (!material_info) continue;

					const uniform_info = material_info.uniforms[key];
					if (!uniform_info) continue;

					if (uniform_info.type === MaterialUniformType.SAMPLER2D && typeof value === 'string') {
						const [atlas, texture_name] = value.split('/');
						this.set_texture(texture_name, atlas, index);
					}
				}
			}
		}
	}
}