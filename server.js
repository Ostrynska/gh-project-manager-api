// require('dotenv').config();

// const session = require('express-session');
// const { Issuer, generators } = require('openid-client');
// const express = require('express');
// const cors = require('cors');
// const { initDB } = require('./db');
// const projectsRouter = require('./routes/projects');

// const app = express();
// app.use(cors());
// app.use(express.json());

// const PORT = process.env.PORT;
// let client;

// async function initializeClient() {
//     const issuer = await Issuer.discover('https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_Xd2uT4WLf');
//     client = new issuer.Client({
//         client_id: '4rm0372u1tdsc607tofnpbnqhe',
//         client_secret: '<client secret>',
//         redirect_uris: ['http://localhost:5174'],
//         response_types: ['code']
//     });
// };
// initializeClient().catch(console.error);

// app.use(session({
//     secret: 'some secret',
//     resave: false,
//     saveUninitialized: false
// }));

// const checkAuth = (req, res, next) => {
//     if (!req.session.userInfo) {
//         req.isAuthenticated = false;
//     } else {
//         req.isAuthenticated = true;
//     }
//     next();
// };

// app.get('/', checkAuth, (req, res) => {
//     res.render('home', {
//         isAuthenticated: req.isAuthenticated,
//         userInfo: req.session.userInfo
//     });
// });

// app.get('/login', (req, res) => {
//     const nonce = generators.nonce();
//     const state = generators.state();

//     req.session.nonce = nonce;
//     req.session.state = state;

//     const authUrl = client.authorizationUrl({
//         scope: 'aws.cognito.signin.user.admin',
//         state: state,
//         nonce: nonce,
//     });

//     res.redirect(authUrl);
// });

// function getPathFromURL(urlString) {
//     try {
//         const url = new URL(urlString);
//         return url.pathname;
//     } catch (error) {
//         console.error('Invalid URL:', error);
//         return null;
//     }
// }

// app.get(getPathFromURL('http://localhost:5174'), async (req, res) => {
//     try {
//         const params = client.callbackParams(req);
//         const tokenSet = await client.callback(
//             'http://localhost:5174',
//             params,
//             {
//                 nonce: req.session.nonce,
//                 state: req.session.state
//             }
//         );

//         const userInfo = await client.userinfo(tokenSet.access_token);
//         req.session.userInfo = userInfo;

//         res.redirect('/');
//     } catch (err) {
//         console.error('Callback error:', err);
//         res.redirect('/');
//     }
// });

// const start = async () => {
//   const db = await initDB();
//   app.use('/api/projects', projectsRouter(db));

//   app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
//   });
// };

// start();

require('dotenv').config();

const express = require("express");
const cookieParser = require('cookie-parser');
const cors = require("cors");
const { Issuer, generators } = require('openid-client');  // Включи необхідні імпорти

const authMiddleware = require('./authMiddleware');
const { getCurrentUrl, getCognitoJWTPublicKey } = require('./utils');

global.jwtSigningKey;
let config;

async function initializeServer() {
    // Ініціалізація OpenID Client
    let server = new URL(`https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`)
    let clientId = process.env.COGNITO_CLIENT_ID;
    let clientSecret = process.env.COGNITO_CLIENT_SECRET;
    
    // Використовуємо Issuer.discover замість client.discovery
    const issuer = await Issuer.discover(server.href);
    
    // Тепер створюємо клієнт за допомогою нової інформації
    config = new issuer.Client({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uris: [process.env.COGNITO_CALLBACK_URL],
        response_types: ['code'],
    });
    
    // Остання частина для отримання публічного ключа для перевірки ACCESS токену
    jwtSigningKey = await getCognitoJWTPublicKey(server.href + "/.well-known/jwks.json");
};

initializeServer().catch(console.error);

const app = express();
const port = process.env.PORT || 3000;

// Список дозволених орігінів
const allowedOrigins = ["http://localhost:5173",];

// CORS middleware
const corsOptions = {
    origin: allowedOrigins, // Передаємо список доменів
    methods: ["GET", "POST"], // Дозволяємо тільки методи GET і POST
    allowedHeaders: ["Content-Type", "Authorization", "X-Custom-Header"], // Дозволяємо тільки ці заголовки
    credentials: true, // Дозволяємо відправку cookies
    maxAge: 10,
};

// Додаємо CORS middleware
app.use(cors(corsOptions));

app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(authMiddleware);

app.get('/login', async (req, res) => {
    const code_verifier = generators.codeVerifier();
    const code_challenge = await generators.codeChallenge(code_verifier);
    const state = generators.state();
    
    let parameters = {
        redirect_uri: process.env.COGNITO_CALLBACK_URL,
        code_challenge,
        code_challenge_method: 'S256',
        state
    }
    
    const congnitoLoginURL = config.authorizationUrl(parameters).href;
    res.cookie('state', state, { httpOnly: true, signed: true });
    res.cookie('code_verifier', code_verifier, { httpOnly: true, signed: true });
    res.send(JSON.stringify({ congnitoLoginURL }));
});

app.get('/token', async (req, res) => {
    try {
        const { state, code_verifier } = req.signedCookies;
        let tokens = await config.authorizationCallback(
            getCurrentUrl(req), 
            { 
                pkceCodeVerifier: code_verifier, 
                expectedState: state 
            }
        );
        
        res.cookie('ACCESS_TOKEN', tokens.access_token, { httpOnly: true, signed: true });
        res.cookie('REFRESH_TOKEN', tokens.refresh_token, { httpOnly: true, signed: true });
        res.cookie('ID_TOKEN', tokens.id_token);
        res.clearCookie("state");
        res.clearCookie("code_verifier");
        res.send(tokens);
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

app.get('/todos', (req, res) => {
    const todos = ["task1", "task2", "task3"];
    const adminTodos = ["adminTask1", "adminTask2", "adminTask3"];
    const isAdmin = JSON.parse(Buffer.from(req?.signedCookies?.ACCESS_TOKEN?.split('.')[1], 'base64')?.toString('utf8'))['cognito:groups']?.includes('Admin');
    res.send(isAdmin ? adminTodos : todos);
});

app.listen(port, () => {
    console.log("Server Started on port " + port);
});
