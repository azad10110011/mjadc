import { describe, it, expect } from 'vitest'
import {
  calculateGrade,
  calculateGradeFromMarks,
  calculateGradeFromParts,
  GRADE_TABLE,
  DEFAULT_PARTS,
} from './index'

describe('calculateGrade (grade boundaries)', () => {
  it('maps every GRADE_TABLE row boundary correctly', () => {
    const expected = [
      [80, 'A+', 5.0],
      [79, 'A', 4.0],
      [70, 'A', 4.0],
      [69, 'A-', 3.5],
      [60, 'A-', 3.5],
      [59, 'B', 3.0],
      [50, 'B', 3.0],
      [49, 'C', 2.0],
      [40, 'C', 2.0],
      [39, 'D', 1.0],
      [33, 'D', 1.0],
      [32, 'F', 0.0],
      [0, 'F', 0.0],
    ] as const
    for (const [total, grade, points] of expected) {
      expect(calculateGrade(total)).toEqual({ grade, points })
    }
  })

  it('returns F for out-of-range totals', () => {
    expect(calculateGrade(101)).toEqual({ grade: 'F', points: 0.0 })
    expect(calculateGrade(-1)).toEqual({ grade: 'F', points: 0.0 })
  })

  it('GRADE_TABLE ranges cover 0-100 with no gaps or overlaps', () => {
    expect(GRADE_TABLE[0]).toMatchObject({ min: 80, max: 100 })
    for (let i = 1; i < GRADE_TABLE.length; i++) {
      const row = GRADE_TABLE[i]
      expect(row.min).toBeLessThan(row.max)
      // adjacent rows must be contiguous (no gap, no overlap)
      expect(GRADE_TABLE[i - 1].min).toBe(row.max + 1)
    }
    expect(GRADE_TABLE[GRADE_TABLE.length - 1].min).toBe(0)
  })
})

describe('calculateGradeFromMarks (hardcoded pass marks: mcq 8, cq 17, practical 8)', () => {
  it('passes when all parts meet pass marks', () => {
    // total = 33 -> D
    expect(calculateGradeFromMarks(8, 17, 8)).toEqual({ grade: 'D', points: 1.0 })
    // total = 100 -> A+
    expect(calculateGradeFromMarks(25, 50, 25)).toEqual({ grade: 'A+', points: 5.0 })
  })

  it('fails when any part is below its pass mark', () => {
    expect(calculateGradeFromMarks(7, 17, 8)).toEqual({ grade: 'F', points: 0.0 })
    expect(calculateGradeFromMarks(8, 16, 8)).toEqual({ grade: 'F', points: 0.0 })
    expect(calculateGradeFromMarks(8, 17, 7)).toEqual({ grade: 'F', points: 0.0 })
  })

  it('absent in any part yields Absent with 0 points regardless of totals', () => {
    expect(calculateGradeFromMarks(0, 0, 0, ['mcq'])).toEqual({ grade: 'Absent', points: 0.0 })
    expect(calculateGradeFromMarks(25, 50, 25, ['cq'])).toEqual({ grade: 'Absent', points: 0.0 })
    expect(calculateGradeFromMarks(25, 50, 25, ['practical'])).toEqual({ grade: 'Absent', points: 0.0 })
  })

  it('absent part does not count toward fail check', () => {
    // mcq absent (would fail at 0), cq+practical pass -> absent wins, not F
    expect(calculateGradeFromMarks(0, 20, 10, ['mcq'])).toEqual({ grade: 'Absent', points: 0.0 })
  })

  it('no absent parts means absent check does not trigger', () => {
    expect(calculateGradeFromMarks(25, 50, 25, [])).toEqual({ grade: 'A+', points: 5.0 })
  })
})

describe('calculateGradeFromParts (config-driven pass marks)', () => {
  const configs = DEFAULT_PARTS.map((p) => ({ ...p, subject: 'Math' }))

  it('uses part-config pass marks for fail detection', () => {
    // DEFAULT_PARTS: mcq 50/8, cq 50/17, practical 50/8
    expect(calculateGradeFromParts({ mcq: 8, cq: 17, practical: 8 }, configs)).toEqual({
      grade: 'D',
      points: 1.0,
    })
    expect(calculateGradeFromParts({ mcq: 7, cq: 17, practical: 8 }, configs)).toEqual({
      grade: 'F',
      points: 0.0,
    })
    expect(calculateGradeFromParts({ mcq: 8, cq: 16, practical: 8 }, configs)).toEqual({
      grade: 'F',
      points: 0.0,
    })
  })

  it('custom pass marks are respected (not hardcoded)', () => {
    const strict = [
      { subject: 'Math', part_name: 'mcq', full_mark: 50, pass_mark: 20, sort_order: 1 },
      { subject: 'Math', part_name: 'cq', full_mark: 50, pass_mark: 30, sort_order: 2 },
      { subject: 'Math', part_name: 'practical', full_mark: 50, pass_mark: 10, sort_order: 3 },
    ]
    // mcq 8 passes hardcoded threshold but fails the strict 20 threshold
    expect(calculateGradeFromParts({ mcq: 8, cq: 30, practical: 10 }, strict)).toEqual({
      grade: 'F',
      points: 0.0,
    })
  })

  it('missing part entries default to 0 and fail their pass mark', () => {
    expect(calculateGradeFromParts({ mcq: 25, cq: 30 }, configs)).toEqual({
      grade: 'F',
      points: 0.0,
    })
  })

  it('absent handling matches calculateGradeFromMarks', () => {
    expect(calculateGradeFromParts({ mcq: 25, cq: 30, practical: 25 }, configs, ['cq'])).toEqual({
      grade: 'Absent',
      points: 0.0,
    })
    // absent part skipped before fail check
    expect(calculateGradeFromParts({ mcq: 25, cq: 0, practical: 25 }, configs, ['cq'])).toEqual({
      grade: 'Absent',
      points: 0.0,
    })
  })

  it('any absent part makes the whole subject Absent (even if rest passes)', () => {
    // practical absent -> subject grade is Absent regardless of other totals
    const configsNoFail = configs.map((c) => ({ ...c, pass_mark: 0 }))
    expect(calculateGradeFromParts({ mcq: 25, cq: 30, practical: 25 }, configsNoFail, ['practical'])).toEqual({
      grade: 'Absent',
      points: 0.0,
    })
  })
})
