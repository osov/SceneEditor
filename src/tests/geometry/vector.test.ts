import { describe, expect, it } from "bun:test"
import { EQ, TAU } from "../../modules/utils"
import { add, angleTo, clone, cross, dot, invert_vec, multiply, normalize, rotate, shape_equal_to, shape_length, subtract, vector_projection, vector_slope } from "@editor/utils/geometry/utils"
import { Vector } from "@editor/utils/geometry/shapes"

describe('Vector', function () {
  it('Default constructor creates Vector(0, 0)', function () {
    let vector = Vector()
    expect(vector.x).toEqual(0)
    expect(vector.y).toEqual(0)
  })
  it('Constructor Vector(x, y) creates vector [x, y]', function () {
    let vector = Vector(1, 1)
    expect(vector.x).toEqual(1)
    expect(vector.y).toEqual(1)
  })
  it('.clone() creates new instance of Vector', function () {
    let v1 = Vector(2, 1)
    let v2 = clone(v1)
    expect(v1.x).toEqual(v2.x)
    expect(v1.y).toEqual(v2.y)
    expect(v2).not.toEqual(v1)
  })
  it('.mutliply() vector by scalar', function () {
    let v1 = Vector(2, 1)
    let v2 = clone(v1)
    multiply(v2, 2)
    expect(v2.x).toEqual(4)
    expect(v2.y).toEqual(2)
  })
  it('.dot() calculates dot product', function () {
    let v1 = Vector(2, 0)
    let v2 = Vector(0, 2)
    expect(dot(v1, v2)).toEqual(0)
  })
  it('.cross() calculates cross product', function () {
    let v1 = Vector(2, 0)
    let v2 = Vector(0, 2)
    expect(cross(v1, v2)).toEqual(4)
  })
  it('.length() calculates vector length', function () {
    let v = Vector(1, 1)
    expect(shape_length(v)).toEqual(Math.sqrt(2))
  })
  it('Get slope - angle in radians between vector and axe x', function () {
    let v1 = Vector(1, 1)
    let v2 = Vector(-1, 1)
    let v3 = Vector(-1, -1)
    let v4 = Vector(1, -1)
    expect(vector_slope(v1)).toEqual((TAU / 2) / 4)
    expect(vector_slope(v2)).toEqual((3 * (TAU / 2)) / 4)
    expect(vector_slope(v3)).toEqual((5 * (TAU / 2)) / 4)
    expect(vector_slope(v4)).toEqual((7 * (TAU / 2)) / 4)
  })
  it('.normalize() returns unit vector', function () {
    let v = Vector(1, 1)
    normalize(v)
    let equals = EQ(shape_length(v), 1.0)
    expect(equals).toEqual(true)
  })
  it('.normalize() throw error on zero length vector', function () {
    let v = Vector(0, 0)
    let fn = function () {
      normalize(v)
    }
    expect(fn).toThrowError()
  })
  it('.rotate() returns new vector rotated by given angle, positive angle defines rotation in clockwise direction', function () {
    let vector = Vector(1, 1)
    let angle = TAU / 4
    rotate(vector, angle)
    expect(shape_equal_to(vector, Vector(-1, 1))).toEqual(true)
  })
  it('.rotate() rotates counterclockwise when angle is negative', function () {
    let vector = Vector(1, 1)
    let angle = -(TAU / 2) / 2
    rotate(vector, angle)
    expect(shape_equal_to(vector, Vector(1, -1))).toEqual(true)
  })
  it('.add() return sum of two vectors', function () {
    let v1 = Vector(2, 1)
    let v2 = Vector(1, 2)
    let v3 = add(v1, v2)
    expect(v3.x).toEqual(3)
    expect(v3.y).toEqual(3)
  })
  it('.subtract() returns difference between two vectors', function () {
    let v1 = Vector(2, 1)
    let v2 = Vector(1, 2)
    let v3 = subtract(v1, v2)
    expect(v3.x).toEqual(1)
    expect(v3.y).toEqual(-1)
  })
  it('.invert() returns inverted vector', function () {
    let v = Vector(2, 1)
    let v1 = clone(v)
    invert_vec(v1)
    expect(v1.x).toEqual(-2)
    expect(v1.y).toEqual(-1)
  })

  it('.angle() returns angle between two vectors', function () {
    let v = Vector(3, 0)
    let v1 = Vector(3, 3)
    let v2 = Vector(0, 3)
    let v3 = Vector(-3, 0)
    let v4 = Vector(-3, -3)
    let v5 = Vector(0, -3)
    let v6 = Vector(3, -3)

    expect(EQ(angleTo(v, v), 0)).toBe(true)
    expect(EQ(angleTo(v, v1), (TAU / 2) / 4)).toBe(true)
    expect(EQ(angleTo(v, v2), (TAU / 2) / 2)).toBe(true)
    expect(EQ(angleTo(v,v3), (TAU / 2))).toBe(true)
    expect(EQ(angleTo(v, v4), (5 * (TAU / 2)) / 4)).toBe(true)
    expect(EQ(angleTo(v, v5), (3 * (TAU / 2)) / 2)).toBe(true)
    expect(EQ(angleTo(v, v6), (7 * (TAU / 2)) / 4)).toBe(true)
  })
  it('.projection() returns new vector case 1', function () {
    let v1 = Vector(3, 3)
    let v2 = Vector(10, 0)
    let v3 = vector_projection(v1, v2)
    expect(v3.x).toEqual(3)
    expect(v3.y).toEqual(0)
  })
  it('.projection() returns new vector case 2', function () {
    let v1 = Vector(-3, 3)
    let v2 = Vector(10, 0)
    let v3 = Vector(-3, 0)
    let v = vector_projection(v1, v2)
    expect(v.x == v3.x).toBe(true)
    expect(v.y == v3.y).toBe(true)
  })
  it('.projection() returns new vector case 3', function () {
    let v1 = Vector(3, 3)
    let v2 = Vector(-3, 3)
    let v3 = Vector(0, 0)
    let v = vector_projection(v1, v2)
    expect(v.x == v3.x).toBe(true)
    expect(v.y == v3.y).toBe(true)
  })
})
