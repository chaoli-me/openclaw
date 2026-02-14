import { describe, expect, it } from "vitest";
import { validateConfigObject } from "./config.js";

describe("config schema regressions", () => {
  it("accepts nested telegram groupPolicy overrides", () => {
    const res = validateConfigObject({
      channels: {
        telegram: {
          groups: {
            "-1001234567890": {
              groupPolicy: "open",
              topics: {
                "42": {
                  groupPolicy: "disabled",
                },
              },
            },
          },
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it('accepts memorySearch fallback "voyage"', () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          memorySearch: {
            fallback: "voyage",
          },
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it("accepts telegram network ssrf allowedHostnames", () => {
    const res = validateConfigObject({
      channels: {
        telegram: {
          network: {
            ssrf: {
              allowedHostnames: ["minio.internal.example.com"],
            },
          },
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it("accepts telegram network ssrf allowPrivateNetwork", () => {
    const res = validateConfigObject({
      channels: {
        telegram: {
          network: {
            ssrf: {
              allowPrivateNetwork: true,
            },
          },
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it("rejects unknown keys inside telegram network ssrf", () => {
    const res = validateConfigObject({
      channels: {
        telegram: {
          network: {
            ssrf: {
              allowedHostnames: ["example.com"],
              bogusKey: true,
            },
          },
        },
      },
    });

    expect(res.ok).toBe(false);
  });
});
