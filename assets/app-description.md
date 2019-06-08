A GitHub App that performs actions when issues or pull requests are labeled or unlabeled.

## Supporting the Project

The continued development of Label Actions is made possible thanks to the support of awesome backers. If you'd like to join them, please consider contributing with [Patreon](https://armin.dev/go/patreon?pr=label-actions&src=repo), [PayPal](https://armin.dev/go/paypal?pr=label-actions&src=repo) or [Bitcoin](https://armin.dev/go/bitcoin?pr=label-actions&src=repo).

## How It Works

The app performs certain actions when an issue or pull request is labeled or unlabeled. No action is taken by default and the app must be configured. The following actions are supported:

* Post a comment (`comment` option)
* Close (`close` option)
* Reopen (`open` option)
* Lock with an optional lock reason (`lock` and `lockReason` options)
* Unlock (`unlock` option)

## Usage

1. **[Install the GitHub App](https://github.com/apps/label-actions)** for the intended repositories
2. Create `.github/label-actions.yml` based on the template below
3. Start labeling issues and pull requests

⚠️ **If possible, install the app only for select repositories. Do not leave the `All repositories` option selected, unless you intend to use the app for all current and future repositories.**

#### Configuration

Create `.github/label-actions.yml` in the default branch to enable the app, or add it at the same file path to a repository named `.github`. Configure the app by editing the following template:

```yaml
# Configuration for Label Actions - https://github.com/dessant/label-actions

# Specify actions for issues and pull requests
actions:
  # Actions taken when the `heated` label is added
  heated:
    # Post a comment
    comment: >
      The thread has been temporarily locked.
      Please follow our community guidelines.
    # Lock the thread
    lock: true
    # Set a lock reason, such as `off-topic`, `too heated`, `resolved` or `spam`
    lockReason: "too heated"
  # Actions taken when the `heated` label is removed
  -heated:
    # Unlock the thread
    unlock: true

# Optionally, specify configuration settings just for issues
issues:
  actions:
    feature:
      # Post a comment, `{issue-author}` is an optional placeholder
      comment: >
        :wave: @{issue-author}, please use our idea board to request new features.
      # Close the issue
      close: true
    -wontfix:
      # Reopen the issue
      open: true

# Optionally, specify configuration settings just for pull requests
pulls:
  actions:
    pizzazz:
      comment: >
        ![](https://i.imgur.com/WuduJNk.jpg)

# Limit to only `issues` or `pulls`
# only: issues

# Repository to extend settings from
# _extends: repo
```
