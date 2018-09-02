import Table from 'cli-table3';
import { equals, whereEq } from 'ramda';

import { Release } from './helmfile';
import { PullRequest } from './pullRequestEnumerator';
import { PullRequestMapper } from './pullRequestMapper';
import * as render from './taskList/cellRenderers';

type Options = {
  pullRequests: PullRequest[];
  releases: Release[];
  pullRequestMapper: PullRequestMapper;
};

type Create = {
  action: 'create';
  pullRequest: PullRequest;
  release: Release;
};

type Update = {
  action: 'update';
  pullRequest: PullRequest;
  oldRelease: Release;
  release: Release;
};

type Delete = {
  action: 'delete';
  release: Release;
  pullRequest?: PullRequest;
};

type NoChange = {
  action: 'no-change';
  pullRequest: PullRequest;
  release: Release;
};

export type Task = Create | Update | Delete | NoChange;

/**
 * Creates a list of Tasks that will create or update Releases which currently
 * have open PRs associated with them.
 */
export const upsertReleaseTasks = ({ pullRequests, releases, pullRequestMapper }: Options) =>
  pullRequests
    .map<Task>(pullRequest => {
      const mappedRelease = pullRequestMapper(pullRequest);
      const matchedRelease = releases.find(whereEq({ name: mappedRelease.name }));

      if (!matchedRelease) {
        return {
          action: 'create',
          release: mappedRelease,
          pullRequest
        };
      }

      if (equals(matchedRelease, mappedRelease) || !pullRequest.buildSucceeded) {
        return {
          action: 'no-change',
          release: matchedRelease,
          pullRequest
        };
      }

      return {
        action: 'update',
        pullRequest,
        oldRelease: matchedRelease,
        release: mappedRelease
      };
    });

/**
 * Creates a list of Tasks that will delete Releases which no longer have an
 * open PR associated with them.
 */
export const deleteReleaseTasks = ({ pullRequests, releases, pullRequestMapper }: Options) =>
  releases
    .filter(release => {
      const matchingPr = pullRequests.find(pr => {
        const mappedRelease = pullRequestMapper(pr);
        return release.name === mappedRelease.name;
      });

      return !matchingPr;
    })
    .map<Task>(release => ({
      action: 'delete',
      release
    }));

export const generate = ({ pullRequests, releases, pullRequestMapper }: Options): Task[] => {
  console.log(`Generating task list based on ${pullRequests.length} PR(s) and ${releases.length} Helm release(s)`);

  return [
    ...upsertReleaseTasks({ pullRequests, releases, pullRequestMapper }),
    ...deleteReleaseTasks({ pullRequests, releases, pullRequestMapper })
  ];
};

export const printTable = (tasks: Task[]) => {
  const table = new Table({
    head: [
      'PR #',
      'PR Title',
      'PR Branch',
      'PR Metadata',
      'BR Build Status',

      'Action',

      'Release',

      'Values'
    ],

    style: {
      head: []
    }
  });

  tasks.forEach(task => {
    (table.push as any)([
      ...render.pullRequest(task),
      render.action(task),
      task.release.name,
      render.valuesDiff(task)
    ]);
  });

  return table.toString();
};
