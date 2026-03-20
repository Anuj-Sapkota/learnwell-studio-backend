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
        select: { fullName: true }, // So the frontend can show the teacher's name
      },
    },
  });
};

export const createSectionService = async (courseId: string, title: string) => {
  return await prisma.section.create({
    data: {
      title,
      courseId,
    },
  });
};

// Add a Lesson to a Section
export const createLessonService = async (data: {
  sectionId: string;
  title: string;
  videoUrl?: string;
  content?: string;
}) => {
  return await prisma.lesson.create({
    data: {
      title: data.title,
      sectionId: data.sectionId,
      videoUrl: data.videoUrl,
      content: data.content,
    },
  });
};

// Get the full Course structure for the "Course Player"
export const getCourseDetailService = async (courseId: string) => {
  return await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: {
        select: {
          fullName: true,
          email: true,
        },
      },
      sections: {
        orderBy: { order: "asc" }, // Ensures Module 1 comes before Module 2
        include: {
          lessons: {
            orderBy: { order: "asc" }, // Ensures Lesson 1 comes before Lesson 2
          },
        },
      },
    },
  });
};
