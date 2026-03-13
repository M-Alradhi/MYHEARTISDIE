import { type NextRequest, NextResponse } from "next/server"

// This API route is deprecated. File uploads now go directly to Firebase Storage from the client.
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: "هذا المسار لم يعد مستخدماً. يتم الرفع مباشرة على Firebase Storage." },
    { status: 410 }
  )
}
