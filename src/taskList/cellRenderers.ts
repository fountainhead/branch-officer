import colors from 'colors/safe';
import { diffLines } from 'diff';
import { safeDump } from 'js-yaml';

import { Task } from '../taskList';

export const pullRequest = (task: Task) => {
  if (!task.pullRequest) {
    return [
      { colSpan: 4, content: colors.gray('PR closed/No PR matching release') }
    ];
  }

  return [
    task.pullRequest.number,
    task.pullRequest.title,
    task.pullRequest.branch,
    JSON.stringify(task.pullRequest.parsedMetadata, null, 2),
    task.pullRequest.buildSucceeded ? colors.green('Passed') : colors.red('Failed')
  ];
};

export const action = (task: Task) => {
  if (task.action === 'create') {
    return colors.green('Create');
  }

  if (task.action === 'update') {
    return colors.yellow('Update');
  }

  if (task.action === 'delete') {
    return colors.red('Delete');
  }

  return colors.gray('No change');
};

export const valuesDiff = (task: Task) => {
  if (task.action === 'delete' || task.action === 'no-change') {
    return {
      hAlign: 'center',
      content: colors.gray('-')
    };
  }

  const values = safeDump(task.release.values);

  if (task.action === 'update') {
    const oldValues = safeDump(task.oldRelease.values);
    const diff = diffLines(oldValues, values);

    return diff
      .map(({ removed, added, value }) => {
        if (removed) {
          return colors.gray('- ') + colors.red(value);
        }

        if (added) {
          return colors.gray('+ ') + colors.green(value);
        }

        return `  ${value}`;
      })
      .join('');
  }

  return values;
};
