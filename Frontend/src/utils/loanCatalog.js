const META_STORAGE_KEY = "loan_page_meta_v1";

const DEFAULT_DOCUMENTS = [
  "Identity Proof",
  "Address Proof",
  "Bank Statement",
  "Income Proof",
];

const DEFAULT_STEPS = ["Calculate", "Apply", "Verify", "Disburse"];

const DEFAULT_APPLICATION_FIELDS = [
  { key: "full_name", label: "Full Name", type: "text", required: true },
  { key: "phone", label: "Mobile Number", type: "tel", required: true },
  { key: "email", label: "Email Address", type: "email", required: true },
];

export const DEFAULT_LOANS = [
  {
    id: "default-business",
    slug: "business",
    key: "business",
    name: "Business Loan",
    description: "Scale your enterprise with flexible funding.",
    minAmount: 100000,
    maxAmount: 10000000,
    minTenure: 12,
    maxTenure: 84,
    interestRate: 12.5,
    minCreditScore: 700,
    active: true,
    badgeText: "Enterprise Finance",
    heroTitle: "Scale your Enterprise.",
    heroSubtitle: "Structured funding for working capital and growth plans.",
    ctaText: "Apply for Business Loan",
    imageUrl:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1000",
    documents: [
      "GST Returns",
      "ITR & Audit Reports",
      "Bank Statement",
      "Promoter KYC",
    ],
    requiredDocuments: ["GST Returns", "ITR", "Bank Statement", "Promoter KYC"],
    applicationFields: [
      { key: "business_name", label: "Business Name", type: "text", required: true },
      { key: "gst_number", label: "GST Number", type: "text", required: true },
      { key: "annual_turnover", label: "Annual Turnover", type: "number", required: true },
      { key: "business_vintage_years", label: "Business Vintage (Years)", type: "number", required: true },
    ],
    processSteps: ["Assess", "Apply", "Review", "Disburse"],
    colorTheme: "blue",
  },
  {
    id: "default-education",
    slug: "education",
    key: "education",
    name: "Education Loan",
    description: "Finance tuition and related expenses with student-friendly repayment.",
    minAmount: 50000,
    maxAmount: 7500000,
    minTenure: 12,
    maxTenure: 240,
    interestRate: 9.5,
    minCreditScore: 650,
    active: true,
    badgeText: "Academic Finance",
    heroTitle: "Invest in your Academic Future.",
    heroSubtitle: "Funding support for domestic and international education.",
    ctaText: "Apply for Education Loan",
    imageUrl:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=1000",
    documents: [
      "Admission Letter",
      "Fee Structure",
      "Academic Records",
      "Co-applicant KYC",
    ],
    requiredDocuments: ["Admission Letter", "Fee Structure", "Academic Records", "Co-applicant KYC"],
    applicationFields: [
      { key: "institute_name", label: "Institute Name", type: "text", required: true },
      { key: "course_name", label: "Course Name", type: "text", required: true },
      { key: "annual_course_fee", label: "Annual Course Fee", type: "number", required: true },
      { key: "co_applicant_name", label: "Co-applicant Name", type: "text", required: false },
    ],
    processSteps: ["Estimate", "Apply", "Verify", "Sanction"],
    colorTheme: "purple",
  },
  {
    id: "default-personal",
    slug: "personal",
    key: "personal",
    name: "Personal Loan",
    description: "Quick unsecured funds for personal goals and urgent needs.",
    minAmount: 50000,
    maxAmount: 3000000,
    minTenure: 12,
    maxTenure: 84,
    interestRate: 11.5,
    minCreditScore: 680,
    active: true,
    badgeText: "Personal Finance",
    heroTitle: "Unlock Your Next Milestone.",
    heroSubtitle: "Fast approval and flexible repayment for your life goals.",
    ctaText: "Apply for Personal Loan",
    imageUrl:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1000",
    documents: [
      "PAN Card",
      "Address Proof",
      "Salary Slips",
      "Bank Statement",
    ],
    requiredDocuments: ["PAN Card", "Address Proof", "Salary Slips", "Bank Statement"],
    applicationFields: [
      { key: "employer_name", label: "Employer Name", type: "text", required: true },
      { key: "employment_type", label: "Employment Type", type: "text", required: true },
      { key: "work_experience_years", label: "Work Experience (Years)", type: "number", required: true },
    ],
    processSteps: ["Check", "Apply", "KYC", "Payout"],
    colorTheme: "emerald",
  },
  {
    id: "default-vehicle",
    slug: "vehicle",
    key: "vehicle",
    name: "Vehicle Loan",
    description: "Drive your dream car or bike with affordable EMIs.",
    minAmount: 50000,
    maxAmount: 7500000,
    minTenure: 12,
    maxTenure: 84,
    interestRate: 9.0,
    minCreditScore: 670,
    active: true,
    badgeText: "Auto Finance",
    heroTitle: "Drive Home your Dream Vehicle.",
    heroSubtitle: "Flexible tenure and competitive rates for every segment.",
    ctaText: "Apply for Vehicle Loan",
    imageUrl:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=1000",
    documents: [
      "Identity Proof",
      "Address Proof",
      "Proforma Invoice",
      "Income Proof",
    ],
    requiredDocuments: ["Identity Proof", "Address Proof", "Proforma Invoice", "Income Proof"],
    applicationFields: [
      { key: "vehicle_type", label: "Vehicle Type", type: "text", required: true },
      { key: "on_road_price", label: "On-road Price", type: "number", required: true },
      { key: "dealer_name", label: "Dealer Name", type: "text", required: false },
    ],
    processSteps: ["Estimate", "Submit", "Verify", "Delivery"],
    colorTheme: "orange",
  },
];

