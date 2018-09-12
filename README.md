# branch-officer

Automates the deployment of GitHub Pull Requests as Preview Environments using
Helm and Helmfile.

[![CircleCI](https://circleci.com/gh/FountainheadTechnologies/branch-officer/tree/master.svg?style=svg&circle-token=17c4432ad0719b66131ee5982ad575a6c39f2956)](https://circleci.com/gh/FountainheadTechnologies/branch-officer/tree/master)

## Installation

```bash
npm install -g @fountainhead/branch-officer
```

## Basic Usage

Branch Officer typically runs as part of your Continuous Integeration/Deployment
workflow (although it can be run through other means), so it expects a
`GITHUB_TOKEN` environment variable. Once this is set, you can invoke it like
so:

```bash
branch-officer \
  --file $(pwd)/helmfile.d/preview-environments.yaml \
  --owner KontosoCorporation \
  --repo WidgetWarehouse
```

In this example, Branch Officer will enumerate all currently open on the
`KontosoCorporation/WidgetWarehouse` repository, compare the `releases` entry in
the Helmfile `preview-environments.yaml`, and display a table of Release entries
that will be created, modified, deleted or left un-modified.

If you are satisfied with the proposed changes, you may add the `--apply` flag
to modify the supplied Helmfile accordingly:

```bash
branch-officer \
  --file $(pwd)/helmfile.d/preview-environments.yaml \
  --owner KontosoCorporation \
  --repo WidgetWarehouse \
  --apply
```

The changes to your Helmfile may then be committed to version control and
applied to your cluster using `helmfile sync`.

## Advanced Usage

### Pull Request Metadata

By default, Branch Officer will create a Release entry with the following
structure:

```yaml
name: {{ name of the PR branch }}
chart: charts/{{ owner name }}/{{ repo name }}
values:
  image:
    tag: {{ SHA of the PR's most recent commit }}
```

It is possible to modify the `values` of a Release on a per-release basis, by
specifying 'metadata' in the Pull Request. This is encoded as YAML-formatted
front-matter in the body of the Pull Request, which is then deep-merged with the
default structure.

For example, if the body of your Pull Request looks like this:

```yaml
---
apiReplicas: 2
uiReplicas: 1
---
This patch addresses the race condition caused by multiple API server instances
competing over a shared resource. To demonstrate that this works, I've set the
'apiReplicas' value in the Helm Release to '2'.
```

Then the Values will be merged into the Helmfile like so:

```yaml
name: fix-race-condition
chart: charts/KontosoCorporation/WidgetWarehouse
values:
  apiReplicas: 2
  uiReplicas: 1
  image:
    tag: {{ SHA of the PR's most recent commit }}
```

In order to create more exotic Release entries, including modification of
properties outside of `release.values`, please refer to the next section.

### Custom Pull Request > Release Mapper

It is also possible to create a JavaScript function that allows full control
over the Release entry that will be created in the Helmfile. For example, use
the SHA of the PR's most recent commit to update multiple images, create a
mapper like so:

```javascript
// mapPrToRelease.js

module.exports = ({branch, parsedMetadata, sha}) => ({
  name: branch,
  chart: 'charts/kontoso',
  values: [{
    api: {
      image: {
      name: 'quay.io/kontoso/widget-warehouse-api'
      tag: `sha-${sha}`
    },
    ui: {
      image: {
      name: 'quay.io/kontoso/widget-warehouse-ui'
      tag: `sha-${sha}`
    }
  }]
})
```

Then, use the `--mapper` argument to specify a path to the Mapper file:

```bash
branch-officer \
  --file $(pwd)/helmfile.d/preview-environments.yaml \
  --mapper $(pwd)/mapPrToRelease.js \
  --owner KontosoCorporation \
  --repo WidgetWarehouse \
  --apply
```

The function exported by your Mapper file will be called with an object
containing the following properties:

- `number (number)`- The Pull Request number. For example, `123`.
- `title (string)` - The Title of the Pull Request. For example, `'Fix Race
  Condition'`.
- `body (string)` - The Body of the Pull Request.
- `sha (string)` - The SHA of the most recent commit on the Pull Request.
- `branch (string)` - The name of the branch the Pull Request was made for.
- `parsedMetadata (object)` - Any YAML-formatted front matter from the body of
  the Pull Request, parsed as an Object. If no metadata was supplied or parsing
  failed, this defaults to an empty object (`{}`).
- `buildSucceeded (boolean)` - Whether all reported 'build statuses' on the PR
  have passed. This is always `true`, as the Mapper function will *not* be
  called for failing PRs.

### Required Status Checks

By default, Branch Officer requires that *all* applicable Status Checks pass in
order for a Release to be created/updated. If a PR is currently failing to be
built, it will be ignored.

It may be desirable to only require certain status checks to be considered. This
is possible by supplying the `--requiredStatusChecks` argument. This argument
may be passed multiple times to specify multiple required statuses. For example,
to allow a release to be created/updated for a PR provided it passes the status
checks named `ci/circleci: test_ui` *and* `ci/circleci: test_api`, use the
following invocation:

```bash
branch-officer \
  --file $(pwd)/helmfile.d/preview-environments.yaml \
  --owner KontosoCorporation \
  --repo WidgetWarehouse \
  --requiredStatusChecks "ci/circleci: test_ui" \
  --requiredStatusChecks "ci/circleci: test_api" \
  --apply
```
