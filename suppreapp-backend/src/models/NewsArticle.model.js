import mongoose from "mongoose";

const NewsArticleSchema = new mongoose.Schema(
  {
    sourceSite: { type: String, default: "baochinhphu.vn", index: true },
    sourceCategory: { type: String, default: "chinh-tri", index: true },
    sourcePageUrl: { type: String, required: true },
    sourceUrl: { type: String, required: true, unique: true },
    imageUrl: { type: String, default: "" },
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: "", trim: true },
    publishedLabel: { type: String, default: "", trim: true },
    publishedAt: { type: Date, default: null, index: true },
    scrapedRank: { type: Number, default: 0 },
    lastSyncedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

NewsArticleSchema.index({ lastSyncedAt: -1, publishedAt: -1, createdAt: -1 });

export default mongoose.model("NewsArticle", NewsArticleSchema);
