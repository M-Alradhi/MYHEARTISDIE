"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Save, Key, Award } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/contexts/auth-context"
import { useLanguage } from "@/lib/contexts/language-context"
import { useState } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase/config"
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { getFirebaseAuth } from "@/lib/firebase/config"
import { toast } from "sonner"
import { studentSidebarItems } from "@/lib/constants/student-sidebar"

export default function StudentSettings() {
  const { userData } = useAuth()
  const { t } = useLanguage()
  const [stats, setStats] = useState({
    totalGrade: 0,
    totalTasks: 0,
    pendingTasks: 0,
    submittedTasks: 0,
    gradedTasks: 0,
    upcomingMeetings: 0,
    projectProgress: 0,
  })
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: userData?.name || "",
    email: userData?.email || "",
    department: userData?.department || "",
    phone: userData?.phone || "",
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handleSave = async () => {
    if (!userData?.uid) return

    setLoading(true)
    try {
      const db = getFirebaseDb()
      const auth = getFirebaseAuth()

      // Email changes require re-authentication and are restricted
      if (formData.email !== userData?.email) {
        toast.error(t("cannotChangeEmail"))
        setLoading(false)
        return
      }

      await updateDoc(doc(db, "users", userData.uid), {
        name: formData.name,
        phone: formData.phone,
        updatedAt: new Date(),
      })
      toast.success(t("profileUpdatedSuccessfully"))
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error(t("errorUpdatingProfile"))
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t("newPasswordMismatch"))
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error(t("passwordMustBe6Chars"))
      return
    }

    setLoading(true)
    try {
      const auth = getFirebaseAuth()
      const user = auth.currentUser

      if (!user || !user.email) {
        toast.error(t("userNotLoggedIn"))
        return
      }

      const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, passwordData.newPassword)

      toast.success(t("passwordChangedSuccessfully"))
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (error: any) {
      console.error("Error changing password:", error)
      if (error.code === "auth/wrong-password") {
        toast.error(t("currentPasswordIncorrect"))
      } else {
        toast.error(t("errorChangingPassword"))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout sidebarItems={studentSidebarItems} requiredRole="student">
      <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-700">
        <div className="animate-in slide-in-from-top duration-500">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-l from-foreground to-foreground/70 bg-clip-text text-transparent">
            الملف الشخصي
          </h1>
          <p className="text-muted-foreground mt-2">{t("manageProfileSettings")}</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">{t("profileInformation")}</TabsTrigger>
              <TabsTrigger value="password">{t("changePassword")}</TabsTrigger>
            </TabsList>

          <TabsContent value="profile">
            <Card className="animate-in slide-in-from-bottom duration-700">
              <CardHeader>
                <CardTitle>{t("profileInformation")}</CardTitle>
                <CardDescription>{t("updateProfileInformation")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("fullName")}</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("email")}</Label>
                    <Input id="email" type="email" value={formData.email} disabled />
                    <p className="text-xs text-muted-foreground">{t("cannotChangeEmail")}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="studentId">{t("studentId")}</Label>
                    <Input id="studentId" value={userData?.studentId} disabled />
                    <p className="text-xs text-muted-foreground">{t("cannotChangeStudentId")}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">{t("department")}</Label>
                    <Input id="department" value={formData.department} disabled />
                    <p className="text-xs text-muted-foreground">{t("departmentCannotBeChanged")}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("phone")}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+973 XXXX XXXX"
                    />
                  </div>
                </div>
                <Button onClick={handleSave} disabled={loading} className="w-full md:w-auto">
                  <Save className="w-4 h-4 ml-2" />
                  {loading ? t("loading") : t("saveChanges")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card className="animate-in slide-in-from-bottom duration-700">
              <CardHeader>
                <CardTitle>{t("changePassword")}</CardTitle>
                <CardDescription>{t("updateProfileInformation")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t("newPassword")}</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t("confirmNewPassword")}</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={handleChangePassword} disabled={loading} className="w-full md:w-auto">
                  <Key className="w-4 h-4 ml-2" />
                  {loading ? t("loading") : t("changePassword")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
