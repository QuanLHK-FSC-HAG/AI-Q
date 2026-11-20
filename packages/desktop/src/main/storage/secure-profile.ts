import { app, safeStorage } from "electron"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import path from "node:path"

export type SecureProfile = {
  v: 1
  userName: string
  termsVersion?: string
  privacyVersion?: string
  acceptedAt?: string
}

function file() {
  return path.join(app.getPath("userData"), "aiq-secure-profile.json")
}

function isAvailable() {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

function decode(raw: string): SecureProfile | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SecureProfile>
    if (parsed?.v !== 1) return null
    if (typeof parsed.userName !== "string") return null
    return {
      v: 1,
      userName: parsed.userName,
      termsVersion: typeof parsed.termsVersion === "string" ? parsed.termsVersion : undefined,
      privacyVersion: typeof parsed.privacyVersion === "string" ? parsed.privacyVersion : undefined,
      acceptedAt: typeof parsed.acceptedAt === "string" ? parsed.acceptedAt : undefined,
    }
  } catch {
    return null
  }
}

export async function readSecureProfile(): Promise<SecureProfile | null> {
  if (!isAvailable()) return null
  try {
    const raw = await readFile(file(), "utf8")
    const outer = JSON.parse(raw) as { enc?: string }
    if (typeof outer?.enc !== "string" || !outer.enc) return null
    const buf = Buffer.from(outer.enc, "base64")
    const text = safeStorage.decryptString(buf)
    return decode(text)
  } catch {
    return null
  }
}

export async function writeSecureProfile(profile: SecureProfile): Promise<boolean> {
  if (!isAvailable()) return false
  try {
    const text = JSON.stringify(profile)
    const enc = safeStorage.encryptString(text).toString("base64")
    const target = file()
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, JSON.stringify({ enc }, null, 2), "utf8")
    return true
  } catch {
    return false
  }
}

export async function clearSecureProfile(): Promise<void> {
  try {
    await writeFile(file(), JSON.stringify({ enc: "" }, null, 2), "utf8")
  } catch {
    // ignore
  }
}
