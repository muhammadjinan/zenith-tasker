const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ error: 'A token is required for authentication' });
    }

    try {
        const bearer = token.split(' ');
        const bearerToken = bearer[1];

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('[Auth] Critical Error: JWT_SECRET is not defined.');
            return res.status(500).json({ error: 'Server authentication misconfiguration' });
        }
        const decoded = jwt.verify(bearerToken, secret);
        req.user = decoded;
    } catch (err) {
        console.error(`[Auth] Failed: ${err.message}`);
        return res.status(401).json({ error: `Invalid Token: ${err.message}` });
    }
    return next();
};

module.exports = verifyToken;
