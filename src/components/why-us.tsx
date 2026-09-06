import { BarChart3, Gauge, ShieldCheck } from "lucide-react";

const features = [
  {
    title: "Fast redirects",
    description:
      "Lookups stay on a single Node path with Postgres, so short links resolve quickly.",
    icon: Gauge,
  },
  {
    title: "Click analytics",
    description:
      "Signed-in links record country, city, device, browser, and OS for the last 30 days.",
    icon: BarChart3,
  },
  {
    title: "Abuse controls",
    description:
      "Guest links expire in 30 minutes. Mutations are rate limited per IP.",
    icon: ShieldCheck,
  },
];

export function WhyUs() {
  return (
    <section className="w-full border-t border-border bg-muted/40 py-16 md:py-24">
      <div className="container grid items-center justify-center gap-10 px-4 text-center md:px-6">
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for people who ship links
          </h2>
          <p className="mx-auto max-w-[700px] text-muted-foreground md:text-lg">
            Wub is a small, open-source shortener: shorten, track, and delete
            links without a marketing dashboard in the way.
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col items-center rounded-xl border border-border bg-card p-6 text-left shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <feature.icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
