# Система событий SceneEditor

## Обзор

SceneEditor использует две системы событий:
- **Legacy EventBus** (`window.EventBus`) - старая система для обратной совместимости
- **Новый EventBus** (`src/core/events/EventBus.ts`) - новая система через DI

`EventBusBridge` обеспечивает двунаправленную трансляцию между ними.

## Новые события (рекомендуемые)

### Выделение
| Событие | Данные | Описание |
|---------|--------|----------|
| `selection:changed` | `{ selected: ISceneObject[] }` | Изменён список выделенных объектов |
| `selection:cleared` | `{}` | Выделение очищено |

### Иерархия
| Событие | Данные | Описание |
|---------|--------|----------|
| `hierarchy:selected` | `{ id: number }` | Выбран узел в иерархии |
| `hierarchy:moved` | `{ ids: number[], parent_id: number, next_id: number }` | Объекты перемещены |
| `hierarchy:renamed` | `{ id: number, name: string }` | Объект переименован |
| `hierarchy:visibility_changed` | `{ id: number, visible: boolean }` | Видимость изменена |
| `hierarchy:refresh_requested` | `{}` | Запрос обновления дерева |

### Трансформация
| Событие | Данные | Описание |
|---------|--------|----------|
| `transform:mode_changed` | `{ mode: 'translate' \| 'rotate' \| 'scale' }` | Режим трансформации изменён |
| `transform:space_changed` | `{ space: 'local' \| 'world' }` | Пространство изменено |
| `transform:translate` | `{ objects: ISceneObject[], delta: Vector3 }` | Перемещение объектов |
| `transform:rotate` | `{ objects: ISceneObject[], delta: Quaternion }` | Вращение объектов |
| `transform:scale` | `{ objects: ISceneObject[], delta: Vector3 }` | Масштабирование объектов |

### История
| Событие | Данные | Описание |
|---------|--------|----------|
| `history:undo_requested` | `{}` | Запрос отмены |
| `history:undone` | `{ type: string }` | Отмена выполнена |
| `history:pushed` | `{ type: string, description: string }` | Действие добавлено в историю |

### Сцена
| Событие | Данные | Описание |
|---------|--------|----------|
| `scene:object_added` | `{ object: ISceneObject }` | Объект добавлен |
| `scene:object_removed` | `{ id: number }` | Объект удалён |
| `scene:save_requested` | `{}` | Запрос сохранения |

### Ассеты
| Событие | Данные | Описание |
|---------|--------|----------|
| `assets:clicked` | `{ asset: AssetInfo }` | Клик по ассету |
| `assets:textures_selected` | `{ textures: TextureInfo[] }` | Выбраны текстуры |
| `assets:materials_selected` | `{ materials: MaterialInfo[] }` | Выбраны материалы |

### Инспектор
| Событие | Данные | Описание |
|---------|--------|----------|
| `inspector:update_requested` | `{}` | Запрос обновления инспектора |

### Горячие клавиши
| Событие | Данные | Описание |
|---------|--------|----------|
| `keybinding:triggered` | `{ key: string, binding: Keybinding }` | Горячая клавиша нажата |
| `keybinding:context_changed` | `{ context: KeybindingContext }` | Контекст изменён |

## Legacy события (для совместимости)

| Legacy событие | Новое событие |
|----------------|---------------|
| `SYS_SELECTED_MESH_LIST` | `selection:changed` |
| `SYS_CLEAR_SELECT_MESH_LIST` | `selection:cleared` |
| `SYS_GRAPH_ADD` | `scene:object_added` |
| `SYS_GRAPH_REMOVE` | `scene:object_removed` |
| `SYS_GRAPH_MOVED_TO` | `hierarchy:moved` |
| `SYS_INPUT_UNDO` | `history:undo_requested` |
| `SYS_INPUT_SAVE` | `scene:save_requested` |

## Использование

### Подписка на новые события
```typescript
const { event_bus } = await bootstrap({ ... });

event_bus.on('selection:changed', (data) => {
    console.log('Выбрано:', data.selected);
});
```

### Отправка событий
```typescript
event_bus.emit('transform:mode_changed', { mode: 'rotate' });
```

### Через EventBusBridge
Мост автоматически транслирует события между системами.
Legacy код продолжит работать без изменений.

## Горячие клавиши

Все горячие клавиши обрабатываются через `KeybindingsService` (поддержка русской раскладки автоматически):

### Трансформация
| Клавиша | Действие |
|---------|----------|
| `W` | Режим перемещения |
| `E` | Режим вращения |
| `R` | Режим масштабирования |

### Редактирование
| Клавиша | Действие |
|---------|----------|
| `Ctrl+C` | Копировать |
| `Ctrl+X` | Вырезать |
| `Ctrl+V` | Вставить |
| `Ctrl+B` | Вставить как дочерний |
| `Ctrl+D` | Дублировать |
| `Delete` | Удалить |

### Навигация
| Клавиша | Действие |
|---------|----------|
| `F` | Фокус на объекте |
| `F2` | Переименовать |
| `I` | Подсветить идентичные |
| `Escape` | Отмена операции |

### История и сохранение
| Клавиша | Действие |
|---------|----------|
| `Ctrl+Z` | Отменить (HistoryControl.undo) |
| `Ctrl+S` | Сохранить (SYS_INPUT_SAVE) |

## Статус миграции

### Мигрированные контролы
| Контрол | Статус | Заметки |
|---------|--------|---------|
| `ViewControl` | ✅ Удалён | Все клавиши в KeybindingsService |
| `InputManager` | ✅ Частично | Ctrl+Z/S в KeybindingsService |

### Legacy контролы (интеграция через EventBusBridge)
| Контрол | События | Заметки |
|---------|---------|---------|
| `SelectControl` | `selection:changed`, `selection:cleared` | Raycast + выделение |
| `ActionsControl` | Вызывается из KeybindingsService | Copy/paste/delete |
| `HistoryControl` | `history:pushed`, `history:undone` | Undo с типизацией |
| `TreeControl` | `hierarchy:*` | Дерево иерархии |
| `TransformControl` | `transform:*` | Gizmo трансформации |

## DI Адаптеры

Адаптеры позволяют использовать legacy код через новую DI систему:

### Зарегистрированные адаптеры
| Токен | Адаптер | Legacy |
|-------|---------|--------|
| `TOKENS.Render` | `LegacyRenderAdapter` | `RenderEngine` |
| `TOKENS.Scene` | `LegacySceneAdapter` | `SceneManager` |
| `TOKENS.Selection` | `LegacySelectionAdapter` | `SelectControl` |
| `TOKENS.History` | `LegacyHistoryAdapter` | `HistoryControl` |

### Использование через DI
```typescript
// Получение сервисов через контейнер
const render = container.resolve<IRenderService>(TOKENS.Render);
const scene = container.resolve<ISceneService>(TOKENS.Scene);
const selection = container.resolve<ISelectionService>(TOKENS.Selection);
const history = container.resolve<IHistoryService>(TOKENS.History);

// Использование
const selected = selection.selected;
scene.create('go', { name: 'test' });
history.undo();
```
