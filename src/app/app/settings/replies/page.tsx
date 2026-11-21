import type { Metadata } from "next";
import { SavedReplies } from "@/components/settings/saved-replies";

export const metadata: Metadata = { title: "Saved replies" };

export default function RepliesPage() {
  return <SavedReplies />;
}
