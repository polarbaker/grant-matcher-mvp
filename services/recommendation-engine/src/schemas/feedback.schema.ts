import Joi from 'joi';

export const feedbackSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().min(10).max(500).optional(),
  relevance: Joi.object({
    score: Joi.number().min(0).max(1).required(),
    reason: Joi.string().min(10).max(200).required()
  }).required(),
  improvements: Joi.array().items(
    Joi.string().min(10).max(200)
  ).optional(),
  analysis: Joi.object({
    summary: Joi.string().required(),
    entities: Joi.object({
      organizations: Joi.array().items(Joi.string()).required(),
      technologies: Joi.array().items(Joi.string()).required(),
      markets: Joi.array().items(Joi.string()).required()
    }).required(),
    key_topics: Joi.array().items(Joi.string()).required(),
    funding_needs: Joi.object({
      amount: Joi.number().required(),
      stage: Joi.string().required(),
      timeline: Joi.string().required()
    }).required(),
    region: Joi.string().required()
  }).optional()
});
