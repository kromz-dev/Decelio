import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy inverse PostHog Cloud UE, sur notre propre domaine.
 *
 * Pourquoi un route handler plutôt qu'une simple réécriture (`rewrites()`
 * dans `next.config.ts`, l'option documentée par PostHog,
 * https://posthog.com/docs/advanced/proxy/nextjs) : `next/dist/server/
 * base-server.js` pose `x-forwarded-for` à partir de l'adresse TCP réelle du
 * visiteur (`req.headers['x-forwarded-for'] ??= socket.remoteAddress`)
 * lorsque cet en-tête est absent, *avant* qu'une réécriture externe ne
 * relaie la requête — une simple réécriture transmettrait donc l'IP réelle
 * du visiteur à PostHog dans cet en-tête, ce que la règle du projet
 * interdit (aucun appel tiers depuis une page publique ne doit exposer
 * l'IP du visiteur). Ce route handler reproduit le même routage que la
 * réécriture recommandée (`/ingest/static/*` → hôte d'assets,
 * `/ingest/*` → hôte d'ingestion) mais retire cet en-tête, ainsi que
 * `x-real-ip` et `cf-connecting-ip` (posés par certains reverse proxy
 * devant l'application), avant de relayer la requête.
 *
 * Aucun risque SSRF : les deux hôtes cibles sont des constantes fixes,
 * jamais dérivées de la requête (ni de `Host`, ni d'un paramètre, ni d'un
 * en-tête). Seul le chemin et la méthode sont repris de la requête entrante.
 */

const POSTHOG_INGEST_HOST = "https://eu.i.posthog.com";
const POSTHOG_ASSETS_HOST = "https://eu-assets.i.posthog.com";

/**
 * En-têtes qui révéleraient l'IP réelle du visiteur au tiers, ou qui
 * n'ont pas de sens une fois relayés vers un autre hôte (ex. `host`, qui
 * désignerait encore notre domaine et non celui de PostHog).
 */
const STRIPPED_REQUEST_HEADERS = [
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
  "host",
  "connection",
  "content-length",
];

function buildTargetUrl(pathSegments: string[], search: string): URL {
  const base = pathSegments[0] === "static" ? POSTHOG_ASSETS_HOST : POSTHOG_INGEST_HOST;
  const encodedPath = pathSegments.map(encodeURIComponent).join("/");
  return new URL(`${base}/${encodedPath}${search}`);
}

async function proxy(request: NextRequest, pathSegments: string[]): Promise<Response> {
  const targetUrl = buildTargetUrl(pathSegments, request.nextUrl.search);

  const headers = new Headers(request.headers);
  for (const header of STRIPPED_REQUEST_HEADERS) {
    headers.delete(header);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
      // Ce relais est un proxy analytique côté serveur : on ne veut jamais
      // qu'un défaut réseau PostHog fasse échouer la page qui l'a déclenché
      // ailleurs dans l'application (aucun `await` bloquant côté visiteur).
      signal: request.signal,
    });
  } catch (error) {
    console.error("Relais PostHog indisponible:", error);
    return NextResponse.json({ error: "posthog_unreachable" }, { status: 502 });
  }

  const responseHeaders = new Headers(upstreamResponse.headers);
  // Le corps est déjà décompressé par `fetch` ; l'en-tête d'origine
  // décrirait un encodage qu'on ne reproduit pas.
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return proxy(request, path);
}

export async function OPTIONS(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return proxy(request, path);
}
