const IS_PROD = process.env.NODE_ENV === "production";

export const COOKIE_OPTIONS = {
  httpOnly: true,           // JS cannot read this cookie - XSS protection
  secure: IS_PROD,          // HTTPS only in production
  sameSite: IS_PROD ? "strict" : "lax", // CSRF protection; lax allows cross-origin GET in dev
  maxAge: 7 * 24 * 60 * 60 * 1000,     // 7 days in ms (matches JWT expiry)
  path: "/",
};

export const setAuthCookie = (res, token) => {
  res.cookie("token", token, COOKIE_OPTIONS);
};

export const clearAuthCookie = (res) => {
  res.clearCookie("token", { ...COOKIE_OPTIONS, maxAge: 0 });
};
