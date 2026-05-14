import { BaseCollector } from "../base";
import { takeScreenshot } from "../screenshot/browser";
import { awsFetch } from "../../aws-sigv4";
import type { CollectionResult, EvidenceTypeDefinition } from "../types";

export const AWS_EVIDENCE_TYPES: EvidenceTypeDefinition[] = [
  {
    id: "iam_users",
    label: "IAM Users",
    description: "List all IAM users in the AWS account",
    supportsApi: true,
    supportsScreenshot: true,
    configFields: [
      { key: "accessKeyId", label: "AWS Access Key ID", type: "text", required: true, placeholder: "AKIAIOSFODNN7EXAMPLE" },
      { key: "secretAccessKey", label: "AWS Secret Access Key", type: "text", required: true, placeholder: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" },
      { key: "region", label: "Region", type: "text", required: true, placeholder: "us-east-1" },
    ],
  },
  {
    id: "iam_policies",
    label: "IAM Policies",
    description: "List customer-managed IAM policies",
    supportsApi: true,
    supportsScreenshot: true,
    configFields: [
      { key: "accessKeyId", label: "AWS Access Key ID", type: "text", required: true, placeholder: "AKIAIOSFODNN7EXAMPLE" },
      { key: "secretAccessKey", label: "AWS Secret Access Key", type: "text", required: true, placeholder: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" },
      { key: "region", label: "Region", type: "text", required: true, placeholder: "us-east-1" },
    ],
  },
  {
    id: "s3_buckets",
    label: "S3 Buckets",
    description: "List all S3 buckets in the account",
    supportsApi: true,
    supportsScreenshot: true,
    configFields: [
      { key: "accessKeyId", label: "AWS Access Key ID", type: "text", required: true, placeholder: "AKIAIOSFODNN7EXAMPLE" },
      { key: "secretAccessKey", label: "AWS Secret Access Key", type: "text", required: true, placeholder: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" },
      { key: "region", label: "Region", type: "text", required: true, placeholder: "us-east-1" },
    ],
  },
  {
    id: "security_groups",
    label: "Security Groups",
    description: "List EC2 security groups and their rules",
    supportsApi: true,
    supportsScreenshot: true,
    configFields: [
      { key: "accessKeyId", label: "AWS Access Key ID", type: "text", required: true, placeholder: "AKIAIOSFODNN7EXAMPLE" },
      { key: "secretAccessKey", label: "AWS Secret Access Key", type: "text", required: true, placeholder: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" },
      { key: "region", label: "Region", type: "text", required: true, placeholder: "us-east-1" },
    ],
  },
];

export class AwsCollector extends BaseCollector {
  private get sigv4Config() {
    const accessKeyId =
      this.params.accessKeyId ??
      this.credentials.accessKeyId ??
      process.env.AWS_ACCESS_KEY_ID ??
      "";
    const secretAccessKey =
      this.params.secretAccessKey ??
      this.credentials.secretAccessKey ??
      process.env.AWS_SECRET_ACCESS_KEY ??
      "";
    const region =
      this.params.region ??
      this.credentials.region ??
      process.env.AWS_REGION ??
      "us-east-1";
    return { accessKeyId, secretAccessKey, region };
  }

  private async iamFetch(action: string, params: Record<string, string> = {}): Promise<unknown> {
    const { accessKeyId, secretAccessKey, region } = this.sigv4Config;
    const queryParams = new URLSearchParams({ Action: action, Version: "2010-05-08", ...params });
    const url = `https://iam.amazonaws.com/?${queryParams.toString()}`;

    const response = await awsFetch(
      { accessKeyId, secretAccessKey, region: "us-east-1", service: "iam" },
      url
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`AWS IAM API error ${response.status}: ${body}`);
    }

    const text = await response.text();
    // Parse XML response — return raw text and note that production should use a proper XML parser
    return { rawXml: text, parsedAt: new Date().toISOString() };
  }

  private async ec2Fetch(action: string, params: Record<string, string> = {}): Promise<unknown> {
    const { accessKeyId, secretAccessKey, region } = this.sigv4Config;
    const queryParams = new URLSearchParams({ Action: action, Version: "2016-11-15", ...params });
    const url = `https://ec2.${region}.amazonaws.com/?${queryParams.toString()}`;

    const response = await awsFetch(
      { accessKeyId, secretAccessKey, region, service: "ec2" },
      url
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`AWS EC2 API error ${response.status}: ${body}`);
    }

    const text = await response.text();
    return { rawXml: text, parsedAt: new Date().toISOString() };
  }

  private async s3Fetch(): Promise<unknown> {
    const { accessKeyId, secretAccessKey, region } = this.sigv4Config;
    const url = `https://s3.amazonaws.com/`;

    const response = await awsFetch(
      { accessKeyId, secretAccessKey, region, service: "s3" },
      url
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`AWS S3 API error ${response.status}: ${body}`);
    }

    const text = await response.text();
    return { rawXml: text, parsedAt: new Date().toISOString() };
  }

  private async collectViaApi(): Promise<CollectionResult> {
    const { evidenceType } = this.config;

    switch (evidenceType) {
      case "iam_users": {
        const data = await this.iamFetch("ListUsers");
        return {
          method: "api",
          data,
          metadata: { evidenceType, collectedAt: new Date().toISOString() },
        };
      }

      case "iam_policies": {
        const data = await this.iamFetch("ListPolicies", { Scope: "Local" });
        return {
          method: "api",
          data,
          metadata: { evidenceType, collectedAt: new Date().toISOString() },
        };
      }

      case "s3_buckets": {
        const data = await this.s3Fetch();
        return {
          method: "api",
          data,
          metadata: { evidenceType, collectedAt: new Date().toISOString() },
        };
      }

      case "security_groups": {
        const data = await this.ec2Fetch("DescribeSecurityGroups");
        return {
          method: "api",
          data,
          metadata: { evidenceType, collectedAt: new Date().toISOString() },
        };
      }

      default:
        throw new Error(`Unknown AWS evidence type: ${evidenceType}`);
    }
  }

  private async collectViaScreenshot(runId: string): Promise<CollectionResult> {
    const { evidenceType } = this.config;
    const region = this.params.region ?? this.credentials.region ?? "us-east-1";

    const urlMap: Record<string, { url: string; filename: string }> = {
      iam_users: {
        url: `https://${region}.console.aws.amazon.com/iam/home#/users`,
        filename: "iam-users.png",
      },
      iam_policies: {
        url: `https://${region}.console.aws.amazon.com/iam/home#/policies`,
        filename: "iam-policies.png",
      },
      s3_buckets: {
        url: `https://s3.console.aws.amazon.com/s3/home?region=${region}`,
        filename: "s3-buckets.png",
      },
      security_groups: {
        url: `https://${region}.console.aws.amazon.com/ec2/home?region=${region}#SecurityGroups:`,
        filename: "security-groups.png",
      },
    };

    const target = urlMap[evidenceType];
    if (!target) throw new Error(`Unknown AWS evidence type: ${evidenceType}`);

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
        note: "AWS Console screenshot requires active browser session with valid credentials",
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
