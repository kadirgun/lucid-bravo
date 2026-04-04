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
  include: vine.array(vine.string()).optional(),
  dimensions: vine.array(vine.string()).optional(),
  metrics: vine.array(vine.string()).optional(),
}

export const bravoValidator = vine.create(bravoSchema)
