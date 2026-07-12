import assert from "node:assert/strict"
import test from "node:test"

const {
  compareSessionStructureToTemplate,
  createWorkoutSessionFromTemplate,
  createTemplateFromSessionStructure,
  updateTemplateFromSessionStructure,
  validateWorkoutTemplateDraftInput,
} = await import(new URL("./workout-templates.ts", import.meta.url).href)

test("accepts a complete valid workout template draft", () => {
  const result = validateWorkoutTemplateDraftInput({
    name: "  Push Day  ",
    description: "  Chest + shoulders  ",
    exercises: [
      {
        exerciseId: "exercise-1",
        order: 1,
        notes: "  Pause on the chest  ",
        sets: [
          {
            setNumber: 1,
            minReps: 6,
            maxReps: 8,
            targetWeight: 100.125,
          },
        ],
      },
    ],
  })

  assert.deepEqual(result, {
    ok: true,
    data: {
      name: "Push Day",
      description: "Chest + shoulders",
      exercises: [
        {
          exerciseId: "exercise-1",
          order: 1,
          notes: "Pause on the chest",
          sets: [
            {
              setNumber: 1,
              minReps: 6,
              maxReps: 8,
              targetWeight: 100.13,
            },
          ],
        },
      ],
    },
  })
})

test("rejects empty exercise lists", () => {
  const result = validateWorkoutTemplateDraftInput({
    name: "Leg Day",
    description: "",
    exercises: [],
  })

  assert.deepEqual(result, {
    ok: false,
    error: "Add at least one exercise before saving this template.",
  })
})

test("rejects non-sequential exercise order", () => {
  const result = validateWorkoutTemplateDraftInput({
    name: "Leg Day",
    description: "",
    exercises: [
      {
        exerciseId: "exercise-1",
        order: 2,
        notes: null,
        sets: [
          {
            setNumber: 1,
            minReps: 8,
            maxReps: 10,
            targetWeight: null,
          },
        ],
      },
    ],
  })

  assert.deepEqual(result, {
    ok: false,
    error: "Exercises must be ordered sequentially starting at 1.",
  })
})

test("rejects exercises without sets", () => {
  const result = validateWorkoutTemplateDraftInput({
    name: "Pull Day",
    description: "",
    exercises: [
      {
        exerciseId: "exercise-1",
        order: 1,
        notes: null,
        sets: [],
      },
    ],
  })

  assert.deepEqual(result, {
    ok: false,
    error: "Exercise 1 must include at least one set.",
  })
})

test("rejects non-sequential set numbers", () => {
  const result = validateWorkoutTemplateDraftInput({
    name: "Pull Day",
    description: "",
    exercises: [
      {
        exerciseId: "exercise-1",
        order: 1,
        notes: null,
        sets: [
          {
            setNumber: 2,
            minReps: 8,
            maxReps: 10,
            targetWeight: null,
          },
        ],
      },
    ],
  })

  assert.deepEqual(result, {
    ok: false,
    error: "Sets must be numbered sequentially starting at 1.",
  })
})

test("rejects invalid rep and weight ranges", () => {
  const tooFewReps = validateWorkoutTemplateDraftInput({
    name: "Pull Day",
    description: "",
    exercises: [
      {
        exerciseId: "exercise-1",
        order: 1,
        notes: null,
        sets: [
          {
            setNumber: 1,
            minReps: 0,
            maxReps: 10,
            targetWeight: null,
          },
        ],
      },
    ],
  })

  assert.deepEqual(tooFewReps, {
    ok: false,
    error: "Set 1 must have min reps of at least 1.",
  })

  const maxBelowMin = validateWorkoutTemplateDraftInput({
    name: "Pull Day",
    description: "",
    exercises: [
      {
        exerciseId: "exercise-1",
        order: 1,
        notes: null,
        sets: [
          {
            setNumber: 1,
            minReps: 10,
            maxReps: 8,
            targetWeight: null,
          },
        ],
      },
    ],
  })

  assert.deepEqual(maxBelowMin, {
    ok: false,
    error: "Set 1 must have max reps of at least min reps.",
  })

  const negativeWeight = validateWorkoutTemplateDraftInput({
    name: "Pull Day",
    description: "",
    exercises: [
      {
        exerciseId: "exercise-1",
        order: 1,
        notes: null,
        sets: [
          {
            setNumber: 1,
            minReps: 8,
            maxReps: 10,
            targetWeight: -5,
          },
        ],
      },
    ],
  })

  assert.deepEqual(negativeWeight, {
    ok: false,
    error: "Set 1 must have a target weight of 0 or greater.",
  })
})

