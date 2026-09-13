import bs58 from 'bs58';

function parseSecret(value: string): Uint8Array | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('[')) {
    try {
      return Uint8Array.from(JSON.parse(trimmed));
    } catch {
      return null;
    }
  }
  try {
    return bs58.decode(trimmed);
  } catch {
    return null;
  }
}

function getSecretMap(env: NodeJS.ProcessEnv): Record<string, string> {
  const raw = env.ALDOR_UMBRA_SECRET_MAP;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function getUmbraSecretForDomain(domain: string, env: NodeJS.ProcessEnv = process.env): Uint8Array | null {
  const map = getSecretMap(env);
  const direct = map[domain];
  if (direct) return parseSecret(direct);

  const envKey = `ALDOR_UMBRA_SECRET_${domain.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
  const fallback = env[envKey];
  if (fallback) return parseSecret(fallback);

  return null;
}
