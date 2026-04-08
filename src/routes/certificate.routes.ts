import express from "express";
import { getMyCertificates, verifyCertificate, downloadCertificate } from "../controllers/certificate.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Student: list own certificates
router.get("/my", protect, getMyCertificates);

// Public: verify any certificate
router.get("/verify/:certificateId", verifyCertificate);

// Download PDF
router.get("/:certificateId/download", downloadCertificate);

export default router;
