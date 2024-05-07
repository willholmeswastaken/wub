import { Hero } from "@/components/hero";
import { WhyUs } from "@/components/why-us";
import { getServerAuthSession } from "@/server/auth";


export default async function HomePage() {
  const session = await getServerAuthSession();
  return (
    <>
      <Hero isLoggedIn={!!session} />
      <WhyUs />
    </>
  );
}
