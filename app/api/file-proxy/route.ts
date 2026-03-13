import { type NextRequest, NextResponse } from "next/server"

// This API route is deprecated. Files are now served directly from Firebase Storage.
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: "هذا المسار لم يعد مستخدماً. الملفات تُقدَّم مباشرة من Firebase Storage." },
    { status: 410 }
  )
}
