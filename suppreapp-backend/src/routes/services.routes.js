import { Router } from "express";
import Service from "../models/Service.model.js";
import { requireRole } from "../middlewares/auth.middleware.js";

const router = Router();

// GET /api/services?serviceType=ADN&all=1
router.get("/", async (req, res, next) => {
  try {
    const { serviceType, all = "" } = req.query;

    const q = {};
    if (serviceType) q.serviceType = serviceType;
    if (all !== "1") q.isActive = true;

    const items = await Service.find(q).sort({ createdAt: -1 }).limit(500).lean();
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// GET /api/services/:id
router.get("/:id", async (req, res, next) => {
  try {
    const doc = await Service.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

// POST /api/services (admin)
router.post("/", requireRole("admin"), async (req, res, next) => {
  try {
    const created = await Service.create(req.body);
    res.json(created);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/services/:id (admin)
router.patch("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const updated = await Service.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).lean();
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/services/:id (admin)
router.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    await Service.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
