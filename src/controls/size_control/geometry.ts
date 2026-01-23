/**
 * Создание Three.js геометрии для SizeControl
 */

import {
    Mesh,
    SphereGeometry,
    MeshBasicMaterial,
    Vector3,
    CircleGeometry,
    LineDashedMaterial,
    BufferGeometry,
    Line,
    Scene,
    type Object3DEventMap,
} from "three";
import { WORLD_SCALAR } from "../../config";

/** Конфигурация слоёв */
export interface LayerConfig {
    controls_layer: number;
    raycast_layer: number;
}

/** Создание точек bounding box */
export function create_bb_points(
    scene: Scene,
    layer_control: number
): Mesh<SphereGeometry, MeshBasicMaterial, Object3DEventMap>[] {
    const geometry = new SphereGeometry(8, 4, 2);
    const material = new MeshBasicMaterial({ color: 0xffff00 });
    const bb_points: Mesh<SphereGeometry, MeshBasicMaterial, Object3DEventMap>[] = [];

    for (let i = 0; i < 4; i++) {
        const sphere = new Mesh(geometry, material);
        sphere.visible = false;
        sphere.layers.set(layer_control);
        scene.add(sphere);
        bb_points.push(sphere);
    }

    return bb_points;
}

/** Создание точек pivot */
export function create_pivot_points(
    scene: Scene,
    layer_config: LayerConfig
): Mesh<CircleGeometry, MeshBasicMaterial, Object3DEventMap>[] {
    const pivot_points: Mesh<CircleGeometry, MeshBasicMaterial, Object3DEventMap>[] = [];

    for (let i = 0; i < 9; i++) {
        const material = new MeshBasicMaterial({ color: 0xff0000 });
        const geometry = new CircleGeometry(7, 4);
        const mesh = new Mesh(geometry, material);
        mesh.visible = false;
        mesh.layers.set(layer_config.controls_layer);
        mesh.layers.enable(layer_config.raycast_layer);
        scene.add(mesh);
        pivot_points.push(mesh);
    }

    return pivot_points;
}

/** Создание меша якоря */
export function create_anchor_mesh(
    scene: Scene,
    layer_config: LayerConfig,
    editor_z: number
): Mesh<CircleGeometry, MeshBasicMaterial, Object3DEventMap> {
    const anchor_mesh = new Mesh(
        new CircleGeometry(15 * WORLD_SCALAR, 12),
        new MeshBasicMaterial({ color: 0xffff00, transparent: true })
    );
    anchor_mesh.position.set(300, -220, editor_z);
    anchor_mesh.layers.set(layer_config.controls_layer);
    anchor_mesh.layers.enable(layer_config.raycast_layer);
    anchor_mesh.visible = false;
    scene.add(anchor_mesh);

    return anchor_mesh;
}

/** Создание линий slice box */
export function create_slice_box_lines(
    scene: Scene,
    layer_control: number,
    editor_z: number
): { slice_box: Line; slice_box_range: Line } {
    const offset = 0.5;
    const points = [
        new Vector3(-offset, offset, 0),
        new Vector3(offset, offset, 0),
        new Vector3(offset, -offset, 0),
        new Vector3(-offset, -offset, 0),
        new Vector3(-offset, offset, 0),
    ];

    const slice_box = new Line(
        new BufferGeometry().setFromPoints(points),
        new LineDashedMaterial({ color: 0xffaa00, dashSize: 0.1, gapSize: 0.05 })
    );
    slice_box.computeLineDistances();
    slice_box.position.set(0, 0, editor_z);
    slice_box.layers.set(layer_control);
    scene.add(slice_box);
    slice_box.visible = false;

    const slice_box_range = new Line(
        new BufferGeometry().setFromPoints(points),
        new LineDashedMaterial({ color: 0xffaaff, dashSize: 0.1, gapSize: 0.05 })
    );
    slice_box_range.computeLineDistances();
    slice_box_range.position.set(0, 0, editor_z);
    slice_box_range.layers.set(layer_control);
    scene.add(slice_box_range);

    return { slice_box, slice_box_range };
}

/** Создание центральной точки debug */
export function create_debug_center(
    scene: Scene,
    layer_control: number
): Mesh<SphereGeometry, MeshBasicMaterial, Object3DEventMap> {
    const geometry = new SphereGeometry(8, 4, 2);
    const debug_center = new Mesh(geometry, new MeshBasicMaterial({ color: 0xff0000 }));
    debug_center.visible = false;
    debug_center.scale.setScalar(0.5);
    debug_center.layers.set(layer_control);
    scene.add(debug_center);

    return debug_center;
}
