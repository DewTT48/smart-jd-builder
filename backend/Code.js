const LEAD_SHEET_NAME = "Leads";
const LEAD_HEADERS = [
  "lead_id",
  "submitted_at",
  "inquiry_type",
  "name",
  "company",
  "email",
  "phone",
  "role",
  "organization_size",
  "message",
  "consent",
  "source",
  "page_url",
  "user_agent",
  "status",
  "owner_notes",
  "contacted_at"
];

const INQUIRY_LABELS = Object.freeze({
  trial: "ขอทดลองใช้ / ขอเปิดบัญชี",
  pricing: "สอบถามราคาและเครดิต",
  corporate: "สอบถามสำหรับองค์กร",
  support: "แจ้งปัญหาการใช้งาน",
  partnership: "ความร่วมมือ / อื่น ๆ"
});

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: "JD Builder Lead API" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(event) {
  const requestId = safeText_(event && event.parameter && event.parameter.request_id, 80);

  try {
    const data = normalizeLead_(event && event.parameter ? event.parameter : {});

    if (data.companyWebsite) {
      return responsePage_({ type: "JD_LEAD_RESULT", requestId, success: true });
    }

    validateLead_(data);
    enforceRateLimit_(data.email);

    const leadId = createLeadId_();
    const submittedAt = new Date();
    appendLead_(leadId, submittedAt, data);

    try {
      notifyAdmin_(leadId, submittedAt, data);
    } catch (notificationError) {
      console.error("Lead saved, but admin notification failed: " +
        (notificationError && notificationError.stack ? notificationError.stack : notificationError));
    }

    return responsePage_({
      type: "JD_LEAD_RESULT",
      requestId,
      success: true,
      leadId
    });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return responsePage_({
      type: "JD_LEAD_RESULT",
      requestId,
      success: false,
      message: publicErrorMessage_(error)
    });
  }
}

function authorizeLeadService() {
  const config = getPrivateConfig_();
  const spreadsheet = SpreadsheetApp.openById(config.sheetId);
  const sheet = spreadsheet.getSheetByName(LEAD_SHEET_NAME);
  if (!sheet) throw new Error("SHEET_NOT_FOUND");

  return {
    spreadsheetName: spreadsheet.getName(),
    sheetName: sheet.getName(),
    remainingEmailQuota: MailApp.getRemainingDailyQuota()
  };
}

function normalizeLead_(params) {
  return {
    inquiryType: safeText_(params.inquiry_type, 60),
    name: safeText_(params.name, 120),
    company: safeText_(params.company, 180),
    email: safeText_(params.email, 180).toLowerCase(),
    phone: safeText_(params.phone, 60),
    role: safeText_(params.role, 120),
    organizationSize: safeText_(params.organization_size, 40),
    message: safeText_(params.message, 3000),
    consent: safeText_(params.consent, 30),
    source: safeText_(params.source, 80),
    pageUrl: safeText_(params.page_url, 500),
    userAgent: safeText_(params.user_agent, 500),
    companyWebsite: safeText_(params.company_website, 200)
  };
}

function validateLead_(data) {
  if (!INQUIRY_LABELS[data.inquiryType]) throw new Error("INVALID_INQUIRY");
  if (!data.name || !data.company || !data.email || !data.message) throw new Error("MISSING_REQUIRED");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error("INVALID_EMAIL");
  if (data.consent !== "accepted") throw new Error("CONSENT_REQUIRED");
}

function enforceRateLimit_(email) {
  const cache = CacheService.getScriptCache();
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email);
  const key = "lead-rate-" + Utilities.base64EncodeWebSafe(digest).slice(0, 32);
  const count = Number(cache.get(key) || 0);
  if (count >= 3) throw new Error("RATE_LIMITED");
  cache.put(key, String(count + 1), 600);
}

function appendLead_(leadId, submittedAt, data) {
  const config = getPrivateConfig_();
  const spreadsheet = SpreadsheetApp.openById(config.sheetId);
  const sheet = spreadsheet.getSheetByName(LEAD_SHEET_NAME);
  if (!sheet) throw new Error("SHEET_NOT_FOUND");

  const currentHeaders = sheet.getRange(1, 1, 1, LEAD_HEADERS.length).getDisplayValues()[0];
  if (currentHeaders.join("|") !== LEAD_HEADERS.join("|")) throw new Error("SCHEMA_MISMATCH");

  const row = [[
    leadId,
    submittedAt,
    neutralizeForSheet_(INQUIRY_LABELS[data.inquiryType]),
    neutralizeForSheet_(data.name),
    neutralizeForSheet_(data.company),
    neutralizeForSheet_(data.email),
    forceTextForSheet_(data.phone),
    neutralizeForSheet_(data.role),
    neutralizeForSheet_(data.organizationSize),
    neutralizeForSheet_(data.message),
    "accepted",
    neutralizeForSheet_(data.source || "smart-jd-builder-landing"),
    neutralizeForSheet_(data.pageUrl),
    neutralizeForSheet_(data.userAgent),
    "ใหม่",
    "",
    ""
  ]];

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, LEAD_HEADERS.length).setValues(row);
  } finally {
    lock.releaseLock();
  }
}

