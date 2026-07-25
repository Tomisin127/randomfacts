import { type NextRequest, NextResponse } from "next/server"
import { withX402 } from "@x402/next"
import { BUILDER_CODE, declareBuilderCodeExtension } from "@x402/extensions/builder-code"
import { declareDiscoveryExtension } from "@x402/extensions/bazaar"
import { resourceServer, BASE_MAINNET, PAY_TO_ADDRESS, PRICE, MY_BUILDER_CODE } from "@/lib/x402"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * A small pool of facts. The endpoint returns one at random after payment.
 */
const FACTS = [
  "Honey never spoils; edible honey has been found in 3,000-year-old Egyptian tombs.",
  "Octopuses have three hearts and blue, copper-based blood.",
  "A day on Venus is longer than its year.",
  "Bananas are botanically berries, but strawberries are not.",
  "The Eiffel Tower can grow more than 15 cm taller in summer heat.",
  "Sharks predate trees; they have existed for over 400 million years.",
  "There are more possible chess games than atoms in the observable universe.",
  "Wombats produce cube-shaped poop.",
  "The shortest war in history lasted about 38 to 45 minutes.",
  "A group of flamingos is called a 'flamboyance'.",
]

/**
 * The actual fulfillment. This only runs after the x402 payment has been
 * verified and settled on Base mainnet, so the resource is safely paid-for.
 */
async function handler(_request: NextRequest) {
  const fact = FACTS[Math.floor(Math.random() * FACTS.length)]
  return NextResponse.json({
    fact,
    source: "randomfactsx402",
    servedAt: new Date().toISOString(),
  })
}

export const GET = withX402(
  handler,
  {
    accepts: {
      scheme: "exact",
      network: BASE_MAINNET,
      payTo: PAY_TO_ADDRESS,
      price: PRICE,
    },
    description: "Returns a single random fact as JSON in exchange for a micropayment.",
    mimeType: "application/json",
    serviceName: "Random Fact",
    tags: ["facts", "trivia", "random", "json"],
    extensions: {
      // ERC-8021 Builder Code attribution. `declareBuilderCodeExtension` returns an
      // UNKEYED { info: { a }, schema } object, so it MUST live under the BUILDER_CODE
      // ("builder-code") key. The resource server then emits it in the 402
      // PaymentRequired response; the paying client echoes the `a` app code into its
      // payment payload, and the CDP facilitator encodes it into the settlement calldata.
      [BUILDER_CODE]: declareBuilderCodeExtension(MY_BUILDER_CODE),
      // Bazaar discovery metadata: tells agents and facilitators how to call this
      // endpoint. `declareDiscoveryExtension` already returns a pre-keyed { bazaar }
      // object, so it is spread directly. The resource server derives the routeTemplate
      // and HTTP method during declaration enrichment.
      ...declareDiscoveryExtension({
        output: {
          example: {
            fact: "Octopuses have three hearts and blue, copper-based blood.",
            source: "randomfactsx402",
          },
        },
      }),
    },
  },
  resourceServer,
)
