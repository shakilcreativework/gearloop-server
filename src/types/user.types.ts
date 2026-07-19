import { ObjectId } from "mongodb";

export interface UserDoc {
  _id: ObjectId;
  name: string;
  email: string;
  image?: string;
  role: "renter" | "owner" | "admin";
  rentalHistory: ObjectId[];
  createdAt: Date;
}
