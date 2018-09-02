import { Release } from './helmfile';
import { PullRequest } from './pullRequestEnumerator';
import { defaultMapper } from './pullRequestMapper';
import * as taskList from './taskList';

describe('generate', () => {
  const pullRequests: PullRequest[] = [{
    number: 1,
    title: 'new pr',
    body: '',
    sha: '111111',
    branch: 'new-branch',
    parsedMetadata: {},
    buildSucceeded: true
  }, {
    number: 2,
    title: 'updated pr',
    body: '',
    sha: '222222',
    branch: 'existing-branch',
    parsedMetadata: {},
    buildSucceeded: true
  }, {
    number: 3,
    title: 'another updated pr',
    body: '',
    sha: '333333',
    branch: 'unchanged-branch',
    parsedMetadata: {},
    buildSucceeded: true
  }, {
    number: 4,
    title: 'updated but failing pr',
    body: '',
    sha: '333333-broken',
    branch: 'unstable-branch',
    parsedMetadata: {},
    buildSucceeded: false
  }];

  const releases: Release[] = [{
    name: 'existing-branch',
    chart: 'charts/corp/app',
    values: [{
      image: {
        tag: '000000'
      }
    }]
  }, {
    name: 'unchanged-branch',
    chart: 'charts/corp/app',
    values: [{
      image: {
        tag: '333333'
      }
    }]
  }, {
    name: 'unstable-branch',
    chart: 'charts/corp/app',
    values: [{
      image: {
        tag: '333333-working'
      }
    }]
  }, {
    name: 'deleted-branch',
    chart: 'charts/corp/app',
    values: [{
      image: {
        tag: '555555'
      }
    }]
  }];

  const tasks = taskList.generate({
    pullRequests,
    releases,
    pullRequestMapper: defaultMapper({
      owner: 'corp',
      repo: 'app'
    })
  });

  it('creates Releases for PRs which do not have one already', () => {
    expect(tasks[0]).toEqual({
      action: 'create',
      pullRequest: pullRequests[0],
      release: {
        name: 'new-branch',
        chart: 'charts/corp/app',
        values: [{
          image: {
            tag: '111111'
          }
        }]
      }
    });
  });

  it('updates Releases where existing PR has changed', () => {
    expect(tasks[1]).toEqual({
      action: 'update',
      pullRequest: pullRequests[1],
      oldRelease: releases[0],
      release: {
        name: 'existing-branch',
        chart: 'charts/corp/app',
        values: [{
          image: {
            tag: '222222'
          }
        }]
      }
    });
  });

  it('makes no changes to Releases where existing PR is unchanged', () => {
    expect(tasks[2]).toEqual({
      action: 'no-change',
      pullRequest: pullRequests[2],
      release: releases[1]
    });
  });

  it('makes no changes to Releases where PR has changed but build has not succeeded', () => {
    expect(tasks[3]).toEqual({
      action: 'no-change',
      pullRequest: pullRequests[3],
      release: releases[2]
    });
  });

  it('deletes Releases which do not have an associated PR', () => {
    expect(tasks[4]).toEqual({
      action: 'delete',
      release: releases[3]
    });
  });
});
