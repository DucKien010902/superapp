import axios from "axios";
import NewsArticle from "../models/NewsArticle.model.js";

const NEWS_SOURCE_URL = "https://baochinhphu.vn/chinh-tri.htm";
const NEWS_SYNC_INTERVAL_MS = 8 * 60 * 60 * 1000;
const NEWS_FETCH_LIMIT = 3;

let syncTimer = null;

function stripTags(value = "") {
  return value.replace(/<[^>]+>/g, " ");
}

function decodeHtmlEntities(value = "") {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(Number.parseInt(dec, 10))
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizeWhitespace(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function cleanText(value = "") {
  return normalizeWhitespace(decodeHtmlEntities(stripTags(value)));
}

function toAbsoluteUrl(value = "", baseUrl = NEWS_SOURCE_URL) {
  if (!value) return "";
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function parseVietnamDateTime(value = "") {
  const match = String(value).match(
    /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/
  );
  if (!match) return null;

  const [, day, month, year, hour = "0", minute = "0"] = match;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:00+07:00`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseTopArticlesFromHtml(html) {
  const articlePattern =
    /<div[^>]+class="[^"]*\bbox-category-item\b[^"]*"[\s\S]*?<a[^>]+class="box-category-link-with-avatar"[^>]+href="([^"]+)"[^>]*>[\s\S]*?<img[^>]+(?:src|data-src)="([^"]+)"[^>]*>[\s\S]*?<a[^>]+class="box-category-link-title"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<span[^>]+class="box-category-time time-ago"[^>]*?(?:title="([^"]*)")?[^>]*>([\s\S]*?)<\/span>[\s\S]*?<p[^>]+class="box-category-sapo"[^>]*>([\s\S]*?)<\/p>/g;

  const items = [];

  for (const match of html.matchAll(articlePattern)) {
    const [, avatarHref, imageSrc, titleHref, rawTitle, rawTimeTitle, rawTimeText, rawSummary] = match;
    const title = cleanText(rawTitle);
    if (!title) continue;

    items.push({
      sourcePageUrl: NEWS_SOURCE_URL,
      sourceSite: "baochinhphu.vn",
      sourceCategory: "chinh-tri",
      sourceUrl: toAbsoluteUrl(titleHref || avatarHref),
      imageUrl: toAbsoluteUrl(imageSrc),
      title,
      summary: cleanText(rawSummary),
      publishedLabel: cleanText(rawTimeTitle || rawTimeText),
      publishedAt: parseVietnamDateTime(rawTimeTitle),
    });

    if (items.length >= NEWS_FETCH_LIMIT) break;
  }

  return items.map((item, index) => ({
    ...item,
    scrapedRank: index,
  }));
}

async function fetchTopNewsArticles() {
  const response = await axios.get(NEWS_SOURCE_URL, {
    responseType: "text",
    timeout: 15000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    },
  });

  const items = parseTopArticlesFromHtml(String(response.data || ""));
  if (items.length === 0) {
    throw new Error("No news articles matched the expected HTML structure");
  }

  return items;
}

export async function syncLatestNewsArticles() {
  const items = await fetchTopNewsArticles();
  const syncedAt = new Date();

  await Promise.all(
    items.map((item) =>
      NewsArticle.findOneAndUpdate(
        { sourceUrl: item.sourceUrl },
        {
          $set: {
            ...item,
            lastSyncedAt: syncedAt,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      )
    )
  );

  return {
    syncedAt,
    count: items.length,
    items,
  };
}

function scheduleNextSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    runNewsSyncCycle("interval").catch((error) => {
      console.error("[news-sync] unhandled interval error:", error);
    });
  }, NEWS_SYNC_INTERVAL_MS);
}

async function runNewsSyncCycle(reason) {
  try {
    const result = await syncLatestNewsArticles();
    console.log(
      `[news-sync] ${reason} success: ${result.count} article(s) synced at ${result.syncedAt.toISOString()}`
    );
  } catch (error) {
    console.error(`[news-sync] ${reason} failed:`, error?.message || error);
  } finally {
    scheduleNextSync();
  }
}

export async function startNewsSyncScheduler() {
  await runNewsSyncCycle("startup");
}

export function stopNewsSyncScheduler() {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
}
