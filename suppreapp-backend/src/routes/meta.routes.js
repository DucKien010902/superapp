import { Router } from "express";
import Option from "../models/Option.model.js";
import { requireRole } from "../middlewares/auth.middleware.js";

const router = Router();

// GET /api/meta/options  -> map dùng cho form (chỉ active)
router.get("/options", async (req, res, next) => {
  try {
    const docs = await Option.find({}).lean();
    const map = {};
    for (const d of docs) {
      map[d.key] = (d.items || [])
        .filter((x) => x.isActive !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((x) => ({ label: x.label, value: x.value }));
    }
    res.json(map);
  } catch (e) {
    next(e);
  }
});

// --------- ADMIN CRUD ---------

// GET /api/meta/options-admin  -> full docs (kể cả inactive)
router.get("/options-admin", requireRole("admin"), async (req, res, next) => {
  try {
    const items = await Option.find({}).sort({ key: 1 }).lean();
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// GET /api/meta/options-admin/:key
router.get("/options-admin/:key", requireRole("admin"), async (req, res, next) => {
  try {
    const doc = await Option.findOne({ key: req.params.key }).lean();
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

// PUT /api/meta/options-admin/:key  (upsert whole doc)
router.put("/options-admin/:key", requireRole("admin"), async (req, res, next) => {
  try {
    const { key } = req.params;
    const { items = [] } = req.body || {};

    const doc = await Option.findOneAndUpdate(
      { key },
      { key, items },
      { new: true, upsert: true }
    ).lean();

    res.json(doc);
  } catch (e) {
    next(e);
  }
});

// POST /api/meta/options-admin/:key/items  (add item)
router.post("/options-admin/:key/items", requireRole("admin"), async (req, res, next) => {
  try {
    const { key } = req.params;
    const { label, value, order = 0, isActive = true } = req.body || {};
    if (!label || !value) return res.status(400).json({ message: "label/value required" });

    const doc = await Option.findOneAndUpdate(
      { key },
      {
        $setOnInsert: { key },
        $push: { items: { label, value, order, isActive } },
      },
      { new: true, upsert: true }
    ).lean();

    res.json(doc);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/meta/options-admin/:key/items/:value  (update item by value)
router.patch("/options-admin/:key/items/:value", requireRole("admin"), async (req, res, next) => {
  try {
    const { key, value } = req.params;
    const patch = req.body || {};

    const doc = await Option.findOne({ key });
    if (!doc) return res.status(404).json({ message: "Not found" });

    const idx = (doc.items || []).findIndex((x) => x.value === value);
    if (idx < 0) return res.status(404).json({ message: "Item not found" });

    // update allowed fields
    if ("label" in patch) doc.items[idx].label = patch.label;
    if ("order" in patch) doc.items[idx].order = patch.order;
    if ("isActive" in patch) doc.items[idx].isActive = patch.isActive;

    // đổi value là nguy hiểm (break link). Nếu muốn, mở lại sau.
    await doc.save();
    res.json(doc.toObject());
  } catch (e) {
    next(e);
  }
});

// DELETE /api/meta/options-admin/:key/items/:value
router.delete("/options-admin/:key/items/:value", requireRole("admin"), async (req, res, next) => {
  try {
    const { key, value } = req.params;

    const doc = await Option.findOneAndUpdate(
      { key },
      { $pull: { items: { value } } },
      { new: true }
    ).lean();

    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/meta/options-admin/:key  (xóa cả key)
router.delete("/options-admin/:key", requireRole("admin"), async (req, res, next) => {
  try {
    await Option.deleteOne({ key: req.params.key });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
