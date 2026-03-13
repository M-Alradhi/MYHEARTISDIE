import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, Upload, AlertCircle } from "lucide-react"
import { useLanguage } from "@/lib/contexts/language-context"

interface TaskGradeBadgeProps {
  status: "pending" | "submitted" | "graded"
  isOverdue?: boolean
  size?: "sm" | "md" | "lg"
}

export function TaskGradeBadge({ status, isOverdue = false, size = "md" }: TaskGradeBadgeProps) {
  const { t } = useLanguage()
  const iconSize = size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-4 h-4"
  const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"

  if (status === "pending") {
    return (
      <Badge variant={isOverdue ? "destructive" : "secondary"} className={`gap-1 ${textSize}`}>
        {isOverdue ? <AlertCircle className={iconSize} /> : <Clock className={iconSize} />}
        {isOverdue ? t("overdue") : t("new")}
      </Badge>
    )
  }

  if (status === "submitted") {
    return (
      <Badge variant="default" className={`gap-1 ${textSize} bg-blue-500 hover:bg-blue-600`}>
        <Upload className={iconSize} />
        {t("taskSubmitted")}
      </Badge>
    )
  }

  if (status === "graded") {
    return (
      <Badge variant="default" className={`gap-1 ${textSize} bg-green-500 hover:bg-green-600`}>
        <CheckCircle2 className={iconSize} />
        {t("taskGraded")}
      </Badge>
    )
  }


  return null
}
