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
  it('returns `data[0].state === \'success\'`', () => {
    expect(prEnumerator.getBuildSucceeded({
      data: [{
        state: 'success'
      }]
    } as any)).toBe(true);

    expect(prEnumerator.getBuildSucceeded({
      data: [{
        state: 'failed'
      }]
    } as any)).toBe(false);

    expect(prEnumerator.getBuildSucceeded({
      data: []
    } as any)).toBe(false);
  });
});
