import { Router } from "express";
import Case from "../models/Case.model.js";
import { computePriceAndAgent } from "../services/pricing.service.js";
import { computeDueDate } from "../services/dueDate.service.js";

const router = Router();

function toDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// GET /api/cases?serviceType=ADN&q=...&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/", async (req, res, next) => {
  try {
    const { serviceType, q = "", from = "", to = "" } = req.query;

    const filter = {};
    if (serviceType) filter.serviceType = serviceType;

    // date range filter (theo field date)
    const fromD = toDateOrNull(from);
    const toD = toDateOrNull(to);
    if (fromD || toD) {
      filter.date = {};
      if (fromD) filter.date.$gte = fromD;
      if (toD) {
        // to inclusive: set to end of day
        const end = new Date(toD);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    // search basic fields
    if (q) {
      const s = String(q);
      filter.$or = [
        { caseCode: { $regex: s, $options: "i" } },
        { patientName: { $regex: s, $options: "i" } },
        { serviceCode: { $regex: s, $options: "i" } },
        { serviceName: { $regex: s, $options: "i" } },
      ];
    }

    const items = await Case.find(filter).sort({ date: -1, createdAt: -1 }).limit(500).lean();
    res.json({ items, total: items.length });
  } catch (e) {
    next(e);
  }
});

// POST /api/cases
router.post("/", async (req, res, next) => {
  try {
    const payload = req.body || {};

    // normalize dates
    payload.date = payload.date ? new Date(payload.date) : new Date();
    payload.sentAt = payload.sentAt ? new Date(payload.sentAt) : null;
    payload.receivedAt = payload.receivedAt ? new Date(payload.receivedAt) : null;

    // recompute caches: price/agent/serviceCode/serviceName
    const info = await computePriceAndAgent({
      serviceId: payload.serviceId,
      doctorId: payload.doctorId,
    });
    payload.price = info.price;
    payload.agentLevel = info.agentLevel;
    payload.agentTierLabel = info.agentTierLabel;
    payload.serviceCode = info.serviceCode || payload.serviceCode || "";
    payload.serviceName = info.serviceName || payload.serviceName || "";

    // dueDate
    payload.dueDate = await computeDueDate({
      serviceId: payload.serviceId,
      receivedAt: payload.receivedAt,
    });

    const created = await Case.create(payload);
    res.json(created);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/cases/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const patch = req.body || {};

    // normalize date types (only if present)
    if ("date" in patch) patch.date = patch.date ? new Date(patch.date) : new Date();
    if ("sentAt" in patch) patch.sentAt = patch.sentAt ? new Date(patch.sentAt) : null;
    if ("receivedAt" in patch) patch.receivedAt = patch.receivedAt ? new Date(patch.receivedAt) : null;

    // Get current doc to know if recompute needed
    const current = await Case.findById(id).lean();
    if (!current) return res.status(404).json({ message: "Not found" });

    const nextDoc = { ...current, ...patch };

    // recompute when doctorId or serviceId changes
    const changedServiceOrDoctor =
      ("serviceId" in patch) || ("doctorId" in patch);

    if (changedServiceOrDoctor) {
      const info = await computePriceAndAgent({
        serviceId: nextDoc.serviceId,
        doctorId: nextDoc.doctorId,
      });
      patch.price = info.price;
      patch.agentLevel = info.agentLevel;
      patch.agentTierLabel = info.agentTierLabel;
      patch.serviceCode = info.serviceCode || nextDoc.serviceCode || "";
      patch.serviceName = info.serviceName || nextDoc.serviceName || "";
    }

    // recompute dueDate when receivedAt or serviceId changes
    const changedDue =
      ("receivedAt" in patch) || ("serviceId" in patch);

    if (changedDue) {
      patch.dueDate = await computeDueDate({
        serviceId: nextDoc.serviceId,
        receivedAt: nextDoc.receivedAt,
      });
    }

    const updated = await Case.findByIdAndUpdate(id, patch, { new: true }).lean();
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/cases/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    await Case.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
