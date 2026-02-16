export function getFriendlyError(error, fallback = "Something went wrong. Please try again.") {
  const status = error?.response?.status;
  const rawMessage = String(error?.response?.data?.message || error?.message || "").trim();
  const lower = rawMessage.toLowerCase();

  if (!status) {
    return "Network issue. Please check your internet connection and try again.";
  }

  if (status === 404) {
    return "Requested service or account was not found.";
  }

  if (status === 401) {
    return "Incorrect credentials. Please check your email and password.";
  }

  if (status === 403) {
    return "Access denied for this account.";
  }

  if (status >= 500) {
    return "Server error. Please try again in a moment.";
  }

  if (lower.includes("invalid") && lower.includes("password")) {
    return "Password is incorrect.";
  }
  if (lower.includes("invalid") && lower.includes("otp")) {
    return "Invalid OTP. Please enter the correct OTP.";
  }
  if (lower.includes("otp") && lower.includes("expired")) {
    return "OTP expired. Please request a new OTP.";
  }
  if (lower.includes("aadhaar")) {
    return "Please enter a valid Aadhaar number.";
  }
  if (lower.includes("pan")) {
    return "Please enter a valid PAN number.";
  }
  if (rawMessage) return rawMessage;
  return fallback;
}