export const slugifyLoanName = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "loan";

const inferKeyFromName = (name = "") => {
  const normalized = String(name).toLowerCase();
  if (normalized.includes("business") || normalized.includes("msme") || normalized.includes("working")) return "business";
  if (normalized.includes("education") || normalized.includes("student") || normalized.includes("study")) return "education";
  if (normalized.includes("personal")) return "personal";
  if (normalized.includes("vehicle") || normalized.includes("auto") || normalized.includes("car") || normalized.includes("bike"))
    return "vehicle";
  return null;
};

const parseList = (value, fallback = []) => {
  if (Array.isArray(value)) return value.filter(Boolean).map((v) => String(v).trim()).filter(Boolean);
  if (typeof value !== "string") return fallback;
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
};

export const parseCommaSeparated = (value) => parseList(value, []);

const sanitizeFieldType = (value = "") => {
  const normalized = String(value).trim().toLowerCase();
  const allowed = new Set(["text", "number", "date", "email", "tel", "textarea"]);
  return allowed.has(normalized) ? normalized : "text";
};

const normalizeFieldLabel = (value = "") => String(value || "").trim();

export const parseApplicationFields = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((field, index) => ({
        key: field?.key || slugifyLoanName(field?.label || `field-${index + 1}`).replace(/-/g, "_"),
        label: normalizeFieldLabel(field?.label || ""),
        type: sanitizeFieldType(field?.type),
        required: field?.required !== false,
      }))
      .filter((field) => field.label);
  }

  if (typeof value !== "string" || !value.trim()) return [];

  // Format: Label:type:required|optional, Another Label:number:required
  return value
    .split(",")
    .map((item, index) => {
      const parts = item
        .split(":")
        .map((part) => part.trim())
        .filter(Boolean);
      const label = normalizeFieldLabel(parts[0] || "");
      const type = sanitizeFieldType(parts[1] || "text");
      const requiredToken = String(parts[2] || "required").toLowerCase();
      const required = requiredToken !== "optional";
      return {
        key: slugifyLoanName(label || `field-${index + 1}`).replace(/-/g, "_"),
        label,
        type,
        required,
      };
    })
    .filter((field) => field.label);
};

const safeNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeLoan = (baseLoan, product = {}, meta = {}) => {
  const name = product.name || baseLoan.name;
  return {
    ...baseLoan,
    ...product,
    ...meta,
    id: product.id || baseLoan.id,
    name,
    slug: meta.slug || product.slug || baseLoan.slug || slugifyLoanName(name),
    key: baseLoan.key || inferKeyFromName(name),
    description: product.description || baseLoan.description,
    minAmount: safeNumber(product.minAmount, baseLoan.minAmount),
    maxAmount: safeNumber(product.maxAmount, baseLoan.maxAmount),
    minTenure: safeNumber(product.minTenure, baseLoan.minTenure),
    maxTenure: safeNumber(product.maxTenure, baseLoan.maxTenure),
    interestRate: safeNumber(product.interestRate, baseLoan.interestRate),
    minCreditScore: safeNumber(product.minCreditScore, baseLoan.minCreditScore),
    active: product.active !== false,
    heroTitle: meta.heroTitle || baseLoan.heroTitle || `${name}.`,
    heroSubtitle: meta.heroSubtitle || baseLoan.heroSubtitle || (product.description || baseLoan.description),
    badgeText: meta.badgeText || baseLoan.badgeText || "Loan Product",
    ctaText: meta.ctaText || baseLoan.ctaText || `Apply for ${name}`,
    imageUrl: meta.imageUrl || baseLoan.imageUrl,
    documents: parseList(meta.documents, baseLoan.documents || DEFAULT_DOCUMENTS),
    requiredDocuments: parseList(meta.requiredDocuments, meta.documents || baseLoan.requiredDocuments || baseLoan.documents || DEFAULT_DOCUMENTS),
    applicationFields: parseApplicationFields(meta.applicationFields).length
      ? parseApplicationFields(meta.applicationFields)
      : baseLoan.applicationFields || DEFAULT_APPLICATION_FIELDS,
    processSteps: parseList(meta.processSteps, baseLoan.processSteps || DEFAULT_STEPS),
    colorTheme: meta.colorTheme || baseLoan.colorTheme || "slate",
  };
};

export const loadLoanPageMeta = () => {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const saveLoanPageMeta = (value) => {
  localStorage.setItem(META_STORAGE_KEY, JSON.stringify(value || {}));
};

export const upsertLoanPageMeta = (productId, metaPatch) => {
  if (!productId) return;
  const current = loadLoanPageMeta();
  current[productId] = { ...(current[productId] || {}), ...metaPatch };
  saveLoanPageMeta(current);
};

export const mergeLoansWithDefaults = (products = []) => {
  const metaById = loadLoanPageMeta();
  const normalizedProducts = (Array.isArray(products) ? products : [])
    .filter(Boolean)
    .map((p) => ({ ...p, key: inferKeyFromName(p.name) }));

  const usedProductIds = new Set();
  const merged = DEFAULT_LOANS.map((defaultLoan) => {
    const matched = normalizedProducts.find((p) => p.key === defaultLoan.key && !usedProductIds.has(p.id));
    if (matched?.id) usedProductIds.add(matched.id);
    const meta = matched?.id ? metaById[matched.id] : null;
    return normalizeLoan(defaultLoan, matched || {}, meta || {});
  });

  const usedSlugs = new Set(merged.map((loan) => loan.slug));
  const extras = normalizedProducts
    .filter((p) => p.active !== false && !usedProductIds.has(p.id))
    .map((p) => {
      const meta = metaById[p.id] || {};
      const baseSlug = meta.slug || slugifyLoanName(p.name);
      let slug = baseSlug;
      let i = 2;
      while (usedSlugs.has(slug)) {
        slug = `${baseSlug}-${i}`;
        i += 1;
      }
      usedSlugs.add(slug);
      return normalizeLoan(
        {
          id: p.id,
          slug,
          name: p.name,
          description: p.description || "Flexible loan product for your goals.",
          minAmount: p.minAmount,
          maxAmount: p.maxAmount,
          minTenure: p.minTenure,
          maxTenure: p.maxTenure,
          interestRate: p.interestRate,
          minCreditScore: p.minCreditScore,
          active: p.active !== false,
          badgeText: "Custom Product",
          heroTitle: `${p.name}`,
          heroSubtitle: p.description || "Personalized financial support built for your need.",
          ctaText: `Apply for ${p.name}`,
          imageUrl:
            "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=1000",
          documents: DEFAULT_DOCUMENTS,
          requiredDocuments: DEFAULT_DOCUMENTS,
          applicationFields: DEFAULT_APPLICATION_FIELDS,
          processSteps: DEFAULT_STEPS,
          colorTheme: "slate",
        },
        { ...p, slug },
        meta
      );
    });

  return [...merged, ...extras].filter((loan) => loan.active !== false);
};
