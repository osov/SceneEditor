import { LineBasicMaterial, Vector2, Line as GeomLine, BufferGeometry } from 'three';

import { CAMERA_Z } from "../config";
import { GoContainer } from "../render_engine/objects/sub_types";
import { PointLike } from "./Geometry";
// import { Arc } from '2d-geometry';
import { Arc } from './Geometry';


export function LinesDrawer() {
    const DRAWN_ARC_EDGES_AMOUNT = 60;

    function add_line(a: PointLike, b: PointLike, container: GoContainer, color = 0x22ff77) {
        const point_a = new Vector2(a.x,  a.y);
        const point_b = new Vector2(b.x,  b.y);
        const points: Vector2[] = [point_a, point_b];
        const geometry = new BufferGeometry().setFromPoints(points);
        const material = new LineBasicMaterial({ color });
        const line = new GeomLine(geometry, material);
        line.position.z = CAMERA_Z - 0.01;
        container.add(line);
    }

    function add_arc(arc: Arc, container: GoContainer, color = 0x22ff77) {
        const step = 2 * Math.PI * arc.r / DRAWN_ARC_EDGES_AMOUNT;
        let lenght_remains = arc.length();
        let _allowed_way = arc;
        while (lenght_remains > 0 && _allowed_way) {
            const move = (step < _allowed_way.length()) ? step : _allowed_way.length();
            lenght_remains -= move;
            const sub_arcs = _allowed_way.splitAtLength(move);
            const move_arc = sub_arcs[0] as Arc;
            _allowed_way = sub_arcs[1] as Arc;
            add_line(move_arc.start(), move_arc.end(), container, color);
        }
    }

    function clear_container(container: GoContainer) {
        const children = container.children;
        for (const child of children) {
            child.parent!.remove(child);
            
        }
        container.clear()
    }

    return {add_line, add_arc, clear_container}
}