import type { ErrorRequestHandler } from "express";
import { ApllicationException } from "../exceptions/application.exception.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof ApllicationException) {
    const errors = Array.isArray(error.cause)
      ? error.cause.map((issue: { path?: unknown; message?: unknown }) => ({
          path: issue.path,
          message: issue.message,
        }))
      : undefined;

    return res.status(error.status).json({ message: error.message, errors });
  }

  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    return res.status(400).json({ message: "Invalid JSON body" });
  }

  console.error("Unhandled request error:", error);
  return res.status(500).json({ message: "Internal server error" });
};
