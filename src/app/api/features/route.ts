import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getFeatureMatrix } from "@/lib/features";
import { ensureFeaturesExist } from "@/lib/features";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureFeaturesExist();
    const matrix = await getFeatureMatrix();

    return NextResponse.json(matrix);
  } catch (err) {
    console.error("[FEATURES API] Error:", err);
    return NextResponse.json({ error: "Failed to fetch features" }, { status: 500 });
  }
}
