"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { supervisorSidebarItems } from "@/lib/constants/supervisor-sidebar"
import { FolderKanban } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/contexts/auth-context"
import { useLanguage } from "@/lib/contexts/language-context"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { calculateProjectProgress } from "@/lib/utils/grading"

export default function SupervisorProjects() {
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
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userData?.uid) return

    // Query both primary and secondary supervisor projects
    const primaryQuery = query(collection(db, "projects"), where("supervisorId", "==", userData.uid))
    const secondaryQuery = query(collection(db, "projects"), where("supervisorIds", "array-contains", userData.uid))

    let primaryDocs: any[] = []
    let secondaryDocs: any[] = []

    const mergeAndProcess = async () => {
      try {
        const seen = new Set<string>()
        const merged = [...primaryDocs, ...secondaryDocs].filter(d => {
          if (seen.has(d.id)) return false
          seen.add(d.id)
          return true
        })

        const updatedProjects = await Promise.all(
          merged.map(async (project) => {
            try {
              const tasksQuery = query(collection(db, "tasks"), where("projectId", "==", project.id))
              const tasksSnapshot = await getDocs(tasksQuery)
              const tasks = tasksSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
              const progress = calculateProjectProgress(tasks as any[])

              if (progress !== (project as any).progress) {
                await updateDoc(doc(db, "projects", project.id), { progress })
              }

              return { ...project, progress }
            } catch (error) {
              console.error(`Error calculating progress for project ${project.id}:`, error)
              return project
            }
          }),
        )

        setProjects(updatedProjects)
      } catch (error) {
        console.error("Error fetching projects:", error)
      } finally {
        setLoading(false)
      }
    }

    const unsubscribe1 = onSnapshot(primaryQuery, (snapshot) => {
      primaryDocs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      mergeAndProcess()
    }, (err: any) => { if (err?.code !== "permission-denied") console.error(err); setLoading(false) })

    const unsubscribe2 = onSnapshot(secondaryQuery, (snapshot) => {
      secondaryDocs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      mergeAndProcess()
    }, (err: any) => { if (err?.code !== "permission-denied") console.error(err) })

    return () => { unsubscribe1(); unsubscribe2() }
  }, [userData?.uid])

  return (
    <DashboardLayout sidebarItems={supervisorSidebarItems} requiredRole="supervisor">
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("projects")}</h1>
            <p className="text-muted-foreground mt-2">{t("manageAndMonitorProjects")}</p>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-4 lg:p-8">
              <p className="text-center text-muted-foreground">{t("loading")}</p>
            </CardContent>
          </Card>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="p-4 lg:p-8">
              <div className="text-center space-y-4">
                <FolderKanban className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">{t("noProjectsYet")}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{t("projectsWillBeAssigned")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{project.title}</CardTitle>
                      <CardDescription className="mt-2">{project.description}</CardDescription>
                    </div>
                    <Badge variant={project.status === "active" ? "default" : "secondary"}>
                      {project.status === "active" ? t("active") : project.status === "completed" ? t("completed") : t("pending")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{t("progress")}</span>
                      <span className="text-sm text-muted-foreground">{project.progress || 0}%</span>
                    </div>
                    <Progress value={project.progress || 0} />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {t("startDate")}:{" "}
                      {project.startDate
                        ? new Date(project.startDate.seconds * 1000).toLocaleDateString("ar-EG")
                        : t("notSet")}
                    </div>
                    <Link href={`/supervisor/tasks?projectId=${project.id}`}>
                      <Button size="sm">{t("viewDetails")}</Button>
                    </Link>
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