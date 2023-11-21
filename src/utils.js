import core from '@actions/core';
import github from '@actions/github';
import {retry} from '@octokit/plugin-retry';
import {throttling} from '@octokit/plugin-throttling';
import yaml from 'js-yaml';

import {configSchema, actionSchema} from './schema.js';

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

function getClient(token) {
  const requestRetries = 3;

  const rateLimitCallback = function (
    retryAfter,
    options,
    octokit,
    retryCount
  ) {
    core.info(
      `Request quota exhausted for request ${options.method} ${options.url}`
    );

    if (retryCount < requestRetries) {
      core.info(`Retrying after ${retryAfter} seconds`);

      return true;
    }
  };

  const options = {
    request: {retries: requestRetries},
    throttle: {
      onSecondaryRateLimit: rateLimitCallback,
      onRateLimit: rateLimitCallback
    }
  };

  return github.getOctokit(token, options, retry, throttling);
}

export {getConfig, getActionConfig, getClient};
