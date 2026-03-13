"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { CalendarIcon, Clock, MapPin, LinkIcon, CheckSquare, Users, ChevronLeft, ChevronRight, Edit2, XCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/contexts/auth-context"
import { useLanguage } from "@/lib/contexts/language-context"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs, orderBy, updateDoc, doc, Timestamp } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase/config"
import { supervisorSidebarItems } from "@/lib/constants/supervisor-sidebar"
import { formatArabicDate } from "@/lib/utils/grading"

interface CalendarEvent {
  id: string
  title: string
  description?: string
  type: "task" | "meeting"
  date: Date
  status?: string
  location?: string
  meetingLink?: string
  duration?: number
  studentName?: string
  time?: string
}

export default function SupervisorCalendar() {
  const { userData } = useAuth()
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
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelEventId, setCancelEventId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [isCancelling, setIsCancelling] = useState(false)

  // Reschedule dialog
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [rescheduleEvent, setRescheduleEvent] = useState<any>(null)
  const [newDate, setNewDate] = useState("")
  const [newTime, setNewTime] = useState("")
  const [isRescheduling, setIsRescheduling] = useState(false)

  const getTodayDate = () => new Date().toISOString().split("T")[0]

  const validateTime = (time: string) => {
    if (!time) return false
    const [hours] = time.split(":").map(Number)
    return hours >= 8 && hours < 20
  }

  const validateDate = (date: string) => {
    if (!date) return false
    const selected = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return selected >= today
  }

  const refreshEvents = async () => {
    if (!userData?.uid) return
    try {
      const db = getFirebaseDb()
      const [snap1, snap2] = await Promise.all([
        getDocs(query(collection(db, "meetings"), where("supervisorId", "==", userData.uid), orderBy("date", "asc"))),
        getDocs(query(collection(db, "meetings"), where("supervisorIds", "array-contains", userData.uid), orderBy("date", "asc"))),
      ])
      const seenIds = new Set<string>()
      const meetingEvents: CalendarEvent[] = [...snap1.docs, ...snap2.docs]
        .filter((doc) => { if (seenIds.has(doc.id)) return false; seenIds.add(doc.id); return true })
        .map((doc) => {
          const data = doc.data()
          return { id: doc.id, title: data.title, description: data.description, type: "meeting", date: data.date?.toDate() || new Date(), status: data.status, location: data.location, meetingLink: data.meetingLink, duration: data.duration, studentName: data.studentName, time: data.time }
        })
      setEvents((prev) => [...prev.filter((e) => e.type === "task"), ...meetingEvents].sort((a, b) => a.date.getTime() - b.date.getTime()))
    } catch (err) { console.error(err) }
  }

  const handleCancelMeeting = async () => {
    if (!cancelEventId || !cancelReason.trim()) return
    setIsCancelling(true)
    try {
      const db = getFirebaseDb()
      await updateDoc(doc(db, "meetings", cancelEventId), { status: "cancelled", cancelReason: cancelReason.trim(), cancelledAt: Timestamp.now() })
      toast.success(language === "ar" ? "تم إلغاء الاجتماع" : "Meeting cancelled")
      setCancelDialogOpen(false)
      setCancelEventId(null)
      setCancelReason("")
      refreshEvents()
    } catch (err) {
      toast.error(language === "ar" ? "حدث خطأ" : "Error cancelling meeting")
    } finally { setIsCancelling(false) }
  }

  const handleRescheduleMeeting = async () => {
    if (!rescheduleEvent || !newDate || !newTime) return
    if (!validateDate(newDate)) { toast.error(language === "ar" ? "لا يمكن تحديد تاريخ في الماضي" : "Cannot schedule in the past"); return }
    if (!validateTime(newTime)) { toast.error(language === "ar" ? "الوقت يجب بين 8ص و8م" : "Time must be 8AM-8PM"); return }
    setIsRescheduling(true)
    try {
      const db = getFirebaseDb()
      await updateDoc(doc(db, "meetings", rescheduleEvent.id), { date: Timestamp.fromDate(new Date(newDate)), time: newTime, status: "scheduled", rescheduledAt: Timestamp.now() })
      toast.success(language === "ar" ? "تم تغيير وقت الاجتماع" : "Meeting rescheduled")
      setRescheduleDialogOpen(false)
      setRescheduleEvent(null)
      setNewDate("")
      setNewTime("")
      refreshEvents()
    } catch (err) {
      toast.error(language === "ar" ? "حدث خطأ" : "Error rescheduling")
    } finally { setIsRescheduling(false) }
  }

  useEffect(() => {
    const fetchEvents = async () => {
      if (!userData?.uid) return

      try {
        const db = getFirebaseDb()

        const tasksQuery = query(
          collection(db, "tasks"),
          where("supervisorId", "==", userData.uid),
          orderBy("dueDate", "asc"),
        )
        const tasksSnapshot = await getDocs(tasksQuery)
        const taskEvents: CalendarEvent[] = tasksSnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            title: data.title,
            description: data.description,
            type: "task",
            date: data.dueDate?.toDate() || new Date(),
            status: data.status,
            studentName: data.studentName,
          }
        })

        // Meetings — primary + secondary supervisor
        const [meetSnap1, meetSnap2] = await Promise.all([
          getDocs(query(collection(db, "meetings"), where("supervisorId", "==", userData.uid), orderBy("date", "asc"))),
          getDocs(query(collection(db, "meetings"), where("supervisorIds", "array-contains", userData.uid), orderBy("date", "asc"))),
        ])
        const seenMeetIds = new Set<string>()
        const meetingEvents: CalendarEvent[] = [...meetSnap1.docs, ...meetSnap2.docs]
          .filter((doc) => { if (seenMeetIds.has(doc.id)) return false; seenMeetIds.add(doc.id); return true })
          .map((doc) => {
            const data = doc.data()
            return {
              id: doc.id,
              title: data.title,
              description: data.description,
              type: "meeting",
              date: data.date?.toDate() || new Date(),
              status: data.status,
              location: data.location,
              meetingLink: data.meetingLink,
              duration: data.duration,
              studentName: data.studentName,
            }
          })

        const allEvents = [...taskEvents, ...meetingEvents].sort((a, b) => a.date.getTime() - b.date.getTime())
        setEvents(allEvents)
      } catch (error) {
        console.error("Error fetching events:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [userData])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek, year, month }
  }

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.date)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate)

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const monthNames = [
    t("january"),
    t("february"),
    t("march"),
    t("april"),
    t("may"),
    t("june"),
    t("july"),
    t("august"),
    t("september"),
    t("october"),
    t("november"),
    t("december"),
  ]

  const dayNames = [
    t("sunday"),
    t("monday"),
    t("tuesday"),
    t("wednesday"),
    t("thursday"),
    t("friday"),
    t("saturday"),
  ]

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []
  const upcomingEvents = events.filter((event) => event.date >= new Date()).slice(0, 5)

  return (
    <DashboardLayout sidebarItems={supervisorSidebarItems} requiredRole="supervisor">
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-primary" />
            {t("unifiedCalendar")}
          </h1>
          <p className="text-muted-foreground mt-2">{t("allTasksAndMeetingsInOnePlace")}</p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">{t("loading")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 rounded-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {monthNames[month]} {year}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={previousMonth} className="rounded-lg bg-transparent">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={nextMonth} className="rounded-lg bg-transparent">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {dayNames.map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                    <div key={`empty-${index}`} className="aspect-square" />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, index) => {
                    const day = index + 1
                    const date = new Date(year, month, day)
                    const dayEvents = getEventsForDate(date)
                    const isToday =
                      date.getDate() === new Date().getDate() &&
                      date.getMonth() === new Date().getMonth() &&
                      date.getFullYear() === new Date().getFullYear()
                    const isSelected =
                      selectedDate &&
                      date.getDate() === selectedDate.getDate() &&
                      date.getMonth() === selectedDate.getMonth() &&
                      date.getFullYear() === selectedDate.getFullYear()

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDate(date)}
                        className={`aspect-square p-2 rounded-lg border transition-all hover:border-primary ${
                          isToday ? "border-primary bg-primary/10" : ""
                        } ${isSelected ? "bg-primary text-primary-foreground" : ""} ${
                          dayEvents.length > 0 ? "font-semibold" : ""
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center h-full">
                          <span className="text-sm">{day}</span>
                          {dayEvents.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {dayEvents.slice(0, 3).map((event, i) => (
                                <div
                                  key={i}
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    event.type === "task" ? "bg-blue-500" : "bg-green-500"
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="text-lg">{t("upcomingEvents")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {upcomingEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">{t("noUpcomingEvents")}</p>
                  ) : (
                    upcomingEvents.map((event) => (
                      <div key={event.id} className="p-3 rounded-lg border space-y-1">
                        <div className="flex items-start gap-2">
                          {event.type === "task" ? (
                            <CheckSquare className="w-4 h-4 text-blue-500 mt-0.5" />
                          ) : (
                            <Users className="w-4 h-4 text-green-500 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{event.title}</p>
                            <p className="text-xs text-muted-foreground">{formatArabicDate(event.date)}</p>
                            {event.studentName && <p className="text-xs text-muted-foreground">{event.studentName}</p>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="text-lg">{t("colorLegend")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm">{t("tasks")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm">{t("meetings")}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {selectedDate && (
              <Card className="lg:col-span-3 rounded-xl">
                <CardHeader>
                  <CardTitle>{t("events")} {formatArabicDate(selectedDate)}</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDateEvents.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">{t("noEventsForSelectedDate")}</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {selectedDateEvents.map((event) => (
                        <Card key={event.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                {event.type === "task" ? (
                                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                    <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                  </div>
                                ) : (
                                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                                    <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                                  </div>
                                )}
                                <div>
                                  <CardTitle className="text-base">{event.title}</CardTitle>
                                  <CardDescription className="mt-1">{event.description}</CardDescription>
                                  {event.studentName && (
                                    <p className="text-sm text-muted-foreground mt-1">{event.studentName}</p>
                                  )}
                                </div>
                              </div>
                              {event.status && (
                                <Badge variant="secondary" className="rounded-lg">
                                  {event.status === "pending"
                                    ? "معلق"
                                    : event.status === "submitted"
                                      ? "مسلم"
                                      : event.status === "completed"
                                        ? "مكتمل"
                                        : event.status}
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {event.time || event.date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                              {event.duration && ` (${event.duration} ${t("minute")})`}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                {event.location}
                              </div>
                            )}
                            {event.meetingLink && (
                              <div className="flex items-center gap-2 text-sm">
                                <LinkIcon className="w-4 h-4" />
                                <a
                                  href={event.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {t("meetingLink")}
                                </a>
                              </div>
                            )}
                            {event.type === "meeting" && event.status !== "cancelled" && (
                              <div className="flex gap-2 mt-3 pt-3 border-t">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 flex-1"
                                  onClick={() => {
                                    setRescheduleEvent(event)
                                    setNewDate(event.date.toISOString().split("T")[0])
                                    setNewTime(event.time || event.date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }))
                                    setRescheduleDialogOpen(true)
                                  }}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  {language === "ar" ? "تغيير الوقت" : "Reschedule"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 flex-1"
                                  onClick={() => {
                                    setCancelEventId(event.id)
                                    setCancelReason("")
                                    setCancelDialogOpen(true)
                                  }}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  {language === "ar" ? "إلغاء" : "Cancel"}
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "إلغاء الاجتماع" : "Cancel Meeting"}</DialogTitle>
            <DialogDescription>{language === "ar" ? "يرجى ذكر سبب الإلغاء" : "Please provide a reason"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{language === "ar" ? "سبب الإلغاء *" : "Cancellation Reason *"}</Label>
              <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder={language === "ar" ? "اكتب سبب الإلغاء..." : "Write reason..."} rows={3} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)} className="flex-1 rounded-lg">{t("cancel")}</Button>
              <Button variant="destructive" onClick={handleCancelMeeting} className="flex-1 rounded-lg" disabled={isCancelling || !cancelReason.trim()}>
                {isCancelling ? "..." : language === "ar" ? "تأكيد الإلغاء" : "Confirm Cancel"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "تغيير وقت الاجتماع" : "Reschedule Meeting"}</DialogTitle>
            <DialogDescription>{rescheduleEvent?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "التاريخ الجديد *" : "New Date *"}</Label>
                <Input type="date" value={newDate} min={getTodayDate()} onChange={(e) => setNewDate(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "الوقت الجديد *" : "New Time *"}</Label>
                <Input type="time" min="08:00" max="19:59" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="h-11" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)} className="flex-1 rounded-lg">{t("cancel")}</Button>
              <Button onClick={handleRescheduleMeeting} className="flex-1 rounded-lg" disabled={isRescheduling || !newDate || !newTime}>
                {isRescheduling ? "..." : language === "ar" ? "تأكيد التغيير" : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  )
}
