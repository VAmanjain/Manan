// src/middleware/validate.ts
import { ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";

export const validateBody = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            console.error(result.error);
            return res.status(400).json({
                error: "Invalid request body",
                details: result.error.flatten(),
            });
        }

        // Attach parsed data to req for cleaner access
        (req as any).validated = result.data;

        next();
    };
};

export const validateParams = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.params);

        if (!result.success) {
            return res.status(400).json({
                error: "Invalid URL parameters",
                details: result.error.flatten(),
            });
        }

        (req as any).validatedParams = result.data;
        next();
    };
};

