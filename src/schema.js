import Joi from 'joi';

const extendedJoi = Joi.extend(joi => {
  return {
    type: 'processOnly',
    base: joi.array(),
    coerce: {
      from: 'string',
      method(value) {
        value = value.trim();

        if (value) {
          value = value
            .split(',')
            .map(item => {
              item = item.trim();
              if (['issues', 'prs', 'discussions'].includes(item)) {
                item = item.slice(0, -1);
              }
              return item;
            })
            .filter(Boolean);
        }

        return {value};
      }
    }
  };
}).extend(joi => {
  return {
    type: 'closeReason',
    base: joi.string(),
    coerce: {
      from: 'string',
      method(value, helpers) {
        value = value.trim();
        if (value === 'not planned') {
          value = 'not_planned';
        } else if (['duplicate', 'outdated', 'resolved'].includes(value)) {
          value = value.toUpperCase();
        }

        return {value};
      }
    }
  };
});

const configSchema = Joi.object({
  'github-token': Joi.string().trim().max(100),

  'config-path': Joi.string()
    .trim()
    .max(200)
    .default('.github/label-actions.yml'),

  'process-only': Joi.alternatives().try(
    extendedJoi
      .processOnly()
      .items(Joi.string().valid('issue', 'pr', 'discussion'))
      .min(1)
      .max(3)
      .unique(),
    Joi.string().trim().valid('')
  )
});

const actions = {
  close: Joi.boolean(),

  'close-reason': Joi.alternatives().try(
    Joi.boolean().only(false),
    extendedJoi.closeReason().valid(
      // issues
      'completed',
      'not_planned',
      // discussions
      'DUPLICATE',
      'OUTDATED',
      'RESOLVED',
      ''
    )
  ),

  reopen: Joi.boolean(),

  lock: Joi.boolean(),

  unlock: Joi.boolean(),

  'lock-reason': Joi.alternatives().try(
    Joi.boolean().only(false),
    Joi.string().trim().valid('resolved', 'off-topic', 'too heated', 'spam', '')
  ),

  comment: Joi.alternatives().try(
    Joi.boolean().only(false),
    Joi.string().trim().valid(''),
    Joi.array().items(Joi.string().trim().max(65536)).min(1).max(10).single()
  ),

  label: Joi.alternatives().try(
    Joi.boolean().only(false),
    Joi.string().trim().valid(''),
    Joi.array()
      .items(Joi.string().trim().max(50))
      .min(1)
      .max(30)
      .unique()
      .single()
  ),

  unlabel: Joi.alternatives().try(
    Joi.boolean().only(false),
    Joi.string().trim().valid(''),
    Joi.array()
      .items(Joi.string().trim().max(50))
      .min(1)
      .max(30)
      .unique()
      .single()
  )
};

const actionSchema = Joi.object()
  .pattern(
    Joi.string().trim().max(51),
    Joi.object().keys({
      close: actions.close.default(false),
      'close-reason': actions['close-reason'].default(''),
      reopen: actions.reopen.default(false),
      lock: actions.lock.default(false),
      unlock: actions.unlock.default(false),
      'lock-reason': actions['lock-reason'].default(''),
      comment: actions.comment.default(''),
      label: actions.label.default(''),
      unlabel: actions.unlabel.default(''),

      issues: Joi.object().keys(actions),
      prs: Joi.object().keys(actions),
      discussions: Joi.object().keys(actions)
    })
  )
  .min(1)
  .max(200);

export {configSchema, actionSchema};
