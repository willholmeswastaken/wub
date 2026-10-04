const features = [
  {
    title: "Copied instantly",
    description:
      "Paste a link and the short one is already on your clipboard. No extra clicks.",
  },
  {
    title: "See who clicks",
    description:
      "Clicks over time, countries, cities, devices and browsers for every link.",
  },
  {
    title: "QR codes built in",
    description:
      "Every link comes with a QR code you can download for print or slides.",
  },
  {
    title: "Open source",
    description:
      "The whole thing is on GitHub. Read the code, self-host it or contribute.",
  },
];

export function WhyUs() {
  return (
    <section className="w-full bg-foreground text-background">
      <div className="mx-auto max-w-5xl px-5 py-20 md:py-28">
        <p className="text-[13px] font-medium uppercase tracking-[0.22em] text-background/55">
          Why Wub
        </p>
        <h2 className="mt-4 max-w-xl text-balance text-4xl font-medium tracking-[-0.045em] sm:text-5xl">
          Everything a short link should do.
        </h2>
        <p className="mt-5 max-w-md text-base leading-relaxed text-background/70 md:text-lg">
          Try it without an account. Sign in with GitHub when you want a link to
          last, and to see who opens it.
        </p>
        <dl className="mt-16 grid grid-cols-1 gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ title, description }) => (
            <div key={title}>
              <dt className="text-lg font-medium tracking-[-0.02em]">
                {title}
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-background/65">
                {description}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
