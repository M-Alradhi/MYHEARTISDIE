"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { useAuth } from "@/lib/contexts/auth-context"
import { useLanguage } from "@/lib/contexts/language-context"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { studentSidebarItems } from "@/lib/constants/student-sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Users,
  User,
  BookOpen,
  Target,
  Calendar,
  GraduationCap,
  Building2,
  Mail,
  Phone,
  Hash,
  ChevronLeft,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"

const timelineLabels: Record<string, string> = {
  "w1-3": "W 1–3",
  "w4-6": "W 4–6",
  "w7-9": "W 7–9",
  "w10-12": "W 10–12",
  "w13-16": "W 13–16",
  "next-semester": "Next Semester",
  na: "N/A",
}

const phases = [
  { key: "requirementCollection", label: "Requirement Collection", labelAr: "جمع المتطلبات" },
  { key: "literatureReview", label: "Literature Review", labelAr: "مراجعة الأدبيات" },
  { key: "design", label: "Design", labelAr: "التصميم" },
  { key: "implementation", label: "Implementation", labelAr: "التنفيذ" },
  { key: "testingAndResults", label: "Testing & Results", labelAr: "الاختبار والنتائج" },
  { key: "reportWriting", label: "Report Writing", labelAr: "كتابة التقرير" },
  { key: "presentation", label: "Presentation", labelAr: "العرض" },
]

