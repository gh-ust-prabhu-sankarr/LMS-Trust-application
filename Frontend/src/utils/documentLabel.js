const toTitleCase = (value = "") =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const getDocumentLabelFromFileName = (fileName, fallback = "Document") => {
  const raw = String(fileName || "").trim();
  if (!raw) return fallback;

  const withoutExt = raw.replace(/\.[^/.]+$/, "");
  const normalized = withoutExt.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

  if (/\bpan\b/.test(normalized)) return "PAN Card";
  if (/\baadhaar\b|\baadhar\b/.test(normalized)) return "Aadhaar Card";
  if (/\bgst\b/.test(normalized)) return "GST Certificate";
  if (/\bbank\b.*\bstatement\b/.test(normalized)) return "Bank Statement";
  if (/\b(salary|pay)\b.*\b(slip|stub)\b|\bpayslip\b/.test(normalized)) return "Salary Slip";
  if (/\bitr\b|income tax return/.test(normalized)) return "ITR Document";
  if (/\bagreement\b/.test(normalized)) return "Loan Agreement";

  const readable = toTitleCase(normalized.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim());
  return readable || fallback;
};
