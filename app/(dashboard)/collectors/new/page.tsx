"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MethodSelector } from "@/components/collectors/method-selector";
import { ArrowLeft, ArrowRight, Loader2, Check } from "lucide-react";
import Link from "next/link";

type Step = 1 | 2 | 3 | 4 | 5;

interface Integration {
  id: string;
  name: string;
  type: "GITHUB" | "AWS" | "JIRA";
}

interface EvidenceTypeDefinition {
  id: string;
  label: string;
  description: string;
  supportsApi: boolean;
  supportsScreenshot: boolean;
  configFields: Array<{
    key: string;
    label: string;
    type: "text" | "select" | "checkbox";
    required: boolean;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
  }>;
}

const EVIDENCE_TYPES: Record<string, EvidenceTypeDefinition[]> = {
  GITHUB: [
    {
      id: "repo_list",
      label: "Repository List",
      description: "List all repositories for a user or organization",
      supportsApi: true,
      supportsScreenshot: true,
      configFields: [
        { key: "org", label: "Organization (leave blank for user repos)", type: "text", required: false, placeholder: "my-org" },
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
      ],
    },
  ],
  AWS: [
    {
      id: "iam_users",
      label: "IAM Users",
      description: "List all IAM users in the AWS account",
      supportsApi: true,
      supportsScreenshot: true,
      configFields: [],
    },
    {
      id: "iam_policies",
      label: "IAM Policies",
      description: "List customer-managed IAM policies",
      supportsApi: true,
      supportsScreenshot: true,
      configFields: [],
    },
    {
      id: "s3_buckets",
      label: "S3 Buckets",
      description: "List all S3 buckets in the account",
      supportsApi: true,
      supportsScreenshot: true,
      configFields: [],
    },
    {
      id: "security_groups",
      label: "Security Groups",
      description: "List EC2 security groups and their rules",
      supportsApi: true,
      supportsScreenshot: true,
      configFields: [],
    },
  ],
  JIRA: [
    {
      id: "open_issues",
      label: "Open Issues",
      description: "List all open issues in a Jira project",
      supportsApi: true,
      supportsScreenshot: true,
      configFields: [
        { key: "projectKey", label: "Project Key", type: "text", required: true, placeholder: "PROJ" },
      ],
    },
    {
      id: "closed_issues",
      label: "Closed Issues",
      description: "List recently resolved/closed issues",
      supportsApi: true,
      supportsScreenshot: true,
      configFields: [
        { key: "projectKey", label: "Project Key", type: "text", required: true, placeholder: "PROJ" },
      ],
    },
    {
      id: "audit_log",
      label: "Audit Log",
      description: "Fetch Jira audit log entries",
      supportsApi: true,
      supportsScreenshot: false,
      configFields: [],
    },
    {
      id: "user_list",
      label: "User List",
      description: "List all users in the Jira instance",
      supportsApi: true,
      supportsScreenshot: true,
      configFields: [],
    },
  ],
};

const STEP_LABELS = ["Integration", "Evidence Type", "Method", "Configure", "Schedule"];

