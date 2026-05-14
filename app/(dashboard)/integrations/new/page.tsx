"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

type IntegrationType = "GITHUB" | "AWS" | "JIRA";

const CREDENTIAL_FIELDS: Record<IntegrationType, { key: string; label: string; placeholder: string; type?: string }[]> = {
  GITHUB: [
    { key: "token", label: "Personal Access Token", placeholder: "ghp_...", type: "password" },
  ],
  AWS: [
    { key: "accessKeyId", label: "Access Key ID", placeholder: "AKIAIOSFODNN7EXAMPLE" },
    { key: "secretAccessKey", label: "Secret Access Key", placeholder: "wJalrXUtnFEMI/...", type: "password" },
    { key: "region", label: "Region", placeholder: "us-east-1" },
  ],
  JIRA: [
    { key: "host", label: "Jira Host", placeholder: "https://yourcompany.atlassian.net" },
    { key: "email", label: "Email", placeholder: "you@company.com" },
    { key: "apiToken", label: "API Token", placeholder: "ATATT3...", type: "password" },
  ],
};

export default function NewIntegrationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<IntegrationType>("GITHUB");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields = CREDENTIAL_FIELDS[type];

  function handleCredentialChange(key: string, value: string) {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, credentials }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create integration");
      }

      router.push("/integrations");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/integrations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Add Integration</h1>
          <p className="text-zinc-400">Connect a new system for evidence collection</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integration Details</CardTitle>
          <CardDescription>
            Credentials are stored in the database. In production, use encrypted storage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production GitHub"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Integration Type</Label>
              <Select
                id="type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value as IntegrationType);
                  setCredentials({});
                }}
              >
                <option value="GITHUB">🐙 GitHub</option>
                <option value="AWS">☁️ AWS</option>
                <option value="JIRA">🟦 Jira</option>
              </Select>
            </div>

            <div className="space-y-4 rounded-lg border border-zinc-800 p-4">
              <p className="text-sm font-medium text-zinc-300">Credentials</p>
              {fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    type={field.type ?? "text"}
                    placeholder={field.placeholder}
                    value={credentials[field.key] ?? ""}
                    onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                    required
                  />
                </div>
              ))}
            </div>

            {error && (
              <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Integration
              </Button>
              <Link href="/integrations">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
