import { x402ResourceServer } from "@x402/next"
import { HTTPFacilitatorClient } from "@x402/core/http"
import { ExactEvmScheme } from "@x402/evm/exact/server"
import { builderCodeResourceServerExtension } from "@x402/extensions/builder-code"
import { bazaarResourceServerExtension } from "@x402/extensions/bazaar"
import { createFacilitatorConfig } from "@coinbase/x402"

/**
 * Base mainnet network id (CAIP-2).
 * USDC payments settle here through the Coinbase CDP facilitator.
 */
export const BASE_MAINNET = "eip155:8453" as const

/**
 * The wallet that receives the USDC for each paid request.
 * Read from the environment — never hardcode a receiving address.
 */
export const PAY_TO_ADDRESS = process.env.WALLET_ADDRESS ?? "0x0000000000000000000000000000000000000000"

/**
 * ERC-8021 Base Builder Code (app code "a") attributed on every settlement.
 * Read from the environment; replace the placeholder with your real code
 * (from https://dashboard.base.org → Settings → Builder Codes).
 */
export const MY_BUILDER_CODE = process.env.BASE_BUILDER_CODE ?? "bc_your_code"

/**
 * Price per request, expressed in USD. The CDP facilitator resolves "$" prices
 * to USDC on Base mainnet.
 */
export const PRICE = "$0.001" as const

/**
 * Normalizes a CDP credential read from the environment.
 *
 * Environment variable UIs frequently mangle secrets in two ways that make the
 * CDP SDK throw `Invalid key format - must be either PEM EC key or base64
 * Ed25519 key`:
 *   1. A PEM EC private key gets stored with literal `\n` sequences instead of
 *      real newlines, so `importPKCS8` can't parse it.
 *   2. The value picks up surrounding quotes or leading/trailing whitespace,
 *      which breaks the base64 Ed25519 length check (must decode to 64 bytes).
 *
 * This cleans both cases without altering a well-formed key.
 */
function normalizeCdpSecret(raw: string | undefined): string | undefined {
  if (!raw) return raw
  let s = raw.trim()
  // Strip a single pair of surrounding quotes if present.
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim()
  }
  // Convert escaped "\n" sequences into real newlines for PEM EC keys.
  if (s.includes("\\n")) s = s.replace(/\\n/g, "\n")
  return s
}

const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID?.trim()
const CDP_API_KEY_SECRET = normalizeCdpSecret(process.env.CDP_API_KEY_SECRET)

/**
 * The CDP facilitator requires an API key pair. Fail loudly and early if it is
 * missing or malformed, so the route returns a clear, actionable error instead
 * of the cryptic "Invalid key format" thrown deep inside the CDP SDK.
 *
 * A valid CDP secret is one of:
 *   - a PEM EC private key ("-----BEGIN EC PRIVATE KEY-----" ...), or
 *   - a base64 Ed25519 key that decodes to exactly 64 bytes (~88 chars, "==").
 */
if (!CDP_API_KEY_ID || !CDP_API_KEY_SECRET) {
  console.error(
    "[v0] Missing CDP_API_KEY_ID / CDP_API_KEY_SECRET — both are required for the Coinbase CDP facilitator on Base mainnet.",
  )
} else {
  const isPemEcKey = CDP_API_KEY_SECRET.includes("BEGIN") && CDP_API_KEY_SECRET.includes("PRIVATE KEY")
  let ed25519Bytes = 0
  try {
    ed25519Bytes = Buffer.from(CDP_API_KEY_SECRET, "base64").length
  } catch {
    ed25519Bytes = 0
  }
  const isEd25519Key = ed25519Bytes === 64

  if (!isPemEcKey && !isEd25519Key) {
    console.error(
      "[v0] CDP_API_KEY_SECRET is not a valid CDP Secret API Key. " +
        `Received a value of ${CDP_API_KEY_SECRET.length} chars that decodes to ${ed25519Bytes} bytes. ` +
        "Expected either a PEM EC key (starts with '-----BEGIN EC PRIVATE KEY-----') " +
        "or a base64 Ed25519 key that decodes to exactly 64 bytes (~88 chars ending in '=='). " +
        "Generate a fresh 'Secret API Key' in the CDP Portal (portal.cdp.coinbase.com → API Keys → Secret API Keys) " +
        "and paste the FULL secret — the current value looks truncated or is the wrong credential (e.g. a Client API Key or Wallet Secret).",
    )
  }
}

/**
 * The Coinbase CDP facilitator config (mainnet). It is authenticated with the
 * CDP API key pair and performs on-chain verification and settlement.
 */
const facilitatorConfig = createFacilitatorConfig(CDP_API_KEY_ID, CDP_API_KEY_SECRET)

const facilitatorClient = new HTTPFacilitatorClient(facilitatorConfig)

/**
 * Shared x402 resource server:
 * - settles "exact" EVM payments on Base mainnet,
 * - attributes payments to the Builder Code (ERC-8021),
 * - declares Bazaar discovery metadata so agents can find the endpoint.
 */
export const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(BASE_MAINNET, new ExactEvmScheme())
  .registerExtension(builderCodeResourceServerExtension)
  .registerExtension(bazaarResourceServerExtension)
