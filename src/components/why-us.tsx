import { BarChart3, ClipboardCheck, Github, QrCode } from "lucide-react";

const features = [
  {
    icon: ClipboardCheck,
    index: "01",
    title: "Copied instantly",
    description:
      "Paste a link and the short one is already on your clipboard. No extra clicks.",
    place: "md:col-span-7",
    tilt: "md:-rotate-1",
  },
  {
    icon: BarChart3,
    index: "02",
    title: "See who clicks",
    description:
      "Clicks over time, countries, cities, devices and browsers for every link.",
    place: "md:col-span-5 md:mt-14",
    tilt: "md:rotate-1",
  },
  {
    icon: QrCode,
    index: "03",
    title: "QR codes built in",
    description:
      "Every link comes with a QR code you can download for print or slides.",
    place: "md:col-span-5",
    tilt: "md:rotate-[0.6deg]",
  },
  {
    icon: Github,
    index: "04",
    title: "Open source",
    description:
      "The whole thing is on GitHub. Read the code, self-host it or contribute.",
    place: "md:col-span-7 md:mt-8",
    tilt: "md:-rotate-[0.4deg]",
  },
];

export function WhyUs() {
  return (
    <section className="w-full border-t-2 border-foreground py-16 md:py-24">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <h2 className="max-w-[12ch] font-display text-[clamp(2.6rem,5vw,4.6rem)] font-medium leading-[0.9] tracking-[-0.03em]">
            A short list, <span className="italic text-brand">on purpose.</span>
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground md:pb-2 md:text-base">
            Try it without an account. Sign in with GitHub when a link should
            outlast the afternoon.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
          {features.map(
            (
              { icon: Icon, index, title, description, place, tilt },
              featureIndex,
            ) => (
              <div
                key={title}
                className={`desk-in ${place}`}
                style={{ animationDelay: `${featureIndex * 90}ms` }}
              >
                <article
                  className={`h-full border border-foreground/15 bg-card p-6 shadow-[5px_6px_0_hsl(var(--foreground)/0.07)] transition-shadow hover:shadow-[7px_8px_0_hsl(var(--brand)/0.45)] ${tilt}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-display text-5xl italic leading-none text-brand">
                      {index}
                    </span>
                    <span className="inline-flex h-11 w-11 rotate-[-8deg] items-center justify-center rounded-full border-2 border-brand text-brand">
                      <Icon className="h-5 w-5 rotate-[8deg]" />
                    </span>
                  </div>
                  <h3 className="mt-8 font-display text-3xl font-medium leading-none">
                    {title}
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </article>
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
