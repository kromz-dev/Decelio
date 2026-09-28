import { createServer, type Server } from "node:http";
import { afterAll, describe, expect, it } from "vitest";
import type { Dispatcher } from "undici";
import { createPinnedDispatcher } from "./crawler";

/**
 * Comme dans `crawler.ts` : Node ne déclare pas encore `dispatcher` sur
 * `RequestInit` (extension d'undici). Interface locale plutôt que `any`.
 */
interface FetchInitWithDispatcher extends RequestInit {
  dispatcher?: Dispatcher;
}

/**
 * Ce fichier est séparé de `crawler.test.ts` parce que ce dernier simule
 * `global.fetch` et le module `undici` entier (`vi.mock("undici", ...)`) :
 * aucun test là-bas n'appelle jamais le vrai `fetch` ni le vrai `Agent`.
 * C'est justement ce qui a caché la panne de la demande #174 (undici 7 → 8) :
 * le `dispatcher` construit avec l'`Agent` du paquet `undici` installé n'est
 * plus accepté par le `fetch` global de Node (qui embarque sa propre copie
 * d'undici, en 7.x) et échoue avec `UND_ERR_INVALID_ARG` — un échec que des
 * simulations ne peuvent pas voir. Ici, on utilise le vrai `fetch` global et
 * le vrai `createPinnedDispatcher`, contre un vrai serveur HTTP local :
 * aucune requête ne sort de la machine (127.0.0.1 uniquement).
 */
describe("createPinnedDispatcher accepté par le vrai fetch global (fix/undici-scanner-casse)", () => {
  let server: Server;
  let port: number;
  const expectedBody = "decelio-dispatcher-ok";

  const ready = new Promise<void>((resolve) => {
    server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(expectedBody);
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        throw new Error("Adresse de serveur de test inattendue");
      }
      port = address.port;
      resolve();
    });
  });

  afterAll(() => {
    return new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("accepte le dispatcher épinglé et récupère la vraie réponse du serveur local", async () => {
    await ready;

    const fetchInit: FetchInitWithDispatcher = {
      dispatcher: createPinnedDispatcher("127.0.0.1"),
    };
    const response = await fetch(`http://127.0.0.1:${port}/`, fetchInit);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(expectedBody);
  });
});