test("creates a live workout session from the template exercises and sets", async () => {
  let findFirstArgs: unknown
  let createArgs: unknown

  const db = {
    workoutTemplate: {
      findFirst: async (args: unknown) => {
        findFirstArgs = args
        return {
          id: "template-1",
          name: "Push Day",
          version: 4,
          exercises: [
            {
              exerciseId: "exercise-1",
              notes: "Pause on chest",
              sets: [
                {
                  setNumber: 1,
                  minReps: 8,
                  maxReps: 10,
                  targetWeight: 80,
                },
                {
                  setNumber: 2,
                  minReps: 8,
                  maxReps: 8,
                  targetWeight: null,
                },
              ],
            },
            {
              exerciseId: "exercise-2",
              notes: null,
              sets: [
                {
                  setNumber: 1,
                  minReps: 12,
                  maxReps: 15,
                  targetWeight: 22.5,
                },
              ],
            },
          ],
        }
      },
    },
    workoutSession: {
      create: async (args: unknown) => {
        createArgs = args
        return { id: "session-1" }
      },
    },
  }

  const result = await createWorkoutSessionFromTemplate(
    db as never,
    "user-1",
    "template-1"
  )

  assert.deepEqual(result, {
    ok: true,
    sessionId: "session-1",
  })

  assert.deepEqual(findFirstArgs, {
    where: {
      id: "template-1",
      userId: "user-1",
    },
    select: {
      id: true,
      name: true,
      version: true,
      exercises: {
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: {
          exerciseId: true,
          notes: true,
          sets: {
            orderBy: [{ setNumber: "asc" }, { id: "asc" }],
            select: {
              setNumber: true,
              minReps: true,
              maxReps: true,
              targetWeight: true,
            },
          },
        },
      },
    },
  })

  assert.equal(typeof createArgs, "object")
  assert.ok(createArgs)

  const sessionCreate = (
    createArgs as {
      data: {
        userId: string
        templateId: string
        templateVersion: number
        name: string
        status: string
        startedAt: Date
        exercises: {
          create: Array<{
            exerciseId: string
            order: number
            notes: string | null
            sets: {
              create: Array<{
                setNumber: number
                plannedMinReps: number
                plannedMaxReps: number
                weight: number | null
              }>
            }
          }>
        }
      }
    }
  ).data

  assert.equal(sessionCreate.userId, "user-1")
  assert.equal(sessionCreate.templateId, "template-1")
  assert.equal(sessionCreate.templateVersion, 4)
  assert.equal(sessionCreate.name, "Push Day")
  assert.equal(sessionCreate.status, "IN_PROGRESS")
  assert.ok(sessionCreate.startedAt instanceof Date)
  assert.deepEqual(sessionCreate.exercises.create, [
    {
      exerciseId: "exercise-1",
      order: 1,
      notes: "Pause on chest",
      sets: {
        create: [
          {
            setNumber: 1,
            plannedMinReps: 8,
            plannedMaxReps: 10,
            weight: 80,
          },
          {
            setNumber: 2,
            plannedMinReps: 8,
            plannedMaxReps: 8,
            weight: null,
          },
        ],
      },
    },
    {
      exerciseId: "exercise-2",
      order: 2,
      notes: null,
      sets: {
        create: [
          {
            setNumber: 1,
            plannedMinReps: 12,
            plannedMaxReps: 15,
            weight: 22.5,
          },
        ],
      },
    },
  ])
})

test("rejects starting a workout when the template is not owned by the user", async () => {
  const db = {
    workoutTemplate: {
      findFirst: async () => null,
    },
  }

  const result = await createWorkoutSessionFromTemplate(
    db as never,
    "user-1",
    "template-1"
  )

  assert.deepEqual(result, {
    ok: false,
    error: "That template could not be found.",
  })
})

test("creates a template from the workout's final per-set prescriptions", async () => {
  let createArgs: unknown

  const db = {
    workoutSession: {
      findFirst: async () => ({
        id: "session-1",
        name: "Leg Day",
        status: "COMPLETED",
        templateId: null,
        startedAt: new Date("2026-07-12T09:00:00.000Z"),
        exercises: [
          {
            id: "we-1",
            exerciseId: "exercise-1",
            order: 1,
            notes: "Controlled tempo",
            sets: [
              {
                setNumber: 1,
                plannedMinReps: null,
                plannedMaxReps: null,
                weight: 100,
                reps: 8,
              },
              {
                setNumber: 2,
                plannedMinReps: null,
                plannedMaxReps: null,
                weight: null,
                reps: 10,
              },
            ],
          },
        ],
      }),
    },
    workoutTemplate: {
      create: async (args: unknown) => {
        createArgs = args
        return { id: "template-1" }
      },
    },
  }

  const result = await createTemplateFromSessionStructure(
    db as never,
    "user-1",
    "session-1",
    "  Leg Day  "
  )

  assert.deepEqual(result, {
    ok: true,
    templateId: "template-1",
  })

  assert.deepEqual(createArgs, {
    data: {
      userId: "user-1",
      name: "Leg Day",
      description: null,
      exercises: {
        create: [
          {
            exerciseId: "exercise-1",
            order: 1,
            notes: "Controlled tempo",
            sets: {
              create: [
                {
                  setNumber: 1,
                  minReps: 8,
                  maxReps: 8,
                  targetWeight: 100,
                },
                {
                  setNumber: 2,
                  minReps: 10,
                  maxReps: 10,
                  targetWeight: null,
                },
              ],
            },
          },
        ],
      },
    },
    select: {
      id: true,
    },
  })
})

