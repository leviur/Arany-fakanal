/**********************
 * API hibák → toast szöveg (rendelések + foglalások)
 **********************/

/**
 * Backend JSON hibából olvasható üzenet.
 * Tipikus formák: { detail: "Érvénytelen státusz." } vagy { guest_email: ["..."] }
 */
function parseApiError(errBody, fallback = "Hiba történt a művelet során.") {
  if (typeof errBody === "string") {
    const trimmed = errBody.trim();
    return trimmed || fallback;
  }
  if (errBody?.detail) return String(errBody.detail);
  const first = Object.values(errBody || {}).flat().find(Boolean);
  return first ? String(first) : fallback;
}

/**
 * Ha a fetch nem OK (pl. 400, 403), kiolvassa a válaszból a hiba szövegét.
 */
async function readApiErrorMessage(response, fallback = "Hiba történt a művelet során.") {
  try {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return parseApiError(await response.json(), fallback);
    }
    const text = (await response.text()).trim();
    return text || fallback;
  } catch (_) {
    return fallback;
  }
}

window.parseApiError = parseApiError;
window.readApiErrorMessage = readApiErrorMessage;
