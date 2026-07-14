import test from "node:test"
import assert from "node:assert/strict"

const { calculatePersonalRecordSummary, validatePersonalRecordSlotSelection } =
  await import(new URL("./personal-records.ts", import.meta.url).href)

test("calculates estimated 1RM with the Epley formula", () => {
  const summary = calculatePersonalRecordSummary([
    {
      weight: 100,
      reps: 10,
      category: "BARBELL",
    },
  ])

  assert.equal(summary.actualOneRepMax, null)
  assert.equal(summary.estimatedOneRepMax, 133.33333333333331)
  assert.equal(summary.shouldDisplayEstimatedValue, true)
})

test("caps repetitions at 12 for estimated 1RM", () => {
  const summary = calculatePersonalRecordSummary([
    {
      weight: 100,
      reps: 14,
      category: "BARBELL",
    },
  ])

  assert.equal(summary.estimatedOneRepMax, 140)
})

test("excludes reps == 1 from estimated 1RM and uses them for actual 1RM", () => {
  const summary = calculatePersonalRecordSummary([
    {
      weight: 120,
      reps: 1,
      category: "BARBELL",
    },
    {
      weight: 100,
      reps: 8,
      category: "BARBELL",
    },
  ])

  assert.equal(summary.actualOneRepMax, 120)
  assert.equal(summary.estimatedOneRepMax, 126.66666666666666)
})

test("excludes weight <= 0 from PR calculations", () => {
  const summary = calculatePersonalRecordSummary([
    {
      weight: 0,
      reps: 8,
      category: "BARBELL",
    },
    {
      weight: -10,
      reps: 1,
      category: "BARBELL",
    },
  ])

  assert.deepEqual(summary, {
    actualOneRepMax: null,
    estimatedOneRepMax: null,
    shouldDisplayEstimatedValue: false,
  })
})

test("excludes null weight from PR calculations", () => {
  const summary = calculatePersonalRecordSummary([
    {
      weight: null,
      reps: 8,
      category: "BARBELL",
    },
  ])

  assert.deepEqual(summary, {
    actualOneRepMax: null,
    estimatedOneRepMax: null,
    shouldDisplayEstimatedValue: false,
  })
})

test("displays estimated value when estimated is greater than actual", () => {
  const summary = calculatePersonalRecordSummary([
    {
      weight: 100,
      reps: 1,
      category: "BARBELL",
    },
    {
      weight: 95,
      reps: 5,
      category: "BARBELL",
    },
  ])

  assert.equal(summary.actualOneRepMax, 100)
  assert.equal(summary.estimatedOneRepMax, 110.83333333333334)
  assert.equal(summary.shouldDisplayEstimatedValue, true)
})

test("hides estimated value when estimated equals actual", () => {
  const summary = calculatePersonalRecordSummary([
    {
      weight: 100,
      reps: 1,
      category: "BARBELL",
    },
    {
      weight: 85.71428571428571,
      reps: 5,
      category: "BARBELL",
    },
  ])

  assert.equal(summary.actualOneRepMax, 100)
  assert.equal(summary.estimatedOneRepMax, 100)
  assert.equal(summary.shouldDisplayEstimatedValue, false)
})

test("hides estimated value when estimated is lower than actual", () => {
  const summary = calculatePersonalRecordSummary([
    {
      weight: 120,
      reps: 1,
      category: "BARBELL",
    },
    {
      weight: 100,
      reps: 5,
      category: "BARBELL",
    },
  ])

  assert.equal(summary.actualOneRepMax, 120)
  assert.equal(summary.estimatedOneRepMax, 116.66666666666667)
  assert.equal(summary.shouldDisplayEstimatedValue, false)
})

test("rejects duplicate slot selections", () => {
  const result = validatePersonalRecordSlotSelection({
    slot: 2,
    userId: "user-1",
    exercise: {
      id: "exercise-1",
      userId: null,
    },
    selectedExerciseIds: ["exercise-1"],
    currentSlotExerciseId: null,
  })

  assert.deepEqual(result, {
    ok: false,
    error: "You already selected that exercise for another slot.",
  })
})

test("rejects invalid slot numbers", () => {
  const result = validatePersonalRecordSlotSelection({
    slot: 5,
    userId: "user-1",
    exercise: {
      id: "exercise-1",
      userId: null,
    },
    selectedExerciseIds: [],
    currentSlotExerciseId: null,
  })

  assert.deepEqual(result, {
    ok: false,
    error: "Select a valid personal record slot.",
  })
})

test("allows global exercise selection", () => {
  const result = validatePersonalRecordSlotSelection({
    slot: 1,
    userId: "user-1",
    exercise: {
      id: "exercise-1",
      userId: null,
    },
    selectedExerciseIds: [],
    currentSlotExerciseId: null,
  })

  assert.deepEqual(result, {
    ok: true,
  })
})

test("allows selecting your own custom exercise", () => {
  const result = validatePersonalRecordSlotSelection({
    slot: 1,
    userId: "user-1",
    exercise: {
      id: "exercise-1",
      userId: "user-1",
    },
    selectedExerciseIds: [],
    currentSlotExerciseId: null,
  })

  assert.deepEqual(result, {
    ok: true,
  })
})

test("prevents selecting another user's custom exercise", () => {
  const result = validatePersonalRecordSlotSelection({
    slot: 1,
    userId: "user-1",
    exercise: {
      id: "exercise-1",
      userId: "user-2",
    },
    selectedExerciseIds: [],
    currentSlotExerciseId: null,
  })

  assert.deepEqual(result, {
    ok: false,
    error: "That exercise is not available to you.",
  })
})
