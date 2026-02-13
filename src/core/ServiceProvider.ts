/**
 * ServiceProvider - единая точка доступа к DI сервисам
 *
 * Заменяет глобальные объекты (window.*) на типобезопасный доступ
 * к сервисам через DI контейнер. Использует lazy resolution.
 *
 * @example
 * ```typescript
 * import { Services } from '@editor/core';
 *
 * // Вместо: SelectControl.get_selected_list()
 * Services.selection.selected;
 *
 * // Вместо: HistoryControl.undo()
 * Services.history.undo();
 *
 * // Вместо: EventBus.on('event', handler)
 * Services.event_bus.on('event', handler);
 * ```
 */

import { get_container } from './di/Container';
import { TOKENS } from './di/tokens';
import type { ILogger, IEventBus } from './di/types';
import type {
    ISelectionService,
    IHistoryService,
    IActionsService,
    IHierarchyService,
    ITransformService,
    ISizeService,
} from '../editor/types';
import type { INotificationService } from '../editor/NotificationService';
import type { IRenderService, ISceneService, ICameraService, IResourceService } from '../engine/types';
import type { IInputService } from './services/InputService';
import type { ITimeService } from './services/TimeService';
import type { IUIService } from '../editor/UIService';
import type { IInspectorService } from '../editor/InspectorService';
import type { IAssetService } from '../editor/AssetService';
import type { ISizeControl, ICameraControl } from './controls/types';
import type { ClientAPIType } from '../modules_editor/ClientAPI';
import type { PopupsType } from '../modules_editor/Popups';
import type { ContextMenuType } from '../modules_editor/ContextMenu';
import type { AssetControlType } from '../controls/AssetControl';
import type { SoundType } from '../modules/Sound';
import type { AudioManagerType } from '../render_engine/AudioManager';
import type { ILegacyResourceManager } from '../render_engine/resource_manager';
import type { TreeControlType } from '../modules_editor/tree_control/index';
import type { ControlManagerType } from '../modules_editor/ControlManager';
import type { InspectorControlType } from '../modules_editor/InspectorControl';

/** Типы сервисов для типобезопасности */
export interface IServices {
    /** Сервис логирования */
    readonly logger: ILogger;
    /** Шина событий */
    readonly event_bus: IEventBus;
    /** Сервис ввода */
    readonly input: IInputService;
    /** Сервис времени */
    readonly time: ITimeService;
    /** Сервис рендеринга */
    readonly render: IRenderService;
    /** Сервис сцены */
    readonly scene: ISceneService;
    /** Сервис ресурсов */
    readonly resources: IResourceService;
    /** Сервис камеры */
    readonly camera: ICameraService;
    /** Сервис выделения */
    readonly selection: ISelectionService;
    /** Сервис истории */
    readonly history: IHistoryService;
    /** Сервис действий */
    readonly actions: IActionsService;
    /** Сервис иерархии */
    readonly hierarchy: IHierarchyService;
    /** Сервис трансформации */
    readonly transform: ITransformService;
    /** Сервис UI */
    readonly ui: IUIService;
    /** Сервис инспектора */
    readonly inspector: IInspectorService;
    /** Сервис ассетов */
    readonly assets: IAssetService;
    /** Сервис визуальных границ */
    readonly size: ISizeService;
    /** Сервис уведомлений */
    readonly notifications: INotificationService;
    /** REST API клиент */
    readonly client_api: ClientAPIType;
    /** Менеджер всплывающих окон */
    readonly popups: PopupsType;
    /** Контекстное меню */
    readonly context_menu: ContextMenuType;
    /** Контрол ассетов */
    readonly asset_control: AssetControlType;
    /** Модуль пространственного звука */
    readonly sound: SoundType;
    /** Менеджер аудио */
    readonly audio_manager: AudioManagerType;
    /** Менеджер ресурсов */
    readonly resource_manager: ILegacyResourceManager;
    /** Контрол дерева (иерархия сцены) */
    readonly tree_control: TreeControlType;
    /** Менеджер контролов */
    readonly control_manager: ControlManagerType;
    /** Контрол инспектора */
    readonly inspector_control: InspectorControlType;
    /** Контрол размера объектов */
    readonly size_control: ISizeControl;
    /** Контрол камеры */
    readonly camera_control: ICameraControl;
}

/**
 * Получить контейнер или выбросить ошибку
 */
function require_container() {
    const container = get_container();
    if (container === undefined) {
        throw new Error('DI контейнер не инициализирован. Вызовите bootstrap() перед использованием Services.');
    }
    return container;
}

/**
 * Services - единая точка доступа к DI сервисам
 *
 * Использует getter'ы для lazy resolution сервисов.
 * Это позволяет избежать проблем с порядком инициализации.
 */
