import { describe, expect, it } from "bun:test"
import { DP_TOL, EQ, TAU } from "../../modules/utils"
import { Arc } from "@editor/utils/geometry/arc"
import { Box } from "@editor/utils/geometry/box"
import { Circle } from "@editor/utils/geometry/circle"
import { CW, CCW } from "@editor/utils/geometry/const"
import { Matrix } from "@editor/utils/geometry/matrix"
import { Point } from "@editor/utils/geometry/point"
import { Segment } from "@editor/utils/geometry/segment"
import { IPoint } from "@editor/utils/geometry/types"
import { vector } from "@editor/utils/geometry/utils"
import { Line } from "@editor/utils/geometry/line"

describe('Arc', function () {
  it('Default constructor constructs full circle unit arc with zero center and sweep 2PI CW', function () {
    let arc = Arc()
    expect(arc.sweep()).toEqual(TAU)
    expect(arc.clockwise).toEqual(CW)
  })
  it('Constructor creates CW arc if parameter clockwise is omitted', function () {
    let arc = Arc(Point(), 1, Math.PI / 4, (3 * Math.PI) / 4)
    expect(arc.sweep()).toEqual(Math.PI / 2)
    expect(arc.clockwise).toEqual(CW)
  })
  it('Constructor can create different CW arcs if clockwise=true 1', function () {
    let arc = Arc(Point(), 1, Math.PI / 4, (3 * Math.PI) / 4, CW)
    expect(arc.sweep()).toEqual(Math.PI / 2)
    expect(arc.clockwise).toEqual(CW)
  })
  it('Constructor can create different CW arcs if clockwise=true 2', function () {
    let arc = Arc(Point(), 1, (3 * Math.PI) / 4, Math.PI / 4, CW)
    expect(arc.sweep()).toEqual((3 * Math.PI) / 2)
    expect(arc.clockwise).toEqual(CW)
  })
  it('Constructor can create different CW arcs if clockwise=true 3', function () {
    let arc = Arc(Point(3, 4), 1, Math.PI / 4, -Math.PI / 4, CW)
    expect(arc.sweep()).toEqual((3 * Math.PI) / 2)
    expect(arc.clockwise).toEqual(CW)
  })
  it('Constructor can create different CW arcs if clockwise=true 4', function () {
    let arc = Arc(Point(2, -2), 1, -Math.PI / 4, Math.PI / 4, CW)
    expect(arc.sweep()).toEqual(Math.PI / 2)
    expect(arc.clockwise).toEqual(CW)
  })
  it('Constructor can create different CCW arcs if clockwise=false 1', function () {
    let arc = Arc(Point(), 1, Math.PI / 4, (3 * Math.PI) / 4, CCW)
    expect(arc.sweep()).toEqual((3 * Math.PI) / 2)
    expect(arc.clockwise).toEqual(CCW)
  })
  it('Constructor can create different CCW arcs if clockwise=false 2', function () {
    let arc = Arc(Point(), 1, (3 * Math.PI) / 4, Math.PI / 4, CCW)
    expect(arc.sweep()).toEqual(Math.PI / 2)
    expect(arc.clockwise).toEqual(CCW)
  })
  it('Constructor can create different CCW arcs if clockwise=false 3', function () {
    let arc = Arc(Point(3, 4), 1, Math.PI / 4, -Math.PI / 4, CCW)
    expect(arc.sweep()).toEqual(Math.PI / 2)
    expect(arc.clockwise).toEqual(CCW)
  })
  it('Constructor can create different CCW arcs if clockwise=false 4', function () {
    let arc = Arc(Point(2, -2), 1, -Math.PI / 4, Math.PI / 4, CCW)
    expect(arc.sweep()).toEqual((3 * Math.PI) / 2)
    expect(arc.clockwise).toEqual(CCW)
  })
  it('In order to construct full circle, set end_angle = start_angle + 2pi', function () {
    let arc = Arc(Point(), 5, Math.PI, 3 * Math.PI, true)
    expect(arc.sweep()).toEqual(2 * Math.PI)
  })
  it('Constructor creates zero arc when end_angle = start_angle', function () {
    let arc = Arc(Point(), 5, Math.PI / 4, Math.PI / 4, true)
    expect(arc.sweep()).toEqual(0)
  })
  // it('New arc may be constructed by function call', function () {
  //   expect(Arc(Point(), 5, Math.PI, 3 * Math.PI, true)).to.deep.equal(
  //     Arc(Point(), 5, Math.PI, 3 * Math.PI, true),
  //   )
  // })
  // it('Getter arc.start returns start point', function () {
  //   let arc = Arc(Point(), 1, -Math.PI / 4, Math.PI / 4, true)
  //   expect(arc.start).to.deep.equal({ x: Math.cos(-Math.PI / 4), y: Math.sin(-Math.PI / 4) })
  // })
  // it('Getter arc.end returns end point', function () {
  //   let arc = Arc(Point(), 1, -Math.PI / 4, Math.PI / 4, true)
  //   expect(arc.end).to.deep.equal({ x: Math.cos(Math.PI / 4), y: Math.sin(Math.PI / 4) })
  // })
  it('Getter arc.length() returns arc length', function () {
    let arc = Arc(Point(), 1, -Math.PI / 4, Math.PI / 4, true)
    expect(arc.length()).toEqual(Math.PI / 2)
  })
  it('Getter arc.length() returns arc length', function () {
    let arc = Arc(Point(), 5, -Math.PI / 4, Math.PI / 4, false)
    expect(arc.length()).toEqual((5 * 3 * Math.PI) / 2)
  })
  it('Getter arc.box returns arc bounding box, CW case', function () {
    let arc = Arc(Point(), 1, -Math.PI / 4, Math.PI / 4, true)
    let box = arc.box
    expect(EQ(box().xmin, Math.sqrt(2) / 2)).toEqual(true)
    expect(EQ(box().ymin, -Math.sqrt(2) / 2)).toEqual(true)
    expect(EQ(box().xmax, 1)).toEqual(true)
    expect(EQ(box().ymax, Math.sqrt(2) / 2)).toEqual(true)
  })
  it('Getter arc.box returns arc bounding box, CCW case', function () {
    let arc = Arc(Point(), 1, -Math.PI / 4, Math.PI / 4, false)
    let box = arc.box
    expect(EQ(box().xmin, -1)).toEqual(true)
    expect(EQ(box().ymin, -1)).toEqual(true)
    expect(EQ(box().xmax, Math.sqrt(2) / 2)).toEqual(true)
    expect(EQ(box().ymax, 1)).toEqual(true)
  })
  it('Getter arc.box returns arc bounding box, circle case', function () {
    let arc = Circle(Point(200, 200), 75).toArc(false)
    let box = arc.box
    expect(EQ(box().xmin, 125)).toEqual(true)
    expect(EQ(box().ymin, 125)).toEqual(true)
    expect(EQ(box().xmax, 275)).toEqual(true)
    expect(EQ(box().ymax, 275)).toEqual(true)
  })
  describe('#Arc.breakToFunctional', function () {
    it('Case 1. No intersection with axes', function () {
      let arc = Arc(Point(), 1, Math.PI / 6, Math.PI / 3, true)
      let f_arcs = arc.breakToFunctional()
      expect(f_arcs.length).toEqual(1)
      expect(EQ(f_arcs[0].startAngle, arc.startAngle)).toEqual(true)
      expect(EQ(f_arcs[0].endAngle, arc.endAngle)).toEqual(true)
    })
    it('Case 2. One intersection, two sub arcs', function () {
      let arc = Arc(Point(), 1, Math.PI / 6, (3 * Math.PI) / 4, true)
      let f_arcs = arc.breakToFunctional()
      expect(f_arcs.length).toEqual(2)
      expect(EQ(f_arcs[0].startAngle, arc.startAngle)).toEqual(true)
      expect(EQ(f_arcs[0].endAngle, Math.PI / 2)).toEqual(true)
      expect(EQ(f_arcs[1].startAngle, Math.PI / 2)).toEqual(true)
      expect(EQ(f_arcs[1].endAngle, arc.endAngle)).toEqual(true)
    })
    it('Case 3. One intersection, two sub arcs, CCW', function () {
      let arc = Arc(Point(), 1, Math.PI / 6, -Math.PI / 6, false)
      let f_arcs = arc.breakToFunctional()
      expect(f_arcs.length).toEqual(2)
      expect(EQ(f_arcs[0].startAngle, arc.startAngle)).toEqual(true)
      expect(EQ(f_arcs[0].endAngle, 0)).toEqual(true)
      expect(EQ(f_arcs[1].startAngle, 0)).toEqual(true)
      expect(EQ(f_arcs[1].endAngle, arc.endAngle)).toEqual(true)
    })
    it('Case 4. One intersection, start at extreme point', function () {
      let arc = Arc(Point(), 1, Math.PI / 2, (3 * Math.PI) / 4, true)
      let f_arcs = arc.breakToFunctional()
      expect(f_arcs.length).toEqual(1)
      expect(EQ(f_arcs[0].startAngle, Math.PI / 2)).toEqual(true)
      expect(EQ(f_arcs[0].endAngle, arc.endAngle)).toEqual(true)
    })
    it('Case 5. 2 intersections, 3 parts', function () {
      let arc = Arc(Point(), 1, Math.PI / 4, (5 * Math.PI) / 4, true)
      let f_arcs = arc.breakToFunctional()
      expect(f_arcs.length).toEqual(3)
      expect(EQ(f_arcs[0].startAngle, arc.startAngle)).toEqual(true)
      expect(EQ(f_arcs[0].endAngle, Math.PI / 2)).toEqual(true)
      expect(EQ(f_arcs[1].endAngle, Math.PI)).toEqual(true)
      expect(EQ(f_arcs[2].endAngle, arc.endAngle)).toEqual(true)
    })
    it('Case 6. 2 intersections, 3 parts, CCW', function () {
      let arc = Arc(Point(), 1, (3 * Math.PI) / 4, -Math.PI / 4, false)
      let f_arcs = arc.breakToFunctional()
      expect(f_arcs.length).toEqual(3)
      expect(EQ(f_arcs[0].startAngle, arc.startAngle)).toEqual(true)
      expect(EQ(f_arcs[0].endAngle, Math.PI / 2)).toEqual(true)
      expect(EQ(f_arcs[1].startAngle, Math.PI / 2)).toEqual(true)
      expect(EQ(f_arcs[1].endAngle, 0)).toEqual(true)
      expect(EQ(f_arcs[2].startAngle, 0)).toEqual(true)
      expect(EQ(f_arcs[2].endAngle, arc.endAngle)).toEqual(true)
    })
    it('Case 7. 2 intersections on extreme points, 1 parts, CCW', function () {
      let arc = Arc(Point(), 1, Math.PI / 2, 0, false)
      let f_arcs = arc.breakToFunctional()
      expect(f_arcs.length).toEqual(1)
      expect(EQ(f_arcs[0].startAngle, Math.PI / 2)).toEqual(true)
      expect(EQ(f_arcs[0].endAngle, 0)).toEqual(true)
    })
    it('Case 7. 4 intersections on extreme points, 5 parts', function () {
      let arc = Arc(Point(), 1, Math.PI / 3, Math.PI / 6, true)
      let f_arcs = arc.breakToFunctional()
      expect(f_arcs.length).toEqual(5)
      expect(EQ(f_arcs[0].startAngle, arc.startAngle)).toEqual(true)
      expect(EQ(f_arcs[4].endAngle, arc.endAngle)).toEqual(true)
    })
    it('Case 8. Full circle, 4 intersections on extreme points, 4 parts', function () {
      let arc = Arc(Point(), 1, Math.PI / 2, Math.PI / 2 + 2 * Math.PI, true)
      let f_arcs = arc.breakToFunctional()
      expect(f_arcs.length).toEqual(4)
    })
  })
  describe('#Arc.intersect', function () {
    it('Intersect arc with segment', function () {
      let arc = Arc(Point(), 1, 0, Math.PI, true)
      let segment = Segment(Point(-1, 0.5), Point(1, 0.5))
      let ip = arc.intersect(segment)
      expect(ip.length).toEqual(2)
    })
    it('Intersect arc with line', function () {
      let line = Line(Point(1, 0), vector(1, 0))
      let arc = Arc(Point(1, 0), 3, -Math.PI / 3, Math.PI / 3, CCW)
      let ip = arc.intersect(line)
      expect(ip.length).toEqual(2)
    })
    it('Intersect arc with circle, same center and radius - return two end points', function () {
      let circle = Circle(Point(1, 0), 3)
      let arc = Arc(Point(1, 0), 3, -Math.PI / 3, Math.PI / 3, CCW)
      let ip = arc.intersect(circle)
      expect(ip.length).toEqual(2)
    })
    it('Intersect arc with arc', function () {
      let arc1 = Arc(Point(), 1, 0, Math.PI, true)
      let arc2 = Arc(Point(0, 1), 1, Math.PI, 2 * Math.PI, true)
      let ip = arc1.intersect(arc2)
      expect(ip.length).toEqual(2)
    })
    it('Intersect arc with box', function () {
      let arc1 = Arc(Point(), 1, 0, Math.PI, true)
      let box = Box(-1, 0.2, 1, 2)
      let ip = arc1.intersect(box)
      expect(ip.length).toEqual(2)
    })
    it('Intersect arc with arc, case of touching', function () {
      let arc1 = Arc(Point(), 1, 0, Math.PI, true)
      let arc2 = Arc(Point(0, 2), 1, -Math.PI / 4, -3 * Math.PI * 4, false)
      let ip = arc1.intersect(arc2)
      expect(ip.length).toEqual(1)
    })
    it('Intersect arc with arc, overlapping case', function () {
      let arc1 = Arc(Point(), 1, 0, Math.PI, true)
      let arc2 = Arc(Point(), 1, -Math.PI / 2, Math.PI / 2, true)
      let ip = arc1.intersect(arc2)
      expect(ip.length).toEqual(2)
      expect(ip[0].equalTo(Point(1, 0))).toEqual(true)
      expect(ip[1].equalTo(Point(0, 1))).toEqual(true)
    })
    it('Intersect arc with arc, overlapping case, 4 points', function () {
      let arc1 = Arc(Point(), 1, -Math.PI / 4, (5 * Math.PI) / 4, true)
      let arc2 = Arc(Point(), 1, Math.PI / 4, (3 * Math.PI) / 4, false)
      let ip = arc1.intersect(arc2)
      expect(ip.length).toEqual(4)
    })
    it('Intersect arc with arc, custom', function () {
      let arc1 = Arc(Point(0, 2), 2, -Math.PI / 2, Math.PI / 2, true)
      let arc2 = Arc(Point(3,2), 2, -Math.PI / 2, Math.PI / 2, false)
      let ip = arc1.intersect(arc2)
      expect(ip.length).toEqual(2)
    })
  })
  it('It can calculate tangent vector in start point, CW case', function () {
    let arc = Arc(Point(), 5, Math.PI / 4, (3 * Math.PI) / 4, CW)
    let tangent = arc.tangentInStart()
    expect(tangent.equalTo(vector(Math.cos((3 * Math.PI) / 4), Math.sin((3 * Math.PI) / 4)))).toBe(true)
  })
  it('It can calculate tangent vector in start point, CCW case', function () {
    let arc = Arc(Point(), 5, Math.PI / 4, (3 * Math.PI) / 4, CCW)
    let tangent = arc.tangentInStart()
    expect(tangent.equalTo(vector(Math.cos((7 * Math.PI) / 4), Math.sin((7 * Math.PI) / 4)))).toBe(true)
  })
  it('It can calculate tangent vector in end point, CW case', function () {
    let arc = Arc(Point(), 5, Math.PI / 4, (3 * Math.PI) / 4, CW)
    let tangent = arc.tangentInEnd()
    expect(tangent.equalTo(vector(Math.cos(Math.PI / 4), Math.sin(Math.PI / 4)))).toBe(true)
  })
  it('It can calculate tangent vector in end point, CCW case', function () {
    let arc = Arc(Point(), 5, Math.PI / 4, (3 * Math.PI) / 4, CCW)
    let tangent = arc.tangentInEnd()
    expect(tangent.equalTo(vector(Math.cos((5 * Math.PI) / 4), Math.sin((5 * Math.PI) / 4)))).toBe(true)
  })
  it('It can calculate middle point case 1 full circle', function () {
    let arc = Circle(Point(), 3).toArc()
    let middle = arc.middle()
    expect(middle.equalTo(Point(3, 0))).toBe(true)
  })
  it('It can calculate middle point case 2 cw', function () {
    let arc = Arc(Point(), 5, Math.PI / 4, (3 * Math.PI) / 4, CW)
    let middle = arc.middle()
    expect(middle.equalTo(Point(0, 5))).toBe(true)
  })
  it('It can calculate middle point case 3 ccw', function () {
    let arc = Arc(Point(), 5, Math.PI / 4, (3 * Math.PI) / 4, CCW)
    let middle = arc.middle()
    expect(middle.equalTo(Point(0, -5))).toBe(true)
  })
  it('It can calculate middle point case 4 ccw, startAngle > endAngle', function () {
    let arc = Arc(Point(), 5, Math.PI / 4, -Math.PI / 4, CCW)
    let middle = arc.middle()
    expect(middle.equalTo(Point(5, 0))).toBe(true)
  })
  it('Can reverse arc', function () {
    let arc = Arc(Point(), 5, Math.PI / 4, (3 * Math.PI) / 4, CW)
    let reversed_arc = arc.reverse()
    expect(reversed_arc.clockwise).toEqual(CCW)
    expect(EQ(arc.sweep(), reversed_arc.sweep())).toBe(true)
  })
  it('Can mirror arc by Y axis using transformation matrix', () => {
    let a1 = Arc(Point(0, 10), 20, -Math.PI / 4, Math.PI / 4, true)
    let m = Matrix().scale(-1, 1)
    let a2 = a1.transform(m)
    expect(a2.start().x).toBeCloseTo(-a1.start().x, DP_TOL)
    expect(a2.start().y).toBeCloseTo(a1.start().y, DP_TOL)
    expect(a2.end().x).toBeCloseTo(-a1.end().x, DP_TOL)
    expect(a2.end().y).toBeCloseTo(a1.end().y, DP_TOL)
    expect(a2.center().x).toBeCloseTo(-a1.center().x, DP_TOL)
    expect(a2.center().y).toBeCloseTo(a1.center().y, DP_TOL)
    expect(a2.clockwise).toBe(!a1.clockwise)
  })

  describe('#Arc.pointAtLength', function () {
    it('gets the point at specific length', function () {
      let arc = Arc(Point(), 1, Math.PI / 4, (3 * Math.PI) / 4)
      expect(arc.length()).toEqual(Math.abs(Math.PI / -2))
      let start = arc.pointAtLength(0) as IPoint
      expect(start.x).toEqual(arc.start().x)
      expect(start.y).toEqual(arc.start().y)
      let end = arc.pointAtLength(arc.length()) as IPoint
      expect(end.x).toEqual(arc.end().x)
      expect(end.y).toEqual(arc.end().y)
    })
    it('points at specific length is on arc', function () {
      let arc = Arc(Point(), 1, Math.PI / 4, (3 * Math.PI) / 4)
      let length = arc.length()
      for (let i = 0; i < 33; i++) {
        let point = arc.pointAtLength((i / 33) * length) as IPoint
        expect(arc.contains(point)).toBe(true)
      }
    })
  })
})
