/**
 * TreeControl - UI контрол для отображения иерархии сцены
 *
 * Реэкспорт из tree_control/ для обратной совместимости.
 * Вся логика теперь в src/modules_editor/tree_control/
 */

export {
    get_tree_control,
    register_tree_control,
    type TreeControlType,
    type TreeItem,
    type TreeMeshObject,
    type TreeContexts,
    type MovedListResult,
    type TreeState,
} from './tree_control';
