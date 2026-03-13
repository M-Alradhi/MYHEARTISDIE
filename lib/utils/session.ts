/**
 * Session utilities — HMAC-signed cookies for tamper detection.
 */

const SESSION_SECRET = process.env.NEXT_PUBLIC_SESSION_SECRET || "gp-platform-session-secret-change-in-production"
const COOKIE_NAME = "session_role"
const COOKIE_MAX_AGE = 60 * 60 * 24

async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

async function hmacVerify(data: string, signature: string, secret: string): Promise<boolean> {
  try { return (await hmacSign(data, secret)) === signature } catch { return false }
}

export async function setSessionCookie(role: string): Promise<void> {
  if (typeof window === "undefined") return
  const signature = await hmacSign(role, SESSION_SECRET)
  const cookieValue = encodeURIComponent(`${role}.${signature}`)
  const isSecure = window.location.protocol === "https:"
  document.cookie = `${COOKIE_NAME}=${cookieValue}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Strict${isSecure ? "; Secure" : ""}`
}

export function clearSessionCookie(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Strict`
}

export async function verifySessionCookie(rawValue: string): Promise<string | null> {
  try {
    const decoded = decodeURIComponent(rawValue)
    const lastDot = decoded.lastIndexOf(".")
    if (lastDot === -1) return null
    const role = decoded.slice(0, lastDot)
    const signature = decoded.slice(lastDot + 1)
    const valid = await hmacVerify(role, signature, SESSION_SECRET)
    if (!valid) return null
    return ["student", "supervisor", "coordinator", "admin"].includes(role) ? role : null
  } catch { return null }
}
