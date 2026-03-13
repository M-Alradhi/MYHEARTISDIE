import { collection, getDocs, query, where } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase/config"

export interface Department {
  id: string
  code: string
  name?: string 
  nameAr: string
  nameEn: string
  isActive: boolean
  createdAt: any
}

export async function getDepartments(): Promise<Department[]> {
  try {
    const db = getFirebaseDb()
    const q = query(collection(db, "departments"), where("isActive", "==", true))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Department[]
  } catch (error) {
    console.error("Error fetching departments:", error)
    return []
  }
}


export function getDepartmentName(
  value: string | Record<string, any> | undefined | null,
  departments: Department[],
  language?: string,
): string {
  if (!value) return "غير محدد"

 
  if (typeof value === "object") {
    
    const nameAr = value.departmentNameAr as string | undefined
    const nameEn = value.departmentNameEn as string | undefined
    if (nameAr || nameEn) {
      return language === "en"
        ? nameEn || nameAr || "غير محدد"
        : nameAr || nameEn || "غير محدد"
    }
    
    const depId = (value.departmentId || value.department) as string | undefined
    if (!depId) return "غير محدد"
    return getDepartmentName(depId, departments, language)
  }


  const legacyMapAr: Record<string, string> = {
    cs: "علوم الحاسب",
    it: "تقنية المعلومات",
    is: "نظم المعلومات",
  }
  const legacyMapEn: Record<string, string> = {
    cs: "Computer Science",
    it: "Information Technology",
    is: "Information Systems",
  }
  const key = value.toLowerCase()
  if (legacyMapAr[key]) {
    return language === "en" ? legacyMapEn[key] : legacyMapAr[key]
  }

 
  const byId = departments.find((d) => d.id === value)
  if (byId) {
    return language === "en"
      ? byId.nameEn || byId.nameAr || byId.code || value
      : byId.nameAr || byId.nameEn || byId.code || value
  }

 
  const normalized = value.trim().toLowerCase()
  const byCode = departments.find((d) => (d.code || "").trim().toLowerCase() === normalized)
  if (byCode) {
    return language === "en"
      ? byCode.nameEn || byCode.nameAr || byCode.code || value
      : byCode.nameAr || byCode.nameEn || byCode.code || value
  }

  
  const byName = departments.find(
    (d) =>
      (d.nameAr || "").trim().toLowerCase() === normalized ||
      (d.nameEn || "").trim().toLowerCase() === normalized,
  )
  if (byName) {
    return language === "en"
      ? byName.nameEn || byName.nameAr || byName.code || value
      : byName.nameAr || byName.nameEn || byName.code || value
  }

  // Return value as-is if it looks like a real name (not an ID)
  if (value.trim().length > 0) return value

  return "غير محدد"
}