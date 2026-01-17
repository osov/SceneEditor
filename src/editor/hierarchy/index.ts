/**
 * Hierarchy Module - система дерева иерархии
 *
 * Содержит:
 * - TreeDataService - управление данными дерева
 * - TreeDomRenderer - рендеринг DOM
 * - TreeDragDropHandler - обработка drag-and-drop
 */

// TreeDataService
export {
    create_tree_data_service,
    type ITreeDataService,
    type TreeDataServiceParams,
    type TreeItem,
    type TreeChangesInfo,
} from './TreeDataService';

// TreeDomRenderer
export {
    create_tree_dom_renderer,
    type ITreeDomRenderer,
    type TreeDomRendererParams,
} from './TreeDomRenderer';

// TreeDragDropHandler
export {
    create_tree_drag_drop_handler,
    type ITreeDragDropHandler,
    type TreeDragDropHandlerParams,
    type DropZoneInfo,
} from './TreeDragDropHandler';
