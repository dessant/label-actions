# Label Actions

Label Actions is a GitHub bot that performs certain actions when issues,
pull requests or discussions are labeled or unlabeled.

<img width="800" src="https://raw.githubusercontent.com/dessant/label-actions/main/assets/screenshot.png">

## Supporting the Project

The continued development of Label Actions is made possible
thanks to the support of awesome backers. If you'd like to join them,
please consider contributing with
[Patreon](https://armin.dev/go/patreon?pr=label-actions&src=repo),
[PayPal](https://armin.dev/go/paypal?pr=label-actions&src=repo) or
[Bitcoin](https://armin.dev/go/bitcoin?pr=label-actions&src=repo).

## How It Works

The bot performs certain actions when an issue, pull request or discussion
is labeled or unlabeled. No action is taken by default and the bot
must be configured. The following actions are supported:

- Post comments
- Add labels
- Remove labels
- Close threads
- Reopen threads
- Lock threads
- Unlock threads

## Usage

1. Create the `.github/workflows/label-actions.yml` workflow file,
   use one of the [example workflows](#examples) to get started
2. Create the `.github/label-actions.yml` configuration file
   based on the [example](#configuring-labels-and-actions) below
3. Start labeling issues, pull requests and discussions

### Inputs

The bot can be configured using [input parameters](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idstepswith).

<!-- prettier-ignore -->
- **`github-token`**
  - GitHub access token, value must be `${{ github.token }}` or an encrypted
    secret that contains a [personal access token](#using-a-personal-access-token)
  - Optional, defaults to `${{ github.token }}`
- **`config-path`**
  - Configuration file path
  - Optional, defaults to `.github/label-actions.yml`
- **`process-only`**
  - Process label events only for issues, pull requests or discussions,
    value must be a comma separated list, list items must be
    one of `issues`, `prs` or `discussions`
  - Optional, defaults to `''`

### Configuration

Labels and actions are specified in a configuration file.
Actions are grouped under label names, and a label name can be prepended
with a `-` sign to declare actions taken when a label is removed
from a thread. Actions can be overridden or declared only for issues,
pull requests or discussions by grouping them under the
`issues`, `prs` or `discussions` key.

#### Actions

<!-- prettier-ignore -->
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
- **`close-reason`**
  - Reason for closing threads, value must be:
    - `completed` or `not planned` for issues
    - `duplicate`, `outdated` or `resolved` for discussions
  - Ignored for pull requests
  - Optional, defaults to `''`
- **`reopen`**
  - Reopen threads, value must be either `true` or `false`
  - Optional, defaults to `false`
- **`lock`**
  - Lock threads, value must be either `true` or `false`
  - Optional, defaults to `false`
- **`lock-reason`**
  - Reason for locking threads, value must be one
    of `resolved`, `off-topic`, `too heated` or `spam`
  - Ignored for discussions
  - Optional, defaults to `''`
- **`unlock`**
  - Unlock threads, value must be either `true` or `false`
  - Optional, defaults to `false`

## Examples

The following workflow will perform the actions specified
in the `.github/label-actions.yml` configuration file when an issue,
pull request or discussion is labeled or unlabeled.

<!-- prettier-ignore -->
```yaml
name: 'Label Actions'

on:
  issues:
    types: [labeled, unlabeled]
  pull_request_target:
    types: [labeled, unlabeled]
  discussion:
    types: [labeled, unlabeled]

permissions:
  contents: read
  issues: write
  pull-requests: write
  discussions: write

jobs:
  action:
    runs-on: ubuntu-latest
    steps:
      - uses: dessant/label-actions@v4
```

### Available input parameters

This workflow declares all the available input parameters of the app
and their default values. Any of the parameters can be omitted.

<!-- prettier-ignore -->
```yaml
name: 'Label Actions'

on:
  issues:
    types: [labeled, unlabeled]
  pull_request_target:
    types: [labeled, unlabeled]
  discussion:
    types: [labeled, unlabeled]

permissions:
  contents: read
  issues: write
  pull-requests: write
  discussions: write

jobs:
  action:
    runs-on: ubuntu-latest
    steps:
      - uses: dessant/label-actions@v4
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
      - uses: dessant/label-actions@v4
        with:
          process-only: 'issues'
```

This step will process label events only for pull requests and discussions.

<!-- prettier-ignore -->
```yaml
    steps:
      - uses: dessant/label-actions@v4
        with:
          process-only: 'prs, discussions'
```

Unnecessary workflow runs can be avoided by removing the events
that trigger workflows from the workflow file instead.

<!-- prettier-ignore -->
```yaml
on:
  issues:
    types: labeled
```

### Configuring labels and actions

Labels and actions are specified in a YAML configuration file.
The following example showcases how desired actions may be declared:

<!-- prettier-ignore -->
```yaml
# Configuration for Label Actions - https://github.com/dessant/label-actions

# The `heated` label is added to issues, pull requests or discussions
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
    label: 'pr: on hold'

# The `heated` label is removed from issues, pull requests or discussions
-heated:
  # Unlock the thread
  unlock: true

# The `wontfix` label is removed from issues
-wontfix:
  issues:
    # Reopen the issue
    reopen: true

# The `feature` label is added to issues
feature:
  issues:
    # Post a comment, `{issue-author}` is an optional placeholder
    comment: >
      :wave: @{issue-author}, please use our idea board to request new features.
    # Close the issue
    close: true
    # Set a close reason
    close-reason: 'not planned'

# The `qa: needed` label is added to pull requests
'qa: needed':
  prs:
    # Add labels
    label:
      - 'qa: l10n'
      - 'pr: on hold'


# The `qa: needed` label is removed from pull requests
'-qa: needed':
  prs:
    # Add label
    label: 'qa: verified'
    # Remove labels
    unlabel:
      - 'qa: l10n'
      - 'pr: on hold'

# The `solved` label is added to discussions
solved:
  discussions:
    # Close the discussion
    close: true
    # Set a close reason
    close-reason: 'resolved'
    # Lock the discussion
    lock: true

# The `pizzazz` label is added to issues, pull requests or discussions
pizzazz:
  # Post comments
  comment:
    - '![](https://i.imgur.com/WuduJNk.jpg)'
    - '![](https://i.imgur.com/1D8yxOo.gif)'
```

### Using a personal access token

The action uses an installation access token by default to interact with GitHub.
You may also authenticate with a personal access token to perform actions
as a GitHub user instead of the `github-actions` app.

Create a [personal access token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token)
with the `repo` or `public_repo` scopes enabled, and add the token as an
[encrypted secret](https://docs.github.com/en/actions/reference/encrypted-secrets#creating-encrypted-secrets-for-a-repository)
for the repository or organization, then provide the action with the secret
using the `github-token` input parameter.

<!-- prettier-ignore -->
```yaml
    steps:
      - uses: dessant/label-actions@v4
        with:
          github-token: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
```

## License

Copyright (c) 2019-2023 Armin Sebastian

This software is released under the terms of the MIT License.
See the [LICENSE](LICENSE) file for further information.
