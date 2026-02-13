import { describe, expect, it } from "vitest";
import type { MsgContext } from "../auto-reply/templating.js";
import type { OpenClawConfig } from "../config/config.js";
import {
  buildProviderRegistry,
  createMediaAttachmentCache,
  normalizeMediaAttachments,
  runCapability,
} from "./runner.js";

describe("runCapability stripFromPrompt", () => {
  it("strips MediaPath, MediaPaths, and MediaUrls when stripFromPrompt is true", async () => {
    const ctx: MsgContext = {
      MediaPath: "/tmp/photo.jpg",
      MediaPaths: ["/tmp/photo.jpg", "/tmp/photo2.jpg"],
      MediaUrls: ["https://example.com/photo.jpg"],
      MediaType: "image/jpeg",
      Body: "Hello <media:image> check this out",
    };
    const media = normalizeMediaAttachments(ctx);
    const cache = createMediaAttachmentCache(media);
    const cfg = {
      tools: {
        media: {
          image: { enabled: false, stripFromPrompt: true },
        },
      },
    } as OpenClawConfig;

    try {
      const result = await runCapability({
        capability: "image",
        cfg,
        ctx,
        attachments: cache,
        media,
        providerRegistry: buildProviderRegistry(),
      });

      expect(result.outputs).toHaveLength(0);
      expect(result.decision.outcome).toBe("disabled");

      // Verify media paths are stripped
      expect(ctx.MediaPath).toBeUndefined();
      expect(ctx.MediaPaths).toBeUndefined();
      expect(ctx.MediaUrls).toBeUndefined();

      // Verify <media:image> placeholder is replaced
      expect(ctx.Body).toBe("Hello [image received - not processed] check this out");
    } finally {
      await cache.cleanup();
    }
  });

  it("does NOT strip media paths when stripFromPrompt is false/absent", async () => {
    const ctx: MsgContext = {
      MediaPath: "/tmp/photo.jpg",
      MediaPaths: ["/tmp/photo.jpg"],
      MediaType: "image/jpeg",
      Body: "Hello <media:image>",
    };
    const media = normalizeMediaAttachments(ctx);
    const cache = createMediaAttachmentCache(media);
    const cfg = {
      tools: {
        media: {
          image: { enabled: false },
        },
      },
    } as OpenClawConfig;

    try {
      const result = await runCapability({
        capability: "image",
        cfg,
        ctx,
        attachments: cache,
        media,
        providerRegistry: buildProviderRegistry(),
      });

      expect(result.decision.outcome).toBe("disabled");

      // Media paths should remain intact
      expect(ctx.MediaPath).toBe("/tmp/photo.jpg");
      expect(ctx.MediaPaths).toEqual(["/tmp/photo.jpg"]);
      expect(ctx.Body).toBe("Hello <media:image>");
    } finally {
      await cache.cleanup();
    }
  });

  it("handles multiple <media:image> placeholders in Body", async () => {
    const ctx: MsgContext = {
      MediaPath: "/tmp/a.jpg",
      MediaPaths: ["/tmp/a.jpg", "/tmp/b.jpg"],
      MediaType: "image/jpeg",
      Body: "<media:image> and <media:image> two images",
    };
    const media = normalizeMediaAttachments(ctx);
    const cache = createMediaAttachmentCache(media);
    const cfg = {
      tools: {
        media: {
          image: { enabled: false, stripFromPrompt: true },
        },
      },
    } as OpenClawConfig;

    try {
      await runCapability({
        capability: "image",
        cfg,
        ctx,
        attachments: cache,
        media,
        providerRegistry: buildProviderRegistry(),
      });

      expect(ctx.Body).toBe(
        "[image received - not processed] and [image received - not processed] two images",
      );
      expect(ctx.MediaPath).toBeUndefined();
      expect(ctx.MediaPaths).toBeUndefined();
    } finally {
      await cache.cleanup();
    }
  });

  it("handles missing Body gracefully when stripFromPrompt is true", async () => {
    const ctx: MsgContext = {
      MediaPath: "/tmp/photo.jpg",
      MediaType: "image/jpeg",
    };
    const media = normalizeMediaAttachments(ctx);
    const cache = createMediaAttachmentCache(media);
    const cfg = {
      tools: {
        media: {
          image: { enabled: false, stripFromPrompt: true },
        },
      },
    } as OpenClawConfig;

    try {
      const result = await runCapability({
        capability: "image",
        cfg,
        ctx,
        attachments: cache,
        media,
        providerRegistry: buildProviderRegistry(),
      });

      expect(result.decision.outcome).toBe("disabled");
      expect(ctx.MediaPath).toBeUndefined();
      // Body was undefined, should remain unchanged (no crash)
      expect(ctx.Body).toBeUndefined();
    } finally {
      await cache.cleanup();
    }
  });
});
