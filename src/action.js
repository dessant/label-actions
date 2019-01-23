module.exports = class Action {
  constructor(context, config, logger) {
    this.context = context;
    this.config = config;
    this.log = logger;
  }

  async action() {
    const {payload, github} = this.context;
    const issue = this.context.issue();

    const {only} = this.config;
    const type = payload.issue ? 'issues' : 'pulls';
    if (only && only !== type) {
      return;
    }

    let label = payload.label.name;
    if (payload.action === 'unlabeled') {
      label = `-${label}`;
    }
    const actions = this.getLabelActions(type, label);
    if (!actions) {
      return;
    }
    const {comment, open, close, lock, unlock, lockReason} = actions;

    const targetPayload = payload.issue || payload.pull_request;

    if (comment) {
      this.log.info(issue, 'Commenting');
      const commentBody = comment.replace(
        /{issue-author}/,
        targetPayload.user.login
      );
      await this.ensureUnlock(issue, {active: targetPayload.locked}, () =>
        github.issues.createComment({...issue, body: commentBody})
      );
    }

    if (open && targetPayload.state === 'closed') {
      this.log.info(issue, 'Reopening');
      await github.issues.edit({...issue, state: 'open'});
    }

    if (close && targetPayload.state === 'open') {
      this.log.info(issue, 'Closing');
      await github.issues.edit({...issue, state: 'closed'});
    }

    if (lock && !targetPayload.locked) {
      this.log.info(issue, 'Locking');
      let params;
      if (lockReason) {
        params = {
          ...issue,
          lock_reason: lockReason,
          headers: {
            Accept: 'application/vnd.github.sailor-v-preview+json'
          }
        };
      } else {
        params = issue;
      }
      await github.issues.lock(params);
    }

    if (unlock && targetPayload.locked) {
      this.log.info(issue, 'Unlocking');
      github.issues.unlock(issue);
    }
  }

  async ensureUnlock(issue, lock, action) {
    const github = this.context.github;
    if (lock.active) {
      if (!lock.hasOwnProperty('reason')) {
        const {data: issueData} = await github.issues.get({
          ...issue,
          headers: {
            Accept: 'application/vnd.github.sailor-v-preview+json'
          }
        });
        lock.reason = issueData.active_lock_reason;
      }
      await github.issues.unlock(issue);
      await action();
      if (lock.reason) {
        issue = {
          ...issue,
          lock_reason: lock.reason,
          headers: {
            Accept: 'application/vnd.github.sailor-v-preview+json'
          }
        };
      }
      await github.issues.lock(issue);
    } else {
      await action();
    }
  }

  getLabelActions(type, label) {
    if (
      this.config[type] &&
      this.config[type].actions &&
      this.config[type].actions[label]
    ) {
      return this.config[type].actions[label];
    }
    return this.config.actions[label];
  }
};
