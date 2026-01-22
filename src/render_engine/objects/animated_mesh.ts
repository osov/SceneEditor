import { AnimationAction, AnimationMixer } from "three";
import { IObjectTypes } from "../types";
import { MultipleMaterialMesh, MultipleMaterialMeshSerializeData } from "./multiple_material_mesh";
import { Services } from '@editor/core/ServiceProvider';
import { Property, PropertyType, type InspectorFieldDefinition } from "@editor/core/inspector";

export interface AnimatedMeshSerializeData extends MultipleMaterialMeshSerializeData {
	animations: string[],
	current_animation: string
}

export class AnimatedMesh extends MultipleMaterialMesh {
	public type = IObjectTypes.GO_ANIMATED_MODEL_COMPONENT;
	// NOTE: ленивая инициализация - mixer создается после загрузки модели
	private mixer: AnimationMixer | null = null;
	private animations_list: { [k: string]: AnimationAction } = {};
	private activeAction: AnimationAction | null = null;
	private lastAction: AnimationAction | null = null;

	constructor(id: number, width = 0, height = 0) {
		super(id, width, height);
		// NOTE: используем anim_model как базовый материал для анимированных моделей
		this.default_material_name = 'anim_model';
		Services.event_bus.on('engine:update', (data) => {
			const e = data as { dt: number };
			this.on_mixer_update(e);
		});
	}

	set_mesh(name: string) {
		super.set_mesh(name);
		this.animations_list = {};
		this.activeAction = null;
		this.lastAction = null;
		// NOTE: создаем mixer после загрузки модели когда children[0] доступен
		if (this.children.length > 0 && name !== '') {
			Services.logger.info('[AnimatedMesh] set_mesh:', name, 'children[0] type:', this.children[0].type, 'layers.mask:', this.children[0].layers.mask);
			// Логируем структуру модели и layers
			this.children[0].traverse((child: any) => {
				if (child.isSkinnedMesh || child.isMesh) {
					Services.logger.info('[AnimatedMesh] Mesh:', child.type, 'name:', child.name, 'layers.mask:', child.layers.mask);
				}
			});
			this.mixer = new AnimationMixer(this.children[0]);
			Services.logger.info('[AnimatedMesh] Created mixer for:', name);

			// Автоматически загружаем доступные анимации для нового меша
			const available_animations = Services.resources.get_all_model_animations(name);
			Services.logger.info('[AnimatedMesh] Loading animations for mesh:', name, 'found:', available_animations);
			for (const anim_name of available_animations) {
				this.add_animation(anim_name);
			}

			// После загрузки всех анимаций выбираем idle по умолчанию
			this.select_default_animation();
		}
	}

	/**
	 * Выбрать анимацию по умолчанию - предпочитаем idle
	 */
	private select_default_animation() {
		const animation_names = Object.keys(this.animations_list);
		if (animation_names.length === 0) return;

		// Ищем анимацию содержащую "idle" (регистронезависимо)
		const idle_animation = animation_names.find(name => name.toLowerCase().includes('idle'));
		const default_animation = idle_animation ?? animation_names[0];

		Services.logger.info('[AnimatedMesh] Selecting default animation:', default_animation, 'from:', animation_names);
		this.set_animation(default_animation);
	}

	private updateLogCounter = 0;
	on_mixer_update(e: { dt: number }) {
		if (this.mixer !== null) {
			this.mixer.update(e.dt);
			// Логируем каждые 60 кадров (примерно раз в секунду)
			if (this.updateLogCounter++ % 60 === 0) {
				Services.logger.info('[AnimatedMesh] mixer.update dt:', e.dt, 'time:', this.mixer.time.toFixed(2));
			}
		}
		for (let i = 0; i < this.materials.length; i++) {
			const material = this.materials[i];
			if (material !== null && material !== undefined) {
				Services.resources.set_material_uniform_for_original(material.name, 'offsetZ', this.position.z);
			}
		}
	}

