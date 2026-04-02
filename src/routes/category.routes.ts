import express from "express";
import { createCategory, deleteCategory, getCategories } from "../controllers/category.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public — anyone can see categories
router.get("/", getCategories);

// Instructor or Admin can create categories
router.post("/", protect, authorize("INSTRUCTOR", "ADMIN"), createCategory);

// Admin only can delete
router.delete("/:categoryId", protect, authorize("ADMIN"), deleteCategory);

export default router;
