// Helpers for the "partners are typed in by name" capstone flow.
// The server re-validates everything -- this is only for instant feedback.

/** Trim and collapse repeated whitespace. */
export function cleanName(raw) {
  return (raw ?? "").trim().split(/\s+/).filter(Boolean).join(" ");
}

/** Case-insensitive, word-order-insensitive key: "Dela Cruz, Juan" == "juan dela cruz". */
export function nameKey(raw) {
  return cleanName(raw)
    .toLowerCase()
    .replace(/[,.]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

/** Flatten DRF error payloads (string | array | object of either) into messages. */
export function flattenErrors(value) {
  if (value == null) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenErrors);
  if (typeof value === "object") return Object.values(value).flatMap(flattenErrors);
  return [String(value)];
}

/**
 * Validate partner inputs. Returns one message (or "") per input, in order.
 * `ownName` is the signed-in student's own full name.
 */
export function validatePartners(partners, ownName) {
  const ownKey = nameKey(ownName);
  const keys = partners.map(nameKey);
  return partners.map((raw, i) => {
    const name = cleanName(raw);
    if (!name) return i === 0 ? "Enter your partner's full name." : "Enter a name or remove this partner.";
    if (name.split(" ").length < 2) return "Enter first and last name.";
    if (ownKey && keys[i] === ownKey) return "That's your own name. List your partner, not yourself.";
    if (keys.findIndex((k) => k === keys[i]) !== i) return "This partner is already listed.";
    return "";
  });
}

/**
 * Split a server `partner_names` error into per-input messages plus general ones.
 * The field error may be a list of messages (matched to an input when the message
 * quotes that input's name) or an object keyed by input index.
 */
export function splitPartnerErrors(serverError, partners) {
  const byIndex = {};
  const general = [];
  const add = (index, message) => {
    byIndex[index] = [...(byIndex[index] ?? []), message];
  };

  if (serverError && !Array.isArray(serverError) && typeof serverError === "object") {
    Object.entries(serverError).forEach(([key, value]) => {
      const index = Number(key);
      flattenErrors(value).forEach((message) =>
        Number.isInteger(index) && index >= 0 && index < partners.length
          ? add(index, message)
          : general.push(message)
      );
    });
    return { byIndex, general };
  }

  flattenErrors(serverError).forEach((message) => {
    const lower = message.toLowerCase();
    const index = partners.findIndex((p) => {
      const name = cleanName(p).toLowerCase();
      return name && lower.includes(`'${name}'`);
    });
    if (index >= 0) add(index, message);
    else general.push(message);
  });
  return { byIndex, general };
}
