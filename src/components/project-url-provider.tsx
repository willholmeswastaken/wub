"use client";

import { env } from "@/env";
import { formatProjectUrl } from "@/lib/project-url";
import { createContext, useContext, type ReactNode } from "react";

const ProjectUrlContext = createContext<{
  host?: string;
  protocol?: string;
}>({});

export function ProjectUrlProvider({
  host,
  protocol,
  children,
}: {
  host?: string;
  protocol?: string;
  children: ReactNode;
}) {
  return (
    <ProjectUrlContext.Provider value={{ host, protocol }}>
      {children}
    </ProjectUrlContext.Provider>
  );
}

export function useProjectUrl(includesProtocol = true) {
  const configured = env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  const request = useContext(ProjectUrlContext);
  return formatProjectUrl(
    configured ?? request.host,
    includesProtocol,
    configured ? undefined : request.protocol,
  );
}
