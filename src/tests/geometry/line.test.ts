import { describe, expect, it } from "bun:test"
import { Arc, Circle, CW, Line, Point, points2norm, Vector } from "../../modules/Geometry"

describe('Line', function () {
  it('Default constructor creates line that is equal to axe x', function () {
    let line = Line()
    expect(line.pt.x).toEqual(0)
    expect(line.pt.y).toEqual(0)
    expect(line.norm.x).toEqual(0)
    expect(line.norm.y).toEqual(1)
  })
  it('Constructor Line(pt1, pt2) creates line that passes through two points', function () {
    let pt1 = Point(1, 1)
    let pt2 = Point(2, 2)
    const norm = points2norm(pt1, pt2);
    let line = Line(pt1, norm)
    expect(pt1.on(line)).toEqual(true)
    expect(pt2.on(line)).toEqual(true)
  })
  it('May create instance by clone', function () {
    let pt1 = Point(1, 3)
    let pt2 = Point(3,3)
    const norm = points2norm(pt1, pt2);
    let l = Line(pt1, norm)
    let l1 = l.clone()
    expect(l1.pt).toEqual(l.pt)
    expect(l1.norm).toEqual(l.norm)
    expect(l1 === l).toBe(false)
  })
  it('Get slope - angle in radians between line and axe x', function () {
    let pt1 = Point(1, 1)
    let pt2 = Point(2, 2)
    const norm = points2norm(pt1, pt2);
    let line = Line(pt1, norm)
    expect(line.slope()).toEqual(Math.PI / 4)
  })
  it('Method contains returns true if point belongs to the line', function () {
    let pt1 = Point(1, 1)
    let pt2 = Point(2, 2)
    let pt3 = Point(3, 3)
    const norm = points2norm(pt1, pt2);
    let line = Line(pt1, norm)
    expect(line.contains(pt3)).toEqual(true)
  })
  it('May return 1-dim coordinate of point on line', function () {
    let pt = Point(100, 200)
    let norm = Vector(0, 1)
    let l = Line(pt, norm)

    expect(l.coord(Point(300, 200))).toEqual(300)
    expect(l.coord(Point(0, 200))).toEqual(0)
  })
  describe('#Line.intersect methods return array of intersection points if intersection exist', function () {
    it('Line to line intersection ', function () {
      let norm1 = points2norm(Point(0, 1), Point(2, 1))
      let norm2 = points2norm(Point(1, 0), Point(1, 2))
      let line1 = Line(Point(0, 1), norm1)
      let line2 = Line(Point(1, 0), norm2)
      let ip = line1.intersect(line2)
      let expected_ip = Point(1, 1)
      expect(ip.length).toEqual(1)
      let p = ip[0];
      expect(p.x).toEqual(expected_ip.x)
      expect(p.y).toEqual(expected_ip.y)
    })
    it('Method intersect returns zero length array if intersection does not exist', function () {
      let norm1 = points2norm(Point(0, 1), Point(2, 1))
      let norm2 = points2norm(Point(0, 2), Point(2, 2))
      let line1 = Line(Point(0, 1), norm1)
      let line2 = Line(Point(0, 2), norm2)
      let ip = line1.intersect(line2)
      expect(ip.length).toEqual(0)
    })
    it('Line to circle intersection - horizontal line, line constructed with 2 points', function () {
      let norm1 = points2norm(Point(-1, 1), Point(3, 1))
      let line = Line(Point(-1, 1), norm1)
      let circle = Circle(Point(0, 0), 3)
      let ip = line.intersect(circle)
      expect(ip.length).toEqual(2)
      expect(ip[0].y).toEqual(1)
      expect(ip[1].y).toEqual(1)
    })
    it('Line to circle intersection - horizontal line, line constructed with point and vector ', function () {
      let line = Line(Point(-1, 1), Vector(0, 3))
      let circle = Circle(Point(0, 0), 3)
      let ip = line.intersect(circle)
      expect(ip.length).toEqual(2)
      expect(ip[0].y).toEqual(1)
      expect(ip[1].y).toEqual(1)
    })
    it('Line to circle intersection - diagonal line, line constructed with point and vector ', function () {
      let line = Line(Point(-3, -3), Vector(-1, 1))
      let circle = Circle(Point(0, 0), 1)
      let ip = line.intersect(circle)
      const sqrt_2_2 = Math.sqrt(2) / 2
      expect(ip.length).toEqual(2)
      expect(ip[0].equalTo(Point(-sqrt_2_2, -sqrt_2_2))).toBe(true)
      expect(ip[1].equalTo(Point(sqrt_2_2, sqrt_2_2))).toBe(true)
    })
    it('Line to arc intersection - quick reject ', function () {
      let line = Line(Point(1, 0), Vector(1, 0))
      let arc = Arc(Point(1, 0), 3, -Math.PI / 3, Math.PI / 3, CW)
      let ip = line.intersect(arc)
      expect(ip.length).toEqual(0)
    })
  })
  it('May check if two lines are parallel', function () {
    let norm1 = points2norm(Point(0, 2), Point(2, 0))
    let norm2 = points2norm(Point(4, 0), Point(0, 4))
    let line1 = Line(Point(0, 2), norm1)
    let line2 = Line(Point(4, 0), norm2)
    expect(line1.parallelTo(line2)).toBe(true)
  })
  it('May check if two lines are not parallel', function () {
    let norm1 = points2norm(Point(0, 2), Point(2, 0))
    let norm2 = points2norm(Point(4.001, 0), Point(0, 4))
    let line1 = Line(Point(0, 2), norm1)
    let line2 = Line(Point(4.001, 0), norm2)
    expect(line1.parallelTo(line2)).toBe(false)
  })
})
