import express from "express";
import { createCategory, deleteCategory, getCategories } from "../controllers/category.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { categoryIdParamSchema, createCategorySchema } from "../schemas/category.schema.js";

const router = express.Router();

router.get("/", getCategories);
router.post("/", protect, authorize("INSTRUCTOR", "ADMIN"), validate(createCategorySchema), createCategory);
router.delete("/:categoryId", protect, authorize("ADMIN"), validate(categoryIdParamSchema), deleteCategory);

export default router;
