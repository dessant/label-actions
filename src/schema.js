const Joi = require('@hapi/joi');

const fields = {
  actions: Joi.object()
    .pattern(
      Joi.string()
        .trim()
        .max(50),
      Joi.object().keys({
        comment: Joi.alternatives()
          .try(
            Joi.string()
              .trim()
              .max(10000),
            Joi.boolean().only(false)
          )
          .default(false)
          .description(
            'Post a comment, `{issue-author}` is an optional placeholder'
          ),
        close: Joi.boolean()
          .default(false)
          .description('Close the thread'),
        open: Joi.boolean()
          .default(false)
          .description('Reopen the thread'),
        lock: Joi.boolean()
          .default(false)
          .description('Lock the thread'),
        unlock: Joi.boolean()
          .default(false)
          .description('Unlock the thread'),
        lockReason: Joi.alternatives()
          .try(
            Joi.string()
              .trim()
              .valid('off-topic', 'too heated', 'resolved', 'spam'),
            Joi.boolean().only(false)
          )
          .default(false)
          .description(
            'Set a lock reason, such as `off-topic`, `too heated`, `resolved` or `spam`'
          )
      })
    )
    .max(200)
    .description('Specify actions for issues and pull requests')
};

const schema = Joi.object().keys({
  actions: fields.actions.default({}),
  only: Joi.string()
    .trim()
    .valid('issues', 'pulls')
    .description('Limit to only `issues` or `pulls`'),
  pulls: Joi.object().keys(fields),
  issues: Joi.object().keys(fields),
  _extends: Joi.string()
    .trim()
    .max(260)
    .description('Repository to extend settings from'),
  perform: Joi.boolean().default(!process.env.DRY_RUN)
});

module.exports = schema;
