# Система событий SceneEditor

## Обзор

SceneEditor использует единый EventBus из DI системы (`src/core/events/EventBus.ts`).

Все события используют формат `namespace:event` для ясности и группировки.

## События

### Ввод (input:*)
| Событие | Данные | Описание |
|---------|--------|----------|
| `input:key_down` | `{ key: string, target: EventTarget \| null }` | Клавиша нажата |
| `input:key_up` | `{ key: string, target: EventTarget \| null }` | Клавиша отпущена |
| `input:pointer_move` | `{ x: number, y: number, offset_x: number, offset_y: number, target: EventTarget \| null }` | Указатель перемещён |
| `input:pointer_down` | `{ x: number, y: number, offset_x: number, offset_y: number, button: number, target: EventTarget \| null }` | Кнопка мыши нажата |
| `input:pointer_up` | `{ x: number, y: number, offset_x: number, offset_y: number, button: number, target: EventTarget \| null }` | Кнопка мыши отпущена |
| `input:dblclick` | `{ x: number, y: number, offset_x: number, offset_y: number, button: number, target: EventTarget \| null }` | Двойной клик |

### Выделение (selection:*)
| Событие | Данные | Описание |
|---------|--------|----------|
| `selection:mesh_list` | `{ list: IBaseMeshAndThree[] }` | Список выделенных мешей изменён |
| `selection:cleared` | `{}` | Выделение очищено |

### Иерархия (hierarchy:*)
| Событие | Данные | Описание |
|---------|--------|----------|
| `hierarchy:selected` | `{ list: number[] }` | Выбраны узлы в иерархии |
| `hierarchy:clicked` | `{ id: number }` | Клик по узлу в дереве |
| `hierarchy:moved` | `{ pid: number, next_id: number, id_mesh_list: number[] }` | Объекты перемещены |
| `hierarchy:renamed` | `{ id: number, name: string }` | Объект переименован |
| `hierarchy:visibility_changed` | `{ list: number[], state: boolean }` | Видимость изменена |
| `hierarchy:active` | `{ list: { id: number, visible: boolean }[], state: boolean }` | Активность изменена |

### Трансформация (transform:*)
| Событие | Данные | Описание |
|---------|--------|----------|
| `transform:mode_changed` | `{ mode: 'translate' \| 'rotate' \| 'scale' }` | Режим трансформации изменён |
| `transform:started` | `{}` | Трансформация начата |
| `transform:ended` | `{}` | Трансформация завершена |

### История (history:*)
| Событие | Данные | Описание |
|---------|--------|----------|
| `history:undone` | `{ type: string, data: any[], owner: number }` | Отмена выполнена |
| `history:pushed` | `{ type: string, description: string }` | Действие добавлено в историю |

### Сцена (scene:*)
| Событие | Данные | Описание |
|---------|--------|----------|
| `scene:object_added` | `{ id: number, list: number[], type: string \| number }` | Объект добавлен |
| `scene:object_removing` | `{ id: number }` | Объект удаляется |
| `scene:object_removed` | `{ id: number }` | Объект удалён |

### Движок (engine:*)
| Событие | Данные | Описание |
|---------|--------|----------|
| `engine:update` | `{ dt: number }` | Начало кадра обновления |
| `engine:update_end` | `{ dt: number }` | Конец кадра обновления |

### Ассеты (assets:*)
| Событие | Данные | Описание |
|---------|--------|----------|
| `assets:textures_selected` | `{ paths: string[] }` | Выбраны текстуры |
| `assets:materials_selected` | `{ paths: string[] }` | Выбраны материалы |
| `assets:selection_cleared` | `{}` | Выбор ассетов очищен |
| `assets:atlas_changed` | `{}` | Атлас изменён |
| `assets:layer_changed` | `{}` | Слой изменён |

### Материалы (materials:*)
| Событие | Данные | Описание |
|---------|--------|----------|
| `materials:changed` | `{ material_name: string, is_uniform: boolean, property: string, value: any }` | Материал изменён |

### Инспектор (inspector:*)
| Событие | Данные | Описание |
|---------|--------|----------|
| `inspector:update` | `{}` | Запрос обновления инспектора |

### Редактор (editor:*)
| Событие | Данные | Описание |
|---------|--------|----------|
| `editor:save` | `{}` | Запрос сохранения |

### Горячие клавиши (keybinding:*)
| Событие | Данные | Описание |
|---------|--------|----------|
| `keybinding:triggered` | `{ key: string, binding: Keybinding }` | Горячая клавиша нажата |

## Использование

### Подписка на события
```typescript
import { Services } from '@editor/core';

Services.event_bus.on('selection:mesh_list', (data) => {
    console.log('Выбрано:', data.list);
});
```

### Отправка событий
```typescript
Services.event_bus.emit('transform:mode_changed', { mode: 'rotate' });
```

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
| `Ctrl+D` | Дублировать |
| `Delete` | Удалить |
| `Ctrl+A` | Выделить всё |

### Навигация
| Клавиша | Действие |
|---------|----------|
| `F` | Фокус на объекте |
| `Escape` | Отмена операции |

### История и сохранение
| Клавиша | Действие |
|---------|----------|
| `Ctrl+Z` | Отменить |
| `Ctrl+Y` | Повторить |
| `Ctrl+S` | Сохранить |

## DI Сервисы

Все сервисы доступны через объект `Services`:

```typescript
import { Services } from '@editor/core';

// Логирование
Services.logger.debug('Отладочное сообщение');

// Шина событий
Services.event_bus.emit('my:event', { data: 123 });

// Ввод
Services.input.is_control(); // Ctrl нажат?
Services.input.is_shift();   // Shift нажат?

// Сцена
Services.scene.get_by_id(123);
Services.scene.create('go', { name: 'test' });

// Рендеринг
Services.render.scene;       // Three.js Scene
Services.render.camera;      // Three.js Camera
Services.render.renderer;    // Three.js WebGLRenderer

// Время
Services.time.dt;            // Delta time
Services.time.elapsed;       // Общее время
```

### Использование через DI контейнер
```typescript
import { get_container, TOKENS } from '@editor/core';

const container = get_container();
const render = container.resolve<IRenderService>(TOKENS.Render);
const scene = container.resolve<ISceneService>(TOKENS.Scene);
```
