const ENDPOINT_PATH = "/api/random-fact"

const DETAILS = [
  { label: "Price", value: "0.001 USDC" },
  { label: "Network", value: "Base mainnet (eip155:8453)" },
  { label: "Scheme", value: "exact" },
  { label: "Facilitator", value: "Coinbase CDP" },
  { label: "Pay to", value: "PAY_TO_ADDRESS (env)" },
  { label: "Builder code", value: "BUILDER_CODE (env)" },
  { label: "Discovery", value: "Listed in the x402 Bazaar" },
]

export default function Page() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground">
          x402 paid endpoint
        </span>
        <h1 className="text-pretty text-3xl font-semibold tracking-tight">randomfactsx402</h1>
        <p className="text-pretty leading-relaxed text-muted-foreground">
          A pay-per-use HTTP endpoint. Send an x402 payment of 0.001 USDC on Base mainnet and the endpoint returns a
          random fact as JSON. Agents can discover it automatically through the x402 Bazaar, and every settlement is
          attributed to a Base Builder Code (ERC-8021).
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 text-card-foreground">
        <div className="flex items-center gap-2 font-mono text-sm">
          <span className="rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">GET</span>
          <code className="text-foreground">{ENDPOINT_PATH}</code>
        </div>
        <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[auto_1fr]">
          {DETAILS.map((d) => (
            <div key={d.label} className="grid grid-cols-subgrid sm:col-span-2">
              <dt className="text-sm text-muted-foreground">{d.label}</dt>
              <dd className="break-all font-mono text-sm text-foreground">{d.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-foreground">How it works</h2>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            An unpaid request returns <code className="font-mono text-foreground">402 Payment Required</code> with the
            payment requirements challenge.
          </li>
          <li>An x402 client (or Bazaar-aware agent) signs and submits the 0.001 USDC payment on Base mainnet.</li>
          <li>The Coinbase CDP facilitator verifies and settles the payment, attributing the builder code.</li>
          <li>The endpoint responds with a random fact.</li>
        </ol>
      </section>
    </main>
  )
}
