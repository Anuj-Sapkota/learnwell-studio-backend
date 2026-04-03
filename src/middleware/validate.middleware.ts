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
      console.log("req.body before validation:", req.body);
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      console.log("parsed: ", parsed)
      if (parsed.body) {
        req.body = Object.assign(req.body || {}, parsed.body);
      }

      if (parsed.params) {
        // We don't overwrite req.params, we just update its properties
        Object.assign(req.params, parsed.params);
      }

      if (parsed.query) {
        // We don't overwrite req.query, we just update its properties
        Object.assign(req.query, parsed.query);
      }

      return next();
    } catch (error) {
      console.log("Error:", error)
      next(error);
    }
  };
