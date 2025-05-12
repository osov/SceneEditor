import { describe, expect, it } from "bun:test"
import { TAU } from "../../modules/utils"
import { Circle, Line, Point, Segment, Vector } from "../../modules/Geometry"

describe('Circle', function () {
  it('Constructor Circle(pt, r) creates new circle', function () {
    let circle = Circle(Point(1, 1), 2)
    expect(circle.pc.x).toEqual(1)
    expect(circle.pc.y).toEqual(1)
    expect(circle.r).toEqual(2)
  })
  it('Method contains returns true if Point belongs to the circle', function () {
    let pt = Point(0, 1)
    let circle = Circle(Point(0, 0), 2)
    expect(circle.contains(pt)).toEqual(true)
  })
  it('Can return circle bounding box', function () {
    let circle = Circle(Point(0, 0), 2)
    let box = circle.box()
    expect(box.xmax).toEqual(2)
    expect(box.xmin).toEqual(-2)
    expect(box.ymax).toEqual(2)
    expect(box.ymin).toEqual(-2)
  })
  it('Can transform circle into closed CW arc', function () {
    let circle = Circle(Point(0, 0), 2)
    let arc = circle.toArc(true)
    expect(arc.sweep()).toEqual(TAU)
    expect(arc.start().equalTo(Point(-2, 0))).toBe(true)
    expect(arc.end().equalTo(Point(-2, 0))).toBe(true)
  })
  it('Can transform circle into closed CCW arc', function () {
    let circle = Circle(Point(0, 0), 2)
    let arc = circle.toArc(false)
    expect(arc.sweep()).toEqual(TAU)
    expect(arc.start().equalTo(Point(-2, 0))).toBe(true)
    expect(arc.end().equalTo(Point(-2, 0))).toBe(true)
  })
  it('Can intersect circle with line. Case 1 no intersection', function () {
    let circle = Circle(Point(0, 0), 2)
    let line = Line(Point(3, 3), Vector(0, 1))
    let ip = circle.intersect(line)
    expect(ip.length).toEqual(0)
  })
  it('Can intersect circle with line. Case 2 Touching', function () {
    let circle = Circle(Point(0, 0), 2)
    let line = Line(Point(3, 2), Vector(0, 1))
    let ip = circle.intersect(line)
    expect(ip.length).toEqual(1)
    let p = ip[0]
    expect(p.x).toEqual(0)
    expect(p.y).toEqual(2)

  })
  it('Can intersect circle with line. Case 3 Two points', function () {
    let circle = Circle(Point(0, 0), 2)
    let line = Line(Point(1, 1), Vector(0, 1))
    let ip = circle.intersect(line)
    expect(ip.length).toEqual(2)
  })
  it('Can intersect circle with segment. One Point', function () {
    let circle = Circle(Point(0, 0), 2)
    let segment = Segment(Point(1, 1), Point(3, 3))
    let ip = circle.intersect(segment)
    expect(ip.length).toEqual(1)
  })
  it('Can intersect circle with segment.2 points', function () {
    let circle = Circle(Point(0, 0), 2)
    let segment = Segment(Point(-3, -3), Point(3, 3))
    let ip = circle.intersect(segment)
    expect(ip.length).toEqual(2)
  })
  it('Can intersect circle with arc', function () {
    let circle = Circle(Point(0, 0), 2)
    let circle1 = Circle(Point(0, 1), 2)
    let arc = circle1.toArc()
    let ip = circle.intersect(arc)
    expect(ip.length).toEqual(2)
  })
  it('Can intersect circle with circle - quick reject', function () {
    let circle1 = Circle(Point(0, 0), 2)
    let circle2 = Circle(Point(5, 4), 2)
    let ip = circle1.intersect(circle2)
    expect(ip.length).toEqual(0)
  })
  it('Can intersect circle with circle - no intersection r1 + r2 < dist', function () {
    let circle1 = Circle(Point(0, 0), 2)
    let circle2 = Circle(Point(2, 2), 0.5)
    let ip = circle1.intersect(circle2)
    expect(ip.length).toEqual(0)
  })
  it('Can intersect circle with circle - no intersection: one inside another', function () {
    let circle1 = Circle(Point(0, 0), 4)
    let circle2 = Circle(Point(0, 0), 3)
    let ip = circle1.intersect(circle2)
    expect(ip.length).toEqual(0)
  })
  it('Can intersect circle with circle - same circle, one intersection, leftmost Point', function () {
    let circle = Circle(Point(0, 0), 4)
    let ip = circle.intersect(circle.clone())
    expect(ip.length).toEqual(1)
    let p = ip[0]
    expect(p.x).toEqual(-4)
    expect(p.y).toEqual(0)
  })
  it('Can intersect circle with circle - degenerated circle', function () {
    let circle1 = Circle(Point(0, 0), 2)
    let circle2 = Circle(Point(2, 0), 0)
    let ip = circle1.intersect(circle2)
    expect(ip.length).toEqual(0)
  })
  describe('#Circle.DistanceTo', function () {
    it('Can measure distance between circle and Point', function () {
      let c = Circle(Point(200, 200), 50)
      let pt = Point(200, 100)

      let [dist, shortest_segment] = c.distanceTo(pt)
      expect(dist).toEqual(50)
      let p1 = shortest_segment.start
      let p2 = shortest_segment.end
      expect(p1.x).toEqual(200)
      expect(p1.y).toEqual(150)
      expect(p2.x).toEqual(pt.x)
      expect(p2.y).toEqual(pt.y)
    })
    it('Can measure distance between circle and circle', function () {
      let c1 = Circle(Point(200, 200), 50)
      let c2 = Circle(Point(200, 230), 100)

      let [dist, shortest_segment] = c1.distanceTo(c2)
      expect(dist).toEqual(20)
      let p1 = shortest_segment.start
      let p2 = shortest_segment.end
      expect(p1.x).toEqual(200)
      expect(p1.y).toEqual(150)
      expect(p2.x).toEqual(200)
      expect(p2.y).toEqual(130)
    })
    it('Can measure distance between circle and line', function () {
      let c = Circle(Point(200, 200), 50)
      let l = Line(Point(200, 130), Vector(0, 1))

      let [dist, shortest_segment] = c.distanceTo(l)
      expect(dist).toEqual(20)
      let p1 = shortest_segment.start
      let p2 = shortest_segment.end
      expect(p1.x).toEqual(200)
      expect(p1.y).toEqual(150)
      expect(p2.x).toEqual(200)
      expect(p2.y).toEqual(130)
    })
    it('Can measure distance between circle and segment', function () {
      let c = Circle(Point(200, 200), 50)
      let seg = Segment(Point(200, 130), Point(220, 130))

      let [dist, shortest_segment] = c.distanceTo(seg)
      expect(dist).toEqual(20)
      let p1 = shortest_segment.start
      let p2 = shortest_segment.end
      expect(p1.x).toEqual(200)
      expect(p1.y).toEqual(150)
      expect(p2.x).toEqual(200)
      expect(p2.y).toEqual(130)
    })
    it('Can measure distance between circle and arc', function () {
      let c = Circle(Point(200, 200), 50)
      let a = Circle(Point(200, 100), 20).toArc()

      let [dist, shortest_segment] = c.distanceTo(a)
      expect(dist).toEqual(30)
      let p1 = shortest_segment.start
      let p2 = shortest_segment.end
      expect(p1.x).toEqual(200)
      expect(p1.y).toEqual(150)
      expect(p2.x).toEqual(200)
      expect(p2.y).toEqual(120)
    })
  })
})
