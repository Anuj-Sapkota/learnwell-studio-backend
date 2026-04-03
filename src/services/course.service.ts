import { prisma } from "../lib/prisma.js";
import { v2 as cloudinary } from "cloudinary";

export const createCourseService = async (data: {
  title: string;
  description?: string | null;
  shortDescription: string;
  price: number;
  discount?: number;
  isFree?: boolean;
  accessDuration?: number | null;
  thumbnail?: string;
  instructorId: string;
  categoryId?: string;
  level?: string;
  totalDuration?: number;
  lectureCount?: number;
  notesCount?: number;
  prerequisites?: string[];
}) => {
  
  return await prisma.course.create({
    data: {
      title: data.title,
      shortDescription: data.shortDescription,
      description: data.description ?? null,
      price: data.isFree ? 0 : data.price,
      discount: data.discount ?? 0,
      isFree: data.isFree ?? false,
      accessDuration: data.accessDuration ?? null,
      thumbnail: data.thumbnail ?? null,
      instructorId: data.instructorId,
      categoryId: data.categoryId ?? null,
      level: data.level ?? "BEGINNER",
      totalDuration: data.totalDuration ?? 0,
      lectureCount: data.lectureCount ?? 0,
      notesCount: data.notesCount ?? 0,
      prerequisites: data.prerequisites ?? [],
    },
  });
};

export const getAllCoursesService = async (
  search?: string,
  categoryId?: string,
) => {
  return await prisma.course.findMany({
    where: {
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { shortDescription: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(categoryId && { categoryId }),
    },
    include: {
      instructor: { select: { fullName: true } },
      category: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
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
  contentType?: string;
  videoUrl?: string;
  videoName?: string;
  pdfUrl?: string;
  documentName?: string;
  duration?: number;
  content?: string;
}) => {
  return await prisma.lesson.create({
    data: {
      title: data.title,
      sectionId: data.sectionId,
      contentType: (data.contentType as any) ?? "TEXT",
      videoUrl: data.videoUrl ?? null,
      videoName: data.videoName ?? null,
      pdfUrl: data.pdfUrl ?? null,
      documentName: data.documentName ?? null,
      duration: data.duration ?? 0,
      content: data.content ?? null,
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
      prerequisites: true,

      instructor: {
        select: {
          fullName: true,
          profile: { select: { avatar: true, bio: true } }, // Show who is teaching
        },
      },
      // section w
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          lessons: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              duration: true,
            },
          },
        },
      },
    },
  });
};

