"use server";

import prisma from "@/lib/prisma";
import { saveImage } from "@/lib/upload";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

//////////////////////////////////////////////////////
// 🔐 Verificar admin
//////////////////////////////////////////////////////

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "admin") {
    throw new Error("No autorizado");
  }

  return session;
}

//////////////////////////////////////////////////////
// 📜 Crear audit log
//////////////////////////////////////////////////////

async function createAuditLog(
  action: string,
  message: string,
  userId?: number
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        message,
        userId: Number(userId ?? 0),
      },
    });
  } catch (error) {
    console.error("Error creando audit log:", error);
  }
}

//////////////////////////////////////////////////////
// 🆕 CREAR CAMPAÑA
//////////////////////////////////////////////////////

export async function createCampaign(formData: FormData) {

  const session = await requireAdmin();

  const title = String(formData.get("title"));
  const description = String(formData.get("description"));
  const creatorName = String(formData.get("creatorName"));
  const creatorEmail = String(formData.get("creatorEmail"));

  const imageFile = formData.get("image") as File;

  if (!title || !description) {
    throw new Error("Faltan datos obligatorios");
  }

  let imageUrl: string | null = null;

  if (imageFile && imageFile.size > 0) {
    imageUrl = await saveImage(imageFile);
  }

  const campaign = await prisma.campaign.create({
    data: {
      title,
      description,
      creatorName,
      creatorEmail,
      imageUrl,
      status: "pendiente",
      type: "petition",
      goal: 100,
    },
  });

  await createAuditLog(
    "CREAR_CAMPAÑA",
    `Se creó la campaña "${campaign.title}"`,
    session.user?.id
  );

  revalidatePath("/admin/campaigns/pending");
  revalidatePath("/campaigns");

  redirect(`/admin/campaigns/pending`);
}

//////////////////////////////////////////////////////
// ✅ APROBAR CAMPAÑA
//////////////////////////////////////////////////////

export async function approveCampaign(formData: FormData) {

  const session = await requireAdmin();

  const campaignId = Number(formData.get("campaignId"));

  const campaign = await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "activa" },
  });

  await createAuditLog(
    "APROBAR_CAMPAÑA",
    `La campaña "${campaign.title}" fue aprobada`,
    session.user?.id
  );

  revalidatePath("/admin/campaigns/pending");
  revalidatePath("/campaigns");
}

//////////////////////////////////////////////////////
// ❌ RECHAZAR CAMPAÑA
//////////////////////////////////////////////////////

export async function rejectCampaign(formData: FormData) {

  const session = await requireAdmin();

  const campaignId = Number(formData.get("campaignId"));

  const campaign = await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "rechazada" },
  });

  await createAuditLog(
    "RECHAZAR_CAMPAÑA",
    `La campaña "${campaign.title}" fue rechazada`,
    session.user?.id
  );

  revalidatePath("/admin/campaigns/pending");
}