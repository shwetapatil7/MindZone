const jwt = require('jsonwebtoken');
const User = require('./models/User');

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id);

    console.log("AUTH USER:", req.user); // <--- ADD HERE

    if (!req.user) throw new Error("User not found");

    next();
  } catch (error) {
    console.error("AUTH ERROR:", error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = auth;
