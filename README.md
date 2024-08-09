# Diff Calculator

CLI and Github Action pack for calculating the diff between two git revisions.  
It can be configured to ignore comments, deletions, and whitespaces, so you can focus on the actual changes.

- [Diff Calculator](#diff-calculator)
  - [CLI](#cli)
    - [Installation](#installation)
    - [Example Usage](#example-usage)
    - [CLI Example](#cli-example)
  - [Github Action](#github-action)
    - [Example Usages](#example-usages)
      - [1. Fail step if the PR has more than 300 lines changed](#1-fail-step-if-the-pr-has-more-than-300-lines-changed)
      - [2. Label the PR based on the diff size](#2-label-the-pr-based-on-the-diff-size)
  - [Ignoring Files](#ignoring-files)

## CLI

CLI is available through npm, yarn and pnpm.
<!-- You can also install it through homebrew. -->

### Installation

```bash
npm install -g @themoin/diff-calculator-cli
yarn global add @themoin/diff-calculator-cli
pnpm install -g @themoin/diff-calculator-cli
```

<!-- ### Through homebrew

```bash
brew tap themoin/tap
brew install themoin/tap/diff-calculator-cli
``` -->

### Example Usage

Run the following command to see the how to use the CLI

```bash
calcdiff --help
```

### CLI Example

```bash
# To check the diff between origin/dev and HEAD with comment, delete and whitespace ignored
calcdiff origin/dev -w -d -c

# To check the diff between origin/dev and origin/feat/something, and only show the total number of lines changed
calcdiff origin/dev origin/feat/something -q

# To check the diff between origin/dev and HEAD with comment, delete and whitespace ignored, and show the verbose output
calcdiff origin/dev -w -d -c -v
```

## Github Action

The Github Action is available through the marketplace. See [action.yaml](action.yaml) for the available inputs and outputs.

**Please note that you must call `@actions/checkout@v4` action with the `fetch-depth: 0` to get the full git history.**
It's because this action use `git diff` command to calculate diff

### Example Usages

#### 1. Fail step if the PR has more than 300 lines changed

```yaml
jobs:
  check-pr-size:
    steps:
      # This step is required to get the full git history. Or you can use another way you prefer.
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Calculate diff size
        id: get-pr-size
        uses: themoin/diff-calculator@{version}
        with:
          source: origin/${{ github.head_ref }}
          target: origin/${{ github.base_ref }}
          ignore-deletion: true
          ignore-whitespace: true
          ignore-comment: true
      - name: Fail if the PR has more than 300 lines changed
        run: |
          if [ ${{ steps.get-pr-size.outputs.size }} -gt 300 ]; then
            echo "The PR has more than 300 lines changed"
            exit 1
          fi
```

#### 2. Label the PR based on the diff size

```yaml
jobs:
  label-pr-size:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Calculate diff size
        id: get-pr-size
        uses: themoin/diff-calculator@{version}
        with:
          source: origin/${{ github.head_ref }}
          target: origin/${{ github.base_ref }}
          ignore-deletion: true
          ignore-whitespace: true
          ignore-comment: true
      - name: Label PR size
        run: |
          VALUE=${{ steps.get-pr-size.outputs.size }}
          if [ $VALUE -le 10 ]; then
            LABEL="size/10"
          elif [ $VALUE -le 100 ]; then
            LABEL="size/100"
          elif [ $VALUE -le 200 ]; then
            LABEL="size/200"
          elif [ $VALUE -lt 300 ]; then
            LABEL="size/300"
          else
            LABEL="size/300+"
          fi
          # Check if the label prefixed with `size/` is already set
          EXISTING=$(gh pr view ${{ github.event.number }} --json labels --jq ".labels[].name" | grep "^size/" || true)
          # If the label is not set, just add the label
          if [ -z "$EXISTING" ]; then
            echo "Adding label $LABEL"
            gh pr edit ${{ github.event.number }} --add-label $LABEL
          # If the label is already set to the calculated label, do nothing
          elif [ $EXISTING = $LABEL ]; then
            echo "Label is already set to $LABEL"
          # If the label is set to another label, remove the existing label and add the calculated label
          else
            echo "Removing label $EXISTING and adding label $LABEL"
            gh pr edit ${{ github.event.number }} --remove-label $EXISTING
            gh pr edit ${{ github.event.number }} --add-label $LABEL
          fi
```

## Ignoring Files

Both CLI and Github Action support ignoring files by providing a `.gitdiffignore` file in the root of the repository.
Its format is the same as `.gitignore` file. See the [specification of `.gitignore`](https://git-scm.com/docs/gitignore).
