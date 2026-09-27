import { describe, expect, it } from "vitest";
import { latestPlatform } from "./latest-platform";

describe("latestPlatform", () => {
  it("retient le journal le plus récent avec un payload exploitable", () => {
    const logs = [
      { payload: null },
      {
        payload: JSON.stringify({
          report: {
            platform: { cms: "wordpress", firewall: "cloudflare", signals: ["a"] },
          },
        }),
      },
    ];

    expect(latestPlatform(logs)).toEqual({ cms: "wordpress", firewall: "cloudflare", signals: ["a"] });
  });

  it("renvoie undefined si le JSON est invalide", () => {
    const logs = [{ payload: "{not json" }];

    expect(latestPlatform(logs)).toBeUndefined();
  });

  it("renvoie undefined si platform.cms est hors union", () => {
    const logs = [
      {
        payload: JSON.stringify({ report: { platform: { cms: "joomla", signals: [] } } }),
      },
    ];

    expect(latestPlatform(logs)).toBeUndefined();
  });

  it("renvoie undefined si aucun journal n'a de payload", () => {
    const logs = [{ payload: null }, { payload: null }];

    expect(latestPlatform(logs)).toBeUndefined();
  });

  it("renvoie undefined si cms est unknown sans aucun autre champ détecté", () => {
    const logs = [
      {
        payload: JSON.stringify({ report: { platform: { cms: "unknown", signals: [] } } }),
      },
    ];

    expect(latestPlatform(logs)).toBeUndefined();
  });

  it("renvoie la plateforme WordPress derrière Cloudflare", () => {
    const logs = [
      {
        payload: JSON.stringify({
          report: {
            platform: {
              cms: "wordpress",
              firewall: "cloudflare",
              signals: ["meta generator: WordPress", "header cf-ray: abc"],
            },
          },
        }),
      },
    ];

    expect(latestPlatform(logs)).toEqual({
      cms: "wordpress",
      firewall: "cloudflare",
      signals: ["meta generator: WordPress", "header cf-ray: abc"],
    });
  });
});
