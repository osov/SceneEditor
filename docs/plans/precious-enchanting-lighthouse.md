# План: Комплексное тестирование инспектора SceneEditor

## Context

Необходимо провести полное ручное тестирование всех типов объектов и свойств в инспекторе SceneEditor, включая ассет-инспектор (текстуры, материалы), undo/redo и multi-select. Тестирование через Playwright MCP в браузере.

## Подготовка

1. Запустить dev-сервер: `bun run dev --project=../SceneEditor_ExampleProject`
2. Открыть Playwright браузер на `http://localhost:5173`
3. Дождаться полной загрузки сцены (canvas `#scene`, дерево `.tree_div`)

## Тестовые сценарии

### 1. Дерево объектов (TreeControl)

- **1.1** Проверить отображение дерева в `.tree_div` — наличие элементов `.tree__item`
- **1.2** Проверить что каждый объект имеет иконку `.tree__ico` и имя `.tree__item_name`
- **1.3** Клик по объекту в дереве — проверить подсветку выделения (класс `.bg`)

### 2. Object Inspector — по типам объектов

Для каждого типа: кликнуть объект в дереве → проверить что инспектор `.inspector__body` показывает нужные группы свойств.

#### 2.1 GO_SPRITE_COMPONENT (sprite)
**Ожидаемые группы**: base, transform, graphics, flip, uniforms (если есть кастомный материал)
**Свойства для проверки**:
- base: NAME (строка), ACTIVE (чекбокс)
- transform: POSITION (vec3), ROTATION (vec3), SCALE (vec2), SIZE (vec2), PIVOT (список)
- graphics: COLOR (цвет), ALPHA (число 0-1), TEXTURE (список текстур с превью), ATLAS (список), MATERIAL (список), BLEND_MODE (список), SLICE9 (point2d)
- flip: FLIP_VERTICAL, FLIP_HORIZONTAL, FLIP_DIAGONAL (чекбоксы)

#### 2.2 GO_LABEL_COMPONENT (label)
**Ожидаемые группы**: base, transform, text, graphics
**Свойства для проверки**:
- text: TEXT (многострочный), FONT (список), FONT_SIZE (число), TEXT_ALIGN (список), LINE_HEIGHT (число)

#### 2.3 GO_MODEL_COMPONENT (model)
**Ожидаемые группы**: base, transform, model, uniforms
**Свойства для проверки**:
- model: MESH_NAME (список), MODEL_SCALE (число)
- uniforms: зависит от материала модели

#### 2.4 GO_ANIMATED_MODEL_COMPONENT (animated_model)
**Ожидаемые группы**: base, transform, model (с анимациями)
**Свойства для проверки**:
- model: + CURRENT_ANIMATION (список), ANIMATIONS (item_list)

#### 2.5 GO_AUDIO_COMPONENT (audio)
**Ожидаемые группы**: base, transform, audio
**Свойства для проверки**:
- audio: SOUND (список), VOLUME (слайдер), LOOP (чекбокс), PAN (слайдер), SPEED (число)
- audio: SOUND_RADIUS, MAX_VOLUME_RADIUS, SOUND_FUNCTION, ZONE_TYPE
- audio: AUDIO_PLAY_PAUSE (кнопка), AUDIO_STOP (кнопка)

#### 2.6 GO_CONTAINER (go)
**Ожидаемые группы**: base, transform
**Свойства**: только базовые + трансформация

#### 2.7 GUI_BOX (box)
**Ожидаемые группы**: base, transform, anchor, graphics
**Свойства**: + ANCHOR (point2d), ANCHOR_PRESET (список)

#### 2.8 GUI_TEXT (text)
**Ожидаемые группы**: base, transform, anchor, text
**Свойства**: + текстовые свойства + якорь

#### 2.9 SLICE9_PLANE (base_slice9)
**Ожидаемые группы**: base, transform, graphics
**Свойства**: + SLICE9 (point2d)

### 3. Изменение свойств

Для каждого типа виджета проверить изменение значения:

