"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/contexts/auth-context"
import { useLanguage } from "@/lib/contexts/language-context"
import { useState, useEffect } from "react"
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase/config"
import { toast } from "sonner"
import { studentSidebarItems } from "@/lib/constants/student-sidebar"
import { Users, Check, X, Clock, BookOpen, Target, Cpu, Calendar, Layers } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function TeamApprovalPage() {
  const { userData, loading: authLoading } = useAuth()
  const { t, language } = useLanguage()
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalSupervisors: 0,
    totalStudents: 0,
    averageProgress: 0,
    projectsNeedingAttention: 0,
  })
  const [loading, setLoading] = useState(true)
  const [pendingInvites, setPendingInvites] = useState<any[]>([])

  useEffect(() => {
    fetchPendingInvites()
  }, [userData])

  const fetchPendingInvites = async () => {
    if (!userData?.email) return

    try {
      const db = getFirebaseDb()
      const ideasQuery = query(collection(db, "projectIdeas"), where("status", "==", "pending_team_approval"))
      const snapshot = await getDocs(ideasQuery)

      console.log("Found project ideas:", snapshot.docs.length)

      const invites = snapshot.docs
        .map((doc) => {
          const data = doc.data()
          const teamMembers = data.teamMembers || []
          const myInvite = teamMembers.find(
            (member: any) => member.email === userData.email && member.approved === false,
          )

          if (myInvite) {
            console.log("Found pending invite for:", userData.email, "in project:", data.title)
            return {
              id: doc.id,
              ...data,
              myInvite,
            }
          }
          return null
        })
        .filter(Boolean)

      console.log("Total pending invites for user:", invites.length)
      setPendingInvites(invites)
    } catch (error) {
      console.error("Error fetching invites:", error)
      toast.error(t("errorLoadingInvites"))
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (ideaId: string) => {
    try {
      const db = getFirebaseDb()
      const ideaRef = doc(db, "projectIdeas", ideaId)
      const idea = pendingInvites.find((inv) => inv.id === ideaId)

      if (!idea) return

      const updatedTeamMembers = idea.teamMembers.map((member: any) => {
        if (member.email === userData?.email) {
          return {
            ...member,
            userId: userData?.uid,
            name: userData?.name || member.name,
            fullName: userData?.name || member.fullName || member.name,
            studentId: userData?.studentId || member.studentId,
            approved: true,
            approvedAt: Timestamp.now(),
          }
        }
        return member
      })

      const allApproved = updatedTeamMembers.every((member: any) => member.approved)

      const updateData: any = {
        teamMembers: updatedTeamMembers,
        teamStatus: allApproved ? "all_approved" : "pending_approval",
      }

      if (allApproved) {
        updateData.status = "pending"

        const { notifyCoordinators } = await import("@/lib/utils/notification-helper")
        await notifyCoordinators(
          "فريق مشروع جاهز للمراجعة",
          `وافق جميع أعضاء فريق المشروع "${idea.title}" على الانضمام. المشروع جاهز للمراجعة النهائية.`,
          "/coordinator/approve-projects",
        )
      }

      await updateDoc(ideaRef, updateData)

      toast.success(t("inviteApproved"))
      fetchPendingInvites()
    } catch (error) {
      console.error("Error approving invite:", error)
      toast.error(t("errorApproving"))
    }
  }

  const handleReject = async (ideaId: string) => {
    try {
      const db = getFirebaseDb()
      const ideaRef = doc(db, "projectIdeas", ideaId)
      const idea = pendingInvites.find((inv) => inv.id === ideaId)

      if (!idea) return

      const updatedTeamMembers = idea.teamMembers.filter((member: any) => member.email !== userData?.email)

      const newTeamStatus = updatedTeamMembers.length < 2 ? "pending_formation" : "pending_approval"

      await updateDoc(ideaRef, {
        teamMembers: updatedTeamMembers,
        teamStatus: newTeamStatus,
      })

      toast.success(t("inviteRejected"))
      fetchPendingInvites()
    } catch (error) {
      console.error("Error rejecting invite:", error)
      toast.error(t("errorRejecting"))
    }
  }

  if (loading) {
    return (
      <DashboardLayout sidebarItems={studentSidebarItems} requiredRole="student">
        <div className="p-4 lg:p-8">
          <Card>
            <CardContent className="p-4 lg:p-8">
              <p className="text-center text-muted-foreground">
                {t("loading")}
              </p>

            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout sidebarItems={studentSidebarItems} requiredRole="student">
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            {t("teamInvites")}
          </h1>

          <p className="text-muted-foreground mt-2">{t("reviewPendingInvites")}</p>
        </div>

        {pendingInvites.length === 0 ? (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>{t("noPendingInvites")}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {pendingInvites.map((invite) => (
              <Card key={invite.id} className="rounded-xl border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-xl leading-snug">{invite.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {t("from")}: {invite.studentName}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs px-3 py-1">{invite.department}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">

                  {/* Project Type + Semester */}
                  <div className="grid grid-cols-2 gap-3">
                    {invite.projectType && (
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        <Layers className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">{t("projectType")}</p>
                          <p className="text-sm font-semibold">
                            {invite.projectType === "system" ? (language === "ar" ? "نظام" : "System")
                              : invite.projectType === "research" ? (language === "ar" ? "بحث" : "Research")
                              : invite.projectType === "entrepreneurship" ? (language === "ar" ? "ريادة أعمال" : "Entrepreneurship")
                              : invite.projectType === "cybersecurity" ? (language === "ar" ? "أمن معلومات" : "Cybersecurity")
                              : invite.projectType === "one-course" ? (language === "ar" ? "كورس واحد" : "One Semester")
                              : invite.projectType === "two-courses" ? (language === "ar" ? "كورسين" : "Two Semesters")
                              : invite.projectType}
                          </p>
                        </div>
                      </div>
                    )}
                    {invite.duration && (
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        <Layers className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">{language === "ar" ? "مدة المشروع" : "Duration"}</p>
                          <p className="text-sm font-semibold">
                            {invite.duration === "one-course" || invite.duration === "one_semester"
                              ? (language === "ar" ? "كورس واحد" : "One Semester")
                              : invite.duration === "two-courses" || invite.duration === "two_semesters"
                              ? (language === "ar" ? "كورسين" : "Two Semesters")
                              : invite.duration}
                          </p>
                        </div>
                      </div>
                    )}
                    {invite.semester && (
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        <Calendar className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">{t("semester")}</p>
                          <p className="text-sm font-semibold">
                            {invite.semester === "fall" ? (language === "ar" ? "الفصل الأول" : "First Semester")
                              : invite.semester === "spring" ? (language === "ar" ? "الفصل الثاني" : "Second Semester")
                              : invite.semester}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Problem Statement / Description */}
                  {(invite.problemStatement || invite.description) && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span>{language === "ar" ? "وصف المشروع" : "Project Description"}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed pr-1">
                        {invite.problemStatement || invite.description}
                      </p>
                    </div>
                  )}

                  {/* Objectives */}
                  {invite.objectives && invite.objectives.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Target className="h-4 w-4 text-primary" />
                        <span>{language === "ar" ? "الأهداف" : "Objectives"}</span>
                      </div>
                      <ul className="space-y-1 pr-2">
                        {(Array.isArray(invite.objectives) ? invite.objectives : [invite.objectives]).map((obj: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            {obj}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Technologies */}
                  {invite.technologies && invite.technologies.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Cpu className="h-4 w-4 text-primary" />
                        <span>{language === "ar" ? "التقنيات المستخدمة" : "Technologies"}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(invite.technologies) ? invite.technologies : [invite.technologies]).map((tech: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs rounded-full px-3">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expected Outcomes */}
                  {invite.expectedOutcomes && (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{language === "ar" ? "النتائج المتوقعة" : "Expected Outcomes"}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{invite.expectedOutcomes}</p>
                    </div>
                  )}

                  <Separator />

                  {/* Team Members */}
                  <div className="space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      {t("teamMembers")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {invite.teamMembers.map((member: any, index: number) => (
                        <Badge
                          key={`${invite.id}-member-${member.email}-${index}`}
                          variant={member.approved ? "default" : "secondary"}
                          className="text-xs px-3 py-1"
                        >
                          {member.fullName || member.name || member.email}
                          {member.role === "leader" && ` (${t("leader")})`}
                          {member.approved && <Check className="h-3 w-3 mr-1" />}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-1">
                    <Button onClick={() => handleApprove(invite.id)} className="rounded-lg flex-1">
                      <Check className="h-4 w-4 mr-2" />
                      {t("approveInvite")}
                    </Button>
                    <Button variant="destructive" onClick={() => handleReject(invite.id)} className="rounded-lg flex-1">
                      <X className="h-4 w-4 mr-2" />
                      {t("rejectInvite")}
                    </Button>
                  </div>

                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}