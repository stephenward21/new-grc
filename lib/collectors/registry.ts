import { GithubCollector, GITHUB_EVIDENCE_TYPES } from "./api/github";
import { AwsCollector, AWS_EVIDENCE_TYPES } from "./api/aws";
import { JiraCollector, JIRA_EVIDENCE_TYPES } from "./api/jira";
import type { BaseCollector } from "./base";
import type { CollectorConfig, EvidenceTypeDefinition } from "./types";

type IntegrationType = "GITHUB" | "AWS" | "JIRA";

const EVIDENCE_TYPES: Record<IntegrationType, EvidenceTypeDefinition[]> = {
  GITHUB: GITHUB_EVIDENCE_TYPES,
  AWS: AWS_EVIDENCE_TYPES,
  JIRA: JIRA_EVIDENCE_TYPES,
};

export function getEvidenceTypes(integrationType: IntegrationType): EvidenceTypeDefinition[] {
  return EVIDENCE_TYPES[integrationType] ?? [];
}

export function getEvidenceTypeDefinition(
  integrationType: IntegrationType,
  evidenceTypeId: string
): EvidenceTypeDefinition | undefined {
  return EVIDENCE_TYPES[integrationType]?.find((et) => et.id === evidenceTypeId);
}

export function createCollector(
  integrationType: IntegrationType,
  config: CollectorConfig
): BaseCollector {
  switch (integrationType) {
    case "GITHUB":
      return new GithubCollector(config);
    case "AWS":
      return new AwsCollector(config);
    case "JIRA":
      return new JiraCollector(config);
    default:
      throw new Error(`Unknown integration type: ${integrationType}`);
  }
}

export { GITHUB_EVIDENCE_TYPES, AWS_EVIDENCE_TYPES, JIRA_EVIDENCE_TYPES };
export type { EvidenceTypeDefinition };
