# Добавление нового инспектора

Инспектор отвечает за отображение и редактирование свойств выбранных объектов.

## Состоит из:
1. Основного модуля `Inspector`, который управляет UI и свойствами
2. Конкретных реализаций инспекторов (например `ObjectInspector` и `AssetInspector`), которые определяют, какие свойства показывать и как их обрабатывать

## Пошаговое руководство

### 1. Создание нового файла инспектора

Создать например `NewInspector.ts` в `src/inspectors`.

### 2. Определение свойств инспектора

Можно описать для удобства enum для свойств:

```typescript
export enum NewInspectorProperty {
    PROPERTY_1 = 'new_property_1',
    PROPERTY_2 = 'new_property_2',
    // остальные свойства ...
}
```

Желательно использовать перфикс инспектора для которого описываются свойства, чтобы не было колизий имен между инспекторами.

### 3. Создание конфигурации инспектора

Определить конфигурацию инспектора используя `InspectorGroup[]`:

```typescript
function NewInspectorCreate() {
    const _config: InspectorGroup[] = [
        {
            name: 'group_name',
            title: 'Название группы',
            property_list: [
                {
                    name: NewInspectorProperty.PROPERTY_1,
                    title: 'Свойство 1',
                    type: PropertyType.STRING,
                    onSave: saveProperty1,
                    onUpdate: updateProperty1
                },
                // остальные свойства ...
            ]
        }
    ];

    // Переменные состояния если нужно
    let _selected_items: any[] = [];

    // Инициализация инспектора
    function init() {
        subscribe();
    }

    // Подписка на соответствующие события
    function subscribe() {
        EventBus.on('SYS_NEW_SELECTED', (data: { items: any[] }) => {
            set_selected_items(data.items);
        });
    }

    // Обработка изменений выбора
    function set_selected_items(items: any[]) {
        _selected_items = items;
        
        // Преобразовываем свои поля во внутринние типы
        const data = items.map((item, id) => {
            return {
                id,
                data: [
                    { name: NewInspectorProperty.PROPERTY_1, data: item.property1 },
                    // остальные свойства ...
                ]
            };
        });

        // Очищаем инспектор
        Inspector.clear();
        // Устанавливаем поля
        Inspector.setData(data, _config);
    }

    // Добавить обработчики сохранения и обновления для каждого свойства
    function saveProperty1(info: BeforeChangeInfo[]) {
        // Обработка сохранения свойства
    }

    function updateProperty1(info: ChangeInfo) {
        // Обработка обновления свойства
    }

    init();
    return {};
}
```

### 4. Регистрация инспектора

Добавить функцию регистрации, чтобы сделать инспектор доступным глобально:

```typescript
declare global {
    const NewInspector: ReturnType<typeof NewInspectorCreate>;
}

export function register_new_inspector() {
    (window as any).NewInspector = NewInspectorCreate();
}
```

### 5. Подключение к редактору

Добавить вызов регистрации в `main.ts`:

```typescript
import { register_new_inspector } from './inspectors/NewInspector';

// желательно в конец, чтобы успели инициализироваться остальные модули и контролы
register_new_inspector();
```

## Типы свойств

Поддерживаемые типы свойст:

- `NUMBER`: Для числовых значений
- `VECTOR_2`, `VECTOR_3`, `VECTOR_4`: Для векторных значений
- `BOOLEAN`: Для значений true/false
- `COLOR`: Для цветовых значений
- `STRING`: Для текстовых значений
- `SLIDER`: Для числовых значений с ползунком
- `LIST_TEXT`: Для выпадающих списков текста
- `LIST_TEXTURES`: Для выбора текстур
- `BUTTON`: Для кнопок действий
- `POINT_2D`: Для выбора 2D точек
- `LOG_DATA`: Для многострочного текста

## Внимание

1. **Группировка связанных свойств**: Использовать структуру `InspectorGroup` для организации связанных свойств в логические группы.

2. **Обработка множественного выбора**: Убедится, что инспектор может обрабатывать множественный выбор элементов:
   - Показывать прочерки для свойств с разными значениями
   - Правильно обрабатывать обновления для всех выбранных элементов

3. **Обработка событий**:
   - Использовать `onSave` для захвата начального состояния перед изменениями
   - Использовать `onUpdate` для применения изменений к выбранным элементам
   - Использовать `onRefresh` для обновления значений свойств при необходимости

## Пример реализации

Вот упрощенный пример нового инспектора:

```typescript
export enum NewInspectorProperty {
    NAME = 'new_name',
    VALUE = 'new_value',
    ENABLED = 'new_enabled'
}

function NewInspectorCreate() {
    const _config: InspectorGroup[] = [
        {
            name: 'basic',
            title: 'Основные свойства',
            property_list: [
                {
                    name: NewInspectorProperty.NAME,
                    title: 'Имя',
                    type: PropertyType.STRING,
                    onSave: saveName,
                    onUpdate: updateName
                },
                {
                    name: NewInspectorProperty.VALUE,
                    title: 'Значение',
                    type: PropertyType.NUMBER,
                    params: { min: 0, max: 100, step: 1 },
                    onSave: saveValue,
                    onUpdate: updateValue
                },
                {
                    name: NewInspectorProperty.ENABLED,
                    title: 'Включено',
                    type: PropertyType.BOOLEAN,
                    onSave: saveEnabled,
                    onUpdate: updateEnabled
                }
            ]
        }
    ];

    let _selected_items: any[] = [];

    function init() {
        subscribe();
    }

    function subscribe() {
        EventBus.on('SYS_NEW_SELECTED', (data: { items: any[] }) => {
            set_selected_items(data.items);
        });
    }

    function set_selected_items(items: any[]) {
        _selected_items = items;
        
        const data = items.map((item, id) => ({
            id,
            data: [
                { name: NewInspectorProperty.NAME, data: item.name },
                { name: NewInspectorProperty.VALUE, data: item.value },
                { name: NewInspectorProperty.ENABLED, data: item.enabled }
            ]
        }));

        Inspector.clear();
        Inspector.setData(data, _config);
    }

    // Добавьте обработчики сохранения и обновления...

    init();
    return {};
}

export function register_new_inspector() {
    (window as any).NewInspector = NewInspectorCreate();
}
```

## Распространенные проблемы и решения

1. **Свойство не обновляется**:
   - Убедится, что обработчик `onUpdate` правильно реализован
   - Проверить, правильно ли свойство зарегистрировано в конфиге

2. **Проблемы с множественным выбором**:
   - Проверить правильность обработки разных значений
   - Проверить, правильно ли инспектор очищает и обновляет данные

3. **UI не обновляется**:
   - Проверка использования `Inspector.refresh()` когда необходимо
   - Убедится в правильной обработке событий