"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, FolderKanban, CheckSquare, Calendar, FileText, Bell, User, Megaphone, Pin } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/contexts/auth-context"
import { useLanguage } from "@/lib/contexts/language-context"
import { useEffect, useState } from "react"
import { getFirebaseDb } from "@/lib/firebase/config"
import { collection, query, where, orderBy, getDocs, getDoc, doc, type Timestamp } from "firebase/firestore"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { studentSidebarItems } from "@/lib/constants/student-sidebar"

interface Announcement {
  id: string
  title: string
  content: string
  authorName: string
  authorRole: string
  projectId?: string
  projectTitle?: string
  isPinned: boolean
  createdAt: Timestamp
  attachments?: { name: string; url: string }[]
}

export default function StudentAnnouncements() {
  const { userData, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (authLoading || !userData) return

      try {
        setLoading(true)
        const db = getFirebaseDb()

        // Get student's project duration from projects OR projectIdeas
        let projectDuration: string | null = null

        // 1. Try from projects collection first
        if (userData.projectId) {
          try {
            const projectSnap = await getDoc(doc(db, "projects", userData.projectId))
            if (projectSnap.exists()) {
              projectDuration = projectSnap.data().duration || null
            }
          } catch {}
        }

        // 2. If not found, try from projectIdeas (student submitted a proposal)
        if (!projectDuration) {
          try {
            const { query: q, collection: col, where: wh, getDocs: gd } = await import("firebase/firestore")
            // Check as leader
            const leaderSnap = await getDocs(
              query(collection(db, "projectIdeas"),
                where("studentId", "==", userData.uid),
                where("status", "in", ["approved", "pending_team_approval", "pending"])
              )
            )
            if (!leaderSnap.empty) {
              projectDuration = leaderSnap.docs[0].data().duration || null
            } else {
              // Check as team member
              const teamSnap = await getDocs(
                query(collection(db, "projectIdeas"), where("isTeamProject", "==", true))
              )
              for (const d of teamSnap.docs) {
                const data = d.data()
                const members = data.teamMembers || []
                if (members.some((m: any) => m.email === userData.email)) {
                  projectDuration = data.duration || null
                  break
                }
              }
            }
          } catch {}
        }

        // Fetch project-specific announcements
        let projectAnnouncements: Announcement[] = []
        if (userData.projectId) {
          const projectQuery = query(
            collection(db, "announcements"),
            where("projectId", "==", userData.projectId),
            orderBy("createdAt", "desc"),
          )
          const projectSnapshot = await getDocs(projectQuery)
          projectAnnouncements = projectSnapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Announcement[]
        }

        // Fetch ALL announcements then filter general ones (projectId == null or missing)
        // Using where("projectId", "==", null) misses docs where projectId field doesn't exist
        const allAnnouncementsQuery = query(
          collection(db, "announcements"),
          orderBy("createdAt", "desc"),
        )
        const allAnnouncementsSnapshot = await getDocs(allAnnouncementsQuery)
        const allAnnouncementsDocs = allAnnouncementsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Announcement[]

        // General = no projectId field, or projectId is null/empty, and not already in projectAnnouncements
        const projectAnnouncementIds = new Set(projectAnnouncements.map((a) => a.id))
        const generalAnnouncements = allAnnouncementsDocs.filter((ann: any) => {
          if (projectAnnouncementIds.has(ann.id)) return false
          return !ann.projectId || ann.projectId === null || ann.projectId === ""
        })

        // Filter general announcements by scope relevance
        const relevantGeneral = generalAnnouncements.filter((ann: any) => {
          const scope = ann.scope || "all"
          if (scope === "all") return true
          // إذا ما عرفنا نوع مشروع الطالب، نعرضله كل الإعلانات
          if (!projectDuration) return true
          // support both old values (one_semester/two_semesters) and new (one-course/two-courses)
          const isOneCourse = projectDuration === "one_semester" || projectDuration === "one-course"
          const isTwoCourses = projectDuration === "two_semesters" || projectDuration === "two-courses"
          if (scope === "single-semester" && isOneCourse) return true
          if (scope === "two-semesters" && isTwoCourses) return true
          return false
        })

        // Combine and sort: pinned first, then by date
        const allAnnouncements = [...projectAnnouncements, ...relevantGeneral].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1
          if (!a.isPinned && b.isPinned) return 1
          return b.createdAt.seconds - a.createdAt.seconds
        })

        setAnnouncements(allAnnouncements)
      } catch (error) {
        console.error("Error fetching announcements:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncements()
  }, [userData, authLoading])

  const filteredAnnouncements = announcements.filter((announcement) => {
    if (activeTab === "all") return true
    if (activeTab === "project") return announcement.projectId
    if (activeTab === "general") return !announcement.projectId
    return true
  })

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate()
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return `${t("today")} ${Math.floor(diffInHours)}`
    } else if (diffInHours < 48) {
      return t("yesterday")
    } else {
      return date.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    }
  }

  return (
    <DashboardLayout sidebarItems={studentSidebarItems} requiredRole="student">
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Megaphone className="w-8 h-8 text-primary" />
              </div>
              {t("announcements")}
            </h1>
            <p className="text-muted-foreground mt-2">{t("latestUpdates")}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all">{t("viewAll")}</TabsTrigger>
            <TabsTrigger value="project">{t("myProject")}</TabsTrigger>
            <TabsTrigger value="general">{t("allProjects")}</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 bg-muted rounded-full mb-4">
                    <Megaphone className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{t("noAnnouncementsYet")}</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">{t("noContent")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {filteredAnnouncements.map((announcement, index) => (
                  <Card
                    key={announcement.id}
                    className={`animate-in fade-in slide-in-from-bottom duration-500 hover:shadow-lg transition-all ${
                      announcement.isPinned ? "border-primary/50 bg-primary/5" : ""
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {announcement.isPinned && (
                              <Badge variant="default" className="gap-1">
                                <Pin className="w-3 h-3" />
                                {t("new")}
                              </Badge>
                            )}
                            {announcement.projectId ? (
                              <Badge variant="secondary">{t("myProject")}</Badge>
                            ) : (
                              <Badge variant="outline">{t("allProjects")}</Badge>
                            )}
                          </div>
                          <CardTitle className="text-xl">{announcement.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{announcement.authorName}</span>
                            <span>•</span>
                            <span>
                              {announcement.authorRole === "supervisor"
                                ? t("supervisor")
                                : announcement.authorRole === "coordinator"
                                  ? t("coordinator")
                                  : ""}
                            </span>
                            <span>•</span>
                            <span>{formatDate(announcement.createdAt)}</span>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{announcement.content}</p>

                      {announcement.projectTitle && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FolderKanban className="w-4 h-4" />
                          <span>{announcement.projectTitle}</span>
                        </div>
                      )}

                      {announcement.attachments && announcement.attachments.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">{t("attachedFiles")}:</p>
                          <div className="space-y-2">
                            {announcement.attachments.map((attachment, idx) => (
                              <a
                                key={idx}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm"
                              >
                                <FileText className="w-4 h-4 text-primary" />
                                <span className="flex-1">{attachment.name}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
