import { Router } from "express";
import { protectRoute } from "../middleware/protectRoute";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  getAdminUsers,
  getAdminStats,
  getAdminListings,
  getAdminReviews,
  adminDeleteListing,
  adminDeleteReview,
} from "../controllers/admin.controller";

const router = Router();

router.get("/admin/users", protectRoute, requireAdmin, getAdminUsers);
router.get("/admin/stats", protectRoute, requireAdmin, getAdminStats);
router.get("/admin/listings", protectRoute, requireAdmin, getAdminListings);
router.get("/admin/reviews", protectRoute, requireAdmin, getAdminReviews);
router.delete(
  "/admin/listings/:id",
  protectRoute,
  requireAdmin,
  adminDeleteListing,
);
router.delete(
  "/admin/reviews/:id",
  protectRoute,
  requireAdmin,
  adminDeleteReview,
);

export default router;
