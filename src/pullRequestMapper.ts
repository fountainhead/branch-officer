import { mergeDeepLeft } from 'ramda';

import { Release } from './helmfile';
import { PullRequest } from './pullRequestEnumerator';

export type PullRequestMapper = (pr: PullRequest) => Release;

type Options = {
  repo: string;
  owner: string;
};

export const defaultMapper: (options: Options) => PullRequestMapper =
  ({ repo, owner }) => ({ branch, sha, parsedMetadata }) => ({
    name: branch,
    chart: `charts/${owner}/${repo}`,
    values: [mergeDeepLeft(parsedMetadata, {
      image: {
        tag: sha
      }
    })]
  });
