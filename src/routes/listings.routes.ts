import { Router } from "express";
import { protectRoute } from "../middleware/protectRoute";
import { validateListingBody } from "../utils/validate";
import {
  getListings,
  getFeaturedListings,
  getListingById,
  getOwnerListings,
  createListing,
  updateListing,
  deleteListing,
  getListingAvailability,
} from "../controllers/listings.controller";

const router = Router();

router.get("/listings", getListings);
router.get("/listings/featured", getFeaturedListings);
router.get("/listings/:id", getListingById);
router.get("/owner/listings/:ownerId", getOwnerListings);
router.get("/listings/:id/availability", getListingAvailability);

router.post("/listings", protectRoute, validateListingBody, createListing);
router.put("/listings/:id", protectRoute, validateListingBody, updateListing);
router.delete("/listings/:id", protectRoute, deleteListing);

export default router;
