import { prisma } from "../lib/prisma.js";
import { ServiceError } from "../errors/service.error.js";

export const createCategoryService = async (name: string, description?: string) => {
  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) throw new ServiceError("Category already exists.", 409);

  return await prisma.category.create({ data: { name, description } });
};

export const getAllCategoriesService = async () => {
  return await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { courses: true } } },
  });
};

export const deleteCategoryService = async (categoryId: string) => {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new ServiceError("Category not found.", 404);
  return await prisma.category.delete({ where: { id: categoryId } });
};
