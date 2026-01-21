/**
 * Parsers - модули парсинга для Defold конвертера
 */

// Утилиты
export {
    getNameFromPath,
    castColor,
    castPivot,
    castStencil,
} from './utils';

// GUI парсер
export {
    generateGui,
    castGuiBox2DefoldGuiNode,
    castGuiText2DefoldGuiNode,
    castGuiSpine2DefoldGuiNode,
} from './gui_parser';

// Component парсер
export {
    castSprite2DefoldSprite,
    castLabel2DefoldLabel,
    castSpineModel2DefoldSpineModel,
    castSprite2DefoldEmbeddedComponent,
    castLabel2DefoldEmbeddedComponent,
    castSpineModel2DefoldEmbeddedComponent,
    castSound2DefoldEmbeddedComponent,
    castSound2DefoldGoSound,
    castExtDependencies2DefoldEmbeddedComponent,
    castIExtDependence2DefoldGoCollectionProxy,
    castIExtDependence2DefoldGoCollectionFactory,
    castIExtDependence2DefoldGoFactory,
} from './component_parser';

// Collection парсер
export {
    generateCollection,
    castNodeEmpty2DefoldGo,
    castGui2DefoldGo,
    castNodeList2DefoldCollection,
} from './collection_parser';

// Asset парсер
export {
    castAtlas2DefoldAtlas,
    castSpine2DefoldSpineScene,
    castPrefab2DefoldPrototype,
    parseAtlasData,
    parseSpineSceneData,
    getFontName,
} from './asset_parser';
