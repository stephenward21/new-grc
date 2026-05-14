export interface CollectorConfig {
  integrationId: string;
  evidenceType: string;
  method: "api" | "screenshot";
  credentials: Record<string, string>;
  params: Record<string, string>;
}

export interface CollectionResult {
  method: "api" | "screenshot";
  data?: unknown;
  screenshotPath?: string;
  screenshotBuffer?: Buffer;
  metadata: Record<string, unknown>;
}

export interface EvidenceTypeDefinition {
  id: string;
  label: string;
  description: string;
  supportsApi: boolean;
  supportsScreenshot: boolean;
  configFields: ConfigField[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "select" | "checkbox";
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}
