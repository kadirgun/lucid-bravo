import vine from '@vinejs/vine'

export const bravoSchema = {
  sort: vine
    .object({
      field: vine.string(),
      order: vine.enum(['asc', 'desc'] as const),
    })
    .optional(),
  limit: vine.number().positive().max(100).optional(),
  page: vine.number().positive().optional(),
  include: vine
    .union([
      vine.union.if((val) => typeof val === 'string', vine.string()),
      vine.union.if((val) => Array.isArray(val), vine.array(vine.string())),
    ])
    .optional(),
  dimensions: vine
    .union([
      vine.union.if((val) => typeof val === 'string', vine.string()),
      vine.union.if((val) => Array.isArray(val), vine.array(vine.string())),
    ])
    .optional(),
  metrics: vine
    .union([
      vine.union.if((val) => typeof val === 'string', vine.string()),
      vine.union.if((val) => Array.isArray(val), vine.array(vine.string())),
    ])
    .optional(),
}

export const bravoValidator = vine.create(bravoSchema)
