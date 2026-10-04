import { VisitorNotice } from "@/components/visitor-notice";
import { TimerOff } from "lucide-react";

export const metadata = {
  title: "This link has expired - Wub",
  robots: { index: false },
};

export default function ExpiredLinkPage() {
  return (
    <VisitorNotice
      icon={<TimerOff className="h-6 w-6" />}
      title="This link has expired"
      description="It was a temporary link made without an account, and those stop working after 30 minutes."
    />
  );
}
