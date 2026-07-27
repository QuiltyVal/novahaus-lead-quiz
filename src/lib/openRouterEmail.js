export function buildOpenRouterEmailResponseFormat() {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'lead_follow_up_email',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          subject: {
            type: 'string',
            description: 'Concise German email subject.',
          },
          body: {
            type: 'string',
            description: 'Polite German follow-up email body.',
          },
        },
        required: ['subject', 'body'],
      },
    },
  }
}
