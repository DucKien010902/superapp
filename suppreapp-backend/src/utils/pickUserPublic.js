export function pickUserPublic(u) {
  if (!u) return null;
  const mapImage = (item) => ({
    id: String(item?._id || item?.id || ""),
    url: item?.url || "",
    caption: item?.caption || "",
    createdAt: item?.createdAt || null,
  });
  const mapFile = (item) => ({
    id: String(item?._id || item?.id || ""),
    name: item?.name || "",
    url: item?.url || "",
    mimeType: item?.mimeType || "",
    size: Number(item?.size || 0),
    createdAt: item?.createdAt || null,
  });
  return {
    id: String(u._id),
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    profile: u.profile,
    images: (u.images || []).map(mapImage),
    files: (u.files || []).map(mapFile),
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}
