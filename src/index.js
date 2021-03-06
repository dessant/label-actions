const core = require('@actions/core');
const github = require('@actions/github');
const yaml = require('js-yaml');

const {configSchema, actionSchema} = require('./schema');

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

    const threadType = payload.issue ? 'issue' : 'pr';

    const processOnly = this.config['process-only'];
    if (processOnly && processOnly !== threadType) {
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

    const threadData = payload.issue || payload.pull_request;

    const {owner, repo} = github.context.repo;
    const issue = {owner, repo, issue_number: threadData.number};

    const lock = {
      active: threadData.locked,
      reason: threadData.active_lock_reason
    };

    if (actions.comment) {
      core.debug('Commenting');
      await this.ensureUnlock(issue, lock, async () => {
        for (let commentBody of actions.comment) {
          commentBody = commentBody.replace(
            /{issue-author}/,
            threadData.user.login
          );

          await this.client.rest.issues.createComment({
            ...issue,
            body: commentBody
          });
        }
      });
    }

    if (actions.label) {
      const currentLabels = threadData.labels.map(label => label.name);
      const newLabels = actions.label.filter(
        label => !currentLabels.includes(label)
      );

      if (newLabels.length) {
        core.debug('Labeling');
        await this.client.rest.issues.addLabels({
          ...issue,
          labels: newLabels
        });
      }
    }

    if (actions.unlabel) {
      const currentLabels = threadData.labels.map(label => label.name);
      const matchingLabels = currentLabels.filter(label =>
        actions.unlabel.includes(label)
      );

      for (const label of matchingLabels) {
        core.debug('Unlabeling');
        await this.client.rest.issues.removeLabel({
          ...issue,
          name: label
        });
      }
    }

    if (actions.reopen && threadData.state === 'closed' && !threadData.merged) {
      core.debug('Reopening');
      await this.client.rest.issues.update({...issue, state: 'open'});
    }

    if (actions.close && threadData.state === 'open') {
      core.debug('Closing');
      await this.client.rest.issues.update({...issue, state: 'closed'});
    }

    if (actions.lock && !threadData.locked) {
      core.debug('Locking');
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

    if (actions.unlock && threadData.locked) {
      core.debug('Unlocking');
      await this.client.rest.issues.unlock(issue);
    }
  }

  getLabelActions(label, event, threadType) {
    if (event === 'unlabeled') {
      label = `-${label}`;
    }
    threadType = threadType === 'issue' ? 'issues' : 'prs';

    const actions = this.actions[label];

    if (actions) {
      const threadActions = actions[threadType];
      if (threadActions) {
        Object.assign(actions, threadActions);
      }

      return actions;
    }
  }

  async ensureUnlock(issue, lock, action) {
    if (lock.active) {
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

      let actionError;
      try {
        await action();
      } catch (err) {
        actionError = err;
      }

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
