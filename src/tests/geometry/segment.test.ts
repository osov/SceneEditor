import { describe, expect, it } from "bun:test"
import { EQ } from "../../modules/utils"
import { Line } from "@editor/utils/geometry/line"
import { Circle } from "@editor/utils/geometry/circle"
import { Point } from "@editor/utils/geometry/point"
import { Segment } from "@editor/utils/geometry/segment"
import { clone, points2norm } from "@editor/utils/geometry/utils"
import { Vector } from "@editor/utils/geometry/vector"

describe('Segment', function () {
  it('Constructor Segment(start, end) creates new instance of Segment', function () {
    let start = Point(1, 1)
    let end = Point(2, 3)
    let segment = Segment(start, end)
    expect(segment.start.x).toEqual(1)
    expect(segment.start.y).toEqual(1)
    expect(segment.end.x).toEqual(2)
    expect(segment.end.y).toEqual(3)
  })
  it('May construct segment when second point is omitted', function () {
    let start = Point(10, 10)
    let segment = Segment(start)
    expect(segment.start.x).toEqual(10)
    expect(segment.start.y).toEqual(10)
    expect(segment.end.x).toEqual(0)
    expect(segment.end.y).toEqual(0)
  })
  it('Method clone copy to a new instance of Segment', function () {
    let start = Point(1, 1)
    let end = Point(2, 3)
    let segment = Segment(start, end)
    let segment_clone = clone(segment)
    expect(segment_clone.start.x).toEqual(segment.start.x)
    expect(segment_clone.start.y).toEqual(segment.start.y)
    expect(segment_clone.end.x).toEqual(segment.end.x)
    expect(segment_clone.end.y).toEqual(segment.end.y)
  })
  it('Method length returns length of segment', function () {
    let start = Point(1, 1)
    let end = Point(5, 4)
    let segment = Segment(start, end)
    expect(segment.length()).toEqual(5.0)
  })
  it('Method box returns bounding box of segment', function () {
    let start = Point(1, 1)
    let end = Point(5, 4)
    let segment = Segment(start, end)
    let box = segment.box()
    expect(box.xmin).toEqual(1)
    expect(box.ymin).toEqual(1)
    expect(box.xmax).toEqual(5)
    expect(box.ymax).toEqual(4)
  })
  it('Method slope returns slope of segment', function () {
    let start = Point(1, 1)
    let end = Point(5, 5)
    let segment = Segment(start, end)
    expect(segment.slope()).toEqual(Math.PI / 4)
  })
  it('Method contains returns true if point belongs to segment', function () {
    let start = Point(-2, 2)
    let end = Point(2, 2)
    let segment = Segment(start, end)
    let pt = Point(1, 2)
    expect(segment.contains(pt)).toEqual(true)
  })
  it('Method tangentInStart and tangentInEnd returns vector [start end] and [end, start]', function () {
    let start = Point(5, 1)
    let end = Point(5, 5)
    let segment = Segment(start, end)
    const t1 = segment.tangentInStart()
    const t2 = segment.tangentInEnd()
    expect(t1.x).toEqual(0)
    expect(t1.y).toEqual(1)
    expect(t2.x).toEqual(0)
    expect(t2.y).toEqual(-1)
  })
  it('Can translate segment by given vector', function () {
    let seg = Segment(Point(0, 0), Point(3, 3))
    let v = Vector(-1, -1)
    let seg_t = Segment(Point(-1, -1), Point(2, 2))
    let seg_d = seg.translate(v.x, v.y)
    expect(seg_d.start.x).toEqual(seg_t.start.x)
    expect(seg_d.end.x).toEqual(seg_t.end.x)
    expect(seg_d.start.y).toEqual(seg_t.start.y)
    expect(seg_d.end.y).toEqual(seg_t.end.y)
  })
  it('Can rotate by angle around center of bounding box', function () {
    let seg = Segment(Point(0, 0), Point(6, 0))
    let seg_plus_pi_2 = Segment(Point(3, -3), Point(3, 3))
    let seg_minus_pi_2 = Segment(Point(3, 3), Point(3, -3))
    let center = seg.box().center()
    expect(clone(seg).rotate(Math.PI / 2, center).equalTo(seg_plus_pi_2)).toBe(true)
    expect(clone(seg).rotate(-Math.PI / 2, center).equalTo(seg_minus_pi_2)).toBe(true)
  })
  it('Can rotate by angle around given point', function () {
    let seg = Segment(Point(1, 1), Point(3, 3))
    let seg_1 = clone(seg).rotate(Math.PI / 2, seg.start)
    let seg_2 = clone(seg).rotate(-Math.PI / 2, seg.start)
    let seg_plus_pi_2 = Segment(Point(1, 1), Point(-1, 3))
    let seg_minus_pi_2 = Segment(Point(1, 1), Point(3, -1))
    expect(seg_1.equalTo(seg_plus_pi_2)).toBe(true)
    expect(seg_2.equalTo(seg_minus_pi_2)).toBe(true)
  })
  describe('#Segment.Intersect', function () {
    it('Intersection with Segment - not parallel segments case (one point)', function () {
      let segment1 = Segment(Point(0, 0), Point(2, 2))
      let segment2 = Segment(Point(0, 2), Point(2, 0))
      let ip = segment1.intersect(segment2)
      expect(ip.length).toEqual(1)
      expect(ip[0].x).toEqual(1)
      expect(ip[0].y).toEqual(1)
    })
    it('Intersection with Segment - overlapping segments case (two points)', function () {
      let segment1 = Segment(Point(0, 0), Point(2, 2))
      let segment2 = Segment(Point(3, 3), Point(1, 1))
      let ip = segment1.intersect(segment2)
      expect(ip.length).toEqual(2)
      expect(ip[0].x).toEqual(2)
      expect(ip[0].y).toEqual(2)
      expect(ip[1].x).toEqual(1)
      expect(ip[1].y).toEqual(1)
    })
    it('Intersection with Segment - boxes intersecting, segments not intersecting', function () {
      let segment1 = Segment(Point(0, 0), Point(2, 2))
      let segment2 = Segment(Point(0.5, 1.5), Point(-2, -4))
      expect(segment1.box().intersect(segment2.box())).toEqual(true)
      expect(segment1.intersect(segment2).length).toEqual(0)
    })
    it('Intersection with Segment - boxes not intersecting, quick reject', function () {
      let segment1 = Segment(Point(0, 0), Point(2, 2))
      let segment2 = Segment(Point(-0.5, 2.5), Point(-2, -4))
      expect(segment1.box().intersect(segment2.box())).toEqual(false)
      expect(segment1.intersect(segment2).length).toEqual(0)
    })
    it('Intersection with Line - not parallel segments case (one point)', function () {
      let segment = Segment(Point(0, 0), Point(2, 2))
      let norm = points2norm(Point(0, 2), Point(2, 0))
      let line = Line(Point(0, 2), norm)
      let ip = segment.intersect(line)
      expect(ip.length).toEqual(1)
      expect(ip[0].x).toEqual(1)
      expect(ip[0].y).toEqual(1)
    })
    it('Intersection with Line - segment lays on line case (two points)', function () {
      let segment = Segment(Point(0, 0), Point(2, 2))
      let norm = points2norm(Point(3, 3), Point(1, 1))
      let line = Line(Point(3, 3), norm)
      let ip = segment.intersect(line)
      expect(ip.length).toEqual(2)
      expect(ip[0].x).toEqual(0)
      expect(ip[0].y).toEqual(0)
      expect(ip[1].x).toEqual(2)
      expect(ip[1].y).toEqual(2)
    })
    it('Intersection with Circle', function () {
      let segment = Segment(Point(0, 0), Point(2, 2))
      let circle = Circle(Point(0, 0), 1)
      let ip_expected = Point(Math.sqrt(2) / 2, Math.sqrt(2) / 2)
      expect(segment.intersect(circle).length).toEqual(1)
      expect(segment.intersect(circle)[0].equalTo(ip_expected)).toEqual(true)
    })
    it('Intersection with Circle - case of tangent', function () {
      let segment = Segment(Point(-2, 2), Point(2, 2))
      let circle = Circle(Point(0, 0), 2)
      let ip_expected = Point(0, 2)
      expect(segment.intersect(circle).length).toEqual(1)
      expect(segment.intersect(circle)[0].equalTo(ip_expected)).toEqual(true)
    })
    it('Intersection between two very close lines returns zero intersections (#99)', () => {
      const s1 = Segment(Point(34.35, 36.557426400375626), Point(25.4, 36.557426400375626))
      const s2 = Segment(Point(25.4, 36.55742640037563), Point(31.25, 36.55742640037563))

      const ip = s1.intersect(s2)
      expect(ip.length).toEqual(0)

      const [dist, shortest_segment] = s1.distanceTo(s2)
    })
  })
  describe('#Segment.DistanceTo', function () {
    it('Distance to Segment Case 1 Intersected Segments', function () {
      let segment1 = Segment(Point(0, 0), Point(2, 2))
      let segment2 = Segment(Point(0, 2), Point(2, 0))
      expect(segment1.distanceTo(segment2)[0]).toEqual(0)
    })
    it('Distance to Segment Case 2 Not Intersected Segments', function () {
      let segment1 = Segment(Point(0, 0), Point(2, 2))
      let segment2 = Segment(Point(1, 0), Point(4, 0))
      let [dist, ...rest] = segment1.distanceTo(segment2)
      expect(EQ(dist, Math.sqrt(2) / 2)).toBe(true)
    })
    it('Distance to Line', function () {
      let seg = Segment(Point(1, 3), Point(4, 6))
      let l = Line(Point(-1, 1), Vector(0, -1))
      expect(seg.distanceTo(l)[0]).toEqual(2)
    })
    it('Distance to Circle Case 1 Intersection - touching', function () {
      let segment = Segment(Point(-4, 2), Point(4, 2))
      let circle = Circle(Point(0, 0), 2)
      expect(segment.distanceTo(circle)[0]).toEqual(0)
    })
    it('Distance to Circle Case 1 Intersection - two points', function () {
      let segment = Segment(Point(-4, 2), Point(4, 2))
      let circle = Circle(Point(0, 0), 3)
      expect(segment.distanceTo(circle)[0]).toEqual(0)
    })
    it('Distance to Circle Case 1 Intersection - one points', function () {
      let segment = Segment(Point(0, 2), Point(4, 2))
      let circle = Circle(Point(0, 0), 3)
      expect(segment.distanceTo(circle)[0]).toEqual(0)
    })
    it('Distance to Circle Case 2 Projection', function () {
      let segment = Segment(Point(-4, 4), Point(4, 4))
      let circle = Circle(Point(0, 0), 2)
      expect(segment.distanceTo(circle)[0]).toEqual(2)
    })
    it('Distance to Circle Case 3 End point out of the circle', function () {
      let segment = Segment(Point(2, 2), Point(4, 2))
      let circle = Circle(Point(0, 0), 2)
      expect(segment.distanceTo(circle)[0]).toEqual(2 * Math.sqrt(2) - 2)
    })
    it('Distance to Circle Case 3 End point inside the circle', function () {
      let segment = Segment(Point(-1, 1), Point(1, 1))
      let circle = Circle(Point(0, 0), 2)
      expect(segment.distanceTo(circle)[0]).toEqual(2 - Math.sqrt(2))
    })
  })

  describe('#Segment.pointAtLength', function () {
    it('gets the point at specific length', function () {
      let segment = Segment(Point(-1, 1), Point(1, 1))
      let l = segment.length()
      let x1 = segment.pointAtLength(1).x
      let x2 = segment.pointAtLength(0).x
      let x3 = segment.pointAtLength(2).x
      let x4 = segment.pointAtLength(0.5).x
      expect(l).toEqual(2)
      expect(x1).toEqual(0)
      expect(x2).toEqual(-1)
      expect(x3).toEqual(1)
      expect(x4).toEqual(-0.5)
    })
    it('points at specific length is on segment', function () {
      let segment = Segment(Point(-12, 4), Point(30, -2))
      let length = segment.length()
      for (let i = 0; i < 33; i++) {
        let point = segment.pointAtLength((i / 33) * length)
        expect(segment.contains(point)).toBe(true)
      }
    })
  })
})
