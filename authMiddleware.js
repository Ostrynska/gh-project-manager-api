const express = require("express");
const cors = require("cors");
const { verfiyJWT } = require("./utils");

const app = express();

// Налаштування CORS
const corsOptions = {
    origin: 'http://localhost:5174', // Дозволяємо запити тільки з цього домену
    methods: ['GET', 'POST'], // Дозволяємо методи GET та POST
    credentials: true, // Дозволяємо передачу cookies
};

app.use(cors(corsOptions)); // Додаємо CORS middleware

const excludeAuthURLs = new Set(['/login', '/token']);

const authMiddleware = async (req, res, next) => {
    if (excludeAuthURLs.has(req.path)) {
        console.log("Bypassing JWT verification for" + req.path);
        next();
        return;
    }

    const { ACCESS_TOKEN: accessToken } = req.signedCookies;

    // Використовуємо асинхронну перевірку JWT
    if (await verfiyJWT(accessToken, jwtSigningKey)) {
        next();
    } else {
        res.status(401).send("Unauthenticated");
    }
};

module.exports = authMiddleware;