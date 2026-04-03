import { prisma } from "../lib/prisma.js";

export const enrollInCourseService = async (userId: string, courseId: string) => {
  // 1. Check if already enrolled
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
  });

  if (existingEnrollment) {
    throw new Error("You are already enrolled in this course");
  }

  // 2. Create the enrollment
  return await prisma.enrollment.create({
    data: {
      userId,
      courseId,
    },
  });
};

// fetch the student's courses
export const getStudentEnrollments = async (userId: string) => {
  return await prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
          instructor: {
            select: { fullName: true }
          },
          _count: {
            select: { sections: true }
          }
        }
      }
    }
  });
};

// check whether the student is enrolled or not
export const checkEnrollment = async (userId: string, courseId: string) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
  });
  return !!enrollment; // Returns true if enrolled, false otherwise
};

// get full course content if the user is enrolled
export const getCourseFullContentService = async (courseId: string) => {
  return await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: {
        select: { fullName: true }
      },
      sections: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              content: true,
              videoUrl: true,
              videoName: true,
              pdfUrl: true,
              documentName: true,
              duration: true,
            }
          }
        }
      }
    }
  });
};

// Fetch a lesson's document URL and verify it exists — used by the document proxy
export const getLessonDocumentService = async (lessonId: string) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      pdfUrl: true,
      title: true,
      section: {
        select: { courseId: true },
      },
    },
  });

  if (!lesson || !lesson.pdfUrl) {
    const err: any = new Error("Document not found");
    err.status = 404;
    throw err;
  }

  return {
    pdfUrl: lesson.pdfUrl,
    title: lesson.title,
    courseId: lesson.section.courseId,
  };
};