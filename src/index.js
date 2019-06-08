const uuidV4 = require('uuid/v4');
const getMergedConfig = require('probot-config');
const sendMessage = require('probot-messages');

const App = require('./action');
const schema = require('./schema');

module.exports = async robot => {
  const github = await robot.auth();
  const appName = (await github.apps.getAuthenticated()).data.name;

  robot.on(
    [
      'issues.labeled',
      'issues.unlabeled',
      'pull_request.labeled',
      'pull_request.unlabeled'
    ],
    async context => {
      const app = await getApp(context);
      if (app) {
        await app.action();
      }
    }
  );

  async function getApp(context) {
    const logger = context.log.child({appName, session: uuidV4()});
    const config = await getConfig(context, logger);
    if (config && config.perform) {
      return new App(context, config, logger);
    }
  }

  async function getConfig(context, log, file = 'label-actions.yml') {
    let config;
    const repo = context.repo();
    try {
      let repoConfig = await getMergedConfig(context, file);
      if (!repoConfig) {
        repoConfig = {perform: false};
      }
      const {error, value} = schema.validate(repoConfig);
      if (error) {
        throw error;
      }
      config = value;
    } catch (err) {
      log.warn({err: new Error(err), repo, file}, 'Invalid config');
      if (['YAMLException', 'ValidationError'].includes(err.name)) {
        await sendMessage(
          robot,
          context,
          '[{appName}] Configuration error',
          '[{appName}]({appUrl}) has encountered a configuration error in ' +
            `\`${file}\`.\n\`\`\`\n${err.toString()}\n\`\`\``,
          {update: 'The configuration error is still occurring.'}
        );
      }
    }

    return config;
  }
};
