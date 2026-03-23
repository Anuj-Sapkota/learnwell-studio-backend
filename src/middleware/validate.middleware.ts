import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import type { ZodTypeAny } from "zod/v3";

interface ValidatableSchema {
  parseAsync: (data: any) => Promise<any>;
}

export const validate =
  (schema: ValidatableSchema) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse the request parts against the schema
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Update req with parsed data
      req.body = parsed.body;
      req.params = parsed.params;
      req.query = parsed.query;

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation Error",
          errors: error.flatten().fieldErrors, // Returns readable errors
        });
      }
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  };
