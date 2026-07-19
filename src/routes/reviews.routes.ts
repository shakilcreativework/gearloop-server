import { Router } from "express";
import { protectRoute } from "../middleware/protectRoute";
import { validateReviewBody } from "../utils/validate";
import { createReview, getReviewsByListing } from "../controllers/reviews.controller";

const router = Router();

router.post("/reviews", protectRoute, validateReviewBody, createReview);
router.get("/reviews/:listingId", getReviewsByListing);

export default router;
