export const requireTenant = (req: any, res: any, next: any) => {
  if (!req.user?.tenantId) return res.status(403).json({ message: "Invalid tenant" });
  next();
};
