import { type DefaultSession, type Session } from "next-auth";

export function sessionWithUserId({
  session,
  user,
}: {
  session: DefaultSession;
  user: { id: string };
}): Session {
  return {
    ...session,
    user: {
      ...session.user,
      id: user.id,
    },
  };
}
