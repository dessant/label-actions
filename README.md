# Label Actions

Label Actions is a GitHub bot that performs certain actions when issues
or pull requests are labeled or unlabeled.

> The legacy version of this project can be found
> [here](https://github.com/dessant/label-actions-app).

<img width="800" src="https://raw.githubusercontent.com/dessant/label-actions/master/assets/screenshot.png">

## Supporting the Project

The continued development of Label Actions is made possible
thanks to the support of awesome backers. If you'd like to join them,
please consider contributing with
[Patreon](https://armin.dev/go/patreon?pr=label-actions&src=repo),
[PayPal](https://armin.dev/go/paypal?pr=label-actions&src=repo) or
[Bitcoin](https://armin.dev/go/bitcoin?pr=label-actions&src=repo).

## How It Works

The bot performs certain actions when an issue or pull request
is labeled or unlabeled. No action is taken by default and the bot
must be configured. The following actions are supported:

- Post comments
- Add labels
- Remove labels
- Close threads
- Reopen threads
- Lock threads with an optional lock reason
- Unlock threads

## Usage

1. Create the `.github/workflows/label-actions.yml` workflow file,
   use one of the [example workflows](#examples) to get started
2. Create the `.github/label-actions.yml` configuration file
   based on the [example](#configuring-labels-and-actions) below
3. Start labeling issues and pull requests

### Inputs

The bot can be configured using [input parameters](https://help.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idstepswith).

- **`github-token`**
  - GitHub access token, value must be `${{ github.token }}` or an encrypted
    secret that contains a [personal access token](#using-a-personal-access-token)
  - Optional, defaults to `${{ github.token }}`
- **`config-path`**
  - Configuration file path
  - Optional, defaults to `.github/label-actions.yml`
- **`process-only`**
  - Process label events only for issues or pull requests, value must be
    either `issues` or `prs`
  - Optional, defaults to `''`

### Configuration

Labels and actions are specified in a configuration file.
Actions are grouped under label names, and a label name can be prepended
with a `-` sign to declare actions taken when a label is removed
from a thread. Actions can be overridden or declared only for issues
or pull requests by grouping them under the `issues` or `prs` key.

#### Actions

- **`comment`**
  - Post comments, value must be either a comment or a list of comments,
    `{issue-author}` is an optional placeholder
  - Optional, defaults to `''`
- **`label`**
  - Add labels, value must be either a label or a list of labels
  - Optional, defaults to `''`
- **`unlabel`**
  - Remove labels, value must be either a label or a list of labels
  - Optional, defaults to `''`
- **`close`**
  - Close threads, value must be either `true` or `false`
  - Optional, defaults to `false`
- **`reopen`**
  - Reopen threads, value must be either `true` or `false`
  - Optional, defaults to `false`
- **`lock`**
  - Lock threads, value must be either `true` or `false`
  - Optional, defaults to `false`
- **`lock-reason`**
  - Reason for locking threads, value must be one
    of `resolved`, `off-topic`, `too heated` or `spam`
  - Optional, defaults to `''`
- **`unlock`**
  - Unlock threads, value must be either `true` or `false`
  - Optional, defaults to `false`

## Examples

The following workflow will perform the actions specified
in the `.github/label-actions.yml` configuration file when an issue
or pull request is labeled or unlabeled.

```yaml
name: 'Label Actions'

on:
  issues:
    types: [labeled, unlabeled]
  pull_request:
    types: [labeled, unlabeled]

permissions:
  contents: read
  issues: write
  pull-requests: write

jobs:
  job:
    runs-on: ubuntu-latest
    steps:
      - uses: dessant/label-actions@v2
```

### Available input parameters

This workflow declares all the available input parameters of the app
and their default values. Any of the parameters can be omitted.

```yaml
name: 'Label Actions'

on:
  issues:
    types: [labeled, unlabeled]
  pull_request:
    types: [labeled, unlabeled]

permissions:
  contents: read
  issues: write
  pull-requests: write

jobs:
  job:
    runs-on: ubuntu-latest
    steps:
      - uses: dessant/label-actions@v2
        with:
          github-token: ${{ github.token }}
          config-path: '.github/label-actions.yml'
          process-only: ''
```

### Ignoring label events

This step will process label events only for issues.

<!-- prettier-ignore -->
```yaml
    steps:
      - uses: dessant/label-actions@v2
        with:
          process-only: 'issues'
```

This step will process label events only for pull requests.

<!-- prettier-ignore -->
```yaml
    steps:
      - uses: dessant/label-actions@v2
        with:
          process-only: 'prs'
```

Unnecessary workflow runs can be avoided by removing the events
that trigger workflows from the workflow file instead.

```yaml
on:
  issues:
    types: labeled
```

### Configuring labels and actions

Labels and actions are specified in a configuration file.
The following example showcases how desired actions may be declared:

```yaml
# Configuration for Label Actions - https://github.com/dessant/label-actions

# Actions taken when the `heated` label is added to issues or pull requests
heated:
  # Post a comment
  comment: >
    The thread has been temporarily locked.
    Please follow our community guidelines.
  # Lock the thread
  lock: true
  # Set a lock reason
  lock-reason: 'too heated'
  # Additionally, add a label to pull requests
  prs:
    label: 'on hold'

# Actions taken when the `heated` label is removed from issues or pull requests
-heated:
  # Unlock the thread
  unlock: true

# Actions taken when the `wontfix` label is removed from issues or pull requests
-wontfix:
  # Reopen the thread
  reopen: true

# Actions taken when the `feature` label is added to issues
feature:
  issues:
    # Post a comment, `{issue-author}` is an optional placeholder
    comment: >
      :wave: @{issue-author}, please use our idea board to request new features.
    # Close the issue
    close: true

# Actions taken when the `wip` label is added to pull requests
wip:
  prs:
    # Add labels
    label:
      - 'on hold'
      - 'needs feedback'

# Actions taken when the `wip` label is removed from pull requests
-wip:
  prs:
    # Add label
    label: 'needs QA'
    # Remove labels
    unlabel:
      - 'on hold'
      - 'needs feedback'

# Actions taken when the `pizzazz` label is added to issues or pull requests
pizzazz:
  # Post comments
  comment:
    - '![](https://i.imgur.com/WuduJNk.jpg)'
    - '![](https://i.imgur.com/1D8yxOo.gif)'

# Actions taken when the `review request` label is added to pull requests
'review request':
  prs:
    # Assign reviewer from `reviewers`
    reviewers:
      - reviewer-account-name1
      - reviewer-account-name2
      - reviewer-account-name3
    number-of-reviwers: 1
```

### Using a personal access token

The action uses an installation access token by default to interact with GitHub.
You may also authenticate with a personal access token to perform actions
as a GitHub user instead of the `github-actions` app.

Create a [personal access token](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token) with the `repo` or `public_repo` scopes
enabled, and add the token as an [encrypted secret](https://docs.github.com/en/actions/reference/encrypted-secrets#creating-encrypted-secrets-for-a-repository)
for the repository or organization, then provide the action with the secret
using the `github-token` input parameter.

<!-- prettier-ignore -->
```yaml
    steps:
      - uses: dessant/label-actions@v2
        with:
          github-token: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
```

## License

Copyright (c) 2019-2021 Armin Sebastian

This software is released under the terms of the MIT License.
See the [LICENSE](LICENSE) file for further information.
