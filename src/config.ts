export const TARGET_DISPLAY_WIDTH = 960;
export const TARGET_DISPLAY_HEIGHT = 540;

export const IS_CAMERA_ORTHOGRAPHIC = new URLSearchParams(document.location.search).get('perspective') == null ? true : false;
export const CAMERA_FAR = new URLSearchParams(document.location.search).get('far') ? parseInt(new URLSearchParams(document.location.search).get('far')!) : 15000;
export const CAMERA_Z = CAMERA_FAR - 1;
export const WORLD_SCALAR = new URLSearchParams(document.location.search).get('ws') ? parseFloat(new URLSearchParams(document.location.search).get('ws')!) : 1 / 10;
export const DEFOLD_LIMITS = !true;

export const PROJECT_NAME = new URLSearchParams(document.location.search).get('project') || 'SceneEditor_ExampleProject';
export const SERVER_URL = 'http://localhost:7007';
export const WS_SERVER_URL = 'http://localhost:7001';
export const WS_RECONNECT_INTERVAL = 10;

export const FLOAT_PRECISION = 4;

export const MIN_VOLUME = 0.0;
export const MAX_VOLUME = 2.0;
export const DEFAULT_SOUND_RADIUS = 0;
export const DEFAULT_MAX_VOLUME_RADIUS = DEFAULT_SOUND_RADIUS;
export const DEFAULT_PAN_NORMALIZATION_DISTANCE = 0;
export const DEFAULT_FADE_IN_TIME = 1.0;
export const DEFAULT_FADE_OUT_TIME = 1.0;

export type _UserMessages = {
    REGION_ENTER: { id_mesh: string, id_region: string }
    REGION_LEAVE: { id_mesh: string, id_region: string }
};