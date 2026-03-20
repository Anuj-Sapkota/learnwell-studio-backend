import { prisma } from "../lib/prisma.js";

export const createCourseService = async (data: {
  title: string;
  description?: string;
  price: number;
  instructorId: string;
  category?: string;
}) => {
  return await prisma.course.create({
    data: {
      title: data.title,
      description: data.description,
      price: data.price,
      instructorId: data.instructorId,
      category: data.category,
    },
  });
};

export const getAllCoursesService = async () => {
  return await prisma.course.findMany({
    include: {
      instructor: {
        select: { fullName: true } // So the frontend can show the teacher's name
      }
    }
  });
};