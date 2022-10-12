/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 640:
/***/ ((module) => {

const addDiscussionCommentQuery = `
mutation ($discussionId: ID!, $body: String!) {
  addDiscussionComment(input: {discussionId: $discussionId, body: $body}) {
    comment {
      id
    }
  }
}
`;

const getLabelQuery = `
query ($owner: String!, $repo: String!, $label: String!) {
  repository(owner: $owner, name: $repo) {
    label(name: $label) {
      id
      name
    }
  }
}
`;

const createLabelQuery = `
mutation ($repositoryId: ID!, $name: String!, $color: String!) {
  createLabel(input: {repositoryId: $repositoryId, name: $name, , color: $color}) {
    label {
      id
      name
    }
  }
}
`;

const getDiscussionLabelsQuery = `
query ($owner: String!, $repo: String!, $discussion: Int!) {
  repository(owner: $owner, name: $repo) {
    discussion(number: $discussion) {
      number
      labels(first: 100) {
        nodes {
          id
          name
        }
      }
    }
  }
}
`;

const addLabelsToLabelableQuery = `
mutation ($labelableId: ID!, $labelIds: [ID!]!) {
  addLabelsToLabelable(input: {labelableId: $labelableId, labelIds: $labelIds}) {
    labelable {
      labels(first: 0) {
        edges {
          node {
            id
          }
        }
      }
    }
  }
}
`;

const removeLabelsFromLabelableQuery = `
mutation ($labelableId: ID!, $labelIds: [ID!]!) {
  removeLabelsFromLabelable(input: {labelableId: $labelableId, labelIds: $labelIds}) {
    labelable {
      labels(first: 0) {
        edges {
          node {
            id
          }
        }
      }
    }
  }
}
`;

const lockLockableQuery = `
mutation ($lockableId: ID!) {
  lockLockable(input: {lockableId: $lockableId}) {
    lockedRecord {
      locked
    }
  }
}
`;

const unlockLockableQuery = `
mutation ($lockableId: ID!) {
  unlockLockable(input: {lockableId: $lockableId}) {
    unlockedRecord {
      locked
    }
  }
}
`;

module.exports = {
  addDiscussionCommentQuery,
  getLabelQuery,
  createLabelQuery,
  getDiscussionLabelsQuery,
  addLabelsToLabelableQuery,
  removeLabelsFromLabelableQuery,
  lockLockableQuery,
  unlockLockableQuery
};


/***/ }),

/***/ 945:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const Joi = __nccwpck_require__(174);

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

module.exports = {configSchema, actionSchema};


/***/ }),

/***/ 471:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 198:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 174:
/***/ ((module) => {

module.exports = eval("require")("joi");


/***/ }),

