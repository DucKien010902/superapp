import Service from "../models/Service.model.js";

export async function computeDueDate({ serviceId, receivedAt }) {
  if (!serviceId || !receivedAt) return null;

  const svc = await Service.findById(serviceId).lean();
  if (!svc) return null;

  const hours = svc.turnaroundHours ?? 48;
  const d = new Date(receivedAt);
  d.setHours(d.getHours() + hours);
  return d;
}