// fetches the courses created by the fixed instructor
export const getInstructorCoursesService = async (instructorId: string) => {
  return await prisma.course.findMany({
    where: { instructorId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          sections: true,
          enrollments: true,
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

// Delete a course (cascades to sections, lessons, enrollments via Prisma schema)
// Also cleans up all associated Cloudinary assets (videos + thumbnail)
export const deleteCourseService = async (
  courseId: string,
  instructorId: string,
) => {
  // 1. Verify ownership and fetch all asset URLs before deleting
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sections: {
        include: {
          lessons: { select: { videoUrl: true } },
        },
      },
    },
  });

  if (!course) throw new Error("Course not found");
  if (course.instructorId !== instructorId) throw new Error("Forbidden");

  // 2. Collect all Cloudinary public_ids to delete
  // Cloudinary URL format: https://res.cloudinary.com/<cloud>/video/upload/v123456/<public_id>.mp4
  const extractPublicId = (url: string, resourceType: "video" | "image") => {
    try {
      // Grab everything after /upload/ and strip the version segment + extension
      const uploadIndex = url.indexOf("/upload/");
      if (uploadIndex === -1) return null;
      const afterUpload = url.slice(uploadIndex + 8); // skip "/upload/"
      // Remove version prefix like "v1234567890/"
      const withoutVersion = afterUpload.replace(/^v\d+\//, "");
      // Remove file extension
      return withoutVersion.replace(/\.[^/.]+$/, "");
    } catch {
      return null;
    }
  };

  const videoPublicIds: string[] = [];
  for (const section of course.sections) {
    for (const lesson of section.lessons) {
      if (lesson.videoUrl) {
        const pid = extractPublicId(lesson.videoUrl, "video");
        if (pid) videoPublicIds.push(pid);
      }
    }
  }

  const imagePublicIds: string[] = [];
  if (course.thumbnail) {
    const pid = extractPublicId(course.thumbnail, "image");
    if (pid) imagePublicIds.push(pid);
  }

  // 3. Delete from Cloudinary (fire and don't block on errors — DB delete is the source of truth)
  const cloudinaryDeletions: Promise<any>[] = [];

  if (videoPublicIds.length > 0) {
    cloudinaryDeletions.push(
      cloudinary.api
        .delete_resources(videoPublicIds, { resource_type: "video" })
        .catch((err) => console.error("Cloudinary video deletion error:", err)),
    );
  }

  if (imagePublicIds.length > 0) {
    cloudinaryDeletions.push(
      cloudinary.api
        .delete_resources(imagePublicIds, { resource_type: "image" })
        .catch((err) => console.error("Cloudinary image deletion error:", err)),
    );
  }

  await Promise.all(cloudinaryDeletions);

  // 4. Delete from DB — Prisma cascade handles sections, lessons, enrollments
  return await prisma.course.delete({ where: { id: courseId } });
};

// get section by Id
export const getSectionById = async (sectionId: string) => {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { courseId: true },
  });

  return section;
};

// Delete a section (cascades to lessons via Prisma schema)
export const deleteSectionService = async (
  sectionId: string,
  instructorId: string,
) => {
  // Verify the section belongs to a course owned by this instructor
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { course: { select: { instructorId: true } } },
  });

  if (!section) throw new Error("Section not found");
  if (section.course.instructorId !== instructorId)
    throw new Error("Forbidden");

  return await prisma.section.delete({ where: { id: sectionId } });
};

// Update a section (title, order)
export const updateSectionService = async (
  sectionId: string,
  instructorId: string,
  data: { title?: string; order?: number },
) => {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { course: { select: { instructorId: true } } },
  });

  if (!section) throw new Error("Section not found");
  if (section.course.instructorId !== instructorId)
    throw new Error("Forbidden");

  return await prisma.section.update({ where: { id: sectionId }, data });
};

// Update a lesson (title, content, order, videoUrl, pdfUrl, names)
export const updateLessonService = async (
  lessonId: string,
  instructorId: string,
  data: {
    title?: string;
    content?: string;
    order?: number;
    videoUrl?: string;
    videoName?: string;
    pdfUrl?: string;
    documentName?: string;
    duration?: number;
  },
) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      section: { include: { course: { select: { instructorId: true } } } },
    },
  });

  if (!lesson) throw new Error("Lesson not found");
  if (lesson.section.course.instructorId !== instructorId)
    throw new Error("Forbidden");

  const updatePayload: any = { ...data };
  if (data.order !== undefined) updatePayload.order = Number(data.order);

  return await prisma.lesson.update({
    where: { id: lessonId },
    data: updatePayload,
  });
};

// Delete a lesson and clean up Cloudinary assets
export const deleteLessonService = async (
  lessonId: string,
  instructorId: string,
) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      section: {
        include: { course: { select: { instructorId: true, id: true } } },
      },
    },
  });

  if (!lesson) throw new Error("Lesson not found");
  if (lesson.section.course.instructorId !== instructorId)
    throw new Error("Forbidden");

  const courseId = lesson.section.course.id;

  // Clean up Cloudinary assets
  const extractPublicId = (url: string) => {
    try {
      const uploadIndex = url.indexOf("/upload/");
      if (uploadIndex === -1) return null;
      const afterUpload = url.slice(uploadIndex + 8);
      const withoutVersion = afterUpload.replace(/^v\d+\//, "");
      return withoutVersion.replace(/\.[^/.]+$/, "");
    } catch {
      return null;
    }
  };

  const deletions: Promise<any>[] = [];
  if (lesson.videoUrl) {
    const pid = extractPublicId(lesson.videoUrl);
    if (pid)
      deletions.push(
        cloudinary.api
          .delete_resources([pid], { resource_type: "video" })
          .catch(console.error),
      );
  }
  if (lesson.pdfUrl) {
    const pid = extractPublicId(lesson.pdfUrl);
    if (pid)
      deletions.push(
        cloudinary.api
          .delete_resources([pid], { resource_type: "image" })
          .catch(console.error),
      );
  }
  await Promise.all(deletions);

  await prisma.lesson.delete({ where: { id: lessonId } });

  // Recalculate course total duration
  await updateCourseTotalDuration(courseId);
};

