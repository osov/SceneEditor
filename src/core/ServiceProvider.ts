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
} from '../editor/types';
import type { IRenderService, ISceneService, ICameraService, IResourceService } from '../engine/types';
import type { IInputService } from './services/InputService';
import type { IUIService } from '../editor/UIService';
import type { IInspectorService } from '../editor/InspectorService';
import type { IAssetService } from '../editor/AssetService';

/** Типы сервисов для типобезопасности */
export interface IServices {
    /** Сервис логирования */
    readonly logger: ILogger;
    /** Шина событий */
    readonly event_bus: IEventBus;
    /** Сервис ввода */
    readonly input: IInputService;
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
    };

    return container.try_resolve(token_map[key]) as IServices[K] | undefined;
}