| Тип виджета | Тест |
|------------|------|
| NUMBER | Ввести число, проверить что оно применилось |
| VECTOR_2 | Изменить X и Y компоненты |
| VECTOR_3 | Изменить X, Y, Z компоненты |
| BOOLEAN | Переключить чекбокс |
| COLOR | Открыть пикер, изменить цвет |
| STRING | Ввести текст |
| SLIDER | Перетащить слайдер |
| LIST_TEXT | Выбрать другой элемент из списка |
| LIST_TEXTURES | Выбрать другую текстуру |
| POINT_2D | Изменить координаты |
| LOG_DATA | Ввести многострочный текст |
| BUTTON | Кликнуть кнопку |

### 4. Asset Inspector — текстуры

- **4.1** Кликнуть текстуру в ассет-панели (нижняя панель `.menu_footer`)
- **4.2** Проверить инспектор показывает: ASSET_ATLAS (список), ATLAS_BUTTON (кнопка), MIN_FILTER (список), MAG_FILTER (список)
- **4.3** Изменить ASSET_ATLAS — проверить что атлас текстуры обновился
- **4.4** Изменить MIN_FILTER — переключить nearest/linear
- **4.5** Изменить MAG_FILTER — переключить nearest/linear

### 5. Asset Inspector — материалы

- **5.1** Кликнуть материал в ассет-панели
- **5.2** Проверить инспектор показывает: VERTEX_PROGRAM (список), FRAGMENT_PROGRAM (список), TRANSPARENT (чекбокс)
- **5.3** Проверить uniform-поля материала (зависит от шейдеров): UNIFORM_FLOAT, UNIFORM_COLOR, UNIFORM_SAMPLER2D и т.д.
- **5.4** Изменить uniform значение — проверить обновление

### 6. Undo/Redo (Ctrl+Z / Ctrl+Shift+Z)

- **6.1** Выбрать sprite → изменить POSITION → Ctrl+Z → проверить позиция вернулась
- **6.2** Выбрать sprite → изменить COLOR → Ctrl+Z → проверить цвет вернулся
- **6.3** Выбрать sprite → изменить ALPHA → Ctrl+Z → проверить alpha вернулась
- **6.4** Выбрать sprite → изменить TEXTURE → Ctrl+Z → проверить текстура вернулась
- **6.5** Изменить uniform → выбрать другой объект → Ctrl+Z → **НЕТ _TpError** (основной баг-фикс)
- **6.6** Redo: после Ctrl+Z нажать Ctrl+Shift+Z — значение восстановилось

### 7. Multi-select

- **7.1** Выбрать несколько объектов одного типа (Ctrl+Click)
- **7.2** Проверить инспектор показывает общие свойства
- **7.3** Изменить свойство — проверить что оно применилось ко всем выбранным

### 8. Очистка инспектора

- **8.1** Кликнуть на пустое место — инспектор очищается
- **8.2** Переключение между mesh и asset — инспектор обновляется корректно

## CSS Селекторы для Playwright

```
Дерево:          .tree_div, a.tree__item, .tree__item_name
Инспектор:       .inspector__body
Tweakpane лейбл: .tp-lblv_l
Tweakpane input:  .tp-txtv_i
Tweakpane folder: .tp-fldv
Tweakpane slider: .tp-sldv
Tweakpane color:  .tp-colswv
Tweakpane list:   .tp-lstv
Tweakpane button: .tp-btnv
Canvas:          canvas#scene
```

## Критические файлы

| Файл | Роль |
|------|------|
| `src/modules_editor/InspectorControl.ts` | Главный контроллер инспектора |
| `src/modules_editor/inspector_control/types.ts` | PropertyType enum |
| `src/core/inspector/IInspectable.ts` | Property enum |
| `src/modules_editor/inspector_control/selection_handler.ts` | Asset selection |
| `src/modules_editor/inspector_control/history_savers.ts` | History savers |
| `src/editor/inspector/handlers/` | Все handlers |

## Порядок выполнения

1. Запустить dev-сервер в фоне
2. Открыть Playwright, перейти на `http://localhost:5173`
3. Сделать скриншот начальной загрузки
4. Последовательно пройти тесты 1-8, делая скриншоты на каждом шаге
5. Фиксировать ошибки в консоли браузера через `browser_console_messages`
6. Сформировать отчёт с результатами
