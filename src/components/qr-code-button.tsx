"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export function QRCodeButton({ url }: { url: string }) {
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Show QR code"
        >
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{url}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <div id="qr-code" className="rounded-lg bg-white p-3">
            <QRCodeSVG
              value={url}
              size={256}
              level="H"
              includeMargin
              className="h-auto w-full"
            />
          </div>
          <Button onClick={handleDownload} className="w-full">
            Download QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
