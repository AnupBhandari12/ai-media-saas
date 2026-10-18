const clean = (value, max = 180) => {
  const text = String(value ?? "").trim();
  if (!text || text.length > max || /[\x00-\x1f\x7f]/.test(text)) throw new Error("Enter valid text within the limit.");
  return text;
};
const escapeWifi = (s) => s.replace(/([\\;,:"])/g, "\\$1");
const escapeVcard = (s) => s.replace(/([\\;,])/g, "\\$1");
export function buildQrPayload(type, fields) {
  if (type === "TEXT") return clean(fields.text, 900);
  if (type === "URL") {
    const raw = clean(fields.url, 500);
    let u; try { u = new URL(raw); } catch { throw new Error("Enter a complete http(s) URL."); }
    if (!["https:", "http:"].includes(u.protocol) || u.username || u.password) throw new Error("Only normal http(s) URLs are supported.");
    return u.href;
  }
  if (type === "WIFI") {
    const ssid = clean(fields.ssid, 64);
    const pass = fields.password || "";
    if (String(pass).length > 63 || /[\x00-\x1f\x7f]/.test(pass)) throw new Error("Wi-Fi password is invalid.");
    const encryption = fields.encryption === "nopass" ? "nopass" : "WPA";
    if (encryption !== "nopass" && !pass) throw new Error("Enter the Wi-Fi password.");
    return `WIFI:T:${encryption};S:${escapeWifi(ssid)};P:${escapeWifi(String(pass))};;`;
  }
  if (type === "CONTACT") {
    const name = clean(fields.name, 90), phone = clean(fields.phone, 40);
    return `BEGIN:VCARD\nVERSION:3.0\nFN:${escapeVcard(name)}\nTEL:${escapeVcard(phone)}\nEND:VCARD`;
  }
  throw new Error("Unsupported QR type.");
}
export function validateQrSize(value) {
  const n = Number(value);
  if (![256, 512, 1024].includes(n)) throw new Error("Choose a standard QR size.");
  return n;
}
