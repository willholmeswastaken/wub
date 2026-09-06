import { db } from "@/server/db";
import { Context, Layer } from "effect";

export class Db extends Context.Tag("Db")<Db, typeof db>() {}

export const DbLive = Layer.succeed(Db, db);
