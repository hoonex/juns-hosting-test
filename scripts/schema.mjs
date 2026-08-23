export const dailyNewsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['date', 'dateLabel', 'top3', 'dailyThesisTitle', 'dailyThesis', 'news'],
  properties: {
    date: { type: 'string' },
    dateLabel: { type: 'string' },
    top3: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'integer' } },
    dailyThesisTitle: { type: 'string' },
    dailyThesis: { type: 'string' },
    news: {
      type: 'array', minItems: 8, maxItems: 10,
      items: {
        type: 'object', additionalProperties: false,
        required: ['category','hook','headline','summary','whyItMatters','analysis','outlook','status','sourceName','sourceUrl','imageUrl'],
        properties: {
          category: { type: 'string', enum: ['AI','AGENT','DEV','GAME','HARDWARE','ROBOT','SCIENCE','MARKET'] },
          hook: { type: 'string' },
          headline: { type: 'string' },
          summary: { type: 'string' },
          whyItMatters: { type: 'string' },
          analysis: { type: 'string' },
          outlook: { type: 'string' },
          status: { type: 'string', enum: ['confirmed','unconfirmed'] },
          sourceName: { type: 'string' },
          sourceUrl: { type: 'string' },
          imageUrl: { type: 'string' }
        }
      }
    }
  }
};
