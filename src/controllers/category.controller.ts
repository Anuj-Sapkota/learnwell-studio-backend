import type { Request, Response, NextFunction } from "express";
import {
  createCategoryService,
  deleteCategoryService,
  getAllCategoriesService,
} from "../services/category.service.js";
import type { CreateCategoryInput } from "../schemas/category.schema.js";

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body as CreateCategoryInput;
    const category = await createCategoryService(name, description);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await getAllCategoriesService();
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoryId } = req.params as { categoryId: string };
    await deleteCategoryService(categoryId);
    res.status(200).json({ success: true, message: "Category deleted successfully." });
  } catch (err) {
    next(err);
  }
};
