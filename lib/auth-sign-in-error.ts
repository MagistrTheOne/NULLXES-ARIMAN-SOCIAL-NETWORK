type AuthErr = {
  status?: number;
  message?: string;
} | null;

/** Maps Better Auth / fetch errors to fixed copy for the login page only. */
export function signInErrorMessage(err: AuthErr): "Invalid credentials" | "Request failed" {
  if (!err) return "Request failed";
  const status = err.status;
  const msg = (err.message ?? "").toLowerCase();
  if (
    status === 401 ||
    status === 403 ||
    msg.includes("invalid") ||
    msg.includes("credential") ||
    msg.includes("password") ||
    msg.includes("unauthorized") ||
    msg.includes("incorrect")
  ) {
    return "Invalid credentials";
  }
  return "Request failed";
}
