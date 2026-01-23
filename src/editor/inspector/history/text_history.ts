/**
 * История текстовых свойств: text, font, text_align, line_height
 */

import { Services } from '@editor/core';
import type { IBaseMeshAndThree } from '../../../render_engine/types';
import type {
    TextEventData,
    FontEventData,
    TextAlignEventData,
    LineHeightEventData,
} from '../../../modules_editor/InspectorTypes';
import type { HistoryModuleDeps } from './types';

/** Создать функции истории текстовых свойств */
export function create_text_history(deps: HistoryModuleDeps) {
    const { get_mesh, push_history } = deps;

    function save_text(ids: number[]): void {
        const texts: TextEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_text] Mesh not found for id:', id);
                continue;
            }
            const text_mesh = mesh as { text?: string };
            if (text_mesh.text !== undefined) {
                texts.push({ id_mesh: id, text: text_mesh.text });
            }
        }

        push_history(
            'MESH_TEXT',
            'Изменение текста',
            texts,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { set_text?: (t: string) => void } | undefined;
                    if (m !== undefined && typeof m.set_text === 'function') {
                        m.set_text(item.text);
                    }
                }
            },
            (items) => {
                const current: TextEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { text?: string } | undefined;
                    if (m !== undefined && m.text !== undefined) {
                        current.push({ id_mesh: item.id_mesh, text: m.text });
                    }
                }
                return current;
            }
        );
    }

    function save_font(ids: number[]): void {
        const fonts: FontEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_font] Mesh not found for id:', id);
                continue;
            }
            const text_mesh = mesh as { parameters?: { font?: string } };
            if (text_mesh.parameters?.font !== undefined) {
                fonts.push({ id_mesh: id, font: text_mesh.parameters.font });
            }
        }

        push_history(
            'MESH_FONT',
            'Изменение шрифта',
            fonts,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { set_font?: (f: string) => void } | undefined;
                    if (m !== undefined && typeof m.set_font === 'function') {
                        m.set_font(item.font);
                    }
                }
            },
            (items) => {
                const current: FontEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { parameters?: { font?: string } } | undefined;
                    if (m !== undefined && m.parameters?.font !== undefined) {
                        current.push({ id_mesh: item.id_mesh, font: m.parameters.font });
                    }
                }
                return current;
            }
        );
    }

    function save_text_align(ids: number[]): void {
        const aligns: TextAlignEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_text_align] Mesh not found for id:', id);
                continue;
            }
            const text_mesh = mesh as { textAlign?: 'left' | 'right' | 'center' | 'justify' };
            if (text_mesh.textAlign !== undefined) {
                aligns.push({ id_mesh: id, text_align: text_mesh.textAlign });
            }
        }

        push_history(
            'MESH_TEXT_ALIGN',
            'Изменение выравнивания',
            aligns,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { textAlign?: string } | undefined;
                    if (m !== undefined) {
                        m.textAlign = item.text_align;
                    }
                }
            },
            (items) => {
                const current: TextAlignEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { textAlign?: 'left' | 'right' | 'center' | 'justify' } | undefined;
                    if (m !== undefined && m.textAlign !== undefined) {
                        current.push({ id_mesh: item.id_mesh, text_align: m.textAlign });
                    }
                }
                return current;
            }
        );
    }

    function save_line_height(ids: number[]): void {
        const heights: LineHeightEventData[] = [];
        for (const id of ids) {
            const mesh = get_mesh(id);
            if (mesh === undefined) {
                Services.logger.error('[save_line_height] Mesh not found for id:', id);
                continue;
            }
            const text_mesh = mesh as { lineHeight?: number };
            if (text_mesh.lineHeight !== undefined) {
                heights.push({ id_mesh: id, line_height: text_mesh.lineHeight });
            }
        }

        push_history(
            'MESH_LINE_HEIGHT',
            'Изменение высоты строки',
            heights,
            (items) => {
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { lineHeight?: number } | undefined;
                    if (m !== undefined) {
                        m.lineHeight = item.line_height;
                    }
                }
            },
            (items) => {
                const current: LineHeightEventData[] = [];
                for (const item of items) {
                    const m = Services.scene.get_by_id(item.id_mesh) as IBaseMeshAndThree & { lineHeight?: number } | undefined;
                    if (m !== undefined && m.lineHeight !== undefined) {
                        current.push({ id_mesh: item.id_mesh, line_height: m.lineHeight });
                    }
                }
                return current;
            }
        );
    }

    return {
        save_text,
        save_font,
        save_text_align,
        save_line_height,
    };
}