function notifyAdmin_(leadId, submittedAt, data) {
  const config = getPrivateConfig_();
  if (!config.adminEmail) return;

  const subject = "[JD Builder] Lead ใหม่: " + INQUIRY_LABELS[data.inquiryType];
  const htmlBody = [
    "<h2>มี Lead ใหม่จาก Landing Page</h2>",
    "<p><strong>Lead ID:</strong> " + escapeHtml_(leadId) + "</p>",
    "<p><strong>เวลา:</strong> " + escapeHtml_(Utilities.formatDate(submittedAt, "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss")) + "</p>",
    "<p><strong>เรื่อง:</strong> " + escapeHtml_(INQUIRY_LABELS[data.inquiryType]) + "</p>",
    "<p><strong>ชื่อ:</strong> " + escapeHtml_(data.name) + "</p>",
    "<p><strong>บริษัท:</strong> " + escapeHtml_(data.company) + "</p>",
    "<p><strong>อีเมล:</strong> " + escapeHtml_(data.email) + "</p>",
    "<p><strong>เบอร์โทร:</strong> " + escapeHtml_(data.phone || "-") + "</p>",
    "<p><strong>ข้อความ:</strong><br>" + escapeHtml_(data.message).replace(/\n/g, "<br>") + "</p>",
    "<p><a href=\"https://docs.google.com/spreadsheets/d/" + encodeURIComponent(config.sheetId) + "/edit\">เปิดรายการ Lead</a></p>"
  ].join("");

  MailApp.sendEmail({
    to: config.adminEmail,
    subject,
    htmlBody,
    name: "JD Builder Landing"
  });
}

function getPrivateConfig_() {
  const properties = PropertiesService.getScriptProperties();
  const sheetId = properties.getProperty("LEAD_SHEET_ID") ||
    (typeof JD_LEAD_PRIVATE_CONFIG !== "undefined" && JD_LEAD_PRIVATE_CONFIG.sheetId);
  const adminEmail = properties.getProperty("LEAD_ADMIN_EMAIL") ||
    (typeof JD_LEAD_PRIVATE_CONFIG !== "undefined" && JD_LEAD_PRIVATE_CONFIG.adminEmail);

  if (!sheetId) throw new Error("CONFIG_MISSING");
  return { sheetId, adminEmail: adminEmail || "" };
}

function safeText_(value, maxLength) {
  return String(value == null ? "" : value).trim().slice(0, maxLength);
}

function neutralizeForSheet_(value) {
  const text = String(value == null ? "" : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function forceTextForSheet_(value) {
  const text = String(value == null ? "" : value);
  return text ? "'" + text : "";
}

function createLeadId_() {
  const stamp = Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyyMMdd-HHmmss");
  const random = Math.floor(1000 + Math.random() * 9000);
  return "LEAD-" + stamp + "-" + random;
}

function publicErrorMessage_(error) {
  const code = error && error.message ? error.message : "";
  if (code === "RATE_LIMITED") return "ส่งข้อมูลบ่อยเกินไป กรุณารอประมาณ 10 นาทีแล้วลองใหม่";
  if (["INVALID_INQUIRY", "MISSING_REQUIRED", "INVALID_EMAIL", "CONSENT_REQUIRED"].indexOf(code) >= 0) {
    return "ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่";
  }
  return "ระบบรับข้อมูลขัดข้อง กรุณารอสักครู่แล้วลองใหม่";
}

function responsePage_(payload) {
  const serialized = JSON.stringify(payload).replace(/</g, "\\u003c");
  const html = "<!doctype html><html><head><meta charset=\"utf-8\"></head><body>" +
    "<script>window.top.postMessage(" + serialized + ", '*');</script>" +
    "</body></html>";
  return HtmlService
    .createHtmlOutput(html)
    .setTitle("JD Builder Lead Result")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function escapeHtml_(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