export default function ProposalViewPage() {
  const { userData, loading: authLoading } = useAuth()
  const { language } = useLanguage()
  const [proposal, setProposal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const ar = language === "ar"

  useEffect(() => {
    const fetchProposal = async () => {
      if (authLoading || !userData) return
      try {
        // Try to find proposal where this student is leader OR team member
        const leaderQuery = query(
          collection(db, "projectIdeas"),
          where("studentId", "==", userData.uid),
          where("status", "in", ["approved", "pending_team_approval", "pending"])
        )
        const leaderSnap = await getDocs(leaderQuery)

        let found: any = null

        if (!leaderSnap.empty) {
          found = { id: leaderSnap.docs[0].id, ...leaderSnap.docs[0].data() }
        } else {
          // Check team member proposals
          const teamQuery = query(
            collection(db, "projectIdeas"),
            where("isTeamProject", "==", true)
          )
          const teamSnap = await getDocs(teamQuery)
          for (const d of teamSnap.docs) {
            const data = d.data()
            const members = data.teamMembers || []
            if (members.some((m: any) => m.email === userData.email)) {
              found = { id: d.id, ...data }
              break
            }
          }
        }

        if (found) {
          setProposal(found)
        } else {
          setNotFound(true)
        }
      } catch (e) {
        console.error(e)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchProposal()
  }, [userData, authLoading])

  const formatDate = (val: any) => {
    if (!val) return "—"
    if (val.seconds) return new Date(val.seconds * 1000).toLocaleDateString(ar ? "ar-EG" : "en-US")
    if (typeof val === "string" && val.includes("-")) {
      const d = new Date(val)
      if (!isNaN(d.getTime())) return d.toLocaleDateString(ar ? "ar-EG" : "en-US")
      return val
    }
    if (typeof val === "string") return val
    if (val instanceof Date) return val.toLocaleDateString(ar ? "ar-EG" : "en-US")
    return "—"
  }

  const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="p-1.5 bg-primary/10 rounded-lg text-primary">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )

  const Field = ({ label, value }: { label: string; value?: string }) => (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  )

  if (authLoading || loading) {
    return (
      <DashboardLayout sidebarItems={studentSidebarItems} requiredRole="student">
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">{ar ? "جارٍ التحميل..." : "Loading..."}</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (notFound || !proposal) {
    return (
      <DashboardLayout sidebarItems={studentSidebarItems} requiredRole="student">
        <div className="p-4 lg:p-8 space-y-6">
          <Link href="/student/project">
            <Button variant="ghost" className="gap-2 mb-2">
              <ChevronLeft className="w-4 h-4" />
              {ar ? "العودة للمشروع" : "Back to Project"}
            </Button>
          </Link>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {ar ? "لا يوجد فورم مقدَّم مرتبط بحسابك حالياً." : "No submitted proposal found linked to your account."}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  const statusColor: Record<string, string> = {
    approved: "default",
    rejected: "destructive",
    pending: "secondary",
    pending_team_approval: "secondary",
  }

  const statusLabel: Record<string, string> = {
    approved: ar ? "مقبول" : "Approved",
    rejected: ar ? "مرفوض" : "Rejected",
    pending: ar ? "قيد المراجعة" : "Under Review",
    pending_team_approval: ar ? "بانتظار موافقة الفريق" : "Awaiting Team Approval",
  }

  return (
    <DashboardLayout sidebarItems={studentSidebarItems} requiredRole="student">
      <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link href="/student/project">
              <Button variant="ghost" size="sm" className="gap-1">
                <ChevronLeft className="w-4 h-4" />
                {ar ? "رجوع" : "Back"}
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                {ar ? "فورم تقديم المشروع" : "Project Proposal Form"}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{ar ? "عرض فقط — لا يمكن التعديل" : "Read-only view"}</p>
            </div>
          </div>
          <Badge variant={statusColor[proposal.status] as any} className="text-sm px-3 py-1">
            {proposal.status === "approved" && <CheckCircle className="w-3.5 h-3.5 mr-1" />}
            {proposal.status?.includes("pending") && <Clock className="w-3.5 h-3.5 mr-1" />}
            {statusLabel[proposal.status] || proposal.status}
          </Badge>
        </div>

        {/* 1. Basic Information */}
        <Section icon={<BookOpen className="w-4 h-4" />} title={ar ? "المعلومات الأساسية" : "Basic Information"}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            <Field label={ar ? "القسم" : "Department"} value={proposal.departmentNameAr || proposal.department} />
            <Field label={ar ? "البرنامج" : "Program"} value={proposal.program} />
            <Field label={ar ? "السنة الأكاديمية" : "Academic Year"} value={proposal.academicYear} />
            <Field label={ar ? "الفصل الدراسي" : "Semester"} value={proposal.semester === "fall" ? (ar ? "الفصل الأول" : "First Semester") : proposal.semester === "spring" ? (ar ? "الفصل الثاني" : "Second Semester") : proposal.semester} />
            <Field label={ar ? "نوع المشروع" : "Project Type"} value={
              proposal.projectType === "system" ? (ar ? "نظام" : "System")
              : proposal.projectType === "research" ? (ar ? "بحث" : "Research")
              : proposal.projectType === "entrepreneurship" ? (ar ? "ريادة الأعمال" : "Entrepreneurship")
              : proposal.projectType === "cybersecurity" ? (ar ? "الأمن السيبراني" : "Cybersecurity")
              : proposal.projectType === "one-course" ? (ar ? "كورس واحد" : "One Semester")
              : proposal.projectType === "two-courses" ? (ar ? "كورسين" : "Two Semesters")
              : proposal.projectType || "—"
            } />
            <Field label={ar ? "مدة المشروع" : "Project Duration"} value={
              proposal.duration === "one-course" ? (ar ? "كورس واحد (فصل دراسي واحد)" : "One Semester")
              : proposal.duration === "two-courses" ? (ar ? "كورسين (فصلين دراسيين)" : "Two Semesters")
              : proposal.duration || "—"
            } />
            {proposal.startDate && <Field label={ar ? "تاريخ البداية" : "Start Date"} value={formatDate(proposal.startDate)} />}
            {proposal.endDate && <Field label={ar ? "تاريخ النهاية" : "End Date"} value={formatDate(proposal.endDate)} />}
          </div>
          <Separator className="my-4" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{ar ? "عنوان المشروع" : "Project Title"}</p>
            <p className="text-base font-semibold">{proposal.title}</p>
          </div>
        </Section>

        {/* 2. Supervisors */}
        <Section icon={<GraduationCap className="w-4 h-4" />} title={ar ? "معلومات المشرف" : "Supervisor Information"}>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border bg-muted/30">
              <p className="text-xs font-semibold text-primary uppercase mb-3">{ar ? "المشرف الرئيسي" : "Main Supervisor"}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{proposal.supervisorName || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{proposal.supervisorEmail || "—"}</span>
                </div>
              </div>
            </div>
            {proposal.coSupervisorName && (
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">{ar ? "المشرف المشارك" : "Co-Supervisor"}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{proposal.coSupervisorName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{proposal.coSupervisorEmail || "—"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* 3. Team Members */}
        <Section icon={<Users className="w-4 h-4" />} title={ar ? "أعضاء الفريق" : "Team Members"}>
          <div className="space-y-3">
            {(proposal.teamMembers || proposal.students || []).map((student: any, index: number) => (
              <div key={index} className="p-4 rounded-lg border bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary">
                    {ar ? `الطالب ${index + 1}` : `Student ${index + 1}`}
                  </span>
                  <Badge variant={student.role === "leader" ? "default" : "outline"} className="text-xs">
                    {student.role === "leader" ? (ar ? "قائد الفريق" : "Team Leader") : (ar ? "عضو" : "Member")}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium">{student.fullName || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{student.studentId || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{student.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{student.phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <GraduationCap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>GPA: {student.gpa || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{student.departmentNameAr || student.department || "—"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 4. Project Details */}
        <Section icon={<Target className="w-4 h-4" />} title={ar ? "تفاصيل المشروع" : "Project Details"}>
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{ar ? "مشكلة البحث" : "Problem Statement"}</p>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{proposal.problemStatement || "—"}</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{ar ? "أهداف المشروع" : "Project Objectives"}</p>
              {Array.isArray(proposal.objectives) ? (
                <ul className="space-y-1.5">
                  {proposal.objectives.map((obj: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">{proposal.objectives || "—"}</p>
              )}
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{ar ? "أهمية المشروع" : "Significance"}</p>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{proposal.significance || "—"}</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{ar ? "مراجعة الأدبيات" : "Literature Review"}</p>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{proposal.literatureReview || "—"}</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{ar ? "المراجع" : "References"}</p>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">{proposal.references || "—"}</p>
            </div>
          </div>
        </Section>

        {/* 5. Timeline */}
        <Section icon={<Calendar className="w-4 h-4" />} title={ar ? "الجدول الزمني" : "Project Timeline"}>
          {proposal.timeline ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-right p-3 font-semibold">{ar ? "المرحلة" : "Phase"}</th>
                    {Object.values(timelineLabels).map((lbl) => (
                      <th key={lbl} className="p-3 text-center font-medium text-xs text-muted-foreground whitespace-nowrap">{lbl}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {phases.map((phase) => (
                    <tr key={phase.key} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-medium text-sm">{ar ? phase.labelAr : phase.label}</td>
                      {Object.keys(timelineLabels).map((val) => (
                        <td key={val} className="p-3 text-center">
                          {proposal.timeline[phase.key] === val ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 bg-primary rounded-full">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </span>
                          ) : (
                            <span className="inline-block w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </Section>

        {/* 6. Declaration */}
        <Section icon={<FileText className="w-4 h-4" />} title={ar ? "إقرار الأمانة الأكاديمية" : "Plagiarism Declaration"}>
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded flex items-center justify-center ${proposal.plagiarismDeclaration ? "bg-primary" : "border-2 border-muted-foreground/40"}`}>
              {proposal.plagiarismDeclaration && <CheckCircle className="w-3.5 h-3.5 text-white" />}
            </div>
            <p className="text-sm text-muted-foreground">
              {ar ? "تم الإقرار بأن هذا العمل أصلي وخالٍ من الانتحال" : "Declared that this work is original and free from plagiarism"}
            </p>
          </div>
        </Section>

        <div className="pb-8" />
      </div>
    </DashboardLayout>
  )
}