export const Services: IServices = {
    get logger(): ILogger {
        return require_container().resolve<ILogger>(TOKENS.Logger);
    },

    get event_bus(): IEventBus {
        return require_container().resolve<IEventBus>(TOKENS.EventBus);
    },

    get input(): IInputService {
        return require_container().resolve<IInputService>(TOKENS.Input);
    },

    get time(): ITimeService {
        return require_container().resolve<ITimeService>(TOKENS.System);
    },

    get render(): IRenderService {
        return require_container().resolve<IRenderService>(TOKENS.Render);
    },

    get scene(): ISceneService {
        return require_container().resolve<ISceneService>(TOKENS.Scene);
    },

    get resources(): IResourceService {
        return require_container().resolve<IResourceService>(TOKENS.Resources);
    },

    get camera(): ICameraService {
        return require_container().resolve<ICameraService>(TOKENS.Camera);
    },

    get selection(): ISelectionService {
        return require_container().resolve<ISelectionService>(TOKENS.Selection);
    },

    get history(): IHistoryService {
        return require_container().resolve<IHistoryService>(TOKENS.History);
    },

    get actions(): IActionsService {
        return require_container().resolve<IActionsService>(TOKENS.Actions);
    },

    get hierarchy(): IHierarchyService {
        return require_container().resolve<IHierarchyService>(TOKENS.Hierarchy);
    },

    get transform(): ITransformService {
        return require_container().resolve<ITransformService>(TOKENS.Transform);
    },

    get ui(): IUIService {
        return require_container().resolve<IUIService>(TOKENS.UI);
    },

    get inspector(): IInspectorService {
        return require_container().resolve<IInspectorService>(TOKENS.Inspector);
    },

    get assets(): IAssetService {
        return require_container().resolve<IAssetService>(TOKENS.Assets);
    },

    get size(): ISizeService {
        return require_container().resolve<ISizeService>(TOKENS.Size);
    },

    get notifications(): INotificationService {
        return require_container().resolve<INotificationService>(TOKENS.Notifications);
    },

    get client_api(): ClientAPIType {
        return require_container().resolve<ClientAPIType>(TOKENS.ClientAPI);
    },

    get popups(): PopupsType {
        return require_container().resolve<PopupsType>(TOKENS.Popups);
    },

    get context_menu(): ContextMenuType {
        return require_container().resolve<ContextMenuType>(TOKENS.ContextMenu);
    },

    get asset_control(): AssetControlType {
        return require_container().resolve<AssetControlType>(TOKENS.AssetControl);
    },

    get sound(): SoundType {
        return require_container().resolve<SoundType>(TOKENS.Sound);
    },

    get audio_manager(): AudioManagerType {
        return require_container().resolve<AudioManagerType>(TOKENS.AudioManager);
    },

    get resource_manager(): ILegacyResourceManager {
        return require_container().resolve<ILegacyResourceManager>(TOKENS.ResourceManager);
    },

    get tree_control(): TreeControlType {
        return require_container().resolve<TreeControlType>(TOKENS.TreeControl);
    },

    get control_manager(): ControlManagerType {
        return require_container().resolve<ControlManagerType>(TOKENS.ControlManager);
    },

    get inspector_control(): InspectorControlType {
        return require_container().resolve<InspectorControlType>(TOKENS.InspectorControl);
    },

    get size_control(): ISizeControl {
        return require_container().resolve<ISizeControl>(TOKENS.SizeControl);
    },

    get camera_control(): ICameraControl {
        return require_container().resolve<ICameraControl>(TOKENS.CameraControl);
    },
};

/**
 * Проверить, инициализирован ли контейнер
 */
export function is_services_ready(): boolean {
    return get_container() !== undefined;
}

/**
 * Безопасно получить сервис (возвращает undefined если не инициализирован)
 */
export function try_get_service<K extends keyof IServices>(key: K): IServices[K] | undefined {
    const container = get_container();
    if (container === undefined) {
        return undefined;
    }

    const token_map: Record<keyof IServices, symbol> = {
        logger: TOKENS.Logger,
        event_bus: TOKENS.EventBus,
        input: TOKENS.Input,
        time: TOKENS.System,
        render: TOKENS.Render,
        scene: TOKENS.Scene,
        resources: TOKENS.Resources,
        camera: TOKENS.Camera,
        selection: TOKENS.Selection,
        history: TOKENS.History,
        actions: TOKENS.Actions,
        hierarchy: TOKENS.Hierarchy,
        transform: TOKENS.Transform,
        ui: TOKENS.UI,
        inspector: TOKENS.Inspector,
        assets: TOKENS.Assets,
        size: TOKENS.Size,
        notifications: TOKENS.Notifications,
        client_api: TOKENS.ClientAPI,
        popups: TOKENS.Popups,
        context_menu: TOKENS.ContextMenu,
        asset_control: TOKENS.AssetControl,
        sound: TOKENS.Sound,
        audio_manager: TOKENS.AudioManager,
        resource_manager: TOKENS.ResourceManager,
        tree_control: TOKENS.TreeControl,
        control_manager: TOKENS.ControlManager,
        inspector_control: TOKENS.InspectorControl,
        // Контролы редактора
        size_control: TOKENS.SizeControl,
        camera_control: TOKENS.CameraControl,
    };

    return container.try_resolve(token_map[key]) as IServices[K] | undefined;
}
