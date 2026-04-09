import { prisma } from "../lib/prisma.js";
import { ServiceError } from "../errors/service.error.js";
import { generateCertificatePDF } from "../utils/pdf.util.js";

// Generates a short unique certificate ID like "CERT-A3F9X2"
const generateCertificateId = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const random = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `CERT-${random}`;
};

/**
 * Checks if a student has submitted all assignments for a course.
 * If yes and no certificate exists yet, issues one automatically.
 */
export const checkAndIssueCertificate = async (userId: string, courseId: string) => {
  // Get all assignments for the course
  const assignments = await prisma.assignment.findMany({
    where: { courseId },
    select: { id: true },
  });

  if (assignments.length === 0) return null; // no assignments = no certificate

  // Check if student has submitted all of them
  const submissions = await prisma.submission.findMany({
    where: { userId, assignmentId: { in: assignments.map((a) => a.id) } },
    select: { assignmentId: true },
  });

  if (submissions.length < assignments.length) return null; // not all submitted yet

  // Check if certificate already issued
  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) return existing;

  // Issue certificate
  let certificateId = generateCertificateId();
  // Ensure uniqueness (extremely unlikely collision but safe)
  while (await prisma.certificate.findUnique({ where: { certificateId } })) {
    certificateId = generateCertificateId();
  }

  return await prisma.certificate.create({
    data: { certificateId, userId, courseId },
    include: {
      user: { select: { fullName: true } },
      course: { select: { title: true } },
    },
  });
};

/**
 * Returns all certificates for a student.
 */
export const getMyCertificatesService = async (userId: string) => {
  return await prisma.certificate.findMany({
    where: { userId },
    orderBy: { issuedAt: "desc" },
    include: {
      course: { select: { title: true, thumbnail: true, instructor: { select: { fullName: true } } } },
    },
  });
};

/**
 * Public verification — anyone can verify a certificate by its ID.
 */
export const verifyCertificateService = async (certificateId: string) => {
  const cert = await prisma.certificate.findUnique({
    where: { certificateId },
    include: {
      user: { select: { fullName: true } },
      course: { select: { title: true, instructor: { select: { fullName: true } } } },
    },
  });
  if (!cert) throw new ServiceError("Certificate not found or invalid.", 404);
  return cert;
};

/**
 * Generates a PDF certificate and returns it as a Buffer.
 */
export const generateCertificatePDFById = async (certificateId: string): Promise<Buffer> => {
  const cert = await prisma.certificate.findUnique({
    where: { certificateId },
    include: {
      user: { select: { fullName: true } },
      course: { select: { title: true, instructorSignature: true, instructor: { select: { fullName: true } } } },
    },
  });

  if (!cert) throw new ServiceError("Certificate not found.", 404);

  return generateCertificatePDF({
    studentName: cert.user.fullName,
    courseTitle: cert.course.title,
    instructorName: cert.course.instructor.fullName,
    ...(cert.course.instructorSignature && { instructorSignatureUrl: cert.course.instructorSignature }),
    certificateId: cert.certificateId,
    issuedAt: cert.issuedAt,
  });
};
