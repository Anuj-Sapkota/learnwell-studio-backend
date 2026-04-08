import { prisma } from "../lib/prisma.js";
import { ServiceError } from "../errors/service.error.js";
import PDFDocument from "pdfkit";

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
export const generateCertificatePDF = async (certificateId: string): Promise<Buffer> => {
  const cert = await prisma.certificate.findUnique({
    where: { certificateId },
    include: {
      user: { select: { fullName: true } },
      course: { select: { title: true, instructor: { select: { fullName: true } } } },
    },
  });

  if (!cert) throw new ServiceError("Certificate not found.", 404);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 60 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width;
    const H = doc.page.height;

    // Background
    doc.rect(0, 0, W, H).fill("#0f172a");

    // Border
    doc.rect(20, 20, W - 40, H - 40).lineWidth(2).stroke("#6366f1");

    // Header
    doc.fillColor("#6366f1").fontSize(14).font("Helvetica-Bold")
      .text("LEARNWELL", 0, 50, { align: "center" });

    doc.fillColor("#ffffff").fontSize(36).font("Helvetica-Bold")
      .text("Certificate of Completion", 0, 80, { align: "center" });

    // Divider
    doc.moveTo(100, 140).lineTo(W - 100, 140).lineWidth(1).stroke("#6366f1");

    // Body
    doc.fillColor("#94a3b8").fontSize(14).font("Helvetica")
      .text("This is to certify that", 0, 165, { align: "center" });

    doc.fillColor("#ffffff").fontSize(28).font("Helvetica-Bold")
      .text(cert.user.fullName, 0, 195, { align: "center" });

    doc.fillColor("#94a3b8").fontSize(14).font("Helvetica")
      .text("has successfully completed the course", 0, 240, { align: "center" });

    doc.fillColor("#6366f1").fontSize(22).font("Helvetica-Bold")
      .text(cert.course.title, 0, 268, { align: "center" });

    doc.fillColor("#94a3b8").fontSize(12).font("Helvetica")
      .text(`Instructed by ${cert.course.instructor.fullName}`, 0, 308, { align: "center" });

    // Divider
    doc.moveTo(100, 340).lineTo(W - 100, 340).lineWidth(1).stroke("#6366f1");

    // Footer
    const issuedDate = new Date(cert.issuedAt).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    doc.fillColor("#64748b").fontSize(11).font("Helvetica")
      .text(`Issued: ${issuedDate}`, 80, 360)
      .text(`Certificate ID: ${cert.certificateId}`, 80, 378)
      .text(`Verify at: ${process.env.FRONTEND_URL}/verify/${cert.certificateId}`, 80, 396);

    doc.end();
  });
};
