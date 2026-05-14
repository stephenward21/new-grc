import { createHmac, createHash } from "crypto";

function hmacSHA256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hash(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function toHex(buffer: Buffer): string {
  return buffer.toString("hex");
}

export interface SigV4Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service: string;
}

export interface SigV4Request {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export function signRequest(
  config: SigV4Config,
  request: SigV4Request
): Record<string, string> {
  const url = new URL(request.url);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);

  const method = request.method.toUpperCase();
  const canonicalUri = encodeURIComponent(url.pathname).replace(/%2F/g, "/") || "/";

  const searchParams = new URLSearchParams(url.search);
  const sortedParams = Array.from(searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const payloadHash = sha256Hash(request.body ?? "");

  const baseHeaders: Record<string, string> = {
    host: url.hostname,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    ...request.headers,
  };

  const sortedHeaderKeys = Object.keys(baseHeaders).sort();
  const canonicalHeaders = sortedHeaderKeys
    .map((k) => `${k.toLowerCase()}:${baseHeaders[k].trim()}`)
    .join("\n") + "\n";
  const signedHeaders = sortedHeaderKeys.map((k) => k.toLowerCase()).join(";");

  const canonicalRequest = [
    method,
    canonicalUri,
    sortedParams,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${config.region}/${config.service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hash(canonicalRequest),
  ].join("\n");

  const kDate = hmacSHA256(`AWS4${config.secretAccessKey}`, dateStamp);
  const kRegion = hmacSHA256(kDate, config.region);
  const kService = hmacSHA256(kRegion, config.service);
  const kSigning = hmacSHA256(kService, "aws4_request");
  const signature = toHex(hmacSHA256(kSigning, stringToSign));

  const authorizationHeader = [
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ");

  return {
    ...baseHeaders,
    Authorization: authorizationHeader,
  };
}

export async function awsFetch(
  config: SigV4Config,
  url: string,
  options: { method?: string; body?: string; headers?: Record<string, string> } = {}
): Promise<Response> {
  const method = options.method ?? "GET";
  const signedHeaders = signRequest(config, {
    method,
    url,
    headers: options.headers,
    body: options.body,
  });

  return fetch(url, {
    method,
    headers: signedHeaders,
    body: options.body,
  });
}