interface UpdateCourseData {
  title?: string;
  shortDescription?: string;
  description?: string;
  thumbnail?: string;
  price?: number | string;
  discount?: number | string;
  isFree?: boolean | string;
  accessDuration?: number | string | null;
  category?: string;
  level?: string;
}

export const updateCourseService = async (
  courseId: string,
  data: UpdateCourseData,
) => {
  const updatePayload: any = { ...data };

  if (data.price !== undefined) updatePayload.price = Number(data.price);
  if (data.discount !== undefined)
    updatePayload.discount = Number(data.discount);
  if (data.isFree !== undefined)
    updatePayload.isFree = data.isFree === "true" || data.isFree === true;
  if (data.accessDuration !== undefined) {
    updatePayload.accessDuration =
      data.accessDuration === "" || data.accessDuration === null
        ? null
        : Number(data.accessDuration);
  }

  return await prisma.course.update({
    where: { id: courseId },
    data: updatePayload,
    include: { instructor: { select: { fullName: true } } },
  });
};

// Sync lesson durations from Cloudinary for lessons that have duration = 0
export const syncLessonDurationsService = async (
  courseId: string,
  instructorId: string,
) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sections: {
        include: {
          lessons: { select: { id: true, videoUrl: true, duration: true } },
        },
      },
    },
  });

  if (!course) throw new Error("Course not found");
  if (course.instructorId !== instructorId) throw new Error("Forbidden");

  const extractPublicId = (url: string) => {
    try {
      const uploadIndex = url.indexOf("/upload/");
      if (uploadIndex === -1) return null;
      const afterUpload = url.slice(uploadIndex + 8);
      const withoutVersion = afterUpload.replace(/^v\d+\//, "");
      return withoutVersion.replace(/\.[^/.]+$/, "");
    } catch {
      return null;
    }
  };

  let updated = 0;
  for (const section of course.sections) {
    for (const lesson of section.lessons) {
      if (!lesson.videoUrl || lesson.duration > 0) continue;
      const publicId = extractPublicId(lesson.videoUrl);
      if (!publicId) continue;
      try {
        const result = await cloudinary.api.resource(publicId, {
          resource_type: "video",
        });
        const duration = Math.round(result.duration || 0);
        if (duration > 0) {
          await prisma.lesson.update({
            where: { id: lesson.id },
            data: { duration },
          });
          updated++;
        }
      } catch (err) {
        console.error(`Failed to fetch duration for lesson ${lesson.id}:`, err);
      }
    }
  }

  await updateCourseTotalDuration(courseId);
  return { updated };
};

// Get enrolled students for a specific course (instructor only)
export const getEnrolledStudentsService = async (
  courseId: string,
  instructorId: string,
) => {
  // Verify ownership
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true, title: true },
  });

  if (!course) throw new Error("Course not found");
  if (course.instructorId !== instructorId) throw new Error("Forbidden");

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: { select: { avatar: true } },
        },
      },
    },
  });

  return {
    courseTitle: course.title,
    totalEnrolled: enrollments.length,
    students: enrollments.map((e) => ({
      enrollmentId: e.id,
      enrolledAt: e.createdAt,
      ...e.user,
    })),
  };
};
