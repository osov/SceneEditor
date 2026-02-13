# План: Исправление бага _TpError при Ctrl+Z uniform-свойств

## Context

**Баг**: Выбрал меш → изменил alpha (uniform) → выбрал другой меш → нажал Ctrl+Z → ошибка `Ошибка в обработчике события selection:mesh_list: _TpError`, меш исчез.

**Причина**: Двойной вызов `set_selected_list()` при undo uniform-свойства.

### Цепочка вызовов при Ctrl+Z

1. `HistoryService.undo()` вызывает `action.undo(data)` (строка 73, HistoryService.ts)
2. Внутри `action.undo()` (history_savers.ts:286-310):
   - Восстанавливает uniform-значения через `Services.resources.set_material_uniform_for_mesh()`
   - Вызывает `on_rebuild_inspector()` → это **`set_selected_list(_selected_list)`** (1-й вызов)
   - `set_selected_list` вызывает `clear()` (dispose Tweakpane) → `setData()` (пересоздаёт)
3. `HistoryService.undo()` затем emit `history:undo` (строка 75, HistoryService.ts)
4. `InspectorControl` подписан на `history:undo` (строка 295-296):
   - Вызывает `set_selected_list(_selected_list)` повторно (2-й вызов)
   - `clear()` пытается dispose уже пересозданные компоненты Tweakpane → **`_TpError`**

### Почему `on_rebuild_inspector` избыточен

Обработчик `history:undo` в InspectorControl (строка 295) **уже** вызывает `set_selected_list(_selected_list)` для обновления инспектора после любого undo. Callback `on_rebuild_inspector` в `save_uniform` дублирует эту работу.

Сравнение с `save_alpha` (visual_history.ts) подтверждает: `save_alpha` НЕ использует `on_rebuild_inspector` — полагается только на событие `history:undo`.

---

## Изменения

### Файл 1: `src/modules_editor/inspector_control/history_savers.ts`

**Убрать параметр `on_rebuild_inspector` и его вызов из `save_uniform`.**

Строка 214-218 — сигнатура функции:
```typescript
// БЫЛО:
export function save_uniform(
    ids: number[],
    field: PropertyData<PropertyType>,
    ctx: HistorySaverContext,
    on_rebuild_inspector: () => void
)

// СТАЛО:
export function save_uniform(
    ids: number[],
    field: PropertyData<PropertyType>,
    ctx: HistorySaverContext,
)
```

Строка 308-309 — убрать вызов callback внутри undo:
```typescript
// БЫЛО:
            }
            // Обновляем инспектор для отображения восстановленных значений
            on_rebuild_inspector();

// СТАЛО:
            }
            // Инспектор обновится через обработчик события history:undo в InspectorControl
```

### Файл 2: `src/modules_editor/InspectorControl.ts`

**Убрать передачу callback при вызове `save_uniform`.**

Строка 563:
```typescript
// БЫЛО:
save_uniform(info.ids, info.field, ctx, () => set_selected_list(_selected_list));

// СТАЛО:
save_uniform(info.ids, info.field, ctx);
```

**Добавить защиту в `clear()` от ошибок Tweakpane.**

Строка 788-790:
```typescript
// БЫЛО:
function clear() {
    _inspector.children.forEach((value) => value.dispose());
}

// СТАЛО:
function clear() {
    _inspector.children.forEach((value) => {
        try {
            value.dispose();
        } catch {
            // Tweakpane может бросить _TpError при повторном dispose
        }
    });
}
```

---

## Проверка

1. `tsc --noEmit` — компиляция без ошибок
2. В браузере:
   - Выбрать меш с материалом (test_sprite или test_model)
   - Изменить uniform-свойство (alpha/color)
   - Выбрать другой меш
   - Нажать Ctrl+Z
   - **Ожидание**: ошибки нет, uniform восстановлен, инспектор показывает текущий выделенный меш
3. Проверить консоль — нет `_TpError`

---

## Критические файлы

| Файл | Что меняем |
|------|-----------|
| `src/modules_editor/inspector_control/history_savers.ts` | Убрать `on_rebuild_inspector` параметр и вызов |
| `src/modules_editor/InspectorControl.ts` | Убрать callback из `save_uniform()`, защитить `clear()` |
