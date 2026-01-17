/**
 * Inspector Module - система инспектора свойств
 *
 * Содержит:
 * - PropertyConvertersService - конвертация значений между форматами
 * - PropertyHistoryService - сохранение свойств в историю для undo/redo
 * - InspectorHandlerAdapter - адаптер для интеграции с InspectorControl
 * - InspectorRenderer - чистый UI слой TweakPane
 * - InspectorDataProcessor - обработка данных нескольких объектов
 * - InspectorEntityFactory - создание сущностей для рендеринга
 * - handlers/ - обработчики свойств по группам (transform, graphics, text, audio)
 */

// Сервисы
export {
    BlendMode,
    FilterMode,
    ScreenPointPreset,
    TextAlign,
    create_property_converters_service,
    get_property_converters,
    type IPropertyConvertersService,
} from './PropertyConvertersService';

export {
    create_property_history_service,
    type IPropertyHistoryService,
    type IMeshResolver,
    type PropertyHistoryServiceParams,
    type HistoryType,
} from './PropertyHistoryService';

// Адаптер
export {
    create_inspector_handler_adapter,
    get_inspector_handler_adapter,
    init_inspector_handler_adapter,
    is_inspector_handler_adapter_initialized,
    type IInspectorHandlerAdapter,
    type InspectorHandlerAdapterParams,
} from './InspectorHandlerAdapter';

// UI Renderer
export {
    create_inspector_renderer,
    init_inspector_renderer,
    get_inspector_renderer,
    is_inspector_renderer_initialized,
    type IInspectorRenderer,
    type InspectorRendererParams,
    type InspectorEntity,
    type InspectorFolder,
    type InspectorButton,
    type InspectorField,
    type ChangeEvent,
} from './InspectorRenderer';

// Data Processor
export {
    create_inspector_data_processor,
    type IInspectorDataProcessor,
    type InspectorDataProcessorParams,
    type ObjectData,
    type UniqueField,
    type ProcessedData,
} from './InspectorDataProcessor';

// Entity Factory
export {
    create_inspector_entity_factory,
    type IInspectorEntityFactory,
    type InspectorEntityFactoryParams,
    type BeforeChangeInfo,
    type ChangeInfo,
} from './InspectorEntityFactory';

// Handlers
export {
    create_transform_handler,
    create_graphics_handler,
    create_text_handler,
    create_audio_handler,
    create_all_handlers,
    create_handler_registry,
    type IPropertyHandler,
    type IHandlerRegistry,
    type HandlerParams,
    type UpdateContext,
    type ReadContext,
    type ReadResult,
    type ChangeAxisInfo,
} from './handlers';