export default function NewCollectorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedIntegrationId = searchParams.get("integrationId");

  const [step, setStep] = useState<Step>(preselectedIntegrationId ? 2 : 1);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [selectedIntegrationId, setSelectedIntegrationId] = useState(preselectedIntegrationId ?? "");
  const [selectedEvidenceType, setSelectedEvidenceType] = useState("");
  const [method, setMethod] = useState<"API" | "SCREENSHOT" | null>(null);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [schedule, setSchedule] = useState("");

  useEffect(() => {
    fetch("/api/integrations")
      .then((r) => r.json())
      .then(setIntegrations)
      .catch(console.error);
  }, []);

  const selectedIntegration = integrations.find((i) => i.id === selectedIntegrationId);
  const evidenceTypes = selectedIntegration ? EVIDENCE_TYPES[selectedIntegration.type] ?? [] : [];
  const selectedEvidenceTypeDef = evidenceTypes.find((et) => et.id === selectedEvidenceType);

  function handleConfigChange(key: string, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/collectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || `${selectedIntegration?.name} - ${selectedEvidenceType}`,
          integrationId: selectedIntegrationId,
          evidenceType: selectedEvidenceType,
          method: method!,
          config,
          schedule: schedule || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create collector");
      }

      const collector = await res.json();
      router.push(`/collectors/${collector.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/collectors">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">New Collector</h1>
          <p className="text-zinc-400">Configure a new evidence collection pipeline</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as Step;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                isDone
                  ? "bg-teal-600 text-white"
                  : isActive
                  ? "bg-zinc-700 text-zinc-100 ring-2 ring-teal-500"
                  : "bg-zinc-800 text-zinc-500"
              }`}>
                {isDone ? <Check className="h-3 w-3" /> : stepNum}
              </div>
              <span className={`hidden text-xs sm:block ${isActive ? "text-zinc-200" : "text-zinc-500"}`}>
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && (
                <div className="h-px w-6 bg-zinc-700" />
              )}
            </div>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Step 1: Choose integration */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Select Integration</h2>
                <p className="text-sm text-zinc-400">Choose which connected system to collect from</p>
              </div>
              {integrations.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-zinc-400">No integrations found.</p>
                  <Link href="/integrations/new" className="mt-2 inline-block text-sm text-teal-400 hover:underline">
                    Add an integration first →
                  </Link>
                </div>
              ) : (
                <div className="grid gap-3">
                  {integrations.map((integration) => (
                    <button
                      key={integration.id}
                      onClick={() => setSelectedIntegrationId(integration.id)}
                      className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                        selectedIntegrationId === integration.id
                          ? "border-teal-600 bg-teal-950/30"
                          : "border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      <span className="text-xl">
                        {{ GITHUB: "🐙", AWS: "☁️", JIRA: "🟦" }[integration.type]}
                      </span>
                      <div>
                        <p className="font-medium text-zinc-100">{integration.name}</p>
                        <p className="text-xs text-zinc-400">{integration.type}</p>
                      </div>
                      {selectedIntegrationId === integration.id && (
                        <Check className="ml-auto h-4 w-4 text-teal-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedIntegrationId}
                className="w-full"
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Choose evidence type */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Evidence Type</h2>
                <p className="text-sm text-zinc-400">What kind of evidence do you want to collect?</p>
              </div>
              <div className="grid gap-3">
                {evidenceTypes.map((et) => (
                  <button
                    key={et.id}
                    onClick={() => setSelectedEvidenceType(et.id)}
                    className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                      selectedEvidenceType === et.id
                        ? "border-teal-600 bg-teal-950/30"
                        : "border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-zinc-100">{et.label}</p>
                      <p className="mt-0.5 text-sm text-zinc-400">{et.description}</p>
                      <div className="mt-2 flex gap-2">
                        {et.supportsApi && <Badge variant="api">API</Badge>}
                        {et.supportsScreenshot && <Badge variant="screenshot">Screenshot</Badge>}
                      </div>
                    </div>
                    {selectedEvidenceType === et.id && (
                      <Check className="h-4 w-4 text-teal-400 flex-shrink-0 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!selectedEvidenceType}
                  className="flex-1"
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Choose method */}
          {step === 3 && selectedEvidenceTypeDef && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Collection Method</h2>
                <p className="text-sm text-zinc-400">How should evidence be collected?</p>
              </div>
              <MethodSelector
                value={method}
                onChange={setMethod}
                supportsApi={selectedEvidenceTypeDef.supportsApi}
                supportsScreenshot={selectedEvidenceTypeDef.supportsScreenshot}
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  disabled={!method}
                  className="flex-1"
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Configure */}
          {step === 4 && selectedEvidenceTypeDef && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Configure</h2>
                <p className="text-sm text-zinc-400">Set the parameters for this collector</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Collector Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`${selectedIntegration?.name} - ${selectedEvidenceTypeDef.label}`}
                  />
                </div>

                {selectedEvidenceTypeDef.configFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>
                      {field.label}
                      {!field.required && <span className="ml-1 text-zinc-500">(optional)</span>}
                    </Label>
                    <Input
                      id={field.key}
                      placeholder={field.placeholder}
                      value={config[field.key] ?? ""}
                      onChange={(e) => handleConfigChange(field.key, e.target.value)}
                      required={field.required}
                    />
                  </div>
                ))}

                {selectedEvidenceTypeDef.configFields.length === 0 && (
                  <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-sm text-zinc-400">
                    No additional configuration needed. Credentials are taken from the integration.
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStep(5)} className="flex-1">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Schedule */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Schedule (Optional)</h2>
                <p className="text-sm text-zinc-400">Provide a cron expression to run this collector automatically</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule">Cron Expression</Label>
                <Input
                  id="schedule"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  placeholder="0 9 * * 1 (every Monday at 9am)"
                />
                <p className="text-xs text-zinc-500">
                  Examples: <code className="text-teal-400">0 * * * *</code> (hourly),{" "}
                  <code className="text-teal-400">0 9 * * 1</code> (weekly Monday 9am),{" "}
                  <code className="text-teal-400">0 0 1 * *</code> (monthly)
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(4)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Collector
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
