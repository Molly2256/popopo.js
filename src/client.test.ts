import { describe, expect, test } from "bun:test";

import { PopopoClient } from "./client.ts";

describe("CoinsClient", () => {
  test("requests user-private-data from Firestore with a Bearer Firebase token", async () => {
    let seenUrl = "";
    let seenAuthorization = "";

    const client = new PopopoClient({
      fetch: async (input, init) => {
        seenUrl = String(input);
        seenAuthorization = new Headers(init?.headers).get("authorization") ?? "";

        return new Response(
          JSON.stringify({
            name: "projects/popopo-prod/databases/(default)/documents/user-privates/user-123",
            fields: {
              coinBalances: {
                mapValue: {
                  fields: {
                    paid: { integerValue: "12" },
                    free: { integerValue: "34" },
                  },
                },
              },
            },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      },
      session: {
        userId: "user-123",
        firebaseIdToken: "firebase-token",
      },
      firebase: {
        apiKey: "api-key",
        projectId: "popopo-prod",
      },
    });

    const result = await client.coins.getBalance();

    expect(seenUrl).toBe(
      "https://firestore.googleapis.com/v1/projects/popopo-prod/databases/(default)/documents/user-privates/user-123?key=api-key",
    );
    expect(seenAuthorization).toBe("Bearer firebase-token");
    expect(result.documentPath).toBe(
      "projects/popopo-prod/databases/(default)/documents/user-privates/user-123",
    );
    expect(result.coinBalances).toEqual({
      paid: 12,
      free: 34,
    });
    expect(result.paidCoins).toBe(12);
    expect(result.freeCoins).toBe(34);
  });

  test("normalizes array-style coin balances and falls back to session bearer token", async () => {
    const client = new PopopoClient({
      fetch: async () =>
        new Response(
          JSON.stringify({
            name: "projects/popopo-prod/databases/(default)/documents/user-privates/user-456",
            fields: {
              coinBalances: {
                arrayValue: {
                  values: [
                    {
                      mapValue: {
                        fields: {
                          scope: { stringValue: "paidCoins" },
                          amount: { integerValue: "99" },
                        },
                      },
                    },
                    {
                      mapValue: {
                        fields: {
                          scope: { stringValue: "freeCoins" },
                          amount: { integerValue: "7" },
                        },
                      },
                    },
                  ],
                },
              },
            },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      session: {
        userId: "user-456",
        bearerToken: "fallback-token",
      },
      firebase: {
        apiKey: "api-key",
        projectId: "popopo-prod",
      },
    });

    const result = await client.coins.getBalance();

    expect(result.coinBalances).toEqual({
      paidCoins: 99,
      freeCoins: 7,
    });
    expect(result.paidCoins).toBe(99);
    expect(result.freeCoins).toBe(7);
  });
});
