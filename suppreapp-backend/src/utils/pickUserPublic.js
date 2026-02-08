export function pickUserPublic(u) {
  if (!u) return null;
  return {
    id: String(u._id),
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    profile: u.profile,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}
