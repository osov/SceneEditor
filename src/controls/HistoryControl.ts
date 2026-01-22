import { get_keys } from "../modules/utils";
import type { HistoryData, HistoryDataKeys } from "../shared/history_types";

// Re-export types from shared for backwards compatibility
export type { HistoryData, HistoryDataKeys } from "../shared/history_types";

declare global {
    const HistoryControl: ReturnType<typeof HistoryControlCreate>;
}

export function register_history_control() {
    (window as any).HistoryControl = HistoryControlCreate();
}

interface HistoryDataItem<T extends HistoryDataKeys> {
    type: T
    data: HistoryData[T][]
    owner: number
}

function HistoryControlCreate() {
    const context_data: { [k: string]: HistoryDataItem<HistoryDataKeys>[] } = {};
    function init() {
        EventBus.on('SYS_INPUT_UNDO', () => undo());
    }

    function clear(ctx_name?: string) {
        const current_scene_path = AssetControl.get_current_scene().path;
        const _ctx_name: string | undefined = (ctx_name) ? ctx_name : (current_scene_path) ? current_scene_path : undefined;
        if (_ctx_name && context_data[_ctx_name]) {
            context_data[_ctx_name].splice(0);
        }
    }

    function clear_all() {
        for (const key of get_keys(context_data)) {
            context_data[key].splice(0);
        }
    }

    function get_history(ctx_name?: string) {
        const current_scene_path = AssetControl.get_current_scene().path;
        const _ctx_name: string | undefined = (ctx_name) ? ctx_name : (current_scene_path) ? current_scene_path : undefined;
        if (_ctx_name && context_data[_ctx_name]) {
            return context_data[_ctx_name];
        }
        return [];
    }

    function add<T extends HistoryDataKeys>(type: T, data_list: HistoryData[T][], owner: number) {
        const current_scene_path = AssetControl.get_current_scene().path;
        const ctx_name = (current_scene_path) ? current_scene_path : 'test';
        let ctx = context_data[ctx_name];
        if (ctx == undefined)
            context_data[ctx_name] = [];
        context_data[ctx_name].push({ type, data: data_list, owner });
    }

    async function undo() {
        const current_scene_path = AssetControl.get_current_scene().path;
        const ctx_name = (current_scene_path) ? current_scene_path : 'test';
        let ctx = context_data[ctx_name];
        if (!ctx || ctx.length == 0)
            return;
        const last = ctx.pop()!;
        const type = last.type;
        const owner = last.owner;
        const data = last.data;
        EventBus.trigger('SYS_HISTORY_UNDO', { type, data, owner });
    }

    init();
    return { add, undo, clear, clear_all, get_history };
}