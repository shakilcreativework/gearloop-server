import { ObjectId } from "mongodb";

export interface ListingDoc {
  _id: ObjectId;
  ownerId: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  category:
    | "camping"
    | "water-sports"
    | "cycling"
    | "climbing"
    | "photography"
    | "winter-sports";
  pricePerDay: number;
  currency: string;
  location: string;
  images: string[];
  condition: "new" | "excellent" | "good" | "fair";
  available: boolean;
  rating: number;
  reviewCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt?: Date;
}
