// Типы для аудио системы

export enum SoundFunctionType {
    LINEAR,
    EXPONENTIAL,
    QUADRATIC,
    INVERSE_QUADRATIC,
    SMOOTH_STEP
}

export enum SoundZoneType {
    CIRCULAR,
    RECTANGULAR
}

export interface AudioSerializeData {
    sound: string;
    speed?: number;
    volume?: number;
    loop?: boolean;
    pan?: number;
    soundRadius?: number;
    maxVolumeRadius?: number;
    panNormalizationDistance?: number;
    soundFunction?: SoundFunctionType;
    fadeInTime?: number;
    fadeOutTime?: number;
    zoneType?: SoundZoneType;
    rectangleWidth?: number;
    rectangleHeight?: number;
    rectangleMaxVolumeWidth?: number;
    rectangleMaxVolumeHeight?: number;
    // Index signature для совместимости с SerializedOtherData
    [key: string]: unknown;
}

/**
 * Параметры для визуализации аудио зоны
 */
export interface AudioVisualizerParams {
    soundRadius: number;
    maxVolumeRadius: number;
    panNormalizationDistance: number;
    zoneType: SoundZoneType;
    rectangleWidth: number;
    rectangleHeight: number;
    rectangleMaxVolumeWidth: number;
    rectangleMaxVolumeHeight: number;
    isActive: boolean;
}
