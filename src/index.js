import core from '@actions/core';
import github from '@actions/github';

import {getConfig, getActionConfig, getClient} from './utils.js';

import {
  addDiscussionCommentQuery,
  getLabelQuery,
  createLabelQuery,
  getDiscussionLabelsQuery,
  addLabelsToLabelableQuery,
  removeLabelsFromLabelableQuery,
  closeDiscussionQuery,
  reopenDiscussionQuery,
  lockLockableQuery,
  unlockLockableQuery
} from './data.js';

async function run() {
  try {
    const config = getConfig();
    const client = getClient(config['github-token']);

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

    const threadState = {
      state: threadData.state,
      stateReason: threadData.state_reason,
      locked: threadData.locked,
      lockReason: threadData.active_lock_reason,
      merged: threadData.merged
    };

    const thread =
      threadType === 'discussion'
        ? {
            discussion_id: payload.discussion.node_id,
            discussion_number: payload.discussion.number
          }
        : {owner, repo, issue_number: threadData.number};

    if (actions.comment) {
      core.debug('Commenting');

      const commentAction = async () => {
        for (let commentBody of actions.comment) {
          commentBody = commentBody.replace(
            /{issue-author}/,
            threadData.user.login
          );

          if (threadType === 'discussion') {
            await this.client.graphql(addDiscussionCommentQuery, {
              discussionId: thread.discussion_id,
              body: commentBody
            });
          } else {
            try {
              await this.client.rest.issues.createComment({
                ...thread,
                body: commentBody
              });
            } catch (err) {
              if (!/cannot be modified.*discussion/i.test(err.message)) {
                throw err;
              }
            }
          }
        }
      };

      await this.ensureUnlock({
        thread,
        threadType,
        threadState,
        action: commentAction,
        restoreLock: !actions.unlock
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
          discussion: thread.discussion_number
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
              labelableId: thread.discussion_id,
              labelIds: labels.map(label => label.id)
            });
          } else {
            await this.client.rest.issues.addLabels({
              ...thread,
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
              labelableId: thread.discussion_id,
              labelIds: matchingLabels.map(label => label.id)
            });
          } else {
            for (const label of matchingLabels) {
              await this.client.rest.issues.removeLabel({
                ...thread,
                name: label.name
              });
            }
          }
        }
      }
    }

    const closeReason =
      actions['close-reason'] ||
      (threadType === 'discussion' ? 'resolved' : 'completed');
    if (
      actions.close &&
      (threadState.state === 'open' ||
        (threadType !== 'pr' && threadState.stateReason !== closeReason))
    ) {
      core.debug('Closing');

      if (threadType === 'discussion') {
        await this.client.graphql(closeDiscussionQuery, {
          discussionId: thread.discussion_id,
          reason: closeReason
        });
      } else {
        const params = {...thread, state: 'closed'};

        if (threadType === 'issue') {
          params.state_reason = closeReason;
        }

        await this.client.rest.issues.update(params);
      }

      threadState.state = 'closed';
    }

    if (
      actions.reopen &&
      threadState.state === 'closed' &&
      !threadState.merged
    ) {
      core.debug('Reopening');

      if (threadType === 'discussion') {
        await this.client.graphql(reopenDiscussionQuery, {
          discussionId: thread.discussion_id
        });
      } else {
        await this.client.rest.issues.update({...thread, state: 'open'});
      }

      threadState.state = 'open';
    }

    const lockReason = actions['lock-reason'];
    if (
      actions.lock &&
      (!threadState.locked ||
        (threadType !== 'discussion' &&
          threadState.lockReason !== (lockReason || null)))
    ) {
      core.debug('Locking');

      if (threadType === 'discussion') {
        await this.client.graphql(lockLockableQuery, {
          lockableId: thread.discussion_id
        });
      } else {
        const params = {...thread};

        if (lockReason) {
          params.lock_reason = lockReason;
        }

        // Lock reason is not updated when issue is locked
        if (threadState.locked) {
          await this.client.rest.issues.unlock(thread);
        }

        await this.client.rest.issues.lock(params);
      }

      threadState.locked = true;
    }

    if (actions.unlock && threadState.locked) {
      core.debug('Unlocking');

      if (threadType === 'discussion') {
        await this.client.graphql(unlockLockableQuery, {
          lockableId: thread.discussion_id
        });
      } else {
        await this.client.rest.issues.unlock(thread);
      }

      threadState.locked = false;
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

  async ensureUnlock({
    thread,
    threadType,
    threadState,
    action,
    restoreLock = false
  }) {
    if (threadState.locked) {
      if (threadType === 'discussion') {
        await this.client.graphql(unlockLockableQuery, {
          lockableId: thread.discussion_id
        });
      } else {
        if (!threadState.hasOwnProperty('lockReason')) {
          const {data: issueData} = await this.client.rest.issues.get(thread);
          threadState.lockReason = issueData.active_lock_reason;
        }

        await this.client.rest.issues.unlock(thread);
      }

      let actionError;
      try {
        await action();
      } catch (err) {
        actionError = err;
      }

      if (restoreLock) {
        if (threadType === 'discussion') {
          await this.client.graphql(lockLockableQuery, {
            lockableId: thread.discussion_id
          });
        } else {
          if (threadState.lockReason) {
            thread = {...thread, lock_reason: threadState.lockReason};
          }

          await this.client.rest.issues.lock(thread);
        }
      } else {
        threadState.locked = false;
      }

      if (actionError) {
        throw actionError;
      }
    } else {
      await action();
    }
  }
}

run();
