import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request) {

  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json(
      { error: "No file uploaded" },
      { status: 400 }
    );
  }

  // NUEVO: límite 5MB
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "La imagen excede 5MB" },
      { status: 400 }
    );
  }

  // NUEVO: nombre único
  const filename = `${Date.now()}-${file.name}`;

  const blob = await put(filename, file, {
    access: "public",
  });

  return NextResponse.json({
    url: blob.url,
  });

}