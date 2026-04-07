import { NextRequest, NextResponse } from "next/server";
import { 
  getArchiveItems, 
  saveToArchive, 
  removeFromArchive 
} from "@/lib/dataManager";
import { CollectedItem } from "@/lib/types";

export async function GET() {
  try {
    const items = await getArchiveItems();
    return NextResponse.json(items);
  } catch (error) {
    console.error("[Archive API GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch archive" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const item: CollectedItem = await request.json();
    await saveToArchive(item);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Archive API POST Error]:", error);
    return NextResponse.json({ error: "Failed to save archive" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    
    await removeFromArchive(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Archive API DELETE Error]:", error);
    return NextResponse.json({ error: "Failed to delete from archive" }, { status: 500 });
  }
}
