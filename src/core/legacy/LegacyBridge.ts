/**
 * LegacyBridge - мост между legacy глобальными объектами и DI сервисами
 *
 * Регистрирует глобальные объекты (SelectControl, HistoryControl и т.д.)
 * которые делегируют вызовы новым DI сервисам.
 */

import type { IContainer } from '../di/types';
import { TOKENS, ENGINE_TOKENS } from '../di/tokens';
import type { ISelectionService, IHistoryService, IActionsService, ITransformService } from '@editor/editor/types';
import type { ISceneObject, ICameraService } from '@editor/engine/types';
import { ObjectTypes } from '@editor/core/render/types';

/**
 * Регистрация SelectControl как глобального объекта
 */
export function register_legacy_select_control(container: IContainer): void {
    const selection = container.resolve<ISelectionService>(TOKENS.Selection);

    const SelectControl = {
        get_selected_list(): ISceneObject[] {
            return selection.selected;
        },

        set_selected_list(list: ISceneObject[]): void {
            selection.set_selected(list);
        },

        select(mesh: ISceneObject, additive = false): void {
            selection.select(mesh, additive);
        },

        deselect(mesh: ISceneObject): void {
            selection.deselect(mesh);
        },

        clear(): void {
            selection.clear();
        },

        select_all(): void {
            selection.select_all();
        },

        is_selected(mesh: ISceneObject): boolean {
            return selection.is_selected(mesh);
        },

        get_primary(): ISceneObject | null {
            return selection.primary;
        },
    };

    (window as unknown as Record<string, unknown>).SelectControl = SelectControl;
}

/**
 * Регистрация HistoryControl как глобального объекта
 */
export function register_legacy_history_control(container: IContainer): void {
    const history = container.resolve<IHistoryService>(TOKENS.History);

    const HistoryControl = {
        add<T>(type: string, data: T[], _owner?: string): void {
            // Преобразуем legacy формат в новый
            history.push({
                type,
                data: data[0],
                description: type,
                undo: () => {
                    console.warn('[HistoryControl] Legacy undo не полностью поддерживается');
                },
                redo: () => {
                    console.warn('[HistoryControl] Legacy redo не полностью поддерживается');
                },
            });
        },

        undo(): void {
            history.undo();
        },

        redo(): void {
            history.redo();
        },

        can_undo(): boolean {
            return history.can_undo();
        },

        can_redo(): boolean {
            return history.can_redo();
        },

        clear(): void {
            history.clear();
        },
    };

    (window as unknown as Record<string, unknown>).HistoryControl = HistoryControl;
}

/**
 * Регистрация ActionsControl как глобального объекта
 */
export function register_legacy_actions_control(container: IContainer): void {
    const actions = container.resolve<IActionsService>(TOKENS.Actions);

    const ActionsControl = {
        copy(): void {
            actions.copy();
        },

        cut(): void {
            actions.cut();
        },

        paste(_flag1?: boolean, _flag2?: boolean): ISceneObject[] {
            return actions.paste();
        },

        paste_as_child(parent: ISceneObject): ISceneObject[] {
            return actions.paste_as_child(parent);
        },

        duplicate(): ISceneObject[] {
            return actions.duplicate();
        },

        delete_selected(): void {
            actions.delete_selected();
        },

        has_clipboard(): boolean {
            return actions.has_clipboard();
        },

        // Расширенные методы для TreeControl (stubs)
        copy_mesh_list: [] as ISceneObject[],

        duplication(): ISceneObject[] {
            return actions.duplicate();
        },

        remove(): void {
            actions.delete_selected();
        },

        from_the_same_world(_list: unknown[], _treeList: unknown[]): boolean {
            // TODO: Реализовать проверку принадлежности к одному миру
            return true;
        },

        is_valid_action(_item: unknown, _itemSelected?: unknown[], _flag1?: boolean, _flag2?: boolean): boolean {
            // TODO: Реализовать валидацию действий
            return true;
        },

        on_action(action: number, _params?: unknown): void {
            console.warn('[ActionsControl] on_action не реализован:', action);
        },

        add_gui_container(params: Record<string, unknown>): ISceneObject {
            return actions.create(ObjectTypes.GUI_CONTAINER, params);
        },

        add_gui_box(params: Record<string, unknown>): ISceneObject {
            return actions.create(ObjectTypes.GUI_BOX, params);
        },

        add_gui_text(params: Record<string, unknown>): ISceneObject {
            return actions.create(ObjectTypes.GUI_TEXT, params);
        },

        add_go_container(params: Record<string, unknown>): ISceneObject {
            return actions.create(ObjectTypes.GO_CONTAINER, params);
        },

        add_go_sprite(params: Record<string, unknown>): ISceneObject {
            return actions.create(ObjectTypes.GO_SPRITE_COMPONENT, params);
        },

        add_go_sprite_component(params: Record<string, unknown>): ISceneObject {
            return actions.create(ObjectTypes.GO_SPRITE_COMPONENT, params);
        },

        add_go_label(params: Record<string, unknown>): ISceneObject {
            return actions.create(ObjectTypes.GO_LABEL_COMPONENT, params);
        },

        add_go_label_component(params: Record<string, unknown>): ISceneObject {
            return actions.create(ObjectTypes.GO_LABEL_COMPONENT, params);
        },

        add_go_model(params: Record<string, unknown>): ISceneObject {
            return actions.create(ObjectTypes.GO_MODEL_COMPONENT, params);
        },

        add_go_model_component(params: Record<string, unknown>): ISceneObject {
            return actions.create(ObjectTypes.GO_MODEL_COMPONENT, params);
        },

        add_go_animated_model(params: Record<string, unknown>): ISceneObject {
            return actions.create(ObjectTypes.GO_ANIMATED_MODEL_COMPONENT, params);
        },

        add_go_animated_model_component(params: Record<string, unknown>): ISceneObject {
            return actions.create(ObjectTypes.GO_ANIMATED_MODEL_COMPONENT, params);
        },

        add_go_audio(params: Record<string, unknown>): ISceneObject {
            return actions.create(ObjectTypes.GO_AUDIO_COMPONENT, params);
        },

        add_go_audio_component(params: Record<string, unknown>): ISceneObject {
            return actions.create(ObjectTypes.GO_AUDIO_COMPONENT, params);
        },

        add_component(params: Record<string, unknown>, type: number): ISceneObject {
            return actions.create(ObjectTypes.COMPONENT, { ...params, type });
        },

        add_go_with_sprite_component(params: Record<string, unknown>): ISceneObject {
            // Создаём контейнер и добавляем в него спрайт
            const container = actions.create(ObjectTypes.GO_CONTAINER, params);
            actions.create(ObjectTypes.GO_SPRITE_COMPONENT, { ...params, parent_id: container.mesh_data.id });
            return container;
        },

        add_component_spline(params: Record<string, unknown>): ISceneObject {
            // Spline это специальный компонент
            return actions.create(ObjectTypes.COMPONENT, { ...params, type: 1 }); // TODO: определить правильный тип
        },

        add_component_mover(params: Record<string, unknown>): ISceneObject {
            // Mover это специальный компонент
            return actions.create(ObjectTypes.COMPONENT, { ...params, type: 2 }); // TODO: определить правильный тип
        },
    };

    (window as unknown as Record<string, unknown>).ActionsControl = ActionsControl;
}

