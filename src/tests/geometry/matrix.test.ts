import { Matrix } from "@editor/utils/geometry/matrix"
import { Point } from "@editor/utils/geometry/point"
import { Vector } from "@editor/utils/geometry/vector"
import { describe, expect, it } from "bun:test"

describe('Matrix', function () {
  it('Matrix can translate vector', function () {
    let m = Matrix(1, 0, 0, 1, 5, 10)
    expect(m.transform(10, 5)).toEqual({x: 15, y: 15})
  })
  it('Method translate returns translation matrix', function () {
    let m = Matrix().translate(5, 10)
    expect(m.transform(10, 5)).toEqual({x: 15, y: 15})
  })
  it('Matrix can rotate vector counterclockwise', function () {
    let cos = 0.0
    let sin = 1.0
    let m = Matrix(cos, sin, -sin, cos, 0, 0)
    expect(m.transform(3, 0)).toEqual({x: 0, y: 3})
  })
  it('Method rotate returns rotation matrix to rotate around (0,0)', function () {
    let m = Matrix().rotate(Math.PI / 2)
    let pt = Point(3, 0)
    let {x, y} = m.transform(pt.x, pt.y)
    let transformed_pt = Point(x, y)
    let expected_pt = Point(0, 3)
    expect(transformed_pt.equalTo(expected_pt)).toBe(true)
  })
  it('Method rotate and translate may compose rotation matrix to rotate around Point other than (0,0)', function () {
    let pt = Point(4, 1)
    let pc = Point(1, 1)
    let [x, y] = [pt.x, pt.y]
    let m = Matrix()
      .translate(pc.x, pc.y)
      .rotate((3 * Math.PI) / 2)
      .translate(-pc.x, -pc.y);
    let {x: x1, y: y1} = m.transform(x, y)
    let transformed_pt = Point(x1, y1)
    let expected_pt = Point(1, -2)
    expect(transformed_pt.equalTo(expected_pt)).toBe(true)
  })
  it('Matrix can scale vector', function () {
    let m = Matrix(10, 0, 0, 5, 0, 0)
    expect(m.transform(1, 1)).toEqual({x: 10, y: 5})
  })
  it('Method scale returns matrix that may scale vector', function () {
    let m = Matrix().scale(5, 10)
    expect(m.transform(1, 1)).toEqual({x: 5, y: 10})
  })
})
