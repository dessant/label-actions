const core = require('@actions/core');
const github = require('@actions/github');
const yaml = require('js-yaml');

const {configSchema, actionSchema} = require('./schema');
const {
  addDiscussionCommentQuery,
  getLabelQuery,
  createLabelQuery,
  getDiscussionLabelsQuery,
  addLabelsToLabelableQuery,
  removeLabelsFromLabelableQuery,
  lockLockableQuery,
  unlockLockableQuery
} = require('./data');

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

    if (actions.comment) {
      core.debug('Commenting');

      const lock = {
        active: threadData.locked,
        reason: threadData.active_lock_reason,
        restoreLock: !actions.unlock
      };

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

        await this.client.rest.issues.update({
          ...issue,
          state: 'closed',
          state_reason: actions['close-reason']
        });
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
          params.lock_reason = lockReason;
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
          const {data: issueData} = await this.client.rest.issues.get(issue);
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

      if (lock.restoreLock) {
        if (issue) {
          if (lock.reason) {
            issue = {...issue, lock_reason: lock.reason};
          }

          await this.client.rest.issues.lock(issue);
        } else {
          await this.client.graphql(lockLockableQuery, {
            lockableId: discussion.node_id
          });
        }
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
