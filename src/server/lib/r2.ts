import { env } from "cloudflare:workers";

export async function putJsonToR2(
  key: string,
  payload: Record<string, unknown>,
): Promise<{ key: string; sizeBytes: number }> {
  const body = JSON.stringify(payload);
  await env.R2.put(key, body, {
    httpMetadata: {
      contentType: "application/json",
    },
  });

  return {
    key,
    sizeBytes: Buffer.byteLength(body),
  };
}

export async function getJsonFromR2(key: string): Promise<string> {
  const object = await env.R2.get(key);
  if (!object) {
    throw new Error("Audit payload not found");
  }

  return object.text();
}

export async function putTextToR2(
  key: string,
  body: string,
): Promise<{ key: string; sizeBytes: number }> {
  await env.R2.put(key, body, {
    httpMetadata: {
      contentType: "application/json",
    },
  });

  return {
    key,
    sizeBytes: Buffer.byteLength(body),
  };
}
