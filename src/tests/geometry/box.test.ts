import { describe, expect, it } from 'bun:test'
import { Box, Point } from '../../modules/Geometry'

describe('Box', function () {
  it('.center works', function () {
    let center1 = Box(-2, -2, 2, 2).center();
    let center2 = Box(0, 10, 5, 15).center();
    expect(center1.x).toEqual(0)
    expect(center1.y).toEqual(0)
    expect(center2.x).toEqual(2.5)
    expect(center2.y).toEqual(12.5)
  })
  it('.intersect() returns true if two boxes intersected', function () {
    let box1 = Box(1, 1, 3, 3)
    let box2 = Box(-3, -3, 2, 2)
    expect(box1.intersect(box2)).toEqual(true)
  })
  it('.contains() returns true if box contains point', function () {
    let box = Box(1, 1, 3, 3)
    let a = Point(2, 2)
    let b = Point(2, 4)
    expect(box.contains(a)).toEqual(true)
    expect(box.contains(b)).toEqual(false)
  })
  it('.expand() expands current box with other', function () {
    let box1 = Box(1, 1, 3, 3)
    let box2 = Box(-3, -3, 2, 2)
    let box3 = box1.merge(box2)
    expect(box3.xmax).toEqual(3)
    expect(box3.ymax).toEqual(3)
    expect(box3.xmin).toEqual(-3)
    expect(box3.ymin).toEqual(-3)
  })
})
