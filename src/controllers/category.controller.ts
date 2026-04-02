import type { Request, Response, NextFunction } from "express";
import {
  createCategoryService,
  deleteCategoryService,
  getAllCategoriesService,
} from "../services/category.service.js";

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Category name is required." });
    }
    const category = await createCategoryService(name.trim(), description);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await getAllCategoriesService();
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoryId } = req.params;
    await deleteCategoryService(categoryId);
    res.status(200).json({ success: true, message: "Category deleted." });
  } catch (err) {
    next(err);
  }
};
