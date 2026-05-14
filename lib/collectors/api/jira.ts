import { BaseCollector } from "../base";
import { takeScreenshot } from "../screenshot/browser";
import type { CollectionResult, EvidenceTypeDefinition } from "../types";

export const JIRA_EVIDENCE_TYPES: EvidenceTypeDefinition[] = [
  {
    id: "open_issues",
    label: "Open Issues",
    description: "List all open issues in a Jira project",
    supportsApi: true,
    supportsScreenshot: true,
    configFields: [
      { key: "host", label: "Jira Host", type: "text", required: true, placeholder: "https://yourcompany.atlassian.net" },
      { key: "email", label: "Email", type: "text", required: true, placeholder: "you@company.com" },
      { key: "apiToken", label: "API Token", type: "text", required: true, placeholder: "ATATT3..." },
      { key: "projectKey", label: "Project Key", type: "text", required: true, placeholder: "PROJ" },
    ],
  },
  {
    id: "closed_issues",
    label: "Closed Issues",
    description: "List recently resolved/closed issues in a Jira project",
    supportsApi: true,
    supportsScreenshot: true,
    configFields: [
      { key: "host", label: "Jira Host", type: "text", required: true, placeholder: "https://yourcompany.atlassian.net" },
      { key: "email", label: "Email", type: "text", required: true, placeholder: "you@company.com" },
      { key: "apiToken", label: "API Token", type: "text", required: true, placeholder: "ATATT3..." },
      { key: "projectKey", label: "Project Key", type: "text", required: true, placeholder: "PROJ" },
    ],
  },
  {
    id: "audit_log",
    label: "Audit Log",
    description: "Fetch Jira audit log entries",
    supportsApi: true,
    supportsScreenshot: false,
    configFields: [
      { key: "host", label: "Jira Host", type: "text", required: true, placeholder: "https://yourcompany.atlassian.net" },
      { key: "email", label: "Email", type: "text", required: true, placeholder: "you@company.com" },
      { key: "apiToken", label: "API Token", type: "text", required: true, placeholder: "ATATT3..." },
    ],
  },
  {
    id: "user_list",
    label: "User List",
    description: "List all users in the Jira instance",
    supportsApi: true,
    supportsScreenshot: true,
    configFields: [
      { key: "host", label: "Jira Host", type: "text", required: true, placeholder: "https://yourcompany.atlassian.net" },
      { key: "email", label: "Email", type: "text", required: true, placeholder: "you@company.com" },
      { key: "apiToken", label: "API Token", type: "text", required: true, placeholder: "ATATT3..." },
    ],
  },
];

export class JiraCollector extends BaseCollector {
  private get host(): string {
    return (
      this.params.host ??
      this.credentials.host ??
      process.env.JIRA_HOST ??
      ""
    ).replace(/\/$/, "");
  }

  private get email(): string {
    return this.params.email ?? this.credentials.email ?? process.env.JIRA_EMAIL ?? "";
  }

  private get apiToken(): string {
    return this.params.apiToken ?? this.credentials.apiToken ?? process.env.JIRA_API_TOKEN ?? "";
  }

  private get authHeader(): string {
    const encoded = Buffer.from(`${this.email}:${this.apiToken}`).toString("base64");
    return `Basic ${encoded}`;
  }

  private async jiraFetch(path: string): Promise<unknown> {
    const url = `${this.host}/rest/api/3${path}`;
    const response = await fetch(url, {
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Jira API error ${response.status}: ${body}`);
    }

    return response.json();
  }

  private async collectViaApi(): Promise<CollectionResult> {
    const { evidenceType, params } = this.config;

    switch (evidenceType) {
      case "open_issues": {
        const jql = encodeURIComponent(`project = ${params.projectKey} AND statusCategory != Done ORDER BY created DESC`);
        const data = await this.jiraFetch(`/search?jql=${jql}&maxResults=100&fields=summary,status,assignee,priority,created,updated`);
        return {
          method: "api",
          data,
          metadata: { evidenceType, projectKey: params.projectKey, collectedAt: new Date().toISOString() },
        };
      }

      case "closed_issues": {
        const jql = encodeURIComponent(`project = ${params.projectKey} AND statusCategory = Done ORDER BY resolutiondate DESC`);
        const data = await this.jiraFetch(`/search?jql=${jql}&maxResults=100&fields=summary,status,assignee,priority,created,updated,resolutiondate`);
        return {
          method: "api",
          data,
          metadata: { evidenceType, projectKey: params.projectKey, collectedAt: new Date().toISOString() },
        };
      }

      case "audit_log": {
        const data = await this.jiraFetch("/auditing/record?limit=200");
        return {
          method: "api",
          data,
          metadata: { evidenceType, collectedAt: new Date().toISOString() },
        };
      }

      case "user_list": {
        const data = await this.jiraFetch("/users/search?maxResults=100");
        return {
          method: "api",
          data,
          metadata: { evidenceType, collectedAt: new Date().toISOString() },
        };
      }

      default:
        throw new Error(`Unknown Jira evidence type: ${evidenceType}`);
    }
  }

  private async collectViaScreenshot(runId: string): Promise<CollectionResult> {
    const { evidenceType, params } = this.config;

    const urlMap: Record<string, { url: string; filename: string }> = {
      open_issues: {
        url: `${this.host}/jira/software/projects/${params.projectKey}/boards`,
        filename: "open-issues.png",
      },
      closed_issues: {
        url: `${this.host}/jira/software/projects/${params.projectKey}/list`,
        filename: "closed-issues.png",
      },
      user_list: {
        url: `${this.host}/jira/people/search`,
        filename: "user-list.png",
      },
    };

    const target = urlMap[evidenceType];
    if (!target) throw new Error(`Screenshot not supported for Jira evidence type: ${evidenceType}`);

    const { buffer, filePath } = await takeScreenshot(target.url, {
      runId,
      filename: target.filename,
      fullPage: true,
      integrationId: this.config.integrationId,
    });

    return {
      method: "screenshot",
      screenshotPath: filePath,
      screenshotBuffer: buffer,
      metadata: {
        evidenceType,
        url: target.url,
        collectedAt: new Date().toISOString(),
        note: "Jira screenshot requires an active browser session with valid credentials",
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
