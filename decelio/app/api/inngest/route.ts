import { serve } from "inngest/next";
import type { NextRequest } from "next/server";
import { inngest } from "@/inngest/client";
import { functions } from "@/inngest/functions";

const handlers = serve({
  client: inngest,
  functions,
});

type RouteHandler = (req: NextRequest, ctx: unknown) => Promise<Response>;

// La clé de signature est portée par le client (voir inngest/client.ts) : sans
// elle, cet endpoint accepte n'importe quel POST anonyme et déclenche une
// campagne sur n'importe quelle marque, car le matcher du middleware exclut
// /api. On refuse donc de servir en production quand elle manque.
//
// La vérification est faite à la requête, et non au chargement du module :
// `next build` évalue ce fichier avec NODE_ENV=production pour collecter les
// données de route, donc un `throw` au niveau module rend le build impossible
// tant que le secret n'est pas présent à la construction. C'est ce qui faisait
// échouer la porte `npm run build` — voir docs/runbooks/deploiement-render-neon.md.
function signingKeyRefusal(): Response | null {
  if (process.env.INNGEST_SIGNING_KEY || process.env.NODE_ENV !== "production") {
    return null;
  }

  return Response.json(
    {
      error:
        "INNGEST_SIGNING_KEY est obligatoire en production : sans elle, /api/inngest est déclenchable par n'importe qui.",
    },
    { status: 503 },
  );
}

function guarded(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const refusal = signingKeyRefusal();
    if (refusal) {
      return refusal;
    }

    return handler(req, ctx);
  };
}

export const GET = guarded(handlers.GET);
export const POST = guarded(handlers.POST);
export const PUT = guarded(handlers.PUT);
