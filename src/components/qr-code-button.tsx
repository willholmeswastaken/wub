"use client";

import { iconButtonClassName } from "@/components/icon-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QrCode } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

interface QRCodeButtonProps {
  url: string;
  trigger?: ReactNode;
}

const EXPORT_SIZE = 1024;

function downloadName(url: string) {
  try {
    const code = new URL(url).pathname
      .replace(/^\/+/, "")
      .replace(/[^\w-]+/g, "-");
    return `wub-${code || "link"}.png`;
  } catch {
    return "wub-link.png";
  }
}

type QRCodeProps = {
  value: string;
  size?: number;
  level?: "L" | "M" | "Q" | "H";
  includeMargin?: boolean;
  className?: string;
};

type QRCodeComponent = (props: QRCodeProps) => ReactNode;

export function QRCodeButton({ url, trigger }: QRCodeButtonProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [QRCodeSVG, setQRCodeSVG] = useState<QRCodeComponent | null>(null);

  useEffect(() => {
    if (!open || QRCodeSVG) return;
    let cancelled = false;
    void import("qrcode.react").then((module) => {
      if (!cancelled) setQRCodeSVG(() => module.QRCodeSVG);
    });
    return () => {
      cancelled = true;
    };
  }, [open, QRCodeSVG]);

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = EXPORT_SIZE;
    canvas.height = EXPORT_SIZE;
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, EXPORT_SIZE, EXPORT_SIZE);
      const downloadLink = document.createElement("a");
      downloadLink.download = downloadName(url);
      downloadLink.href = canvas.toDataURL("image/png");
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button type="button" className="flex flex-col items-center gap-2">
            <span className={iconButtonClassName()}>
              <QrCode className="h-4 w-4" />
            </span>
            <span className="text-xs text-muted-foreground">QR</span>
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>QR code</DialogTitle>
          <DialogDescription className="break-all">
            {url.replace(/^https?:\/\//, "")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div ref={qrRef} className="w-full max-w-64">
            {QRCodeSVG ? (
              <QRCodeSVG
                value={url}
                size={256}
                level="H"
                includeMargin
                className="h-auto w-full"
              />
            ) : (
              <div className="aspect-square w-full animate-pulse rounded-xl bg-muted/40" />
            )}
          </div>
          <Button onClick={handleDownload} className="w-full">
            Download QR code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
