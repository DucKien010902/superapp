function isMutation(method) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

export function browserGate(allowedOrigins = []) {
  return (req, res, next) => {
    // chỉ chặn các request "thay đổi dữ liệu"
    if (!isMutation(req.method)) return next();

    const origin = req.headers.origin || "";
    const referer = req.headers.referer || "";
    const ua = req.headers["user-agent"] || "";

    // Browser thường có Origin khi gọi fetch từ trang web
    // Postman/curl thường không có Origin (hoặc tự set được, nhưng ít khi)
    if (!origin) {
      return res.status(403).json({
        message: "Blocked: missing Origin (non-browser request)",
      });
    }

    // Origin phải nằm trong whitelist
    if (allowedOrigins.length && !allowedOrigins.includes(origin)) {
      return res.status(403).json({
        message: `Blocked: Origin not allowed: ${origin}`,
      });
    }

    // Referer (không bắt buộc tuyệt đối nhưng thêm lớp)
    // Nếu bạn muốn chặt hơn: bắt buộc referer phải bắt đầu bằng origin
    if (referer && !referer.startsWith(origin)) {
      return res.status(403).json({
        message: "Blocked: invalid Referer",
      });
    }

    // UA check nhẹ (không phải bảo mật tuyệt đối)
    if (!ua) {
      return res.status(403).json({ message: "Blocked: missing User-Agent" });
    }

    next();
  };
}
