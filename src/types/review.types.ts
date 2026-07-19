import { ObjectId } from "mongodb";

export interface ReviewDoc {
  _id: ObjectId;
  listingId: ObjectId;
  reviewerId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}
