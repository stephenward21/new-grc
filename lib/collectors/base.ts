import type { CollectorConfig, CollectionResult } from "./types";

export abstract class BaseCollector {
  protected config: CollectorConfig;

  constructor(config: CollectorConfig) {
    this.config = config;
  }

  abstract collect(): Promise<CollectionResult>;

  protected get credentials(): Record<string, string> {
    return this.config.credentials;
  }

  protected get params(): Record<string, string> {
    return this.config.params;
  }

  protected get method(): "api" | "screenshot" {
    return this.config.method;
  }
}
