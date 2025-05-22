import { AnimationAction, AnimationMixer } from "three";
import { IObjectTypes } from "../types";
import { MultipleMaterialMesh, MultipleMaterialMeshSerializeData } from "./multiple_material_mesh";

export interface AnimatedMeshSerializeData extends MultipleMaterialMeshSerializeData {
	animations: { name: string, alias: string }[],
	current_animation: string
}

export class AnimatedMesh extends MultipleMaterialMesh {
	public type = IObjectTypes.GO_ANIMATED_MODEL_COMPONENT;
	private mixer = new AnimationMixer(this);
	private animations_list: { [k: string]: AnimationAction } = {};
	private activeAction: AnimationAction | null = null;
	private lastAction: AnimationAction | null = null;

	constructor(id: number, width = 0, height = 0) {
		super(id, width, height);
		EventBus.on('SYS_ON_UPDATE', this.on_mixer_update.bind(this));
	}

	set_mesh(name: string) {
		super.set_mesh(name);
		this.animations_list = {};
		this.activeAction = null;
		this.lastAction = null;
		this.mixer = new AnimationMixer(this.children[0]);
	}

	on_mixer_update(e: { dt: number }) {
		if (this.mixer)
			this.mixer.update(e.dt);
		for (let i = 0; i < this.materials.length; i++) {
			ResourceManager.set_material_uniform_for_original(this.materials[i].name, 'offsetZ', this.position.z);
		}
	}

	add_animation(name: string) {
		const clip = ResourceManager.find_animation(name, this.mesh_name);
		if (!clip)
			return Log.error('Animation not found', name);
		const animationAction = this.mixer.clipAction(clip.clip)
		this.animations_list[name] = animationAction;
		if (Object.keys(this.animations_list).length == 1) {
			this.activeAction = animationAction;
			animationAction.play();
		}
	}

	remove_animation(name: string) {
		const action = this.animations_list[name];
		if (action) {
			action.stop();
			action.reset();
			if (action == this.activeAction) {
				// NOTE: если это была текущая анимация, то нужно установить другую из имеющихся, если они есть, иначе сбросить состояние
				const available_animations = Object.keys(this.animations_list).filter(key => key != name);
				if (available_animations.length > 0) {
					this.activeAction = this.lastAction ?? this.animations_list[available_animations[0]];
					this.activeAction?.reset();
					this.activeAction?.play();
				} else {
					this.activeAction = null;
					this.lastAction = null;
				}
			}
		}
		delete this.animations_list[name];
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
		const data = super.serialize();

		data.animations = [];
		data.current_animation = this.get_animation();

		for (const [name] of Object.entries(this.animations_list)) {
			data.animations.push({ name: name });
		}

		return data;
	}

	deserialize(data: AnimatedMeshSerializeData) {
		super.deserialize(data);

		if (data.animations) {
			for (const animation of data.animations) {
				this.add_animation(animation.name);
			}
		}

		if (data.current_animation) {
			this.set_animation(data.current_animation);
		}
	}
}