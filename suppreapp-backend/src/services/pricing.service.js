import Service from "../models/Service.model.js";
import Doctor from "../models/Doctor.model.js";

export async function computePriceAndAgent({ serviceId, doctorId }) {
  if (!serviceId || !doctorId) {
    return { price: 0, agentLevel: "", agentTierLabel: "", serviceCode: "", serviceName: "" };
  }

  const [svc, doc] = await Promise.all([
    Service.findById(serviceId).lean(),
    Doctor.findById(doctorId).lean(),
  ]);
  if (!svc || !doc) {
    return { price: 0, agentLevel: "", agentTierLabel: "", serviceCode: "", serviceName: "" };
  }

  const level = doc.agentLevel || "cap3";
  const found = (svc.pricesByLevel || []).find((p) => p.level === level);

  return {
    price: found?.price ?? 0,
    agentLevel: level,
    agentTierLabel: doc.agentTierLabel || level,
    serviceCode: svc.serviceCode || "",
    serviceName: svc.name || "",
  };
}
