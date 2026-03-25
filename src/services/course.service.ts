import { prisma } from "../lib/prisma.js";

export const createCourseService = async (data: {
  title: string;
  description?: string | null;
  shortDescription: string;
  price: number;
  instructorId: string;
  category: string;
  totalDuration?: number;
  lectureCount?: number;
  notesCount?: number;
}) => {
  return await prisma.course.create({
    data: {
      ...data,
      lectureCount: data.lectureCount ?? 0,
      notesCount: data.notesCount ?? 0,
    },
  });
};

// Fetches all the available courses
export const getAllCoursesService = async () => {
  return await prisma.course.findMany({
    include: {
      instructor: {
        select: { fullName: true }, // So the frontend can show the teacher's name
      },
    },
  });
};

//Creates the section for the course
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
  title: string;
  sectionId: string;
  videoUrl?: string;
  duration?: any;
  content?: string;
}) => {
  return await prisma.lesson.create({
    data: {
      title: data.title,
      sectionId: data.sectionId,
      videoUrl: data.videoUrl ?? "",
      duration: 0,
      content: data.content ?? "",
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

//Get the preview details for  the course before buying
export const getCoursePreviewService = async (courseId: string) => {
  return await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      shortDescription: true, 
      description: true,
      thumbnail: true,        
      price: true,
      category: true,
      level: true,
      totalDuration: true,
      videoCount: true,   
      
      instructor: {
        select: { 
          fullName: true,
          profile: { select: { avatar: true, bio: true } } // Show who is teaching
        },
      },
// section w
      sections: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          lessons: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              duration: true,
            }
          }
        }
      }
    },
  });
};

// fetches the courses created by the fixed instructor
export const getInstructorCoursesService = async (instructorId: string) => {
  return await prisma.course.findMany({
    where: {
      instructorId: instructorId,
    },
    orderBy: {
      createdAt: "desc", // Show newest courses first
    },
    include: {
      _count: {
        select: {
          sections: true,
        },
      },
    },
  });
};

// updates the total course duration each time a new lesson is added

export const updateCourseTotalDuration = async (courseId: string) => {

  // 1. Sum the duration of all lessons in this course
  const aggregation = await prisma.lesson.aggregate({
    where: {
      section: {
        courseId: courseId,
      },
    },
    _sum: {
      duration: true,
    },
  });

  const newTotalDuration = aggregation._sum.duration || 0;

  // 2. Update the Course record
  const updatedCourse = await prisma.course.update({
    where: { id: courseId },
    data: {
      totalDuration: newTotalDuration,
    },
  });

  return updatedCourse;
};

// get section by Id
export const getSectionById = async (sectionId: string) => {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { courseId: true },
  });

  return section;
};
