"use client"

import type React from "react"
import { toProxyViewUrl, toProxyDownloadUrl } from "@/lib/utils/file-proxy"
import { useSearchParams } from "next/navigation"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import {
  Users,
  Award,
  Plus,
  Edit,
  Upload,
  CheckCircle2,
  Clock,
  Download,
  FileIcon,
  ImageIcon,
  ExternalLink,
  X,
  File,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/contexts/auth-context"
import { useLanguage } from "@/lib/contexts/language-context"
import { useEffect, useMemo, useState } from "react"
import { getFirebaseDb } from "@/lib/firebase/config"
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc, Timestamp, orderBy, addDoc } from "firebase/firestore"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createNotification } from "@/lib/firebase/notifications"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import type { SubmittedFile } from "@/lib/types"
import { supervisorSidebarItems } from "@/lib/constants/supervisor-sidebar"
import { uploadFileToStorage, isImageFile } from "@/lib/firebase/storage"
import { calculateProjectProgress } from "@/lib/utils/grading"

interface Student {
  id: string
  name: string
  email: string
  projectId: string
  projectTitle?: string
}

interface Task {
  id: string
  studentId: string
  studentName: string
  projectId: string
  title: string
  description: string
  maxGrade: number
  weight: number
  dueDate: any
  status: "pending" | "submitted" | "graded"
  submissionText?: string
  submittedFiles?: SubmittedFile[]
  submittedAt?: any
  grade?: number
  feedback?: string
  gradedAt?: any
  gradedBy?: string
  createdAt: any
  supervisorFiles?: SubmittedFile[]
}

function normalizeKeyPart(v: unknown) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\- ]+/g, "")
    .replace(/\s/g, "_")
}


