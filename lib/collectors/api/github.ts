import { BaseCollector } from "../base";
import { takeScreenshot } from "../screenshot/browser";
import type { CollectionResult, EvidenceTypeDefinition } from "../types";

export const GITHUB_EVIDENCE_TYPES: EvidenceTypeDefinition[] = [
  {
    id: "repo_list",
    label: "Repository List",
    description: "List all repositories for a user or organization",
    supportsApi: true,
    supportsScreenshot: true,
    configFields: [
      { key: "org", label: "Organization (leave blank for user repos)", type: "text", required: false, placeholder: "my-org" },
      { key: "token", label: "GitHub Token", type: "text", required: true, placeholder: "ghp_..." },
    ],
  },
  {
    id: "branch_protection",
    label: "Branch Protection Rules",
    description: "Fetch branch protection settings for a repository",
    supportsApi: true,
    supportsScreenshot: true,
    configFields: [
      { key: "owner", label: "Owner", type: "text", required: true, placeholder: "my-org" },
      { key: "repo", label: "Repository", type: "text", required: true, placeholder: "my-repo" },
      { key: "token", label: "GitHub Token", type: "text", required: true, placeholder: "ghp_..." },
    ],
  },
  {
    id: "collaborators",
    label: "Repository Collaborators",
    description: "List collaborators with access to a repository",
    supportsApi: true,
    supportsScreenshot: true,
    configFields: [
      { key: "owner", label: "Owner", type: "text", required: true, placeholder: "my-org" },
      { key: "repo", label: "Repository", type: "text", required: true, placeholder: "my-repo" },
      { key: "token", label: "GitHub Token", type: "text", required: true, placeholder: "ghp_..." },
    ],
  },
  {
    id: "audit_log",
    label: "Organization Audit Log",
    description: "Fetch recent audit log events for an organization",
    supportsApi: true,
    supportsScreenshot: true,
    configFields: [
      { key: "org", label: "Organization", type: "text", required: true, placeholder: "my-org" },
      { key: "token", label: "GitHub Token", type: "text", required: true, placeholder: "ghp_..." },
    ],
  },
];

export class GithubCollector extends BaseCollector {
  private get token(): string {
    return this.params.token ?? this.credentials.token ?? "";
  }

  private async githubFetch(path: string): Promise<unknown> {
    const response = await fetch(`https://api.github.com${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API error ${response.status}: ${body}`);
    }

    return response.json();
  }

  private async collectViaApi(): Promise<CollectionResult> {
    const { evidenceType, params } = this.config;

    switch (evidenceType) {
      case "repo_list": {
        const endpoint = params.org
          ? `/orgs/${params.org}/repos?per_page=100&type=all`
          : "/user/repos?per_page=100&affiliation=owner,collaborator,organization_member";
        const data = await this.githubFetch(endpoint);
        return {
          method: "api",
          data,
          metadata: { evidenceType, org: params.org ?? "user", collectedAt: new Date().toISOString() },
        };
      }

      case "branch_protection": {
        const branches = (await this.githubFetch(
          `/repos/${params.owner}/${params.repo}/branches`
        )) as Array<{ name: string }>;

        const protectionDetails = await Promise.all(
          branches.map(async (branch) => {
            try {
              const protection = await this.githubFetch(
                `/repos/${params.owner}/${params.repo}/branches/${branch.name}/protection`
              );
              return { branch: branch.name, protection };
            } catch {
              return { branch: branch.name, protection: null };
            }
          })
        );

        return {
          method: "api",
          data: protectionDetails,
          metadata: {
            evidenceType,
            owner: params.owner,
            repo: params.repo,
            collectedAt: new Date().toISOString(),
          },
        };
      }

      case "collaborators": {
        const data = await this.githubFetch(
          `/repos/${params.owner}/${params.repo}/collaborators?per_page=100`
        );
        return {
          method: "api",
          data,
          metadata: {
            evidenceType,
            owner: params.owner,
            repo: params.repo,
            collectedAt: new Date().toISOString(),
          },
        };
      }

      case "audit_log": {
        const data = await this.githubFetch(
          `/orgs/${params.org}/audit-log?per_page=100`
        );
        return {
          method: "api",
          data,
          metadata: { evidenceType, org: params.org, collectedAt: new Date().toISOString() },
        };
      }

      default:
        throw new Error(`Unknown GitHub evidence type: ${evidenceType}`);
    }
  }

  private async collectViaScreenshot(runId: string): Promise<CollectionResult> {
    const { evidenceType, params } = this.config;

    let url: string;
    let filename: string;

    switch (evidenceType) {
      case "repo_list":
        url = params.org
          ? `https://github.com/orgs/${params.org}/repositories`
          : "https://github.com?tab=repositories";
        filename = "repo-list.png";
        break;

      case "branch_protection":
        url = `https://github.com/${params.owner}/${params.repo}/settings/branches`;
        filename = "branch-protection.png";
        break;

      case "collaborators":
        url = `https://github.com/${params.owner}/${params.repo}/settings/access`;
        filename = "collaborators.png";
        break;

      case "audit_log":
        url = `https://github.com/organizations/${params.org}/settings/audit-log`;
        filename = "audit-log.png";
        break;

      default:
        throw new Error(`Unknown GitHub evidence type: ${evidenceType}`);
    }

    const { buffer, filePath } = await takeScreenshot(url, {
      runId,
      filename,
      fullPage: true,
    });

    return {
      method: "screenshot",
      screenshotPath: filePath,
      screenshotBuffer: buffer,
      metadata: {
        evidenceType,
        url,
        collectedAt: new Date().toISOString(),
        note: "Screenshot requires GitHub session cookies for private content",
      },
    };
  }

  async collect(): Promise<CollectionResult> {
    const runId = this.params.runId ?? "unknown";

    if (this.method === "api") {
      return this.collectViaApi();
    } else {
      return this.collectViaScreenshot(runId);
    }
  }
}
