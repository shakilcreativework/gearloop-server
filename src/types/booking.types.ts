import { ObjectId } from "mongodb";

export interface BookingDoc {
  _id: ObjectId;
  listingId: ObjectId;
  renterId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalPrice: number;
  paymentProvider: "paddle";
  paymentStatus: "pending" | "paid" | "refunded";
  status: "requested" | "confirmed" | "completed" | "cancelled";
  createdAt: Date;
}