/***/ 200:
/***/ ((module) => {

module.exports = eval("require")("js-yaml");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core = __nccwpck_require__(471);
const github = __nccwpck_require__(198);
const yaml = __nccwpck_require__(200);

const {configSchema, actionSchema} = __nccwpck_require__(945);
const {
  addDiscussionCommentQuery,
  getLabelQuery,
  createLabelQuery,
  getDiscussionLabelsQuery,
  addLabelsToLabelableQuery,
  removeLabelsFromLabelableQuery,
  lockLockableQuery,
  unlockLockableQuery
} = __nccwpck_require__(640);

async function run() {
  try {
    const config = getConfig();
    const client = github.getOctokit(config['github-token']);

    const actions = await getActionConfig(client, config['config-path']);

    const app = new App(config, client, actions);

    await app.performActions();
  } catch (err) {
    core.setFailed(err);
  }
}

class App {
  constructor(config, client, actions) {
    this.config = config;
    this.client = client;
    this.actions = actions;
  }

  async performActions() {
    const payload = github.context.payload;

    if (payload.sender.type === 'Bot') {
      return;
    }

    const [threadType, threadData] = payload.issue
      ? ['issue', payload.issue]
      : payload.pull_request
      ? ['pr', payload.pull_request]
      : ['discussion', payload.discussion];

    const processOnly = this.config['process-only'];
    if (processOnly && !processOnly.includes(threadType)) {
      return;
    }

    const actions = this.getLabelActions(
      payload.label.name,
      payload.action,
      threadType
    );
    if (!actions) {
      return;
    }

    const {owner, repo} = github.context.repo;
    let issue, discussion;
    if (threadType === 'discussion') {
      discussion = {
        node_id: payload.discussion.node_id,
        number: payload.discussion.number
      };
    } else {
      issue = {
        owner,
        repo,
        issue_number: threadData.number
      };
    }

    const lock = {
      active: threadData.locked,
      reason: threadData.active_lock_reason
    };

    if (actions.comment) {
      core.debug('Commenting');
      await this.ensureUnlock({issue, discussion}, lock, async () => {
        for (let commentBody of actions.comment) {
          commentBody = commentBody.replace(
            /{issue-author}/,
            threadData.user.login
          );

          if (threadType === 'discussion') {
            await this.client.graphql(addDiscussionCommentQuery, {
              discussionId: discussion.node_id,
              body: commentBody
            });
          } else {
            try {
              await this.client.rest.issues.createComment({
                ...issue,
                body: commentBody
              });
            } catch (err) {
              if (!/cannot be modified.*discussion/i.test(err.message)) {
                throw err;
              }
            }
          }
        }
      });
    }

    if (actions.label || actions.unlabel) {
      let currentLabels;
      if (threadType === 'discussion') {
        ({
          repository: {
            discussion: {
              labels: {nodes: currentLabels}
            }
          }
        } = await this.client.graphql(getDiscussionLabelsQuery, {
          owner,
          repo,
          discussion: discussion.number
        }));
      } else {
        currentLabels = threadData.labels;
      }

      if (actions.label) {
        const currentLabelNames = currentLabels.map(label => label.name);
        const newLabels = actions.label.filter(
          label => !currentLabelNames.includes(label)
        );

        if (newLabels.length) {
          core.debug('Labeling');

          if (threadType === 'discussion') {
            const labels = [];
            for (const labelName of newLabels) {
              let {
                repository: {label}
              } = await this.client.graphql(getLabelQuery, {
                owner,
                repo,
                label: labelName
              });

              if (!label) {
                ({
                  createLabel: {label}
                } = await this.client.graphql(createLabelQuery, {
                  repositoryId: payload.repository.node_id,
                  name: labelName,
                  color: 'ffffff',
                  headers: {Accept: 'application/vnd.github.bane-preview+json'}
                }));
              }

              labels.push(label);
            }

            await this.client.graphql(addLabelsToLabelableQuery, {
              labelableId: discussion.node_id,
              labelIds: labels.map(label => label.id)
            });
          } else {
            await this.client.rest.issues.addLabels({
              ...issue,
              labels: newLabels
            });
          }
        }
      }

      if (actions.unlabel) {
        const matchingLabels = currentLabels.filter(label =>
          actions.unlabel.includes(label.name)
        );

        if (matchingLabels.length) {
          core.debug('Unlabeling');

          if (threadType === 'discussion') {
            await this.client.graphql(removeLabelsFromLabelableQuery, {
              labelableId: discussion.node_id,
              labelIds: matchingLabels.map(label => label.id)
            });
          } else {
            for (const label of matchingLabels) {
              await this.client.rest.issues.removeLabel({
                ...issue,
                name: label.name
              });
            }
          }
        }
      }
    }

    if (threadType !== 'discussion') {
      if (
        actions.reopen &&
        threadData.state === 'closed' &&
        !threadData.merged
      ) {
        core.debug('Reopening');
        await this.client.rest.issues.update({...issue, state: 'open'});
      }

      if (actions.close && threadData.state === 'open') {
        core.debug('Closing');
        await this.client.rest.issues.update({...issue, state: 'closed'});
      }
    }

    if (actions.lock && !threadData.locked) {
      core.debug('Locking');
      if (threadType === 'discussion') {
        await this.client.graphql(lockLockableQuery, {
          lockableId: discussion.node_id
        });
      } else {
        const params = {...issue};
        const lockReason = actions['lock-reason'];
        if (lockReason) {
          Object.assign(params, {
            lock_reason: lockReason,
            headers: {
              Accept: 'application/vnd.github.sailor-v-preview+json'
            }
          });
        }
        await this.client.rest.issues.lock(params);
      }
    }

    if (actions.unlock && threadData.locked) {
      core.debug('Unlocking');
      if (threadType === 'discussion') {
        await this.client.graphql(unlockLockableQuery, {
          lockableId: discussion.node_id
        });
      } else {
        await this.client.rest.issues.unlock(issue);
      }
    }
  }

  getLabelActions(label, event, threadType) {
    if (event === 'unlabeled') {
      label = `-${label}`;
    }

    threadType =
      threadType === 'issue'
        ? 'issues'
        : threadType === 'pr'
        ? 'prs'
        : 'discussions';

    const actions = this.actions[label];

    if (actions) {
      const threadActions = actions[threadType];
      if (threadActions) {
        Object.assign(actions, threadActions);
      }

      return actions;
    }
  }

  async ensureUnlock({issue, discussion}, lock, action) {
    if (lock.active) {
      if (issue) {
        if (!lock.hasOwnProperty('reason')) {
          const {data: issueData} = await this.client.rest.issues.get({
            ...issue,
            headers: {
              Accept: 'application/vnd.github.sailor-v-preview+json'
            }
          });
          lock.reason = issueData.active_lock_reason;
        }

        await this.client.rest.issues.unlock(issue);
      } else {
        await this.client.graphql(unlockLockableQuery, {
          lockableId: discussion.node_id
        });
      }

      let actionError;
      try {
        await action();
      } catch (err) {
        actionError = err;
      }

      if (issue) {
        if (lock.reason) {
          issue = {
            ...issue,
            lock_reason: lock.reason,
            headers: {
              Accept: 'application/vnd.github.sailor-v-preview+json'
            }
          };
        }

        await this.client.rest.issues.lock(issue);
      } else {
        await this.client.graphql(lockLockableQuery, {
          lockableId: discussion.node_id
        });
      }

      if (actionError) {
        throw actionError;
      }
    } else {
      await action();
    }
  }
}

function getConfig() {
  const input = Object.fromEntries(
    Object.keys(configSchema.describe().keys).map(item => [
      item,
      core.getInput(item)
    ])
  );

  const {error, value} = configSchema.validate(input, {abortEarly: false});
  if (error) {
    throw error;
  }

  return value;
}

async function getActionConfig(client, configPath) {
  let configData;
  try {
    ({
      data: {content: configData}
    } = await client.rest.repos.getContent({
      ...github.context.repo,
      path: configPath
    }));
  } catch (err) {
    if (err.status === 404) {
      throw new Error(`Missing configuration file (${configPath})`);
    } else {
      throw err;
    }
  }

  const input = yaml.load(Buffer.from(configData, 'base64').toString());
  if (!input) {
    throw new Error(`Empty configuration file (${configPath})`);
  }

  const {error, value} = actionSchema.validate(input, {abortEarly: false});
  if (error) {
    throw error;
  }

  return value;
}

run();

})();

module.exports = __webpack_exports__;
/******/ })()
;