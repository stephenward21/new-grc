import { awsFetch } from "../../aws-sigv4";

interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

interface TempCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

function extractXmlValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([^<]+)<\/${tag}>`));
  return match?.[1] ?? "";
}

async function getFederationToken(credentials: AWSCredentials): Promise<TempCredentials> {
  const url =
    "https://sts.amazonaws.com/?Action=GetFederationToken&Name=grc-screenshot&DurationSeconds=3600&Version=2011-06-15";

  const response = await awsFetch({ ...credentials, service: "sts" }, url);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`STS GetFederationToken failed (${response.status}): ${text}`);
  }

  const xml = await response.text();

  return {
    accessKeyId: extractXmlValue(xml, "AccessKeyId"),
    secretAccessKey: extractXmlValue(xml, "SecretAccessKey"),
    sessionToken: extractXmlValue(xml, "SessionToken"),
  };
}

/**
 * Generates a one-time AWS console sign-in URL using IAM user credentials.
 * Playwright navigates to this URL and is automatically redirected to
 * destinationUrl inside an authenticated console session.
 *
 * Requires the IAM user to have sts:GetFederationToken permission.
 */
export async function getAWSConsoleSigninUrl(
  credentials: AWSCredentials,
  destinationUrl: string
): Promise<string> {
  const tempCreds = await getFederationToken(credentials);

  const session = JSON.stringify({
    sessionId: tempCreds.accessKeyId,
    sessionKey: tempCreds.secretAccessKey,
    sessionToken: tempCreds.sessionToken,
  });

  const federationRes = await fetch(
    `https://signin.aws.amazon.com/federation?Action=getSigninToken&SessionDuration=3600&Session=${encodeURIComponent(session)}`
  );

  if (!federationRes.ok) {
    throw new Error(`Failed to get federation signin token: ${await federationRes.text()}`);
  }

  const { SigninToken } = (await federationRes.json()) as { SigninToken: string };

  return (
    `https://signin.aws.amazon.com/federation` +
    `?Action=login` +
    `&Issuer=grc-evidence-collector` +
    `&Destination=${encodeURIComponent(destinationUrl)}` +
    `&SigninToken=${SigninToken}`
  );
}
