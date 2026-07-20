import { Router } from "express";
import { protectRoute } from "../middleware/protectRoute";
import { protectInternalRoute } from "../middleware/protectInternalRoute";
import { validateBookingBody, validateBookingUpdateBody } from "../utils/validate";
import {
  createBooking,
  getBookingsByRenter,
  updateBookingStatus,
} from "../controllers/bookings.controller";

const router = Router();

router.post("/bookings", protectRoute, validateBookingBody, createBooking);
router.get("/bookings/:renterId", protectRoute, getBookingsByRenter);
router.patch(
  "/bookings/:id/status",
  protectInternalRoute,
  validateBookingUpdateBody,
  updateBookingStatus,
);

export default router;
