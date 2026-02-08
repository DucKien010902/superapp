import { Router } from "express";
import Doctor from "../models/Doctor.model.js";
import { requireRole } from "../middlewares/auth.middleware.js";

const router = Router();

// GET /api/doctors?search=&all=1
router.get("/", async (req, res, next) => {
  try {
    const { search = "", all = "" } = req.query;

    const q = {};
    if (all !== "1") q.isActive = true;

    if (search) {
      q.$or = [
        { fullName: { $regex: String(search), $options: "i" } },
        { phone: { $regex: String(search), $options: "i" } },
      ];
    }

    const items = await Doctor.find(q).sort({ createdAt: -1 }).limit(500).lean();
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// GET /api/doctors/:id
router.get("/:id", async (req, res, next) => {
  try {
    const doc = await Doctor.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

// POST /api/doctors  (admin)
router.post("/", requireRole("admin"), async (req, res, next) => {
  try {
    const created = await Doctor.create(req.body);
    res.json(created);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/doctors/:id  (admin)
router.patch("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const updated = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).lean();
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/doctors/:id  (admin)
router.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    await Doctor.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