	add_animation(name: string) {
		Services.logger.info('[AnimatedMesh] add_animation:', name, 'mesh:', this.mesh_name, 'children:', this.children.length);
		const clip = Services.resources.find_animation(name, this.mesh_name);
		if (!clip) {
			Services.logger.error('[AnimatedMesh] Animation not found:', name, 'for model:', this.mesh_name);
			Services.logger.info('[AnimatedMesh] Available animations:', Services.resources.get_all_model_animations(this.mesh_name));
			return;
		}

		// NOTE: создаем mixer если его нет (ленивая инициализация)
		if (this.mixer === null && this.children.length > 0) {
			this.mixer = new AnimationMixer(this.children[0]);
			Services.logger.info('[AnimatedMesh] Created mixer for:', this.mesh_name);
		}
		if (this.mixer === null) {
			return Services.logger.error('[AnimatedMesh] Cannot add animation - mixer not initialized, children:', this.children.length);
		}

		const animationAction = this.mixer.clipAction(clip.clip);
		this.animations_list[name] = animationAction;
		Services.logger.info('[AnimatedMesh] Animation added:', name, 'total animations:', Object.keys(this.animations_list).length);
		// NOTE: НЕ запускаем анимацию автоматически - выбор делается в set_mesh после загрузки всех анимаций
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
		// Пустая строка означает "Нет анимации" - останавливаем текущую
		if (alias === '') {
			if (this.activeAction !== null) {
				this.activeAction.fadeOut(0.3);
				this.activeAction = null;
			}
			return;
		}

		if (this.animations_list[alias] === undefined) {
			Services.logger.warn(`Animation "${alias}" not found. Available: ${Object.keys(this.animations_list).join(', ') || 'none'}`);
			return;
		}

		const toAction = this.animations_list[alias];
		if (toAction === this.activeAction) return;

		this.lastAction = this.activeAction;
		this.activeAction = toAction;
		const fade_duration = 0.3;

		// fadeOut только если есть предыдущая анимация
		if (this.lastAction !== null) {
			this.lastAction.fadeOut(fade_duration);
		}

		this.activeAction.reset();
		this.activeAction.fadeIn(fade_duration);
		this.activeAction.startAt(offset);
		this.activeAction.play();
	}

	get_animation() {
		return Object.keys(this.animations_list).find(key => this.animations_list[key] == this.activeAction) || '';
	}

	serialize() {
		const data = super.serialize();

		data.animations = [];
		data.current_animation = this.get_animation();

		for (const [name] of Object.entries(this.animations_list)) {
			data.animations.push(name);
		}

		return data;
	}

	deserialize(data: AnimatedMeshSerializeData) {
		super.deserialize(data);

		// NOTE: инициализируем mixer после загрузки модели
		if (this.children.length > 0 && this.mixer === null) {
			this.mixer = new AnimationMixer(this.children[0]);
		}

		if (data.animations) {
			for (const animation of data.animations) {
				// NOTE: для обратной совместимости, после пересохранения всех сцен которые содежат аним модели можно удалить
				this.add_animation((animation as any)?.name || animation);
			}
		}

		if (data.current_animation) {
			this.set_animation(data.current_animation);
		}
	}

	/**
	 * Получить список доступных анимаций
	 */
	get_available_animations(): string[] {
		return Object.keys(this.animations_list);
	}

	/**
	 * AnimatedMesh добавляет поля модели и текущей анимации
	 * NOTE: ANIMATIONS (ITEM_LIST) временно убрано - тип не настроен в конфигурации
	 */
	override get_inspector_fields(): InspectorFieldDefinition[] {
		const available_animations = this.get_available_animations();
		// Формируем params в формате search-list: { 'label': 'value', ... }
		const animation_options: Record<string, string> = { 'Нет анимации': '' };
		for (const anim of available_animations) {
			animation_options[anim] = anim;
		}
		return [
			...super.get_inspector_fields(),
			// Модель
			{ group: 'model', property: Property.MESH_NAME, type: PropertyType.LIST_TEXT },
			// Текущая анимация (с доступными опциями)
			{ group: 'model', property: Property.CURRENT_ANIMATION, type: PropertyType.LIST_TEXT,
			  params: animation_options },
		];
	}
}