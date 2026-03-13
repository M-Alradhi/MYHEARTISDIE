"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { supervisorSidebarItems } from "@/lib/constants/supervisor-sidebar"
import { Users, FolderKanban, Mail, FileText, CheckSquare } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/contexts/auth-context"
import { useLanguage } from "@/lib/contexts/language-context"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function SupervisorStudents() {
  const { userData } = useAuth()
  const { t } = useLanguage()
    const [stats, setStats] = useState({
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalSupervisors: 0,
      totalStudents: 0,
      averageProgress: 0,
      projectsNeedingAttention: 0,
    })
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStudents = async () => {
      if (!userData?.uid) return

      try {
        // Query 1: students where this supervisor is the primary supervisor
        const primaryQuery = query(
          collection(db, "users"),
          where("role", "==", "student"),
          where("supervisorId", "==", userData.uid),
        )
        // Query 2: students where this supervisor is in the supervisorIds array
        const secondaryQuery = query(
          collection(db, "users"),
          where("role", "==", "student"),
          where("supervisorIds", "array-contains", userData.uid),
        )

        const [primarySnapshot, secondarySnapshot] = await Promise.all([
          getDocs(primaryQuery),
          getDocs(secondaryQuery),
        ])

        // Merge results, avoiding duplicates
        const seenIds = new Set<string>()
        const allDocs: any[] = []
        for (const d of [...primarySnapshot.docs, ...secondarySnapshot.docs]) {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id)
            allDocs.push(d)
          }
        }

        const studentsData = await Promise.all(
          allDocs.map(async (doc) => {
            const studentData = { id: doc.id, ...doc.data() }

            let projectData = null

            // First, try to find projects where student is the primary owner
            const primaryProjectsQuery = query(collection(db, "projects"), where("studentId", "==", doc.id))
            const primaryProjectsSnapshot = await getDocs(primaryProjectsQuery)

            if (!primaryProjectsSnapshot.empty) {
              projectData = { id: primaryProjectsSnapshot.docs[0].id, ...primaryProjectsSnapshot.docs[0].data() }
            } else {
              // If not found, check if student is a team member in any project
              const allProjectsQuery = query(collection(db, "projects"))
              const allProjectsSnapshot = await getDocs(allProjectsQuery)

              for (const projectDoc of allProjectsSnapshot.docs) {
                const project = projectDoc.data()
                if (project.studentIds && Array.isArray(project.studentIds) && project.studentIds.includes(doc.id)) {
                  projectData = { id: projectDoc.id, ...project }
                  break
                }
              }
            }

            // Get student's tasks count
            const tasksQuery = query(collection(db, "tasks"), where("studentId", "==", doc.id))
            const tasksSnapshot = await getDocs(tasksQuery)
            const completedTasks = tasksSnapshot.docs.filter((task) => {
              const status = task.data().status
              return status === "graded" || status === "submitted"
            }).length

            return {
              ...studentData,
              project: projectData,
              totalTasks: tasksSnapshot.size,
              completedTasks,
            }
          }),
        )

        setStudents(studentsData)
      } catch (error) {
        console.error("Error fetching students:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [userData])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <DashboardLayout sidebarItems={supervisorSidebarItems} requiredRole="supervisor">
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">{t("myStudents")}</h1>
          <p className="text-muted-foreground mt-2">{t("manageAndMonitorStudents")}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("totalStudents")}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{students.length}</div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("studentsWithProjects")}</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{students.filter((s) => s.project).length}</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("studentsWithoutProjects")}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{students.filter((s) => !s.project).length}</div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card className="rounded-xl">
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">{t("loading")}</p>
            </CardContent>
          </Card>
        ) : students.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <Users className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">{t("noStudentsYet")}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{t("studentsWillBeAssigned")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {students.map((student) => (
              <Card key={student.id} className="rounded-xl hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(student.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{student.name}</CardTitle>
                          <CardDescription className="mt-1">
                            <Badge variant="outline" className="rounded-lg">
                              {student.studentId}
                            </Badge>
                          </CardDescription>
                        </div>
                        {student.project ? (
                          <Badge className="rounded-lg bg-green-500">{t("withProject")}</Badge>
                        ) : (
                          <Badge variant="secondary" className="rounded-lg">
                            {t("withoutProject")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-3">
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground truncate">{student.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t("department")}:</span>
                      <span>{student.department}</span>
                    </div>
                    {student.project && (
                      <div className="flex items-center gap-2">
                        <FolderKanban className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t("project")}:</span>
                        <span>{student.project.title}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t("completedTask")}:</span>
                      <span>{student.completedTasks}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={student.totalTasks ? (student.completedTasks / student.totalTasks) * 100 : 0}
                        className="w-full"
                      />
                    </div>
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