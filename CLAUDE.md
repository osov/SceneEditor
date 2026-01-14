## Архитектура SceneEditor v2.0

### Структура проекта
```
src/
├── core/                    # Ядро системы
│   ├── di/                  # DI контейнер
│   │   ├── Container.ts     # Реализация контейнера
│   │   ├── tokens.ts        # Токены сервисов (TOKENS, INIT_ORDER)
│   │   └── types.ts         # Интерфейсы DI
│   ├── events/              # Шина событий
│   │   └── EventBus.ts
│   ├── plugins/             # Плагинная система
│   │   ├── PluginManager.ts
│   │   ├── PluginContext.ts
│   │   └── types.ts
│   ├── inspector/           # Система инспекторов
│   │   ├── types.ts
│   │   ├── FieldTypeRegistry.ts
│   │   └── InspectorController.ts
│   ├── render/              # Адаптеры рендеринга
│   │   ├── RenderEngineAdapter.ts
│   │   ├── SceneManagerAdapter.ts
│   │   └── ResourceManagerAdapter.ts
│   ├── controls/            # Адаптеры контролов
│   │   ├── SelectControlAdapter.ts
│   │   ├── HistoryControlAdapter.ts
│   │   └── ControlManagerAdapter.ts
│   ├── services/            # Базовые сервисы
│   │   ├── LoggerService.ts
│   │   ├── SceneGraphService.ts
│   │   └── SceneGraphBridge.ts
│   ├── bootstrap.ts         # Инициализация ядра
│   └── index.ts             # Публичный API
├── plugins/                 # Встроенные плагины
│   └── core-inspector/      # Базовые типы полей инспектора
└── cli/                     # CLI точка входа
    └── index.ts
```

### DI Контейнер

Использование DI контейнера вместо глобальных синглтонов:

```typescript
import { bootstrap, TOKENS, get_container } from '@editor/core';

// Инициализация
const { container, logger, event_bus } = await bootstrap({ debug: true });

// Получение сервисов
const render_engine = container.resolve<IRenderEngine>(TOKENS.RenderEngine);
const scene_manager = container.resolve<ISceneManager>(TOKENS.SceneManager);
```

**Токены сервисов (TOKENS):**
- `Logger`, `EventBus`, `Config` - базовые сервисы
- `RenderEngine`, `SceneManager`, `ResourceManager` - рендеринг
- `SelectControl`, `HistoryControl`, `ControlManager` - контролы
- `PluginManager`, `SceneGraphService` - дополнительные сервисы

### Плагинная система

```typescript
// Создание плагина
export function create_my_plugin(): PluginFactory {
    return {
        manifest: {
            id: 'my-plugin',
            name: 'My Plugin',
            version: '1.0.0',
        },
        async activate(context: IPluginContext) {
            context.register_extension(EXTENSION_POINTS.INSPECTOR_FIELD_TYPES, {
                type: PropertyType.CUSTOM,
                handler: create_custom_field_handler(),
            });
        },
    };
}
```

### Адаптеры Legacy модулей

Адаптеры оборачивают глобальные модули для типобезопасного доступа через DI:

```typescript
// Адаптер получает legacy модуль лениво
function get_legacy_render_engine(): LegacyRenderEngine | undefined {
    return (globalThis as unknown as { RenderEngine?: LegacyRenderEngine }).RenderEngine;
}

// И предоставляет типобезопасный интерфейс
const adapter: IRenderEngine = {
    get scene() { return get_engine().scene; },
    get camera() { return get_engine().camera; },
    render() { get_engine().render(); },
};
```

---

## Архитектурные принципы
- все рассуждения делаем на русском языке

**Основная философия:**
- Фабричные функции вместо классов если классы не дают больше удобств и пользы
- внутри фабричных функций сначала объявление всех функций идет, а в конце return объект с ключами всех функций
- Чистые функции для игровой логики (без побочных эффектов)
- Полное отделение логики от уровня DOM/представления
- Логика возвращает массив событий - представление потребляет события
- Легко переносима на сервер (логика не зависит от DOM)
- Деструктурируйте импорты, когда это возможно (например, import { foo } from 'bar')
- проверку переменных всегда делай с чем-то, избегай if (a) и тп если это не boolean тип
- Не использовать методы доступа в литерале объектов

**Соглашения об именовании:**
- `snake_case` для функций и переменных
- `CamelCase` для типов и интерфейсов
- `UPPER_CASE` для ключей перечислений
- Комментарии на русском языке

**Система типов:**
- Используйте перечисления, а не union типы
- избегайте явного указания для простых типов, если они определены инициализатором
- Добавляйте явные типы для массивов/объектов и там где TypeScript выводит `never`/`any`
- в проекте не должно быть any/never типов кроме случая в on_input, там в параметрах функции это допустимо
- избегай повторяющиеся типы, используй объявление в одном месте и импорт типов
- избегай @ts-ignore, лучше уточняй если без этого никак
- не должно быть универсальных переменных, которые в себе могут иметь union типы

---

## CLI Запуск

```bash
# Запуск с проектом
bun run dev --project=../my-project

# Аргументы CLI:
# --project, -p  Путь к проекту
# --port         HTTP порт (по умолчанию 7007)
# --ws-port      WebSocket порт (по умолчанию 7001)
# --vite-port    Vite порт (по умолчанию 5173)
# --open, -o     Открыть браузер (по умолчанию true)
```
