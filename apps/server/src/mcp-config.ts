/** Initial read-only connector is deliberately separate from browser/god-session authority.
 * docs/world-agent-mcp.md#implemented-read-only-bootstrap
 */
export interface McpReadConfig {
  tokenSha256: string;
  worldId: string;
  expiresAt: number;
  allowedHosts: string[];
}
export function readMcpConfig(env: NodeJS.ProcessEnv): McpReadConfig | null {
  const keys = [
    'OPEN_LEGEND_MCP_TOKEN_SHA256',
    'OPEN_LEGEND_MCP_WORLD_ID',
    'OPEN_LEGEND_MCP_EXPIRES_AT',
    'OPEN_LEGEND_MCP_HOSTS',
  ] as const;
  if (keys.every((key) => !env[key])) return null;
  const hash = env[keys[0]],
    worldId = env[keys[1]],
    expiry = env[keys[2]],
    hosts = env[keys[3]];
  if (
    !hash ||
    !/^[a-f0-9]{64}$/.test(hash) ||
    !worldId ||
    !/^[a-zA-Z0-9_-]{1,200}$/.test(worldId) ||
    !expiry ||
    !hosts
  )
    throw new Error(
      'MCP requires a SHA-256 token hash, exact world ID, expiry and explicit allowed hosts.',
    );
  const expiresAt = Date.parse(expiry);
  if (!Number.isFinite(expiresAt) || !/(Z|[+-]\d\d:\d\d)$/.test(expiry))
    throw new Error('MCP expiry must be an ISO timestamp with timezone.');
  const allowedHosts = hosts.split(',').map((host) => host.trim().toLowerCase());
  if (
    allowedHosts.length > 8 ||
    allowedHosts.some((host) => {
      try {
        const url = new URL(`http://${host}`);
        return !host || /[\s*/\\@?#]/.test(host) || url.host !== host || url.pathname !== '/';
      } catch {
        return true;
      }
    })
  )
    throw new Error('MCP hosts must be exact host[:port] values, not URLs or wildcards.');
  return { tokenSha256: hash, worldId, expiresAt, allowedHosts: [...new Set(allowedHosts)] };
}
