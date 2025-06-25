import { MATRIX_INDENTITY, ShapeNames, VOID_BOX } from "./const";
import { Point } from "./point";
import { Segment } from "./segment";
import { IBox, IMatrix, IPoint, IVector, PointLike } from "./types";
import { clone_matrix } from "./utils";


export function Box(xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity) {
    const name = ShapeNames.Box;
    let center = () => Point((xmin + xmax) / 2, (ymin + ymax) / 2);
    let box = () => Box(xmin, ymin, xmax, ymax);
    let width = Math.abs(xmax - xmin);
    let height = Math.abs(ymax - ymin);
    let low = Point(xmin, ymin);
    let high = Point(xmax, ymax);
    const b: IBox = {
        xmin, ymin, xmax, ymax, name, center, box, width, height, low, high,
        contains, intersect, merge, equalTo, lessThan,
        translate, scale, transform, toPoints, toSegments
    };

    function contains(other: IPoint): boolean {
        return other.x >= xmin && other.x <= xmax && other.y >= ymin && other.y <= ymax;
    }

    function intersect(otherIBox: IBox) {
        return !(
            xmax < otherIBox.xmin || xmin > otherIBox.xmax || ymax < otherIBox.ymin || ymin > otherIBox.ymax
        );
    }

    function merge(otherIBox: IBox) {
        return Box(
            Math.min(xmin, otherIBox.xmin),
            Math.min(ymin, otherIBox.ymin),
            Math.max(xmax, otherIBox.xmax),
            Math.max(ymax, otherIBox.ymax),
        );
    }

    function equalTo(otherIBox: IBox) {
        return low.equalTo(otherIBox.low) && high.equalTo(otherIBox.high);
    }

    function lessThan(otherIBox: IBox) {
        if (low.lessThan(otherIBox.low)) return true;
        if (low.equalTo(otherIBox.low) && high.lessThan(otherIBox.high)) return true;
        return false;
    }

    function toPoints() {
        return [
            Point(xmin, ymin),
            Point(xmax, ymin),
            Point(xmax, ymax),
            Point(xmin, ymax),
        ];
    }

    function toSegments() {
        const pts = toPoints();
        return [
            Segment(pts[0], pts[1]),
            Segment(pts[1], pts[2]),
            Segment(pts[2], pts[3]),
            Segment(pts[3], pts[0]),
        ];
    }

    function transform(_m: IMatrix | null) {
        const m = (_m != null) ? _m : clone_matrix(MATRIX_INDENTITY);
        return toPoints().map(p => p.transform(m)).reduce((new_box, pt) => new_box.merge(pt.box()), VOID_BOX);
    }

    function translate(x: number, y: number) {
        return transform(clone_matrix(MATRIX_INDENTITY).translate(x, y));
    }

    function scale(a: unknown, b?: unknown) {
        return transform(clone_matrix(MATRIX_INDENTITY).scale(a as number, (b ?? a) as number));
    }

    return b;
}