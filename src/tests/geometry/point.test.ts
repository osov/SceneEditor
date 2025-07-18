import { Arc } from "@editor/utils/geometry/arc"
import { Circle } from "@editor/utils/geometry/circle"
import { Line } from "@editor/utils/geometry/line"
import { Matrix } from "@editor/utils/geometry/matrix"
import { Point } from "@editor/utils/geometry/point"
import { Segment } from "@editor/utils/geometry/segment"
import { clone, points2norm } from "@editor/utils/geometry/utils"
import { Vector } from "@editor/utils/geometry/vector"
import { describe, expect, it } from "bun:test"

describe('Point', function () {
  it('Default constructor creates new (0,0) point', function () {
    let point = Point()
    expect(point.x).toEqual(0)
    expect(point.y).toEqual(0)
  })
  it('New point may be constructed by function call', function () {
    let point = Point(1, 3)
    expect(point.x).toEqual(1)
    expect(point.y).toEqual(3)
  })
  it('Method clone creates new instance of Point', function () {
    let point1 = Point(2, 1)
    let point2 = clone(point1)
    expect(point2).not.toEqual(point1)
    expect(point2.x).toEqual(point1.x)
    expect(point2.y).toEqual(point1.y)
  })
  it('Method equalTo return true if points are equal', function () {
    let point = Point()
    let zero = Point(0, 0)
    let equals = point.equalTo(zero)
    expect(equals).toEqual(true)
  })
  it('Method equalTo return true if points are equal up to DP_TOL tolerance', function () {
    let point1 = Point(1, 1)
    let point2 = Point(1, 1.000000999)
    let equals = point1.equalTo(point2)
    expect(equals).toEqual(true)
  })
  it('Method translate returns new point translated by (dx, dy)', function () {
    let point = Point(1, 1)
    let tpoint = point.translate(2, 0)
    expect(tpoint.x).toEqual(3)
    expect(tpoint.y).toEqual(1)
  })
  it('Method rotates returns new point rotated by default around (0.0), counterclockwise', function () {
    let point = Point(1, 1)
    let rotated_point = point.rotate(Math.PI / 2)
    let expected_point = Point(-1, 1)
    let equals = rotated_point.equalTo(expected_point)
    expect(equals).toEqual(true)
  })
  it('Method rotate returns new point rotated around center, counterclockwise', function () {
    let point = Point(2, 1)
    let center = Point(1, 1)
    let rotated_point = point.rotate(Math.PI / 2, center)
    let expected_point = Point(1, 2)
    let equals = rotated_point.equalTo(expected_point)
    expect(equals).toEqual(true)
  })
  it('Method translate returns new point translated by vector', function () {
    let point = Point(1, 1)
    let v = Vector(2, 0)
    let tpoint = point.translate(v.x, v.y)
    expect(tpoint.x).toEqual(3)
    expect(tpoint.y).toEqual(1)
  })
  it('Can scale point with scale factor', function () {
    const point = Point(2, 3)
    const scaled_point = point.scale(2)
    expect(scaled_point.x).toEqual(4)
    expect(scaled_point.y).toEqual(6)
  })
  it('Method returns projection point on given line', function () {
    let anchor = Point(1, 1)
    let norm = Vector(0, 1)
    let line = Line(anchor, norm)
    let pt = Point(2, 2)
    let proj_pt = pt.projectionOn(line)
    expect(proj_pt.x).toEqual(2)
    expect(proj_pt.y).toEqual(1)
  })
  it('Method transform returns new point transformed by affine transformation matrix', function () {
    let pt = Point(4, 1)
    let pc = Point(1, 1)
    let m = Matrix()
      .translate(pc.x, pc.y)
      .rotate((3 * Math.PI) / 2)
      .translate(-pc.x, -pc.y)
    let transformed_pt = pt.transform(m)
    let expected_pt = Point(1, -2)
    expect(transformed_pt.equalTo(expected_pt)).toBe(true)
  })

  describe('#Point.Distance methods', function () {
    it('Method distanceTo return distance to other point ', function () {
      let point1 = Point(1, 1)
      let point2 = Point(2, 2)
      let [dist, shortest_segment] = point1.distanceTo(point2)
      expect(dist).toEqual(Math.sqrt(2))
    })
    it('Method distanceTo calculates distance to given line', function () {
      let anchor = Point(1, 1)
      let norm = Vector(0, 1)
      let line = Line(anchor, norm)
      let pt = Point(2, 2)
      expect(pt.distanceTo(line)[0]).toEqual(1)
    })
    it('Method distanceTo returns distance to segment', function () {
      let start = Point(-2, 2)
      let end = Point(2, 2)
      let segment = Segment(start, end)
      let pt1 = Point(2, 4)
      let pt2 = Point(-5, 2)
      let pt3 = Point(6, 2)

      expect(pt1.distanceTo(segment)[0]).toEqual(2)
      expect(pt2.distanceTo(segment)[0]).toEqual(3)
      expect(pt3.distanceTo(segment)[0]).toEqual(4)
    })
    it('Method distanceTo returns distance to circle', function () {
      let circle = Circle(Point(), 3)
      let pt1 = Point(5, 0)
      let pt2 = Point(0, 2)
      expect(pt1.distanceTo(circle)[0]).toEqual(2)
      expect(pt2.distanceTo(circle)[0]).toEqual(1)
    })
    it('Method distanceTo returns distance to arc', function () {
      let circle = Circle(Point(), 3)
      let arc = circle.toArc()
      let pt1 = Point(5, 0)
      let pt2 = Point(0, 2)
      expect(pt1.distanceTo(arc)[0]).toEqual(2)
      expect(pt2.distanceTo(arc)[0]).toEqual(1)
    })
  })
  describe('#Point.On inclusion queries', function () {
    it('Method "on" returns true if point checked with same points', function () {
      let pt = Point(0, 1)
      expect(pt.on(clone(pt))).toEqual(true)
    })
    it('Method "on" returns true if point belongs to line', function () {
      let pt1 = Point(1, 1)
      let pt2 = Point(2, 2)
      let pt3 = Point(3, 3)
      const norm = points2norm(pt1, pt2);
      let line = Line(pt1, norm)
      expect(pt3.on(line)).toEqual(true)
    })
    it('Method "on" returns true if point belongs to circle', function () {
      let pt = Point(0, 1)
      let circle = Circle(Point(0, 0), 2)
      expect(pt.on(circle)).toEqual(true)
    })
    it('Method "on" returns true if point belongs to segment', function () {
      let pt1 = Point(1, 1)
      let pt2 = Point(2, 2)
      let pt3 = Point(3, 3)
      const norm = points2norm(pt1, pt3);
      let segment = Line(pt1, norm)
      expect(pt2.on(segment)).toEqual(true)
    })
    it('Method "on" returns true if point belongs to arc', function () {
      let arc = Arc(Point(), 1, -Math.PI / 4, Math.PI / 4, false)
      let pt = Point(-1, 0)
      expect(pt.on(arc)).toEqual(true)
    })
  })
  it('Method leftTo returns true if point is on the "left" semi plane, which is the side of the normal vector', function () {
    let pt0 = Point(-1, -1)
    const norm = points2norm(pt0, Point(1, 1));
    let line = Line(pt0, norm)
    let pt1 = Point(-2, 2)
    let pt2 = Point(3, 1)
    expect(pt1.leftTo(line)).toEqual(true)
    expect(pt2.leftTo(line)).toEqual(false)
  })
})