/**
 * Регистрация ControlManager как глобального объекта (stub)
 */
export function register_legacy_control_manager(): void {
    const ControlManager = {
        draw_graph(): void {
            // Триггерим событие для обновления дерева
            if (typeof EventBus !== 'undefined') {
                EventBus.trigger('SYS_GRAPH_REDRAW', {});
            }
        },

        update_graph(): void {
            // Триггерим событие для обновления дерева
            if (typeof EventBus !== 'undefined') {
                EventBus.trigger('SYS_GRAPH_REDRAW', {});
            }
        },
    };

    (window as unknown as Record<string, unknown>).ControlManager = ControlManager;
}

/**
 * Регистрация AssetControl как глобального объекта (stub)
 */
export function register_legacy_asset_control(): void {
    const AssetControl = {
        async go_to_dir(_dir: string, _create?: boolean): Promise<boolean> {
            console.warn('[AssetControl] go_to_dir не реализован');
            return false;
        },

        select_file(_path: string): void {
            console.warn('[AssetControl] select_file не реализован');
        },

        loadPartOfSceneInPos(_path: string, _pos: unknown): unknown {
            console.warn('[AssetControl] loadPartOfSceneInPos не реализован');
            return null;
        },
    };

    (window as unknown as Record<string, unknown>).AssetControl = AssetControl;
}

/**
 * Регистрация TransformControl как глобального объекта (stub)
 */
export function register_legacy_transform_control(container: IContainer): void {
    const transform = container.resolve<ITransformService>(TOKENS.Transform);

    const TransformControl = {
        set_selected_list(_list: unknown[]): void {
            // TODO: Связать с TransformService
        },

        detach(): void {
            transform.detach();
        },

        set_active(_active: boolean): void {
            // TODO: Реализовать
        },

        set_mode(mode: string): void {
            transform.set_mode(mode as 'translate' | 'rotate' | 'scale');
        },

        set_proxy_in_average_point(_list: unknown[]): void {
            // TODO: Реализовать для множественного выделения
        },

        draw(): void {
            // TODO: Реализовать перерисовку гизмо
        },
    };

    (window as unknown as Record<string, unknown>).TransformControl = TransformControl;
}

/**
 * Регистрация SizeControl как глобального объекта (stub)
 */
export function register_legacy_size_control(): void {
    const SizeControl = {
        set_selected_list(_list: unknown[]): void {
            // TODO: Реализовать через сервис
        },

        detach(): void {
            // TODO: Реализовать
        },

        set_active(_active: boolean): void {
            // TODO: Реализовать
        },

        set_proxy_in_average_point(_list: unknown[]): void {
            // TODO: Реализовать для множественного выделения
        },

        draw(): void {
            // TODO: Реализовать перерисовку размерного контрола
        },
    };

    (window as unknown as Record<string, unknown>).SizeControl = SizeControl;
}

/**
 * Регистрация CameraControl как глобального объекта (stub)
 */
export function register_legacy_camera_control(container: IContainer): void {
    const camera = container.resolve<ICameraService>(ENGINE_TOKENS.Camera);

    const CameraControl = {
        load_state(_name: string): void {
            // TODO: Реализовать загрузку состояния камеры
        },

        get_zoom(): number {
            return camera.get_zoom();
        },
    };

    (window as unknown as Record<string, unknown>).CameraControl = CameraControl;
}

/**
 * Регистрация всех legacy контролов
 */
export function register_all_legacy_controls(container: IContainer): void {
    register_legacy_select_control(container);
    register_legacy_history_control(container);
    register_legacy_actions_control(container);
    register_legacy_transform_control(container);
    register_legacy_size_control();
    register_legacy_camera_control(container);
    register_legacy_asset_control();
}
