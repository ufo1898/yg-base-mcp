#!/usr/bin/env node
/**
 * yg-base-mcp — MCP stdio server that fronts a hosted x402 data endpoint.
 *
 * Two ways to reach the data:
 *   1. Set YG_BASE_MCP_URL (default: the hosted endpoint) — this process simply
 *      proxies JSON-RPC to the hosted Streamable-HTTP MCP server. No wallet needed
 *      to *discover* tools; paid tools return the x402 challenge with instructions.
 *   2. Point it at your own facilitator/wallet by pre-signing EIP-3009 and passing
 *      the envelope as the `_payment` argument of a tools/call.
 *
 * Hosted endpoint: https://yg-base.lxin952.workers.dev/mcp
 */
const HOSTED = process.env.YG_BASE_MCP_URL || 'https://yg-base.lxin952.workers.dev/mcp';

const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');

async function rpc(body) {
  const res = await fetch(HOSTED, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { jsonrpc: '2.0', id: body.id ?? null, error: { code: -32603, message: `bad upstream response: ${text.slice(0, 160)}` } }; }
}

let buf = '';
process.stdin.on('data', async (chunk) => {
  buf += chunk.toString('utf8');
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }); continue; }
    // notifications need no response
    if (msg.id === undefined || String(msg.method || '').startsWith('notifications/')) { await rpc(msg).catch(() => {}); continue; }
    if (msg.method === 'initialize') {
      send({ jsonrpc: '2.0', id: msg.id, result: {
        protocolVersion: '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'yg-base-mcp', version: '1.0.0' },
        instructions: 'Live Base chain data, paid per call in USDC over x402. Call free_sample first, then any paid tool without _payment to get the payment challenge.',
      } });
      continue;
    }
    const out = await rpc(msg);
    send(out);
  }
});

process.stdin.on('end', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
console.error(`[yg-base-mcp] proxying MCP to ${HOSTED}`);
