const onlyDigits = (value) => String(value || "").replace(/\D/g, ""); //usedforaadhar

export const maskPanNumber = (value) => {
  const pan = String(value || "").toUpperCase().trim();
  if (!pan) return "-";
  if (pan.length <= 4) return `${"*".repeat(Math.max(0, pan.length - 1))}${pan.slice(-1)}`;
  return `${pan.slice(0, 3)}******${pan.slice(-1)}`;
};

export const maskAadhaarNumber = (value) => {
  const digits = onlyDigits(value);
  if (!digits) return "-";
  const last4 = digits.slice(-4);
  return `XXXX XXXX ${last4}`;
};
