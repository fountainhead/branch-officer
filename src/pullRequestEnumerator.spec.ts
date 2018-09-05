import { GetCombinedStatusForRefResponse, Response } from '@octokit/rest';

import * as prEnumerator from './pullRequestEnumerator';

describe('extractLastPage', () => {
  it('extracts the `page` query parameter from the `last` link rel', () => {
    expect(prEnumerator.extractLastPage(
      '<https://api.github.com/user/repos?page=3&per_page=100>; rel="next", ' +
      '<https://api.github.com/user/repos?page=50&per_page=100>; rel="last"'
    )).toEqual(100);
  });

  it('returns `1` if no `last` link rel is present', () => {
    expect(prEnumerator.extractLastPage(
      '<https://api.github.com/user/repos?page=3&per_page=100>; rel="next"'
    )).toEqual(1);

    expect(prEnumerator.extractLastPage('')).toEqual(1);
  });
});

describe('getPrData', () => {
  it('maps each PR in response to `PullRequest` type', () => {
    const response = {
      data: [{
        number: 1,
        title: 'Test PR One',
        body: '# Testing PRs without metadata',
        head: {
          sha: 'deadbeef',
          ref: 'test-1'
        }
      }, {
        number: 2,
        title: 'Test PR w/ metadata',
        body: `---
replicas: 2
ingress: test.tld.dev
---

# Testing PR with metadata`,
        head: {
          sha: 'deadbeef',
          ref: 'test-2'
        }
      }]
    };

    expect(prEnumerator.getPrData(response as any)).toEqual([{
      number: 1,
      title: 'Test PR One',
      body: '# Testing PRs without metadata',
      sha: 'deadbeef',
      branch: 'test-1',
      parsedMetadata: {}
    }, {
      number: 2,
      title: 'Test PR w/ metadata',
      body: `---
replicas: 2
ingress: test.tld.dev
---

# Testing PR with metadata`,
      sha: 'deadbeef',
      branch: 'test-2',
      parsedMetadata: {
        replicas: 2,
        ingress: 'test.tld.dev'
      }
    }]);
  });
});

describe('getBuildSucceeded', () => {
  const mixedResponse = {
    data: {
      statuses: [{
        context: 'test: stageA',
        state: 'success'
      }, {
        context: 'test: stageB',
        state: 'success'
      }, {
        context: 'test: stageC',
        state: 'failure'
      }]
    }
  } as any as Response<GetCombinedStatusForRefResponse>;

  const okResponse = {
    data: {
      statuses: [{
        context: 'test: stageA',
        state: 'success'
      }, {
        context: 'test: stageB',
        state: 'success'
      }]
    }
  } as any as Response<GetCombinedStatusForRefResponse>;

  const failedResponse = {
    data: {
      statuses: [{
        context: 'test: stageA',
        state: 'failure'
      }, {
        context: 'test: stageB',
        state: 'failure'
      }]
    }
  } as any as Response<GetCombinedStatusForRefResponse>;

  it('returns `true` only when State for each name has `state` === `success`', () => {
    expect(prEnumerator.getBuildSucceeded(['test: stageA'])(mixedResponse)).toEqual(true);
    expect(prEnumerator.getBuildSucceeded(['test: stageB'])(mixedResponse)).toEqual(true);
    expect(prEnumerator.getBuildSucceeded(['test: stageC'])(mixedResponse)).toEqual(false);

    expect(prEnumerator.getBuildSucceeded(['test: stageA', 'test: stageB'])(mixedResponse)).toEqual(true);
    expect(prEnumerator.getBuildSucceeded(['test: stageA', 'test: stageC'])(mixedResponse)).toEqual(false);
  });

  it('returns `true` only when all Statues have `state` === `success` when list is omitted', () => {
    expect(prEnumerator.getBuildSucceeded()(okResponse)).toEqual(true);
    expect(prEnumerator.getBuildSucceeded()(mixedResponse)).toEqual(false);
    expect(prEnumerator.getBuildSucceeded()(failedResponse)).toEqual(false);
  });
});
