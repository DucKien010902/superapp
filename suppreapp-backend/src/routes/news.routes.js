import { Router } from "express";
import NewsArticle from "../models/NewsArticle.model.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const requestedLimit = Number.parseInt(String(req.query.limit || "10"), 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 20)
      : 10;

    const items = await NewsArticle.find({})
      .sort({ lastSyncedAt: -1, publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      items: items.map((item) => ({
        id: String(item._id),
        sourceUrl: item.sourceUrl,
        imageUrl: item.imageUrl || "",
        title: item.title || "",
        summary: item.summary || "",
        publishedLabel: item.publishedLabel || "",
        publishedAt: item.publishedAt || null,
        lastSyncedAt: item.lastSyncedAt || null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
