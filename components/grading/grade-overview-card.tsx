"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Award, Clock, TrendingUp, TrendingDown } from "lucide-react"
import { calculateWeightedGrade, getGradeColor, getStatusColor, type TaskGrade } from "@/lib/utils/grading"
import { useLanguage } from "@/lib/contexts/language-context"

interface GradeOverviewCardProps {
  tasks: TaskGrade[]
  showDetails?: boolean
}

export function GradeOverviewCard({ tasks, showDetails = true }: GradeOverviewCardProps) {
  const gradeInfo = calculateWeightedGrade(tasks)
  const statusColors = getStatusColor(gradeInfo.status)
  const { language } = useLanguage()

  const isAr = language === "ar"

  const pendingTasks = tasks.filter((t) => t.status === "pending")
  const submittedTasks = tasks.filter((t) => t.status === "submitted")

  const statusMessage = () => {
    if (gradeInfo.isPassing) {
      if (gradeInfo.status === "excellent")
        return isAr
          ? "ممتاز! أداء رائع جداً - استمر في التميز"
          : "Excellent! Outstanding performance - keep it up"
      if (gradeInfo.status === "very-good")
        return isAr
          ? "جيد جداً! أداء مميز - قريب من الامتياز"
          : "Very Good! Great performance - close to excellence"
      if (gradeInfo.status === "good")
        return isAr
          ? "جيد! أداء جيد - يمكنك تحسين المزيد"
          : "Good! Decent performance - there is room for improvement"
      return isAr
        ? "مقبول - حاول تحسين أدائك في المهام القادمة"
        : "Acceptable - try to improve your performance in upcoming tasks"
    }
    if (gradeInfo.totalGrade > 0)
      return isAr
        ? "تحتاج إلى تحسين - درجتك أقل من 50% للنجاح"
        : "Needs improvement - your grade is below 50% to pass"
    return isAr
      ? "لم يتم التقييم بعد - في انتظار تقييم المهام"
      : "Not evaluated yet - waiting for tasks to be graded"
  }

  return (
    <Card className="border-2 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-l from-primary via-primary/50 to-transparent" />

      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Award className="w-6 h-6 text-primary" />
              {isAr ? "درجتك الإجمالية" : "Your Overall Grade"}
            </CardTitle>
            <CardDescription className="mt-1">
              {isAr ? "من إجمالي 100 درجة للمشروع الكامل" : "Out of 100 total project grade"}
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={`${statusColors.bg} ${statusColors.text} ${statusColors.border} px-4 py-2 text-sm font-bold`}
          >
            {gradeInfo.letterGrade}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Grade Display */}
        <div className="flex items-start gap-6">
          {/* Left: status pills (horizontal) */}
          <div className="flex flex-row gap-3 w-auto flex-shrink-0 items-center overflow-x-auto pr-2">
            <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center border border-amber-200 p-2 bg-background">
              <div className="text-[10px] text-muted-foreground text-center">
                {isAr ? "في الانتظار" : "Pending"}
              </div>
              <div className="text-lg font-bold text-amber-600">{pendingTasks.length}</div>
            </div>

            <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center border border-blue-200 p-2 bg-background">
              <div className="text-[10px] text-muted-foreground text-center">
                {isAr ? "تم التسليم" : "Submitted"}
              </div>
              <div className="text-lg font-bold text-blue-600">{submittedTasks.length}</div>
            </div>

            <div className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center border border-green-200 p-2 bg-background">
              <div className="text-[10px] text-muted-foreground text-center">
                {isAr ? "تم التقييم" : "Graded"}
              </div>
              <div className="text-lg font-bold text-green-600">{gradeInfo.gradedTasksCount}</div>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-baseline gap-3">
              <span className={`text-6xl font-bold ${getGradeColor(gradeInfo.totalGrade)}`}>
                {gradeInfo.totalGrade.toFixed(1)}
              </span>
              <span className="text-3xl text-muted-foreground font-medium">/100</span>
              {gradeInfo.totalGrade >= 50 ? (
                <TrendingUp className="w-8 h-8 text-green-500" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-500" />
              )}
            </div>

            <div className="space-y-2">
              <Progress value={gradeInfo.percentage} className="h-4" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {isAr
                    ? `${gradeInfo.gradedTasksCount} من ${gradeInfo.totalTasksCount} مهمة تم تقييمها`
                    : `${gradeInfo.gradedTasksCount} of ${gradeInfo.totalTasksCount} tasks graded`}
                </span>
                <span>
                  {isAr
                    ? `الوزن المنجز: ${gradeInfo.completedWeight.toFixed(0)}%`
                    : `Completed weight: ${gradeInfo.completedWeight.toFixed(0)}%`}
                </span>
              </div>
            </div>

            {gradeInfo.remainingWeight > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-900">
                <Clock className="w-4 h-4" />
                <span>
                  {isAr
                    ? `متبقي ${gradeInfo.remainingWeight.toFixed(0)}% من المهام لم يتم تقييمها بعد`
                    : `${gradeInfo.remainingWeight.toFixed(0)}% of tasks weight not yet graded`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status Message */}
        <div className={`${statusColors.bg} ${statusColors.border} border rounded-lg p-4`}>
          <p className={`text-sm font-semibold ${statusColors.text}`}>{statusMessage()}</p>
        </div>
      </CardContent>
    </Card>
  )
}