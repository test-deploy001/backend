const jwt = require('jsonwebtoken');

// Middleware to authenticate and check role
const verifyRole = (requiredRoles) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token missing' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      console.log("Decoded token:", decoded);
      // Check if the user's role is in the list of required roles
      if (!requiredRoles.includes(decoded.userType)) {
        console.log("Access denied for userType:", decoded.userType); // Debug log
        return res.status(403).json({ message: 'Access denied' });
      }

      // Attach user info to the request for further use
      req.user = decoded;
      next();
    });
  };
};

module.exports = { verifyRole };
