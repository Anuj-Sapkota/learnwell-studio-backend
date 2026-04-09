import type { Request, Response, NextFunction } from "express";
import {
  getMyCertificatesService,
  verifyCertificateService,
  generateCertificatePDFById,
} from "../services/certificate.service.js";

interface ProtectedRequest extends Request {
  user: { userId: string; role: string };
}

// Student: get all their certificates
export const getMyCertificates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as ProtectedRequest).user.userId;
    const certificates = await getMyCertificatesService(userId);
    res.status(200).json({ success: true, data: certificates });
  } catch (err) {
    next(err);
  }
};

// Public: verify a certificate by its ID
export const verifyCertificate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { certificateId } = req.params as { certificateId: string };
    const cert = await verifyCertificateService(certificateId);
    res.status(200).json({ success: true, data: cert });
  } catch (err) {
    next(err);
  }
};

// Download certificate as PDF
export const downloadCertificate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { certificateId } = req.params as { certificateId: string };
    const pdfBuffer = await generateCertificatePDFById(certificateId);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="certificate-${certificateId}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};
