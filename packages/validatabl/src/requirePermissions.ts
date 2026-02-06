// packages/validatabl/src/requirePermissions.ts

import type { RequestHandler } from "express";
import { checkPermissions } from "@gatewaystack/validatabl-core";

/**
 * Express middleware that requires ALL specified permissions.
 * Returns 403 if any are missing.
 *
 * Reads identity from req.user (populated by identifiabl).
 */
export function requirePermissions(...permissions: string[]): RequestHandler {
  return (req: any, res, next) => {
    const claims = {
      scope: req.user?.scope,
      scopes: req.user?.scopes,
      permissions: req.user?.permissions,
      roles: req.user?.roles,
    };

    const result = checkPermissions(claims, permissions);

    if (!result.allowed) {
      return res.status(403).json({
        error: "insufficient_permissions",
        message: result.reason,
        missing: result.missing,
      });
    }

    return next();
  };
}
