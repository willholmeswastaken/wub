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
import { QRCodeSVG } from "qrcode.react";

interface QRCodeButtonProps {
  url: string;
}

export function QRCodeButton({ url }: QRCodeButtonProps) {
  const handleDownload = () => {
    const svg = document.querySelector("#qr-code svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `qr-code-${url}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="flex flex-col items-center gap-2">
          <span className={iconButtonClassName()}>
            <QrCode className="h-4 w-4" />
          </span>
          <span className="text-xs text-muted-foreground">QR</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>QR code</DialogTitle>
          <DialogDescription className="break-all">{url}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div id="qr-code">
            <QRCodeSVG
              value={url}
              size={256}
              level="H"
              includeMargin
              className="h-auto w-full"
            />
          </div>
          <Button onClick={handleDownload} className="w-full">
            Download QR code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
