import { VisitorNotice } from "@/components/visitor-notice";
import { Unlink } from "lucide-react";

export const metadata = {
  title: "Link not found - Wub",
  robots: { index: false },
};

export default function LinkNotFoundPage() {
  return (
    <VisitorNotice
      icon={<Unlink className="h-6 w-6" />}
      title="This link doesn't go anywhere"
      description="It may have been deleted by its owner, or there's a typo in the address."
    />
  );
}