test("rejects template creation when a workout set has no completed reps", async () => {
  const db = {
    workoutSession: {
      findFirst: async () => ({
        id: "session-1",
        name: "Leg Day",
        status: "COMPLETED",
        templateId: null,
        startedAt: new Date("2026-07-12T09:00:00.000Z"),
        exercises: [
          {
            id: "we-1",
            exerciseId: "exercise-1",
            order: 1,
            notes: null,
            sets: [
              {
                setNumber: 1,
                plannedMinReps: null,
                plannedMaxReps: null,
                weight: 100,
                reps: null,
              },
            ],
          },
        ],
      }),
    },
  }

  const result = await createTemplateFromSessionStructure(
    db as never,
    "user-1",
    "session-1",
    "Leg Day"
  )

  assert.deepEqual(result, {
    ok: false,
    error:
      "Set 1 in exercise 1 needs completed reps before it can be saved to a template.",
  })
})

test("detects structural changes from per-set template prescriptions", async () => {
  const db = {
    workoutSession: {
      findFirst: async () => ({
        id: "session-1",
        name: "Push Day",
        status: "COMPLETED",
        templateId: "template-1",
        startedAt: new Date("2026-07-12T09:00:00.000Z"),
        exercises: [
          {
            id: "we-1",
            exerciseId: "exercise-1",
            order: 1,
            notes: null,
            sets: [
              {
                setNumber: 1,
                plannedMinReps: 8,
                plannedMaxReps: 10,
                weight: 82.5,
                reps: 9,
              },
            ],
          },
        ],
      }),
    },
    workoutTemplate: {
      findFirst: async () => ({
        id: "template-1",
        name: "Push Day",
        exercises: [
          {
            exerciseId: "exercise-1",
            notes: "ignored in comparison",
            sets: [
              {
                setNumber: 1,
                minReps: 8,
                maxReps: 10,
                targetWeight: 80,
              },
            ],
          },
        ],
      }),
    },
  }

  const result = await compareSessionStructureToTemplate(
    db as never,
    "user-1",
    "session-1"
  )

  assert.deepEqual(result, {
    ok: true,
    hasTemplate: true,
    modified: true,
    templateId: "template-1",
    templateName: "Push Day",
  })
})

test("updates a template from the workout's final per-set prescriptions", async () => {
  let replacedExercises: unknown
  let versionUpdateArgs: unknown

  const db = {
    workoutSession: {
      findFirst: async () => ({
        id: "session-1",
        name: "Pull Day",
        status: "COMPLETED",
        templateId: "template-1",
        startedAt: new Date("2026-07-12T09:00:00.000Z"),
        exercises: [
          {
            id: "we-1",
            exerciseId: "exercise-1",
            order: 1,
            notes: "Straps optional",
            sets: [
              {
                setNumber: 1,
                plannedMinReps: 6,
                plannedMaxReps: 8,
                weight: 140,
                reps: 6,
              },
              {
                setNumber: 2,
                plannedMinReps: 6,
                plannedMaxReps: 8,
                weight: 140,
                reps: 6,
              },
            ],
          },
        ],
      }),
    },
    workoutTemplate: {
      findFirst: async () => ({
        id: "template-1",
        name: "Pull Day",
        version: 3,
      }),
      update: async (args: unknown) => {
        versionUpdateArgs = args
        return { id: "template-1" }
      },
    },
    workoutTemplateExercise: {
      deleteMany: async () => ({ count: 1 }),
      create: async (_args: unknown) => {
        replacedExercises = _args
        return { id: "wte-1" }
      },
    },
  }

  const result = await updateTemplateFromSessionStructure(
    db as never,
    "user-1",
    "session-1"
  )

  assert.deepEqual(result, {
    ok: true,
    templateId: "template-1",
  })

  assert.deepEqual(replacedExercises, {
    data: {
      templateId: "template-1",
      exerciseId: "exercise-1",
      order: 1,
      notes: "Straps optional",
      sets: {
        create: [
          {
            setNumber: 1,
            minReps: 6,
            maxReps: 6,
            targetWeight: 140,
          },
          {
            setNumber: 2,
            minReps: 6,
            maxReps: 6,
            targetWeight: 140,
          },
        ],
      },
    },
  })

  assert.deepEqual(versionUpdateArgs, {
    where: {
      id: "template-1",
    },
    data: {
      version: {
        increment: 1,
      },
    },
  })
})
