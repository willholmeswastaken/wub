import { Hero } from "@/components/hero";
import { KeyFeatures } from "@/components/key-features";
import { WhyUs } from "@/components/why-us";
import { getServerAuthSession } from "@/server/auth";


export default async function HomePage() {
  const session = await getServerAuthSession();
  return (
    <>
      <Hero isLoggedIn={!!session} />
      <KeyFeatures />
      <WhyUs />
    </>
  );
}
