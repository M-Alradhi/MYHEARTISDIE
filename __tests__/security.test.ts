import { escapeHtml, sanitizeInput, sanitizeObject } from "@/lib/utils/security"

describe("escapeHtml", () => {
  it("escapes < and >", () => { expect(escapeHtml("<script>")).toBe("&lt;script&gt;") })
  it("escapes quotes", () => { expect(escapeHtml('"hi"')).toBe("&quot;hi&quot;") })
  it("preserves Arabic text", () => { expect(escapeHtml("مرحبا")).toBe("مرحبا") })
})

describe("sanitizeInput", () => {
  it("removes script tags", () => { expect(sanitizeInput('<script>alert(1)</script>Hi')).not.toContain("<script>") })
  it("removes javascript: protocol", () => { expect(sanitizeInput("javascript:alert(1)")).not.toContain("javascript:") })
  it("removes event handlers", () => { expect(sanitizeInput('<img onclick="evil()">')).not.toContain("onclick") })
  it("returns empty for non-string", () => { expect(sanitizeInput(null as any)).toBe("") })
  it("preserves Arabic text", () => { expect(sanitizeInput("مشروع التخرج 2025")).toContain("مشروع التخرج") })
})

describe("sanitizeObject", () => {
  it("sanitizes string values", () => {
    const r = sanitizeObject({ name: '<script>alert(1)</script>Ahmed' })
    expect(r.name).not.toContain("<script>")
  })
  it("preserves numbers", () => {
    const r = sanitizeObject({ count: 42 } as any)
    expect(r.count).toBe(42)
  })
})