export default function SupervisorTasks() {
  const { userData, loading: authLoading } = useAuth()
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

  const [students, setStudents] = useState<Student[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const projectId = searchParams.get("projectId")

  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const [submittingTask, setSubmittingTask] = useState(false)

  const [taskForm, setTaskForm] = useState({
    studentId: "",
    projectId: "",
    title: "",
    description: "",
    maxGrade: "100",
    weight: "10",
    dueDate: "",
    assignToAllMembers: false,
  })

  const [gradeForm, setGradeForm] = useState({
    grade: "",
    feedback: "",
  })

  
  const [supervisorFiles, setSupervisorFiles] = useState<File[]>([])
  const [uploadedSupervisorFiles, setUploadedSupervisorFiles] = useState<SubmittedFile[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)

 
  const [createSupervisorFiles, setCreateSupervisorFiles] = useState<File[]>([])
  const [createUploadedSupervisorFiles, setCreateUploadedSupervisorFiles] = useState<SubmittedFile[]>([])
  const [createUploadingFiles, setCreateUploadingFiles] = useState(false)

  useEffect(() => {
    if (!authLoading && userData) {
      let unsubscribe: (() => void) | null = null
      fetchData().then((unsub) => {
        if (unsub) unsubscribe = unsub
      })
      return () => { if (unsubscribe) unsubscribe() }
    }
  }, [userData, authLoading])

  const fetchData = async () => {
    if (!userData) return

    try {
      setLoading(true)
      const db = getFirebaseDb()

      const projectsQuery = query(collection(db, "projects"), where("supervisorId", "==", userData.uid))
      const projectsQuerySecondary = query(collection(db, "projects"), where("supervisorIds", "array-contains", userData.uid))
      const [projectsSnapshot, projectsSnapshotSecondary] = await Promise.all([
        getDocs(projectsQuery),
        getDocs(projectsQuerySecondary),
      ])
      const projectsMap = new Map()
      const allStudentIds = new Set<string>()

      const allProjectDocs = [...projectsSnapshot.docs, ...projectsSnapshotSecondary.docs]
        .filter((d, i, arr) => arr.findIndex(x => x.id === d.id) === i) // deduplicate

      allProjectDocs.forEach((d) => {
        const projectData = d.data()
        projectsMap.set(d.id, {
          id: d.id,
          title: projectData.title,
          studentId: projectData.studentId,
          studentIds: projectData.studentIds || [],
          supervisorIds: projectData.supervisorIds || [projectData.supervisorId].filter(Boolean),
        })

        allStudentIds.add(projectData.studentId)
        if (projectData.studentIds && Array.isArray(projectData.studentIds)) {
          projectData.studentIds.forEach((id: string) => allStudentIds.add(id))
        }
      })

      const usersQuery = query(collection(db, "users"))
      const usersSnapshot = await getDocs(usersQuery)
      const usersMap = new Map()

      usersSnapshot.docs.forEach((d) => {
        usersMap.set(d.id, { id: d.id, ...d.data() })
      })

      const studentsData: Student[] = []
      const processedStudents = new Set<string>()

      projectsMap.forEach((project) => {
        const projectStudentIds = new Set([project.studentId, ...(project.studentIds || [])])

        projectStudentIds.forEach((studentId) => {
          if (processedStudents.has(studentId)) return
          const u = usersMap.get(studentId)
          if (!u) return

          studentsData.push({
            id: studentId,
            name: u.name || t("student") + " " + studentId.slice(0, 5),
            email: u.email || "",
            projectId: project.id,
            projectTitle: project.title,
          })
          processedStudents.add(studentId)
        })
      })

      setStudents(studentsData)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error(t("errorLoadingData"))
    } finally {
      setLoading(false)
    }

    // Real-time listener for tasks — primary + secondary supervisor
    const db2 = getFirebaseDb()
    const tasksQuery = query(
      collection(db2, "tasks"),
      where("supervisorId", "==", userData.uid),
      orderBy("createdAt", "desc"),
    )

    // Also get tasks from projects where this supervisor is secondary
    let primaryTasks: any[] = []
    let secondaryTasks: any[] = []
    const mergeAndSetTasks = () => {
      const seen = new Set<string>()
      const merged = [...primaryTasks, ...secondaryTasks].filter((t) => {
        if (seen.has(t.id)) return false
        seen.add(t.id)
        return true
      }) as Task[]
      setTasks(merged)
    }

    const unsubPrimary = onSnapshot(tasksQuery, (snapshot) => {
      primaryTasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      mergeAndSetTasks()
    })

    // Get secondary project IDs then listen to their tasks
    getDocs(query(collection(db2, "projects"), where("supervisorIds", "array-contains", userData.uid))).then((projSnap) => {
      const projIds = projSnap.docs.map((d) => d.id).filter((id) => id)
      if (projIds.length === 0) return
      // Firestore `in` supports max 30 items
      const chunks = []
      for (let i = 0; i < projIds.length; i += 10) chunks.push(projIds.slice(i, i + 10))
      chunks.forEach((chunk) => {
        onSnapshot(
          query(collection(db2, "tasks"), where("projectId", "in", chunk), orderBy("createdAt", "desc")),
          (snapshot) => {
            const newTasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
            secondaryTasks = [
              ...secondaryTasks.filter((t) => !newTasks.find((nt) => nt.id === t.id)),
              ...newTasks,
            ]
            mergeAndSetTasks()
          }
        )
      })
    }).catch(() => {})

    return unsubPrimary
  }

 
  const handleCreateSupervisorFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setCreateSupervisorFiles((prev) => [...prev, ...files])
    }
  }

  const removeCreateSupervisorFile = (index: number) => {
    setCreateSupervisorFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeCreateUploadedSupervisorFile = (index: number) => {
    setCreateUploadedSupervisorFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUploadCreateSupervisorFiles = async () => {
    if (createSupervisorFiles.length === 0) return

    setCreateUploadingFiles(true)
    try {
      const uploadedFiles: SubmittedFile[] = []

      for (const file of createSupervisorFiles) {
        const result = await uploadFileToStorage(file, userData?.uid || "supervisor", "supervisor-files")
        uploadedFiles.push({
          name: file.name,
          url: result.url,
          downloadUrl: result.downloadUrl,
          size: file.size,
          type: file.type,
          isImage: result.isImage,
        })
      }

      setCreateUploadedSupervisorFiles((prev) => [...prev, ...uploadedFiles])
      setCreateSupervisorFiles([])
      toast.success(`${t("filesUploaded")} ${uploadedFiles.length} ${t("fileForTask")}`)
    } catch (error) {
      console.error("Error uploading create files:", error)
      toast.error(t("errorUploadingTaskFiles"))
    } finally {
      setCreateUploadingFiles(false)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()

    if (submittingTask) return
    setSubmittingTask(true)

    try {
      if (!taskForm.title || !taskForm.maxGrade || !taskForm.weight || !taskForm.dueDate) {
        toast.error(t("pleaseFillAllRequiredFields"))
        return
      }

      if (!taskForm.assignToAllMembers && !taskForm.studentId) {
        toast.error(t("pleaseChooseStudentOrAssignToAll"))
        return
      }

      const maxGrade = Number.parseFloat(taskForm.maxGrade)
      const weight = Number.parseFloat(taskForm.weight)

      if (maxGrade <= 0 || maxGrade > 100) {
        toast.error(t("maxGradeMustBeBetween1And100"))
        return
      }

      if (weight <= 0 || weight > 100) {
        toast.error(t("weightMustBeBetween1And100"))
        return
      }

      if (!userData?.uid) {
        toast.error(t("errorSupervisorNotIdentified"))
        return
      }

      const db = getFirebaseDb()

      let targetStudents: Student[] = []

      if (taskForm.assignToAllMembers) {
        if (!taskForm.projectId) {
          toast.error(t("pleaseChooseProjectBeforeAssigningToAll"))
          return
        }
        targetStudents = students.filter((s) => s.projectId === taskForm.projectId)
        if (targetStudents.length === 0) {
          toast.error(t("noStudentsInSelectedProject"))
          return
        }
      } else {
        const student = students.find((s) => s.id === taskForm.studentId)
        if (!student) {
          toast.error(t("selectedStudentNotFound"))
          return
        }
        targetStudents = [student]
      }

      const dueAt = Timestamp.fromDate(new Date(`${taskForm.dueDate}T23:59:59`))

      const writePromises = targetStudents.map((student) => {
        const project = projectsMap.get(student.projectId)
        const taskData: Record<string, unknown> = {
          studentId: student.id,
          studentName: student.name,
          projectId: student.projectId || "",
          supervisorId: userData.uid,
          supervisorIds: project?.supervisorIds || [userData.uid],
          title: taskForm.title,
          description: taskForm.description || "",
          maxGrade,
          weight,
          dueDate: dueAt,
          status: "pending" as const,
          createdAt: Timestamp.now(),
          supervisorFiles: createUploadedSupervisorFiles.length > 0 ? createUploadedSupervisorFiles : [],
        }

        return addDoc(collection(db, "tasks"), taskData)
      })

      await Promise.all(writePromises)

      const notificationPromises = targetStudents.map((student) =>
        createNotification({
          userId: student.id,
          title: t("newTask"),
          message: `${t("newTaskAssignedSuccessfully")}: ${taskForm.title} -${t("dueDate")}: ${new Date(
            taskForm.dueDate,
          ).toLocaleDateString("ar-EG")}`,
          type: "task",
          link: "/student/tasks",
        }),
      )
      await Promise.all(notificationPromises)

      toast.success(`${t("newTaskAssignedSuccessfullyFor")}: ${targetStudents.length} ${t("studentAndSendingNotifications")}`)

      setTaskDialogOpen(false)
      setTaskForm({
        studentId: "",
        projectId: "",
        title: "",
        description: "",
        maxGrade: "100",
        weight: "10",
        dueDate: "",
        assignToAllMembers: false,
      })

      // ✅ reset create attachments
      setCreateSupervisorFiles([])
      setCreateUploadedSupervisorFiles([])
      setCreateUploadingFiles(false)

      await fetchData()
    } catch (error) {
      console.error("Error creating task:", error)
      toast.error(t("errorCreatingTask"))
    } finally {
      setSubmittingTask(false)
    }
  }

  const handleGradeTask = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTask || !gradeForm.grade) {
      toast.error(t("pleaseEnterGrade"))
      return
    }

    const grade = Number.parseFloat(gradeForm.grade)

    if (grade < 0 || grade > selectedTask.maxGrade) {
      toast.error(`${t("gradeMustBeBetween0And")}${selectedTask.maxGrade}`)
      return
    }

    try {
      const db = getFirebaseDb()

      const teamTasksQuery = query(
        collection(db, "tasks"),
        where("projectId", "==", selectedTask.projectId),
        where("title", "==", selectedTask.title),
      )
      const teamTasksSnapshot = await getDocs(teamTasksQuery)

      const studentIds = teamTasksSnapshot.docs.map((d) => d.data().studentId)

      const updatePromises = teamTasksSnapshot.docs.map((taskDoc) =>
        updateDoc(doc(db, "tasks", taskDoc.id), {
          grade,
          feedback: gradeForm.feedback || "",
          status: "graded",
          gradedAt: Timestamp.now(),
          gradedBy: userData?.uid || "",
          gradingFiles: uploadedSupervisorFiles.length > 0 ? uploadedSupervisorFiles : [],
        }),
      )

      await Promise.all(updatePromises)

      const notificationPromises = studentIds.map((studentId) =>
        createNotification({
          userId: studentId,
          title: t("gradeUpdated"),
          message: `${t("gradeUpdated")}: "${selectedTask.title}" - ${t("grade")}: ${grade}/${selectedTask.maxGrade}`,
          type: "grade",
          link: "/student/tasks",
        }),
      )

      await Promise.all(notificationPromises)

      // ✅ Recalculate and update project progress after grading
      if (selectedTask.projectId) {
        try {
          const allTasksSnap = await getDocs(query(collection(db, "tasks"), where("projectId", "==", selectedTask.projectId)))
          const allTasks = allTasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
          const newProgress = calculateProjectProgress(allTasks as any[])
          await updateDoc(doc(db, "projects", selectedTask.projectId), { progress: newProgress })
        } catch (e) { console.error("Error updating project progress:", e) }
      }

      toast.success(`${t("TheTaskWasAssessedForAllTeamMembers")}(${studentIds.length} ${t("students")})`)
      setGradeDialogOpen(false)
      setSelectedTask(null)
      setGradeForm({ grade: "", feedback: "" })
      setSupervisorFiles([])
      setUploadedSupervisorFiles([])
      fetchData()
    } catch (error) {
      console.error("Error grading task:", error)
      toast.error(t("errorGradingTask"))
    }
  }

  const openGradeDialog = (task: Task) => {
    setSelectedTask(task)
    setGradeForm({
      grade: task.grade?.toString() || "",
      feedback: task.feedback || "",
    })
    // grading files (optional)
    setUploadedSupervisorFiles(((task as any).gradingFiles as SubmittedFile[]) || [])
    setSupervisorFiles([])
    setGradeDialogOpen(true)
  }

  const handleSupervisorFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setSupervisorFiles((prev) => [...prev, ...files])
    }
  }

  const removeSupervisorFile = (index: number) => {
    setSupervisorFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeUploadedSupervisorFile = (index: number) => {
    setUploadedSupervisorFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUploadSupervisorFiles = async () => {
    if (supervisorFiles.length === 0) return

    setUploadingFiles(true)
    try {
      const uploadedFiles: SubmittedFile[] = []

      for (const file of supervisorFiles) {
        const result = await uploadFileToStorage(file, userData?.uid || "supervisor", "supervisor-files")
        uploadedFiles.push({
          name: file.name,
          url: result.url,
          downloadUrl: result.downloadUrl,
          size: file.size,
          type: file.type,
          isImage: result.isImage,
        })
      }

      setUploadedSupervisorFiles((prev) => [...prev, ...uploadedFiles])
      setSupervisorFiles([])
      toast.success(`${t("filesUploaded")}${uploadedFiles.length} ${t("files")}${t("uploadedSuccessfully")}`)
    } catch (error) {
      console.error("Error uploading files:", error)
      toast.error(t("errorUploadingTaskFile"))
    } finally {
      setUploadingFiles(false)
    }
  }

  const getGradeColor = (grade: number, maxGrade: number) => {
    const percentage = (grade / maxGrade) * 100
    if (percentage >= 85) return "text-green-600 dark:text-green-500"
    if (percentage >= 70) return "text-blue-600 dark:text-blue-500"
    if (percentage >= 50) return "text-amber-600 dark:text-amber-500"
    return "text-red-600 dark:text-red-500"
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return t("notSet")
    return timestamp.toDate().toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStudentTasks = (studentId: string) => tasks.filter((t) => t.studentId === studentId)

  const calculateStudentGrade = (studentId: string) => {
    const studentTasks = getStudentTasks(studentId).filter((t) => t.status === "graded")
    if (studentTasks.length === 0) return { total: 0, weighted: 0, percentage: 0 }

    const weightedSum = studentTasks.reduce((sum, t) => {
      const taskPercentage = ((t.grade || 0) / t.maxGrade) * 100
      return sum + taskPercentage * (t.weight / 100)
    }, 0)

    const totalWeight = studentTasks.reduce((sum, t) => sum + t.weight, 0)
    const percentage = totalWeight > 0 ? weightedSum : 0

    return {
      total: Math.round(percentage),
      weighted: Math.round(weightedSum * 10) / 10,
      percentage: Math.round(percentage),
    }
  }

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="secondary"
            className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
          >
            <Clock className="w-3 h-3" />
              {t("inProgress")}
          </Badge>
        )
      case "submitted":
        return (
          <Badge variant="default" className="gap-1 bg-blue-500">
            <Upload className="w-3 h-3" />
              {t("submitted")}
          </Badge>
        )
      case "graded":
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <CheckCircle2 className="w-3 h-3" />
              {t("graded")}
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const filteredTasks = projectId ? tasks.filter((t) => t.projectId === projectId) : tasks

  const pendingTasks = useMemo(() => filteredTasks.filter((t) => t.status === "pending"), [filteredTasks])
  const submittedTasks = useMemo(() => filteredTasks.filter((t) => t.status === "submitted"), [filteredTasks])
  const gradedTasks = useMemo(() => filteredTasks.filter((t) => t.status === "graded"), [filteredTasks])

  return (
    <DashboardLayout sidebarItems={supervisorSidebarItems} requiredRole="supervisor">
      <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                <Award className="w-8 h-8 text-primary" />
              </div>
             {t("manageTasksAndEvaluation")}
            </h1>
            <p className="text-muted-foreground mt-2"> {t("tasksAndEvaluationDescription")} </p>
          </div>

          <Dialog
            open={taskDialogOpen}
            onOpenChange={(open) => {
              setTaskDialogOpen(open)
              if (!open) {
                // reset create attachments if dialog closes
                setCreateSupervisorFiles([])
                setCreateUploadedSupervisorFiles([])
                setCreateUploadingFiles(false)
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg">
                <Plus className="w-4 h-4" />
                  {t("newTask")}
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("addNewTask")}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="assignToAllMembers" className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="assignToAllMembers"
                      checked={taskForm.assignToAllMembers}
                      onChange={(e) =>
                        setTaskForm({ ...taskForm, assignToAllMembers: e.target.checked, studentId: "" })
                      }
                      className="rounded"
                    />
                     {t("assignTaskToAllMembers")}
                  </Label>
                </div>

                {taskForm.assignToAllMembers ? (
                  <div className="space-y-2">
                    <Label htmlFor="project">{t("project")} *</Label>
                    <Select
                      value={taskForm.projectId}
                      onValueChange={(value) => setTaskForm({ ...taskForm, projectId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("pleaseChooseProject")} />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from(new Set(students.filter((s) => s.projectId).map((s) => s.projectId))).map(
                          (projectId) => {
                            const projectStudents = students.filter((s) => s.projectId === projectId)
                            const projectTitle = projectStudents[0]?.projectTitle || t("projectWithoutTitle")
                            return (
                              <SelectItem key={projectId} value={projectId}>
                                {projectTitle} ({projectStudents.length} {t("student")})
                              </SelectItem>
                            )
                          },
                        )}
                      </SelectContent>
                    </Select>

                    {taskForm.projectId && (
                      <p className="text-sm text-muted-foreground">
                       {t("taskAddTo")}{students.filter((s) => s.projectId === taskForm.projectId).length} {t("student")}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="student">{t("student")} *</Label>
                    <Select
                      value={taskForm.studentId}
                      onValueChange={(value) => setTaskForm({ ...taskForm, studentId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("pleaseChooseStudent")} />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name} - {student.projectTitle || t("withoutProject")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="title">{t("taskTitle")} *</Label>
                  <Input
                    id="title"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    placeholder={t("exSendLastReport")}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t("taskDescription")}</Label>
                  <Textarea
                    id="description"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    placeholder={t("taskDescriptionPlaceholder")}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxGrade">{t("maxGrad")} *</Label>
                    <Input
                      id="maxGrade"
                      type="number"
                      min="1"
                      max="100"
                      value={taskForm.maxGrade}
                      onChange={(e) => setTaskForm({ ...taskForm, maxGrade: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight">{t("weight")} (%) *</Label>
                    <Input
                      id="weight"
                      type="number"
                      min="1"
                      max="100"
                      step="0.1"
                      value={taskForm.weight}
                      onChange={(e) => setTaskForm({ ...taskForm, weight: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">{t("sendDate")} *</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* ✅ NEW: Supervisor attachments for task */}
                <div className="space-y-3 pt-2">
                  <Label className="text-base flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                      {t("fileTask")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                   {t("taskFilesDescription")} 
                  </p>

                  {createUploadedSupervisorFiles.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground"> {t("uploadedFile")}:</Label>
                      {createUploadedSupervisorFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900"
                        >
                          <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded">
                            {file.isImage ? (
                              <ImageIcon className="w-4 h-4 text-green-600" />
                            ) : (
                              <File className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCreateUploadedSupervisorFile(index)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {createSupervisorFiles.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground"> {t("fileReadyToUpload")}:</Label>
                      {createSupervisorFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg border">
                          <div className="p-1.5 bg-muted rounded">
                            {isImageFile(file) ? (
                              <ImageIcon className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <File className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCreateSupervisorFile(index)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleUploadCreateSupervisorFiles}
                        disabled={createUploadingFiles}
                        className="w-full bg-transparent"
                      >
                        {createUploadingFiles ? "جاري الرفع..." : `رفع ${createSupervisorFiles.length} ملف`}
                      </Button>
                    </div>
                  )}

                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      onChange={handleCreateSupervisorFileSelect}
                      className="hidden"
                      id="create-supervisor-file-upload"
                      disabled={createUploadingFiles}
                    />
                    <label htmlFor="create-supervisor-file-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground"> {t("dragAndDropFile")}</p>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTaskDialogOpen(false)}
                    disabled={submittingTask || createUploadingFiles}
                  >
                    {t("cancel")}
                  </Button>

                  <Button type="submit" disabled={submittingTask || createUploadingFiles}>
                    {submittingTask ? t("addingTask") : t("addTask")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalTasks")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{tasks.length}</div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow border-amber-200 dark:border-amber-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("inPending")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{pendingTasks.length}</div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow border-blue-200 dark:border-blue-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("submittedTasks")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{submittedTasks.length}</div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow border-green-200 dark:border-green-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("gradedTasks")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{gradedTasks.length}</div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-1/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : students.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("noStudents")}</h3>
              <p className="text-sm text-muted-foreground">{t("ThereAreNoStudentsCurrentlyRegisteredUnderYourSupervision")}</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="by-student" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 text-xs sm:text-sm">
              <TabsTrigger value="by-student" className="px-1 sm:px-3">{t("byStudent")}</TabsTrigger>
              <TabsTrigger value="by-project" className="px-1 sm:px-3">{t("byProject")}</TabsTrigger>
              <TabsTrigger value="by-status" className="px-1 sm:px-3">{t("byStatus")}</TabsTrigger>
            </TabsList>

            <TabsContent value="by-student" className="space-y-6">
              {students.map((student, index) => {
                const studentTasks = getStudentTasks(student.id)
                const gradeInfo = calculateStudentGrade(student.id)

                return (
                  <Card
                    key={student.id}
                    className="animate-in fade-in slide-in-from-bottom duration-500 hover:shadow-lg transition-shadow"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader className="p-3 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 flex-shrink-0">
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-lg">
                              {student.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base sm:text-lg truncate">{student.name}</CardTitle>
                            <CardDescription className="truncate">{student.projectTitle || t("withoutProject")}</CardDescription>
                          </div>
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 sm:text-left">
                          <div className="flex items-center gap-1">
                            <div className="text-2xl sm:text-3xl font-bold text-primary">{gradeInfo.total}</div>
                            <div className="text-muted-foreground text-sm">/100</div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {studentTasks.filter((t) => t.status === "graded").length} {t("from")} {studentTasks.length} {t("task")}
                          </p>
                          <Progress value={gradeInfo.percentage} className="w-24 sm:w-32 h-2" />
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      {studentTasks.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground bg-muted/50 rounded-lg">
                          <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>{t("noTasksYetForThisStudent")}</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {studentTasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer gap-2 sm:gap-0"
                              onClick={() => task.status === "submitted" && openGradeDialog(task)}
                            >
                              <div className="flex-1 space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-sm sm:text-base">{task.title}</p>
                                  {getTaskStatusBadge(task.status)}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                                  <span>{t("maxGrade")}: {task.maxGrade}</span>
                                  <span>{t("weight")}: {task.weight}%</span>
                                  <span>{t("sendd")}: {formatDate(task.dueDate)}</span>
                                </div>
                                {task.description && (
                                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 sm:gap-3 sm:mr-4">
                                {task.status === "graded" ? (
                                  <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0">
                                    <div className="text-xl sm:text-2xl font-bold text-green-600">{task.grade}<span className="text-xs text-muted-foreground font-normal">/{task.maxGrade}</span></div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs"
                                      onClick={(ev) => {
                                        ev.stopPropagation()
                                        openGradeDialog(task)
                                      }}
                                    >
                                      <Edit className="w-3 h-3 ml-1" />
                                      {t("edit")}
                                    </Button>
                                  </div>
                                ) : task.status === "submitted" ? (
                                  <Button size="sm" className="gap-1 text-xs sm:text-sm">
                                    <Award className="w-3 h-3 sm:w-4 sm:h-4" />
                                    {t("grade")}
                                  </Button>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">{t("NoSubmitted")}</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </TabsContent>

            <TabsContent value="by-project" className="space-y-6">
              {Array.from(new Set(students.map((s) => s.projectId))).map((projectId, index) => {
                const projectStudents = students.filter((s) => s.projectId === projectId)
                const projectTitle = projectStudents[0]?.projectTitle || t("projectWithoutTitle")
                const projectTasks = tasks.filter((t) => t.projectId === projectId)
                const gradedCount = projectTasks.filter((t) => t.status === "graded").length
                const submittedCount = projectTasks.filter((t) => t.status === "submitted").length
                const pendingCount = projectTasks.filter((t) => t.status === "pending").length
                const avgGrade =
                  gradedCount > 0
                    ? Math.round(
                        projectTasks
                          .filter((t) => t.status === "graded")
                          .reduce((sum, t) => sum + ((t.grade || 0) / t.maxGrade) * 100, 0) / gradedCount,
                      )
                    : 0

                return (
                  <Card
                    key={projectId}
                    className="animate-in fade-in slide-in-from-bottom duration-500 hover:shadow-lg transition-shadow"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{projectTitle}</CardTitle>
                          <CardDescription className="mt-1">
                            {projectStudents.length} {t("student")} • {projectTasks.length} {t("task")}
                          </CardDescription>
                        </div>
                        <div className="text-left space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-2xl font-bold text-primary">{avgGrade}</span>
                            <span className="text-muted-foreground text-sm">/100</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{t("averageGrade")}</p>
                          <Progress value={avgGrade} className="w-28 h-2" />
                        </div>
                      </div>

                      <div className="flex gap-3 mt-3">
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 gap-1">
                          <Clock className="w-3 h-3" />
                          {pendingCount} {t("waiting")}
                        </Badge>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 gap-1">
                          <Upload className="w-3 h-3" />
                          {submittedCount} {t("submitt")}
                        </Badge>
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {gradedCount} {t("gradedd")}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent>
                      {projectTasks.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground bg-muted/50 rounded-lg">
                          <Award className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p>{t("noTasksYetForThisProject")}</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Group tasks by title (team tasks) */}
                          {Array.from(new Set(projectTasks.map((t) => t.title))).map((taskTitle) => {
                            const taskGroup = projectTasks.filter((t) => t.title === taskTitle)
                            const firstTask = taskGroup[0]
                            const allGraded = taskGroup.every((t) => t.status === "graded")
                            const anySubmitted = taskGroup.some((t) => t.status === "submitted")

                            return (
                              <div
                                key={taskTitle}
                                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => anySubmitted && openGradeDialog(taskGroup.find((t) => t.status === "submitted")!)}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold">{taskTitle}</p>
                                    {getTaskStatusBadge(allGraded ? "graded" : anySubmitted ? "submitted" : "pending")}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{t("grade")}: {firstTask.maxGrade}</span>
                                    <span>•</span>
                                    <span>{t("weight")}: {firstTask.weight}%</span>
                                    <span>•</span>
                                    <span>{t("sendd")}: {formatDate(firstTask.dueDate)}</span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mt-2">
                                  {taskGroup.map((task) => (
                                    <Badge
                                      key={task.id}
                                      variant={task.status === "graded" ? "default" : task.status === "submitted" ? "secondary" : "outline"}
                                      className="text-xs gap-1"
                                    >
                                      {task.studentName}
                                      {task.status === "graded" && (
                                        <span className="font-bold text-green-600 dark:text-green-400">
                                          {" "}{task.grade}/{task.maxGrade}
                                        </span>
                                      )}
                                    </Badge>
                                  ))}
                                </div>

                                {anySubmitted && !allGraded && (
                                  <div className="mt-3">
                                    <Button
                                      size="sm"
                                      className="gap-1"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openGradeDialog(taskGroup.find((t) => t.status === "submitted")!)
                                      }}
                                    >
                                      <Award className="w-3 h-3" />
                                        {t("gradeTask")}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </TabsContent>

            <TabsContent value="by-status" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-500" />
                      {t("submittedTask")}({submittedTasks.length})
                  </CardTitle>
                  <CardDescription>{t("waitingForEvaluation")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {submittedTasks.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">{t("noSubmittedTasks")}</p>
                  ) : (
                    <div className="space-y-3">
                      {submittedTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => openGradeDialog(task)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold">{task.title}</p>
                              <Badge variant="secondary">{task.studentName}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {t("taskSubmitted")}: {formatDate(task.submittedAt)} • {t("maxGrade")}: {task.maxGrade} • {t("weight")}:{" "}
                              {task.weight}%
                            </p>
                          </div>
                          <Button className="gap-2" onClick={() => openGradeDialog(task)}>
                            <Award className="w-4 h-4" />
                              {t("gradeNow")}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500" />
                    {t("taskWaiting")}({pendingTasks.length})
                  </CardTitle>
                  <CardDescription>{t("taskNotSubmitted")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingTasks.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">{t("noPendingTasks")}</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingTasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-4 rounded-lg border">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold">{task.title}</p>
                              <Badge variant="secondary">{task.studentName}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {t("taskSubmitted")}: {formatDate(task.dueDate)} • {t("maxGrade")}: {task.maxGrade} • {t("weight")}: {task.weight}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    {t("gradedTas")} ({gradedTasks.length})
                  </CardTitle>
                  <CardDescription>{t("gradedTasksSuccess")}</CardDescription>
                </CardHeader>
                {gradedTasks.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">{t("noGradedTasks")}</p>
                ) : (
                  <div className="space-y-3">
                    {gradedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900 cursor-pointer hover:shadow-md transition-shadow mx-2"
                        onClick={() => openGradeDialog(task)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">{task.title}</p>
                            <Badge variant="secondary">{task.studentName}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t("evaluationDone")}: {formatDate(task.gradedAt)} • {t("weight")}: {task.weight}%
                          </p>
                        </div>
                        <div className="text-left">
                          <div className={`text-2xl font-bold ${getGradeColor(task.grade!, task.maxGrade)}`}>
                            {task.grade}/{task.maxGrade}
                          </div>
                          <Button size="sm" variant="outline" className="mt-2 bg-transparent">
                            <Edit className="w-3 h-3 ml-1" />
                            {t("edit")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">{t("gradeTask")}</DialogTitle>
            </DialogHeader>

            {selectedTask && (
              <div className="space-y-5">
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      {selectedTask.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-3 flex-wrap">
                      <span>{t("student")}: {selectedTask.studentName}</span>
                      <span>•</span>
                      <span>{t("maxGrade")}: {selectedTask.maxGrade}</span>
                      <span>•</span>
                      <span>{t("weight")}: {selectedTask.weight}%</span>
                    </CardDescription>
                  </CardHeader>
                  {selectedTask.description && (
                    <CardContent>
                      <Label className="text-sm font-medium">{t("taskDescription")}:</Label>
                      <p className="text-sm text-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                        {selectedTask.description}
                      </p>
                    </CardContent>
                  )}
                </Card>

                {selectedTask.status !== "pending" && (
                  <Card className="border-2 bg-blue-50/50 dark:bg-blue-950/10">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Upload className="w-5 h-5 text-blue-600" />
                        {t("submissionDetails")}
                      </CardTitle>
                      <CardDescription>{t("submittedTasks")}: {formatDate(selectedTask.submittedAt)}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedTask.submissionText && (
                        <div>
                          <Label className="text-sm font-medium">{t("studentNotes")}:</Label>
                          <p className="text-sm text-foreground mt-1 whitespace-pre-wrap bg-white dark:bg-gray-900 p-3 rounded-lg border">
                            {selectedTask.submissionText}
                          </p>
                        </div>
                      )}

                      {selectedTask.submittedFiles && selectedTask.submittedFiles.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            {t("uploadFile")}: ({selectedTask.submittedFiles.length}):
                          </Label>
                          <div className="space-y-2">
                            {selectedTask.submittedFiles.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border hover:border-blue-400 transition-all group hover:shadow-md"
                              >
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                  {file.isImage ? (
                                    <ImageIcon className="w-5 h-5 text-blue-600" />
                                  ) : (
                                    <FileIcon className="w-5 h-5 text-blue-600" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors">
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(file.size)}
                                    {file.isImage && ` • ${t("image")}`}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
        onClick={() => window.open(toProxyViewUrl(file), "_blank", "noopener,noreferrer")}
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const href = toProxyDownloadUrl(file)
                                      const link = document.createElement("a")
                                      link.href = href
                                      link.setAttribute("download", file.name)
                                      link.setAttribute("target", "_blank")
                                      link.setAttribute("rel", "noopener noreferrer")
                                      document.body.appendChild(link)
                                      link.click()
                                      document.body.removeChild(link)
                                    }}
                                    className="p-1 text-muted-foreground hover:text-blue-600"
                                    title={t("downloaded")}
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <form onSubmit={handleGradeTask} className="space-y-4">
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Award className="w-5 h-5 text-primary" />
                        {t("evaluation")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="grade" className="text-base">
                          {t("grade")} * ({t("from")} {selectedTask.maxGrade})
                        </Label>
                        <Input
                          id="grade"
                          type="number"
                          min="0"
                          max={selectedTask.maxGrade}
                          step="0.5"
                          value={gradeForm.grade}
                          onChange={(ev) => setGradeForm({ ...gradeForm, grade: ev.target.value })}
                          placeholder={`0 - ${selectedTask.maxGrade}`}
                          required
                          className="text-lg font-semibold"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="feedback" className="text-base">
                          {t("studentFeedback")}
                        </Label>
                        <Textarea
                          id="feedback"
                          value={gradeForm.feedback}
                          onChange={(ev) => setGradeForm({ ...gradeForm, feedback: ev.target.value })}
                          placeholder={t("feedbackPlaceholder")}
                          rows={6}
                          className="resize-none"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="text-base flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          {t("attachFilesForEvaluation")}
                        </Label>
                        <p className="text-xs text-muted-foreground"> {t("youCanAttachFiles")}</p>

                        {uploadedSupervisorFiles.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground"> {t("attachedFiles")}</Label>
                            {uploadedSupervisorFiles.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900"
                              >
                                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded">
                                  {file.isImage ? (
                                    <ImageIcon className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <File className="w-4 h-4 text-green-600" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{file.name}</p>
                                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeUploadedSupervisorFile(index)}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {supervisorFiles.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground"> {t("fileReadyToUpload")}</Label>
                            {supervisorFiles.map((file, index) => (
                              <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg border">
                                <div className="p-1.5 bg-muted rounded">
                                  {isImageFile(file) ? (
                                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <File className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{file.name}</p>
                                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSupervisorFile(index)}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleUploadSupervisorFiles}
                              disabled={uploadingFiles}
                              className="w-full bg-transparent"
                            >
                              {uploadingFiles ? `${t("uploading")}` : `${t("upload")} ${supervisorFiles.length} ${t("file")}`}
                            </Button>
                          </div>
                        )}

                        <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                          <input
                            type="file"
                            multiple
                            onChange={handleSupervisorFileSelect}
                            className="hidden"
                            id="supervisor-file-upload"
                            disabled={uploadingFiles}
                          />
                          <label htmlFor="supervisor-file-upload" className="cursor-pointer">
                            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">{t("dragAndDropFile")}</p>
                          </label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-3 justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setGradeDialogOpen(false)
                        setSelectedTask(null)
                        setGradeForm({ grade: "", feedback: "" })
                        setSupervisorFiles([])
                        setUploadedSupervisorFiles([])
                      }}
                      size="lg"
                    >
                      {t("cancel")}
                    </Button>

                    <Button type="submit" className="gap-2" size="lg" disabled={uploadingFiles}>
                      <Award className="w-4 h-4" />
                      {selectedTask.status === "graded" ? t("updateEvaluation") : t("saveEvaluation")}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
