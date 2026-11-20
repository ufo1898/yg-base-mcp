# yg-base-mcp

MCP server for **live Base chain data, paid per call in USDC over x402**. No API key, no signup, and the buyer needs **no ETH** — payments ride EIP-3009 (`transferWithAuthorization`) and the seller submits the transfer, so gas is on the seller.

- Hosted MCP endpoint (Streamable HTTP): `https://yg-base.lxin952.workers.dev/mcp`
- Discovery: [`/openapi.json`](https://yg-base.lxin952.workers.dev/openapi.json) · [`/.well-known/x402`](https://yg-base.lxin952.workers.dev/.well-known/x402) · [`/llms.txt`](https://yg-base.lxin952.workers.dev/llms.txt)
- Network / asset: Base mainnet `eip155:8453`, USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

## Tools

| tool | price | what you get |
|---|---|---|
| `free_sample` | free | best Base USDC yield right now + one-line conclusion |
| `yields` | 0.002 USDC | live supply rates across Aave, Moonwell, Compound III on Base |
| `arb` | 0.002 USDC | cross-venue round-trip spreads (Aerodrome / Uniswap V3 / Sushi), incl. gas and break-even size |
| `pools` | 0.002 USDC | pool withdrawability: cash on hand, utilisation, whether you can actually exit |
| `tokenrisk` | 0.005 USDC | risk check for any Base token: honeypot verdict, buy/sell tax, safe exit size, pair age, holder concentration |
| `plan` | 0.005 USDC | given size and horizon: where to put it, net yield after gas, minimum size worth moving |
| `wallet` | 0.010 USDC | health check for any Base wallet: balances, yield positions, exit feasibility, gas runway, risk list |

## Use it

### Hosted (recommended)

Any MCP client that speaks Streamable HTTP:

```json
{
  "mcpServers": {
    "yg-base-data": {
      "type": "http",
      "url": "https://yg-base.lxin952.workers.dev/mcp"
    }
  }
}
```

### Local stdio proxy

```bash
npx yg-base-mcp
```

```json
{
  "mcpServers": {
    "yg-base-data": { "command": "npx", "args": ["-y", "yg-base-mcp"] }
  }
}
```

Override the upstream with `YG_BASE_MCP_URL`.

## How payment works

1. `tools/call` a paid tool **without** `_payment` → you get `payment_required` plus `payTo`, `price` and the `GET <resource>` URL.
2. `GET` that URL with no header → HTTP 402, and the `PAYMENT-REQUIRED` header carries the full x402 v2 challenge (base64 JSON).
3. Sign an EIP-3009 `TransferWithAuthorization` for the quoted amount to `payTo` on Base.
4. Base64 the `{x402Version:2, scheme, network, payload:{signature, authorization}}` envelope into `_payment` and call the tool again. The seller submits the transfer and pays gas; the same authorization can't be replayed.

`_payment` also accepts an `X-PAYMENT` envelope carrying a `txHash` if you already sent the USDC yourself.

## Why this exists

Agents that route stablecoin liquidity need three numbers before they move money: the live rate, the exit risk, and the gas-adjusted break-even size. This server answers those from chain state rather than from a stale database, at a price small enough that an agent can call it per decision.

MIT licensed.
