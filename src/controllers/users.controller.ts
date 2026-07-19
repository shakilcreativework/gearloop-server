import { Request, Response, NextFunction } from "express";
import { getDb } from "../config/db";
import { UserDoc } from "../types";

export async function getUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getDb();
    const collection = db.collection<UserDoc>("users");

    const users = await collection.find().toArray();

    res.json({ users });
  } catch (err) {
    next(err);
  }
}
