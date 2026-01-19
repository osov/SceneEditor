// Визуализация зон звука для AudioMesh

import {
    EllipseCurve,
    Line,
    LineBasicMaterial,
    Vector3,
    BufferGeometry,
    Mesh,
    MeshBasicMaterial,
    Object3D
} from "three";
import { SoundZoneType, type AudioVisualizerParams } from "./types";
import { get_sound } from "../../../modules/Sound";

/**
 * Интерфейс визуализатора аудио зон
 */
export interface IAudioVisualizer {
    create(): void;
    update(): void;
    remove(): void;
    set_params(params: AudioVisualizerParams): void;
    dispose(): void;
}

/**
 * Создаёт визуализатор аудио зон
 * @param parent - родительский Object3D для добавления визуальных элементов
 */
export function AudioVisualizerCreate(parent: Object3D): IAudioVisualizer {
    // Визуальные элементы
    let soundRadiusVisual: Line | null = null;
    let maxVolumeRadiusVisual: Line | null = null;
    let panNormalizationVisual: Line | null = null;
    let listenerVisual: Mesh | null = null;
    let rectangleVisual: Line | null = null;
    let rectangleMaxVolumeVisual: Line | null = null;

    // Текущие параметры
    let params: AudioVisualizerParams = {
        soundRadius: 0,
        maxVolumeRadius: 0,
        panNormalizationDistance: 0,
        zoneType: SoundZoneType.CIRCULAR,
        rectangleWidth: 0,
        rectangleHeight: 0,
        rectangleMaxVolumeWidth: 0,
        rectangleMaxVolumeHeight: 0,
        isActive: true
    };

    // ========== Создание визуалов ==========

    function createSoundRadiusVisual(): void {
        const curve = new EllipseCurve(0, 0, params.soundRadius, params.soundRadius, 0, 2 * Math.PI, false, 0);
        const points = curve.getPoints(64);
        const geometry = new BufferGeometry().setFromPoints(points);
        const material = new LineBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });
        soundRadiusVisual = new Line(geometry, material);
        soundRadiusVisual.visible = params.isActive;
        parent.add(soundRadiusVisual);
    }

    function createMaxVolumeRadiusVisual(): void {
        const curve = new EllipseCurve(0, 0, params.maxVolumeRadius, params.maxVolumeRadius, 0, 2 * Math.PI, false, 0);
        const points = curve.getPoints(64);
        const geometry = new BufferGeometry().setFromPoints(points);
        const material = new LineBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        maxVolumeRadiusVisual = new Line(geometry, material);
        maxVolumeRadiusVisual.visible = params.isActive;
        parent.add(maxVolumeRadiusVisual);
    }

    function createRectangleVisual(): void {
        if (params.rectangleWidth > 0 && params.rectangleHeight > 0) {
            const halfWidth = params.rectangleWidth / 2;
            const halfHeight = params.rectangleHeight / 2;

            const points = [
                new Vector3(-halfWidth, -halfHeight, 0),
                new Vector3(halfWidth, -halfHeight, 0),
                new Vector3(halfWidth, halfHeight, 0),
                new Vector3(-halfWidth, halfHeight, 0),
                new Vector3(-halfWidth, -halfHeight, 0)
            ];

            const geometry = new BufferGeometry().setFromPoints(points);
            const material = new LineBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.8
            });

            rectangleVisual = new Line(geometry, material);
            rectangleVisual.visible = params.isActive;
            parent.add(rectangleVisual);
        }
    }

    function createRectangleMaxVolumeVisual(): void {
        if (params.rectangleMaxVolumeWidth > 0 && params.rectangleMaxVolumeHeight > 0) {
            const halfWidth = params.rectangleMaxVolumeWidth / 2;
            const halfHeight = params.rectangleMaxVolumeHeight / 2;

            const points = [
                new Vector3(-halfWidth, -halfHeight, 0),
                new Vector3(halfWidth, -halfHeight, 0),
                new Vector3(halfWidth, halfHeight, 0),
                new Vector3(-halfWidth, halfHeight, 0),
                new Vector3(-halfWidth, -halfHeight, 0)
            ];

            const geometry = new BufferGeometry().setFromPoints(points);
            const material = new LineBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.8
            });

            rectangleMaxVolumeVisual = new Line(geometry, material);
            rectangleMaxVolumeVisual.visible = params.isActive;
            parent.add(rectangleMaxVolumeVisual);
        }
    }

    function createPanNormalizationVisual(): void {
        const points = [
            new Vector3(-params.panNormalizationDistance, 0, 0),
            new Vector3(params.panNormalizationDistance, 0, 0)
        ];
        const geometry = new BufferGeometry().setFromPoints(points);
        const material = new LineBasicMaterial({
            color: 0x0080ff,
            transparent: true,
            opacity: 1
        });
        panNormalizationVisual = new Line(geometry, material);
        panNormalizationVisual.visible = params.isActive;
        parent.add(panNormalizationVisual);
    }

    // ========== Обновление визуалов ==========

    function updateListenerVisual(): void {
        if (listenerVisual === null) return;
        const listenerPosition = get_sound().get_listener_position();
        listenerVisual.position.copy(listenerPosition);
        listenerVisual.parent?.worldToLocal(listenerVisual.position);
        listenerVisual.visible = params.isActive;
    }

    function updateSoundRadiusVisual(): void {
        if (params.soundRadius > 0) {
            if (soundRadiusVisual === null) {
                createSoundRadiusVisual();
            } else {
                soundRadiusVisual.geometry.dispose();
                const curve = new EllipseCurve(0, 0, params.soundRadius, params.soundRadius, 0, 2 * Math.PI, false, 0);
                const points = curve.getPoints(64);
                soundRadiusVisual.geometry = new BufferGeometry().setFromPoints(points);
            }
            soundRadiusVisual!.visible = params.isActive;
        } else {
            removeSoundRadiusVisual();
        }
    }

    function updateMaxVolumeRadiusVisual(): void {
        if (params.maxVolumeRadius > 0) {
            if (maxVolumeRadiusVisual === null) {
                createMaxVolumeRadiusVisual();
            } else {
                maxVolumeRadiusVisual.geometry.dispose();
                const curve = new EllipseCurve(0, 0, params.maxVolumeRadius, params.maxVolumeRadius, 0, 2 * Math.PI, false, 0);
                const points = curve.getPoints(64);
                maxVolumeRadiusVisual.geometry = new BufferGeometry().setFromPoints(points);
            }
            maxVolumeRadiusVisual!.visible = params.isActive;
        } else {
            removeMaxVolumeRadiusVisual();
        }
    }

    function updateRectangleVisual(): void {
        if (params.rectangleWidth > 0 && params.rectangleHeight > 0) {
            if (rectangleVisual === null) {
                createRectangleVisual();
            } else {
                rectangleVisual.geometry.dispose();
                const halfWidth = params.rectangleWidth / 2;
                const halfHeight = params.rectangleHeight / 2;

                const points = [
                    new Vector3(-halfWidth, -halfHeight, 0),
                    new Vector3(halfWidth, -halfHeight, 0),
                    new Vector3(halfWidth, halfHeight, 0),
                    new Vector3(-halfWidth, halfHeight, 0),
                    new Vector3(-halfWidth, -halfHeight, 0)
                ];

                rectangleVisual.geometry = new BufferGeometry().setFromPoints(points);
            }
            rectangleVisual!.visible = params.isActive;
        } else {
            removeRectangleVisual();
        }
    }

    function updateRectangleMaxVolumeVisual(): void {
        if (params.rectangleMaxVolumeWidth > 0 && params.rectangleMaxVolumeHeight > 0) {
            if (rectangleMaxVolumeVisual === null) {
                createRectangleMaxVolumeVisual();
            } else {
                rectangleMaxVolumeVisual.geometry.dispose();
                const halfWidth = params.rectangleMaxVolumeWidth / 2;
                const halfHeight = params.rectangleMaxVolumeHeight / 2;

                const points = [
                    new Vector3(-halfWidth, -halfHeight, 0),
                    new Vector3(halfWidth, -halfHeight, 0),
                    new Vector3(halfWidth, halfHeight, 0),
                    new Vector3(-halfWidth, halfHeight, 0),
                    new Vector3(-halfWidth, -halfHeight, 0)
                ];

                rectangleMaxVolumeVisual.geometry = new BufferGeometry().setFromPoints(points);
            }
            rectangleMaxVolumeVisual!.visible = params.isActive;
        } else {
            removeRectangleMaxVolumeVisual();
        }
    }

    function updatePanNormalizationVisual(): void {
        if (params.panNormalizationDistance > 0) {
            if (panNormalizationVisual === null) {
                createPanNormalizationVisual();
            } else {
                panNormalizationVisual.geometry.dispose();
                const points = [
                    new Vector3(-params.panNormalizationDistance, 0, 0),
                    new Vector3(params.panNormalizationDistance, 0, 0)
                ];
                panNormalizationVisual.geometry = new BufferGeometry().setFromPoints(points);
            }
            panNormalizationVisual!.visible = params.isActive;
        } else {
            removePanNormalizationVisual();
        }
    }

    // ========== Удаление визуалов ==========

    function removeSoundRadiusVisual(): void {
        if (soundRadiusVisual !== null) {
            parent.remove(soundRadiusVisual);
            soundRadiusVisual.geometry.dispose();
            if (soundRadiusVisual.material instanceof LineBasicMaterial) {
                soundRadiusVisual.material.dispose();
            }
            soundRadiusVisual = null;
        }
    }

    function removeMaxVolumeRadiusVisual(): void {
        if (maxVolumeRadiusVisual !== null) {
            parent.remove(maxVolumeRadiusVisual);
            maxVolumeRadiusVisual.geometry.dispose();
            if (maxVolumeRadiusVisual.material instanceof LineBasicMaterial) {
                maxVolumeRadiusVisual.material.dispose();
            }
            maxVolumeRadiusVisual = null;
        }
    }

    function removeRectangleVisual(): void {
        if (rectangleVisual !== null) {
            parent.remove(rectangleVisual);
            rectangleVisual.geometry.dispose();
            if (rectangleVisual.material instanceof LineBasicMaterial) {
                rectangleVisual.material.dispose();
            }
            rectangleVisual = null;
        }
    }

    function removeRectangleMaxVolumeVisual(): void {
        if (rectangleMaxVolumeVisual !== null) {
            parent.remove(rectangleMaxVolumeVisual);
            rectangleMaxVolumeVisual.geometry.dispose();
            if (rectangleMaxVolumeVisual.material instanceof LineBasicMaterial) {
                rectangleMaxVolumeVisual.material.dispose();
            }
            rectangleMaxVolumeVisual = null;
        }
    }

    function removePanNormalizationVisual(): void {
        if (panNormalizationVisual !== null) {
            parent.remove(panNormalizationVisual);
            panNormalizationVisual.geometry.dispose();
            if (panNormalizationVisual.material instanceof LineBasicMaterial) {
                panNormalizationVisual.material.dispose();
            }
            panNormalizationVisual = null;
        }
    }

    function removeListenerVisual(): void {
        if (listenerVisual !== null) {
            parent.remove(listenerVisual);
            listenerVisual.geometry.dispose();
            if (listenerVisual.material instanceof MeshBasicMaterial) {
                listenerVisual.material.dispose();
            }
            listenerVisual = null;
        }
    }

    // ========== Публичные методы ==========

    function create(): void {
        removeSoundRadiusVisual();
        removeMaxVolumeRadiusVisual();
        removeRectangleVisual();
        removeRectangleMaxVolumeVisual();

        if (params.zoneType === SoundZoneType.CIRCULAR) {
            createSoundRadiusVisual();
            createMaxVolumeRadiusVisual();
        } else {
            createRectangleVisual();
            createRectangleMaxVolumeVisual();
        }
        createPanNormalizationVisual();
    }

    function update(): void {
        updateListenerVisual();

        if (params.zoneType === SoundZoneType.CIRCULAR) {
            removeRectangleVisual();
            removeRectangleMaxVolumeVisual();

            updateSoundRadiusVisual();
            updateMaxVolumeRadiusVisual();
        } else {
            removeSoundRadiusVisual();
            removeMaxVolumeRadiusVisual();

            updateRectangleVisual();
            updateRectangleMaxVolumeVisual();
        }
        updatePanNormalizationVisual();
    }

    function remove(): void {
        removeListenerVisual();
        removeSoundRadiusVisual();
        removeMaxVolumeRadiusVisual();
        removeRectangleVisual();
        removeRectangleMaxVolumeVisual();
        removePanNormalizationVisual();
    }

    function set_params(newParams: AudioVisualizerParams): void {
        params = { ...newParams };
    }

    function dispose(): void {
        remove();
    }

    return {
        create,
        update,
        remove,
        set_params,
        dispose
    };
}
