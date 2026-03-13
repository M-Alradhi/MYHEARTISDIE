"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import {
  FolderKanban,
  CheckSquare,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lightbulb,
  FileText,
  GraduationCap,
  Users,
  Target,
  BookOpen,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/contexts/auth-context"
import { useLanguage } from "@/lib/contexts/language-context"
import { useEffect, useState } from "react"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { studentSidebarItems } from "@/lib/constants/student-sidebar"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function StudentProject() {
  const { userData, loading: authLoading } = useAuth()
  const { t, language } = useLanguage()
  const [project, setProject] = useState<any>(null)
  const [supervisor, setSupervisor] = useState<any>(null)
  const [projectIdeas, setProjectIdeas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIdea, setSelectedIdea] = useState<any>(null)
  const [ideaDialogOpen, setIdeaDialogOpen] = useState(false)

  useEffect(() => {
    const fetchProject = async () => {
      if (authLoading || !userData) return

      try {
        if (userData?.uid) {
          const myIdeasQuery = query(collection(db, "projectIdeas"), where("studentId", "==", userData.uid))
          const myIdeasSnapshot = await getDocs(myIdeasQuery)
          const myIdeas = myIdeasSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

          const allIdeasQuery = query(collection(db, "projectIdeas"), where("isTeamProject", "==", true))
          const allIdeasSnapshot = await getDocs(allIdeasQuery)

          const teamIdeas = allIdeasSnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((idea: any) => {
              const teamMembers = idea.teamMembers || []
              return teamMembers.some((member: any) => member.email === userData.email)
            })

          const allIdeas = [...myIdeas]
          teamIdeas.forEach((teamIdea) => {
            if (!allIdeas.find((idea) => idea.id === teamIdea.id)) {
              allIdeas.push(teamIdea)
            }
          })

          setProjectIdeas(allIdeas)
        }

        if (!userData?.projectId) {
          // No project assigned yet — but still check if member of a team project via studentIds
          // Try to find a project where this student is in studentIds array
          try {
            const memberProjectQuery = query(
              collection(db, "projects"),
              where("studentIds", "array-contains", userData.uid)
            )
            const memberSnap = await getDocs(memberProjectQuery)
            if (!memberSnap.empty) {
              const projectData = { id: memberSnap.docs[0].id, ...memberSnap.docs[0].data() } as any
              setProject(projectData)
              if (projectData.supervisorId) {
                const supervisorDoc = await getDoc(doc(db, "users", projectData.supervisorId))
                if (supervisorDoc.exists()) setSupervisor(supervisorDoc.data())
              }
              // Fetch linked projectIdea for objectives
              try {
                const linkedIdeaQuery = query(collection(db, "projectIdeas"), where("isTeamProject", "==", true))
                const linkedIdeaSnap = await getDocs(linkedIdeaQuery)
                for (const d of linkedIdeaSnap.docs) {
                  const ideaData: any = d.data()
                  const members = ideaData.teamMembers || []
                  const isMatch =
                    ideaData.title === projectData.title ||
                    members.some((m: any) => m.email === userData.email)
                  if (isMatch) {
                    setSelectedIdea({ id: d.id, ...ideaData })
                    break
                  }
                }
              } catch {}
            }
          } catch {}
          setLoading(false)
          return
        }

        const projectDoc = await getDoc(doc(db, "projects", userData.projectId))
        if (projectDoc.exists()) {
          const projectData = { id: projectDoc.id, ...projectDoc.data() }
          setProject(projectData)

          if (projectData.supervisorId) {
            const supervisorDoc = await getDoc(doc(db, "users", projectData.supervisorId))
            if (supervisorDoc.exists()) {
              setSupervisor(supervisorDoc.data())
            }
          }

          // Find the linked projectIdea for this active project by team member email
          const linkedIdeaQuery = query(
            collection(db, "projectIdeas"),
            where("isTeamProject", "==", true)
          )
          const linkedIdeaSnap = await getDocs(linkedIdeaQuery)
          for (const d of linkedIdeaSnap.docs) {
            const ideaData: any = d.data()
            const members = ideaData.teamMembers || []
            const isMatch =
              ideaData.title === projectData.title ||
              members.some((m: any) => m.email === userData.email)
            if (isMatch) {
              setSelectedIdea({ id: d.id, ...ideaData })
              break
            }
          }
        }
      } catch (error) {
        console.error("Error fetching project:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [userData, authLoading])

  const formatDate = (timestamp: any) => {
    if (!timestamp) return t("notSpecified")
    const date = new Date(timestamp.seconds * 1000)
    return date.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US")
  }

  const getStatusText = (status: string) => {
    if (status === "approved") return t("approved")
    if (status === "rejected") return t("rejected")
    if (status === "pending_team_approval") return "بانتظار موافقة الفريق"
    if (status === "pending_approval") return "بانتظار موافقة الفريق"
    return t("underReview")
  }

  const getProjectStatusText = (status: string) => {
    if (status === "active") return t("active")
    if (status === "completed") return t("completed")
    return t("pending")
  }

  const canSubmitNewIdea = () => {
    // If student already has a project, they cannot submit
    if (project) return false
    if (projectIdeas.length === 0) return true

    const allRejected = projectIdeas.every((idea) => idea.status === "rejected")
    const hasActiveIdea = projectIdeas.some((idea) =>
      idea.status === "pending" ||
      idea.status === "approved" ||
      idea.status === "pending_team_approval" ||
      idea.status === "pending_approval"
    )

    return allRejected && !hasActiveIdea
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout sidebarItems={studentSidebarItems} requiredRole="student">
        <div className="p-4 lg:p-8">
          <Card>
            <CardContent className="p-4 lg:p-8">
              <p className="text-center text-muted-foreground">{t("loading")}</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout sidebarItems={studentSidebarItems} requiredRole="student">
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t("myProject")}</h1>
            <p className="text-muted-foreground mt-1">{t("projectDetails")}</p>
          </div>
          {!project && canSubmitNewIdea() && (
            <div className="flex flex-wrap gap-2">
              <Link href="/student/project/browse-ideas">
                <Button variant="outline" className="rounded-lg bg-transparent w-full sm:w-auto">
                  <Lightbulb className="w-4 h-4 ml-2" />
                  {t("browseProjectIdeas")}
                </Button>
              </Link>
              <Link href="/student/project/submit">
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 ml-2" />
                  {t("submitProjectIdea")}
                </Button>
              </Link>
            </div>
          )}
        </div>

        {!project &&
          !canSubmitNewIdea() &&
          projectIdeas.some((idea) => idea.status === "pending" || idea.status === "approved") && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t("cannotSubmitNewIdea")}</AlertDescription>
            </Alert>
          )}

        {projectIdeas.length > 0 && !project && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {t("submittedProjectIdeas")}
              </CardTitle>
              <CardDescription>{t("projectIdeasStatus")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {projectIdeas.map((idea) => (
                <div key={idea.id} className="p-3 sm:p-4 bg-background rounded-lg border">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base sm:text-lg">{idea.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{idea.problemStatement || idea.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {t("submissionDate")}: {formatDate(idea.submittedAt)}
                      </p>

                      {idea.status === "rejected" && idea.rejectionReason && (
                        <Alert variant="destructive" className="mt-3">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            <p className="font-semibold text-sm mb-1">{t("rejectionReasonLabel")}</p>
                            <p className="text-sm">{idea.rejectionReason}</p>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 flex-wrap">
                      <Badge
                        variant={
                          idea.status === "approved"
                            ? "default"
                            : idea.status === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                        className="flex items-center gap-1"
                      >
                        {idea.status === "approved" ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            {getStatusText("approved")}
                          </>
                        ) : idea.status === "rejected" ? (
                          <>
                            <XCircle className="w-3 h-3" />
                            {getStatusText("rejected")}
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            {getStatusText(idea.status)}
                          </>
                        )}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg text-xs gap-1"
                        onClick={() => { setSelectedIdea(idea); setIdeaDialogOpen(true) }}
                      >
                        <FileText className="w-3 h-3" />
                         {t("fullProposal")}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!project ? (
          <Card>
            <CardContent className="p-4 lg:p-8">
              <div className="text-center space-y-4">
                <FolderKanban className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">{t("noProjectAssigned")}</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {projectIdeas.length > 0 ? t("projectSubmittedUnderReview") : t("submitOrWait")}
                  </p>
                  {canSubmitNewIdea() && (
                    <Link href="/student/project/submit">
                      <Button className="mt-4">
                        <Plus className="w-4 h-4 ml-2" />
                        {t("submitProjectIdea")}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl sm:text-2xl">{project.title}</CardTitle>
                    <CardDescription className="mt-1 sm:mt-2">{project.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={project.status === "active" ? "default" : "secondary"}>
                      {getProjectStatusText(project.status)}
                    </Badge>
                    {selectedIdea && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg gap-1.5"
                        onClick={() => setIdeaDialogOpen(true)}
                      >
                        <FileText className="w-4 h-4" />
                        {language === "ar" ? "عرض الفورم" : "View Proposal"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t("projectProgress")}</span>
                    <span className="text-sm text-muted-foreground">{project.progress || 0}%</span>
                  </div>
                  <Progress value={project.progress || 0} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("startDate")}</p>
                    <p className="text-sm mt-1">{formatDate(project.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("expectedDeliveryDate")}</p>
                    <p className="text-sm mt-1">{formatDate(project.endDate)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <Link href="/student/tasks">
                <Card className="hover:bg-accent transition-colors cursor-pointer hover:shadow-lg">
                  <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
                    <CheckSquare className="w-7 h-7 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{t("tasks")}</p>
                      <p className="text-sm text-muted-foreground">{t("tasksAndAssignments")}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/student/discussions">
                <Card className="hover:bg-accent transition-colors cursor-pointer hover:shadow-lg">
                  <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
                    <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{t("discussions")}</p>
                      <p className="text-sm text-muted-foreground">{t("discussionForum")}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* Removed "الملفات" link */}
            </div>

            {supervisor && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("supervisor")}</CardTitle>
                  <CardDescription>{t("supervisorInfo")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <p className="font-medium">{supervisor.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{supervisor.email}</p>
                      <p className="text-sm text-muted-foreground">{supervisor.department}</p>
                    </div>
                    <Link href="/student/messages">
                      <Button className="w-full sm:w-auto">{t("contactSupervisor")}</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>{t("projectObjectives")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(() => {
                    const objectives = selectedIdea?.objectives || project.objectives
                    if (!objectives || objectives.length === 0) {
                      return <p className="text-sm text-muted-foreground">{t("noObjectivesYet")}</p>
                    }
                    const arr = Array.isArray(objectives) ? objectives : [objectives]
                    return arr.map((objective: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary font-bold mt-0.5 shrink-0">{index + 1}.</span>
                        <span className="text-sm">{objective}</span>
                      </li>
                    ))
                  })()}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      {/* Full Form Dialog */}
      <Dialog open={ideaDialogOpen} onOpenChange={setIdeaDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
                {t("proposalDetails")}
            </DialogTitle>
          </DialogHeader>

          {selectedIdea && (
            <div className="space-y-6 text-sm">

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-muted/40 rounded-lg">
                {selectedIdea.academicYear && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1"> {t("academicYear")}</p>
                    <p className="font-medium">{selectedIdea.academicYear}</p>
                  </div>
                )}
                {selectedIdea.semester && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1"> {t("semester")}</p>
                    <p className="font-medium">{selectedIdea.semester === "fall" ? "الفصل الأول" : "الفصل الثاني"}</p>
                  </div>
                )}
                {selectedIdea.program && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1"> {t("program")}</p>
                    <p className="font-medium">{selectedIdea.program}</p>
                  </div>
                )}
                {selectedIdea.projectType && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1"> {t("projectType")}</p>
                    <p className="font-medium">
                      {selectedIdea.projectType === "system" ? "نظام (System)"
                        : selectedIdea.projectType === "research" ? "بحث (Research)"
                        : selectedIdea.projectType === "entrepreneurship" ? "ريادة أعمال (Entrepreneurship)"
                        : selectedIdea.projectType === "cybersecurity" ? "أمن معلومات (Cybersecurity)"
                        : selectedIdea.projectType === "one-course" ? "كورس واحد"
                        : selectedIdea.projectType === "two-courses" ? "كورسين"
                        : selectedIdea.projectType}
                    </p>
                  </div>
                )}
                {selectedIdea.duration && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">مدة المشروع</p>
                    <p className="font-medium">
                      {selectedIdea.duration === "one-course" ? "كورس واحد (فصل دراسي واحد)"
                        : selectedIdea.duration === "two-courses" ? "كورسين (فصلين دراسيين)"
                        : selectedIdea.duration}
                    </p>
                  </div>
                )}
                {selectedIdea.departmentNameAr && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">{t("department")}</p>
                    <p className="font-medium">{selectedIdea.departmentNameAr}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Supervisor Info */}
              {(selectedIdea.supervisorName || selectedIdea.supervisorEmail) && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary" />
                     {t("supervisorInformatio")}
                  </h4>
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1"> {t("supervisorName")}</p>
                      <p className="font-medium">{selectedIdea.supervisorName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1"> {t("supervisorEmail")}</p>
                      <p className="font-medium">{selectedIdea.supervisorEmail}</p>
                    </div>
                    {selectedIdea.coSupervisorName && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1"> {t("coSupervisorInformation")}</p>
                        <p className="font-medium">{selectedIdea.coSupervisorName}</p>
                      </div>
                    )}
                    {selectedIdea.coSupervisorEmail && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1"> {t("coSupervisorEmail")}</p>
                        <p className="font-medium">{selectedIdea.coSupervisorEmail}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Team Members */}
              {selectedIdea.teamMembers && selectedIdea.teamMembers.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                     {t("teamMembers")}
                  </h4>
                  <div className="space-y-2">
                    {selectedIdea.teamMembers.map((member: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border">
                        <div className="space-y-0.5">
                          <p className="font-medium">{member.fullName || member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                          {member.studentId && <p className="text-xs text-muted-foreground">الرقم: {member.studentId}</p>}
                          {member.phone && <p className="text-xs text-muted-foreground">الهاتف: {member.phone}</p>}
                          {member.gpa && <p className="text-xs text-muted-foreground">المعدل: {member.gpa}</p>}
                          {member.departmentNameAr && <p className="text-xs text-muted-foreground">القسم: {member.departmentNameAr}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {member.role === "leader" && <Badge className="text-xs">قائد الفريق</Badge>}
                          <Badge variant={member.approved ? "default" : "secondary"} className="text-xs">
                            {member.approved ? "وافق" : "لم يوافق بعد"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Project Details */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                   {t("projectDetails")}
                </h4>
                <div className="space-y-4">
                  {selectedIdea.problemStatement && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">المشكلة البحثية</p>
                      <p className="leading-relaxed p-3 bg-muted/30 rounded-lg">{selectedIdea.problemStatement}</p>
                    </div>
                  )}
                  {selectedIdea.objectives && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                        <Target className="w-3 h-3" /> الأهداف
                      </p>
                      {Array.isArray(selectedIdea.objectives)
                        ? <ul className="space-y-1 p-3 bg-muted/30 rounded-lg">
                            {selectedIdea.objectives.map((obj: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span>
                                <span>{obj}</span>
                              </li>
                            ))}
                          </ul>
                        : <p className="leading-relaxed p-3 bg-muted/30 rounded-lg">{selectedIdea.objectives}</p>
                      }
                    </div>
                  )}
                  {selectedIdea.significance && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">أهمية المشروع</p>
                      <p className="leading-relaxed p-3 bg-muted/30 rounded-lg">{selectedIdea.significance}</p>
                    </div>
                  )}
                  {selectedIdea.literatureReview && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">مراجعة الأدبيات</p>
                      <p className="leading-relaxed p-3 bg-muted/30 rounded-lg">{selectedIdea.literatureReview}</p>
                    </div>
                  )}
                  {selectedIdea.references && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">المراجع</p>
                      <p className="leading-relaxed p-3 bg-muted/30 rounded-lg whitespace-pre-line">{selectedIdea.references}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              {selectedIdea.timeline && Object.values(selectedIdea.timeline).some(Boolean) && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                       {t("timeline")}
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-right p-2 border rounded-tl-lg">المرحلة</th>
                            <th className="p-2 border">W 1-3</th>
                            <th className="p-2 border">W 4-6</th>
                            <th className="p-2 border">W 7-9</th>
                            <th className="p-2 border">W 10-12</th>
                            <th className="p-2 border">W 13-16</th>
                            <th className="p-2 border">Next Sem.</th>
                            <th className="p-2 border rounded-tr-lg">NA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: "requirementCollection", label: "Requirement Collection" },
                            { key: "literatureReview", label: "Literature Review" },
                            { key: "design", label: "Design" },
                            { key: "implementation", label: "Implementation" },
                            { key: "testingAndResults", label: "Testing & Results" },
                            { key: "reportWriting", label: "Report Writing" },
                            { key: "presentation", label: "Presentation" },
                          ].map((phase) => (
                            <tr key={phase.key} className="border-b hover:bg-muted/30">
                              <td className="p-2 font-medium border">{phase.label}</td>
                              {["w1-3","w4-6","w7-9","w10-12","w13-16","next-semester","na"].map((w) => (
                                <td key={w} className="p-2 text-center border">
                                  {selectedIdea.timeline[phase.key] === w
                                    ? <span className="text-primary font-bold text-base">✓</span>
                                    : <span className="text-muted-foreground/30">—</span>
                                  }
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
