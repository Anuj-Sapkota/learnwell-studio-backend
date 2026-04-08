import { prisma } from "../lib/prisma.js";
import { ServiceError } from "../errors/service.error.js";

const UNLOCK_THRESHOLD = 60; // percent watched to unlock next lesson

/**
 * Called by the frontend video player periodically.
 * Updates watch progress and unlocks the next lesson if threshold is met.
 */
export const updateLessonProgressService = async (
  userId: string,
  lessonId: string,
  watchedPercent: number,
) => {
  // Clamp to 0-100
  const percent = Math.min(100, Math.max(0, watchedPercent));

  // Fetch lesson with its section and all sibling lessons ordered
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      section: {
        include: {
          lessons: { orderBy: { order: "asc" }, select: { id: true, order: true } },
          course: {
            select: {
              id: true,
              assignments: { select: { id: true } },
              sections: {
                orderBy: { order: "asc" },
                include: {
                  lessons: { orderBy: { order: "asc" }, select: { id: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!lesson) throw new ServiceError("Lesson not found.", 404);

  // Verify enrollment
  const enrolled = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: lesson.section.course.id } },
  });
  if (!enrolled) throw new ServiceError("You are not enrolled in this course.", 403);

  // Upsert progress for this lesson
  const progress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: {
      watchedPercent: percent,
      ...(percent >= UNLOCK_THRESHOLD && { completedAt: new Date() }),
    },
    create: {
      userId,
      lessonId,
      watchedPercent: percent,
      isUnlocked: true,
      completedAt: percent >= UNLOCK_THRESHOLD ? new Date() : null,
    },
  });

  // If threshold met, unlock the next lesson
  if (percent >= UNLOCK_THRESHOLD) {
    const siblings = lesson.section.lessons;
    const currentIndex = siblings.findIndex((l) => l.id === lessonId);
    const nextLesson = siblings[currentIndex + 1];

    if (nextLesson) {
      // Unlock next lesson in same section
      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId: nextLesson.id } },
        update: { isUnlocked: true },
        create: { userId, lessonId: nextLesson.id, isUnlocked: true, watchedPercent: 0 },
      });
    } else {
      // Last lesson in section — check if there's a next section
      const allSections = lesson.section.course.sections;
      const sectionIndex = allSections.findIndex((s) => s.id === lesson.sectionId);
      const nextSection = allSections[sectionIndex + 1];

      if (nextSection && nextSection.lessons.length > 0) {
        const firstLesson = nextSection.lessons[0];
        if (firstLesson) {
          await prisma.lessonProgress.upsert({
            where: { userId_lessonId: { userId, lessonId: firstLesson.id } },
            update: { isUnlocked: true },
            create: { userId, lessonId: firstLesson.id, isUnlocked: true, watchedPercent: 0 },
          });
        }
      } else if (!nextSection) {
        await unlockCourseAssignments(userId, lesson.section.course.id);
      }
    }
  }

  return progress;
};

/**
 * Marks all assignments for a course as unlocked for a student
 * by creating a record in a simple lookup (we use LessonProgress pattern — 
 * assignments unlock is tracked via checking all lessons completed).
 */
const unlockCourseAssignments = async (userId: string, courseId: string) => {
  // We don't need a separate table — the frontend/API checks completion status
  // This is a no-op hook for future extension (e.g. notifications)
  console.log(`All lessons completed for user ${userId} in course ${courseId} — assignments unlocked`);
};

/**
 * Returns progress for all lessons in a course for a given student.
 * Also returns whether assignments are unlocked (all lessons >= threshold).
 */
export const getCourseProgressService = async (userId: string, courseId: string) => {
  // Verify enrollment
  const enrolled = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrolled) throw new ServiceError("You are not enrolled in this course.", 403);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, duration: true, contentType: true, order: true },
          },
        },
      },
      assignments: { select: { id: true, title: true, type: true } },
    },
  });

  if (!course) throw new ServiceError("Course not found.", 404);

  // Fetch all progress records for this user in this course
  const allLessonIds = course.sections.flatMap((s) => s.lessons.map((l) => l.id));
  const progressRecords = await prisma.lessonProgress.findMany({
    where: { userId, lessonId: { in: allLessonIds } },
  });

  const progressMap = new Map(progressRecords.map((p) => [p.lessonId, p]));

  // First lesson of the course is always unlocked
  const firstLessonId = course.sections[0]?.lessons[0]?.id;

  const sections = course.sections.map((section) => ({
    id: section.id,
    title: section.title,
    order: section.order,
    lessons: section.lessons.map((lesson) => {
      const prog = progressMap.get(lesson.id);
      const isFirst = lesson.id === firstLessonId;
      return {
        ...lesson,
        watchedPercent: prog?.watchedPercent ?? 0,
        isUnlocked: isFirst || (prog?.isUnlocked ?? false),
        completedAt: prog?.completedAt ?? null,
      };
    }),
  }));

  // Assignments unlock when ALL video lessons are >= threshold
  const videoLessons = course.sections.flatMap((s) =>
    s.lessons.filter((l) => l.contentType === "VIDEO" || l.contentType === "MIXED")
  );
  const allVideosDone = videoLessons.length === 0 || videoLessons.every((l) => {
    const prog = progressMap.get(l.id);
    return (prog?.watchedPercent ?? 0) >= UNLOCK_THRESHOLD;
  });

  return {
    courseId,
    sections,
    assignmentsUnlocked: allVideosDone,
    assignments: allVideosDone ? course.assignments : [],
  };
};
