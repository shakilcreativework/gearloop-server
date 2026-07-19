import { Router } from "express";
import { protectRoute } from "../middleware/protectRoute";
import { validateBookingBody } from "../utils/validate";
import { createBooking, getBookingsByRenter } from "../controllers/bookings.controller";

const router = Router();

router.post("/bookings", protectRoute, validateBookingBody, createBooking);
router.get("/bookings/:renterId", protectRoute, getBookingsByRenter);

export default router;
