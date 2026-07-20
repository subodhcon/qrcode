/**
 * Health check controller.
 * GET /api/health
 */
export const getHealth = (req, res) => {
  res.status(200).json({
    status: true,
  });
};
