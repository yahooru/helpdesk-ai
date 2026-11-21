import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AiForm } from "@/components/settings/ai-form";
import { aiConfigured } from "@/lib/ai/gemini";
import { staffContext } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Assistant settings" };

export default async function AiSettingsPage() {
  const ctx = await staffContext();
  if (!ctx) redirect("/onboarding");
  const w = ctx.workspace;
  return (
    <AiForm
      initial={{
        botName: w.botName,
        aiEnabled: w.aiEnabled,
        aiTone: w.aiTone,
        handoffOnNoAnswer: w.handoffOnNoAnswer,
        aiInstructions: w.aiInstructions,
        autoAssign: w.autoAssign,
      }}
      canEdit={ctx.membership.role === "admin"}
      aiConfigured={aiConfigured()}
    />
  );
}
