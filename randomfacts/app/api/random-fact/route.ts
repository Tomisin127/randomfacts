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
      // ERC-8021 Builder Code attribution ("a" app code) on every settlement.
      // declareBuilderCodeExtension returns an UNKEYED { info, schema } object, so it
      // MUST be assigned under the BUILDER_CODE ("builder-code") key — spreading it at
      // the top level dumps `info`/`schema` as loose keys and the resource server never
      // emits the `a` app code into the settlement calldata.
      [BUILDER_CODE]: declareBuilderCodeExtension(MY_BUILDER_CODE),
      // Bazaar discovery metadata: tells agents and facilitators how to call this endpoint.
      ...(() => {
        const ext = declareDiscoveryExtension({
          output: {
            example: {
              fact: "Octopuses have three hearts and blue, copper-based blood.",
              source: "randomfactsx402",
            },
          },
        })
        // Add routeTemplate to the bazaar extension object for facilitator validation.
        if (ext.bazaar) {
          // @ts-ignore - routeTemplate is validated by the Bazaar facilitator at runtime
          ext.bazaar.routeTemplate = "/api/random-fact"
        }
        return ext
      })(),
    },
  },
  resourceServer,
)
