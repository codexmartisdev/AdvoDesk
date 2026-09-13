export type GitHubDirectEditProbe = {
  source: 'github-direct-edit';
  ok: true;
  version: 2;
};

export const githubDirectEditProbe: GitHubDirectEditProbe = {
  source: 'github-direct-edit',
  ok: true,
  version: 2,
};

export function isGitHubDirectEditProbeValid(
  probe: GitHubDirectEditProbe
): boolean {
  return probe.ok && probe.source === 'github-direct-edit' && probe.version === 2;
}
