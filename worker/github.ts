import type { Campaign, Post, Settings } from '../shared/types';

interface GitHubResult {
  ok: boolean;
  commit?: string;
  path?: string;
  error?: string;
}

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function putFile(
  token: string,
  repo: string,
  path: string,
  content: string,
  message: string,
): Promise<{ sha?: string; error?: string }> {
  const api = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
  const headers = {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'content-type': 'application/json',
    'user-agent': 'autoreel-zen',
  };

  let sha: string | undefined;
  const existing = await fetch(api, { headers });
  if (existing.ok) {
    const data = (await existing.json()) as { sha?: string };
    sha = data.sha;
  }

  const res = await fetch(api, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ message, content: encodeBase64(content), sha, branch: undefined }),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    return { error: `GitHub ${res.status}: ${body}` };
  }
  const data = (await res.json()) as { commit?: { sha?: string } };
  return { sha: data.commit?.sha };
}

export async function backupToGitHub(
  settings: Settings,
  payload: { posts: Post[]; campaigns: Campaign[]; stats: unknown },
): Promise<GitHubResult> {
  const repo = settings.ghRepo.trim();
  const token = settings.ghToken.trim();
  if (!repo || !token) return { ok: false, error: 'GitHub repo and token are required' };
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return { ok: false, error: 'Repo must look like owner/name' };

  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);
  const snapshot = {
    app: 'autoreel-zen',
    savedAt: now.toISOString(),
    settings: {
      brand: settings.brand,
      vision: settings.vision,
      seedTopic: settings.seedTopic,
      postsPerDay: settings.postsPerDay,
      slots: settings.slots,
      autoContinue: settings.autoContinue,
    },
    stats: payload.stats,
    campaigns: payload.campaigns,
    posts: payload.posts,
  };
  const body = JSON.stringify(snapshot, null, 2);

  const latest = await putFile(token, repo, 'data/latest.json', body, `chore(data): snapshot ${stamp}`);
  if (latest.error) return { ok: false, error: latest.error };
  const archive = await putFile(
    token,
    repo,
    `data/archive/${stamp}.json`,
    body,
    `chore(data): archive ${stamp}`,
  );
  return {
    ok: true,
    commit: latest.sha,
    path: 'data/latest.json',
    error: archive.error,
  };
}
