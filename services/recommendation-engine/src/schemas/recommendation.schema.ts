import Joi from 'joi';

export const deckAnalysisSchema = Joi.object({
  topics: Joi.array().items(Joi.string()).required(),
  fundingNeeds: Joi.object({
    amount: Joi.number().min(0).required(),
    timeline: Joi.string().required()
  }).required(),
  teamSize: Joi.number().min(1).required(),
  stage: Joi.string().valid('idea', 'seed', 'early', 'growth', 'mature').required(),
  traction: Joi.object({
    revenue: Joi.number().min(0),
    users: Joi.number().min(0)
  }).required()
});

export const grantSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  amount: Joi.object({
    min: Joi.number().min(0).required(),
    max: Joi.number().min(Joi.ref('min')).required()
  }).required(),
  deadline: Joi.date().greater('now').required(),
  eligibility: Joi.object({
    regions: Joi.array().items(Joi.string()).required(),
    organizationTypes: Joi.array().items(Joi.string()).required(),
    requirements: Joi.array().items(Joi.string())
  }).required(),
  categories: Joi.array().items(Joi.string()).required(),
  status: Joi.string().valid('active', 'inactive', 'expired').default('active')
});

export const feedbackSchema = Joi.object({
  userId: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string(),
  status: Joi.string().valid('interested', 'not_interested', 'applied').required()
});

export const recommendationSchema = Joi.object({
  userId: Joi.string().required(),
  preferences: Joi.object({
    grantTypes: Joi.array().items(Joi.string()),
    fundingAmount: Joi.object({
      min: Joi.number().min(0),
      max: Joi.number().min(0)
    }),
    categories: Joi.array().items(Joi.string()),
    locations: Joi.array().items(Joi.string())
  }),
  profile: Joi.object({
    organization: Joi.object({
      type: Joi.string().allow(''),
      size: Joi.string().allow('')
    }).optional(),
    expertise: Joi.array().items(Joi.string()),
    previousGrants: Joi.array().items(
      Joi.object({
        amount: Joi.number().min(0),
        year: Joi.number().min(1900).max(new Date().getFullYear())
      })
    )
  }),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10)
});
