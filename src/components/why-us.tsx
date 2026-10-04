import { BarChart3, ClipboardCheck, Github, QrCode } from "lucide-react";

const features = [
  {
    icon: ClipboardCheck,
    title: "Copied instantly",
    description:
      "Paste a link and the short one is already on your clipboard. No extra clicks.",
  },
  {
    icon: BarChart3,
    title: "See who clicks",
    description:
      "Clicks over time, countries, cities, devices and browsers for every link.",
  },
  {
    icon: QrCode,
    title: "QR codes built in",
    description:
      "Every link comes with a QR code you can download for print or slides.",
  },
  {
    icon: Github,
    title: "Open source",
    description:
      "The whole thing is on GitHub. Read the code, self-host it or contribute.",
  },
];

export function WhyUs() {
  return (
    <section className="w-full border-t border-border bg-background py-16 md:py-24">
      <div className="container px-4">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="text-balance text-base text-muted-foreground md:text-lg">
            Try it without an account. Sign in with GitHub to keep your links
            forever and see their analytics.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-muted/40 p-6 text-left"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
