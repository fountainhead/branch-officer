import colors from 'colors/safe';

import { Task } from '../taskList';
import * as renderers from './cellRenderers';

const create: Task = {
  action: 'create',
  pullRequest: {
    number: 1,
    title: 'new pr',
    body: '',
    sha: '111111',
    branch: 'new-branch',
    parsedMetadata: {
      testing: true
    },
    buildSucceeded: true
  },
  release: {
    name: 'new-branch',
    chart: 'charts/corp/app',
    values: [{
      image: {
        tag: '111111'
      }
    }]
  }
};

const del: Task = {
  action: 'delete',
  release: {
    name: 'old-branch',
    chart: 'charts/corp/app',
    values: [{
      image: {
        tag: '111111'
      }
    }]
  }
};

const update: Task = {
  action: 'update',
  pullRequest: {
    number: 1,
    title: 'new pr',
    body: '',
    sha: '111111',
    branch: 'new-branch',
    parsedMetadata: {
      testing: true
    },
    buildSucceeded: true
  },
  release: {
    name: 'new-branch',
    chart: 'charts/corp/app',
    values: [{
      image: {
        tag: '111111'
      }
    }]
  },
  oldRelease: {
    name: 'new-branch',
    chart: 'charts/corp/app',
    values: [{
      image: {
        tag: '000000'
      }
    }]
  }
};

describe('pullRequest', () => {

  it('returns 4 cells containing PR number, title, branch and parsed metadata when task has `pullRequest`', () => {
    expect(renderers.pullRequest(create)).toEqual([
      1,
      'new pr',
      'new-branch',
      `{
  "testing": true
}`,
      colors.green('Passed')
    ]);
  });

  it('returns a cell spanning 4 columns when task does not have `pullRequest`', () => {
    expect(renderers.pullRequest(del)).toEqual([{
      colSpan: 4,
      content: colors.gray('PR closed/No PR matching release')
    }]);
  });
});

describe('valuesDiff', () => {
  it(`returns an empty cell when task is 'delete' or 'no-change'`, () => {
    expect(renderers.valuesDiff(del)).toEqual({
      hAlign: 'center',
      content: colors.gray('-')
    });
  });

  it(`returns a cell containing chart values as YAML when task is 'create'`, () => {
    expect(renderers.valuesDiff(create)).toEqual(`- image:
    tag: '111111'
`);
  });

  it(`returns a colourised diff of new vs old chart values as YAML when task is 'update'`, () => {
    expect(renderers.valuesDiff(update)).toEqual(
      '  - image:\n' +
      colors.gray('- ') + colors.red(`    tag: '000000'\n`) +
      colors.gray('+ ') + colors.green(`    tag: '111111'\n`)
    );
  });
});
