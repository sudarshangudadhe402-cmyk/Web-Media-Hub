import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { logger } from "../lib/logger";

function getIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const ip = getIp(req);
      const issues = (result.error as ZodError).issues.map((i) => ({
        field: i.path.join("."),
        code: i.code,
      }));

      logger.warn(
        { ip, path: req.path, method: req.method, issues },
        "Input validation failure"
      );

      res.status(400).json({
        error: "Invalid request. Please check your input and try again.",
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
