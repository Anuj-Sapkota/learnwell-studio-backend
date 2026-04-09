import PDFDocument from "pdfkit";
import https from "https";
import http from "http";

interface CertificateData {
  studentName: string;
  courseTitle: string;
  instructorName: string;
  instructorSignatureUrl?: string;
  certificateId: string;
  issuedAt: Date;
}

const fetchImageBuffer = (url: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const request = protocol.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchImageBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    request.on("error", reject);
    request.setTimeout(10000, () => { request.destroy(); reject(new Error("Timeout")); });
  });
};

export const generateCertificatePDF = async (data: CertificateData): Promise<Buffer> => {
  let signatureBuffer: Buffer | null = null;
  if (data.instructorSignatureUrl) {
    try {
      // Force JPEG conversion via Cloudinary URL transformation — pdfkit only supports JPEG/PNG
      const jpegUrl = data.instructorSignatureUrl.replace("/upload/", "/upload/f_jpg,q_90/");
      signatureBuffer = await fetchImageBuffer(jpegUrl);
      console.log(`Signature fetched: ${signatureBuffer.length} bytes`);
    } catch (err) {
      console.error("Failed to fetch instructor signature:", err);
    }
  }

  return new Promise((resolve, reject) => {
    // Landscape A4
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width;   // 841.89
    const H = doc.page.height;  // 595.28

    // ── Background: light blue ──────────────────────────────────────────────
    doc.rect(0, 0, W, H).fill("#a8c8e8");

    // ── White inner card ────────────────────────────────────────────────────
    const pad = 40;
    const cardX = pad;
    const cardY = pad;
    const cardW = W - pad * 2;
    const cardH = H - pad * 2;
    doc.rect(cardX, cardY, cardW, cardH).fill("#ffffff");

    // ── Thin inner border ───────────────────────────────────────────────────
    const bPad = 52;
    doc.rect(bPad, bPad, W - bPad * 2, H - bPad * 2)
      .lineWidth(1)
      .stroke("#a8c8e8");

    // ── Corner decorations ──────────────────────────────────────────────────
    // Each corner has 3 overlapping triangles: dark blue, red/pink, yellow
    const drawCornerTL = () => {
      // dark blue triangle
      doc.save().polygon([0, 0], [120, 0], [0, 120]).fill("#1a3a6b").restore();
      // red triangle
      doc.save().polygon([0, 0], [90, 0], [0, 90]).fill("#d63060").restore();
      // yellow triangle
      doc.save().polygon([0, 0], [60, 0], [0, 60]).fill("#f5c842").restore();
    };

    const drawCornerTR = () => {
      doc.save().translate(W, 0)
        .polygon([0, 0], [-120, 0], [0, 120]).fill("#1a3a6b").restore();
      doc.save().translate(W, 0)
        .polygon([0, 0], [-90, 0], [0, 90]).fill("#d63060").restore();
      doc.save().translate(W, 0)
        .polygon([0, 0], [-60, 0], [0, 60]).fill("#f5c842").restore();
    };

    const drawCornerBL = () => {
      doc.save().translate(0, H)
        .polygon([0, 0], [120, 0], [0, -120]).fill("#1a3a6b").restore();
      doc.save().translate(0, H)
        .polygon([0, 0], [90, 0], [0, -90]).fill("#d63060").restore();
      doc.save().translate(0, H)
        .polygon([0, 0], [60, 0], [0, -60]).fill("#f5c842").restore();
    };

    const drawCornerBR = () => {
      doc.save().translate(W, H)
        .polygon([0, 0], [-120, 0], [0, -120]).fill("#1a3a6b").restore();
      doc.save().translate(W, H)
        .polygon([0, 0], [-90, 0], [0, -90]).fill("#d63060").restore();
      doc.save().translate(W, H)
        .polygon([0, 0], [-60, 0], [0, -60]).fill("#f5c842").restore();
    };

    drawCornerTL();
    drawCornerTR();
    drawCornerBL();
    drawCornerBR();

    // ── CERTIFICATE title ───────────────────────────────────────────────────
    doc.fillColor("#1a3a6b").fontSize(42).font("Helvetica-Bold")
      .text("CERTIFICATE", 0, 90, { align: "center", characterSpacing: 4 });

    doc.fillColor("#444444").fontSize(14).font("Helvetica")
      .text("Of Training Course Completion", 0, 142, { align: "center" });

    // ── Body text ───────────────────────────────────────────────────────────
    doc.fillColor("#555555").fontSize(13).font("Helvetica")
      .text("This certificate is awarded to", 0, 200, { align: "center" });

    // Student name in pink cursive-style (Helvetica-BoldOblique as fallback)
    doc.fillColor("#d63060").fontSize(34).font("Helvetica-BoldOblique")
      .text(data.studentName, 0, 228, { align: "center" });

    doc.fillColor("#333333").fontSize(13).font("Helvetica")
      .text("Has successfully completed the training course on", 0, 285, { align: "center" });

    doc.fillColor("#1a3a6b").fontSize(15).font("Helvetica-Bold")
      .text(data.courseTitle, 0, 308, { align: "center" });

    // ── Signature + Instructor ──────────────────────────────────────────────
    const sigCenterX = W / 2;
    const sigY = 370;

    if (signatureBuffer) {
      const sigW = 130;
      const sigH = 55;
      doc.image(signatureBuffer, sigCenterX - sigW / 2, sigY, { width: sigW, fit: [sigW, sigH] });
    } else {
      // Fallback line
      doc.moveTo(sigCenterX - 65, sigY + 50)
        .lineTo(sigCenterX + 65, sigY + 50)
        .lineWidth(1).stroke("#aaaaaa");
    }

    doc.fillColor("#1a3a6b").fontSize(13).font("Helvetica-Bold")
      .text(data.instructorName.toUpperCase(), 0, sigY + 60, { align: "center", characterSpacing: 1 });

    doc.fillColor("#888888").fontSize(10).font("Helvetica")
      .text("INSTRUCTOR", 0, sigY + 78, { align: "center", characterSpacing: 2 });

    // ── Footer: cert ID + date ──────────────────────────────────────────────
    const issuedDate = new Date(data.issuedAt).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    doc.fillColor("#aaaaaa").fontSize(9).font("Helvetica")
      .text(`ID: ${data.certificateId}   |   Issued: ${issuedDate}   |   Verify: ${process.env.FRONTEND_URL}/verify/${data.certificateId}`,
        bPad + 10, H - bPad - 16, { width: W - (bPad + 10) * 2, align: "center" });

    doc.end();
  });
};
