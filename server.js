// server.js (Versija 13.0 - Enhanced su mobile optimization, background mode, location tracking)
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

// Rate limiting utility
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minučių
const MAX_REQUESTS_PER_WINDOW = parseInt(process.env.RATE_LIMIT_MAX || '1000', 10); // maksimalus requestų skaičius per langą

function checkRateLimit(ip) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    
    if (!rateLimit.has(ip)) {
        rateLimit.set(ip, []);
    }
    
    const requests = rateLimit.get(ip);
    const validRequests = requests.filter(time => time > windowStart);
    rateLimit.set(ip, validRequests);
    
    if (validRequests.length >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }
    
    validRequests.push(now);
    return true;
}

// Logging utility
const log = {
    info: (msg) => console.log(`[${new Date().toISOString()}] INFO: ${msg}`),
    error: (msg, err) => console.error(`[${new Date().toISOString()}] ERROR: ${msg}`, err || ''),
    warn: (msg) => console.warn(`[${new Date().toISOString()}] WARN: ${msg}`)
};

// --- Konfigūracija ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    path: '/socket.io/',
    // Didesni timeout'ai mobiliems/Proxy aplinkoje
    pingInterval: 10000,
    pingTimeout: 30000,
    transports: ['websocket', 'polling'],
    cors: { origin: true, credentials: true },
    allowEIO3: true
});
// Užtikriname teisingą secure cookie veikimą už proxy (Nginx)
app.set('trust proxy', 1);
const PORT = 3000;

// --- Duomenų bazės konfigūracija ---
const pool = new Pool({
    user: 'gps_user',
    host: 'postgres',
    database: 'gps_db',
    password: process.env.DB_PASSWORD, // Nuskaitoma iš aplinkos kintamojo
    port: 5432,
    max: 20, // Maksimalus connection pool dydis
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Duomenų bazės ryšio tikrinimas
pool.on('connect', () => {
    log.info('Sėkmingai prisijungta prie duomenų bazės');
});

pool.on('error', (err) => {
    log.error('Duomenų bazės klaida:', err);
    // Kritinė klaida - reikia perskirstyti connections
    if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
        log.error('Kritinė duomenų bazės klaida - bandome perskirstyti connections');
        pool.end().then(() => {
            log.info('Connection pool uždarytas po klaidos');
        });
    }
});

// Graceful shutdown for database
process.on('SIGINT', async () => {
    log.info('SIGINT gautas, uždaromas duomenų bazės pool...');
    await pool.end();
    process.exit(0);
});

// Session secret validation
if (!process.env.SESSION_SECRET) {
    log.error('KRITINĖ KLAIDA: SESSION_SECRET aplinkos kintamasis nėra nustatytas!');
    process.exit(1);
}

const sessionMiddleware = session({
    name: 'gps.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true, // atnaujina galiojimo laiką su kiekvienu request
    cookie: {
        // naudosime secure tik jei nurodyta aplinkoje (per Nginx/HTTPS)
        secure: process.env.COOKIE_SECURE === '1',
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 30 // 30 dienų "remember me"
    }
});

app.use(sessionMiddleware);
app.use(express.json());

// Security headers middleware
app.use((req, res, next) => {
    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Strict Transport Security (HSTS)
    if (process.env.COOKIE_SECURE === '1') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    // Content Security Policy
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.socket.io; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https:; connect-src 'self' ws: wss:;");
    
    next();
});

// Rate limiting middleware (skip static, ping, socket.io)
app.use((req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const url = req.originalUrl || req.url || '';
    // Neapribojame Socket.IO transporto, statinių failų ir ping
    if (
        url.startsWith('/socket.io/') ||
        url.startsWith('/js/') ||
        url.startsWith('/css/') ||
        url.startsWith('/images/') ||
        url.startsWith('/png/') ||
        url.startsWith('/map/') ||
        url.startsWith('/favicon') ||
        url.endsWith('.js') ||
        url.endsWith('.css') ||
        url.endsWith('.png') ||
        url.endsWith('.jpg') ||
        url.endsWith('.jpeg') ||
        url.endsWith('.webp') ||
        url.endsWith('.ico') ||
        url === '/ping'
    ) {
        return next();
    }
    
    if (!checkRateLimit(clientIP)) {
        log.warn(`Rate limit exceeded for IP: ${clientIP}`);
        return res.status(429).json({ 
            message: 'Per daug užklausų. Bandykite vėliau.',
            retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000)
        });
    }
    
    next();
});

// CORS middleware - saugesnis
app.use((req, res, next) => {
    // Leidžiame tik konkretų origin arba localhost development
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
        process.env.ALLOWED_ORIGINS.split(',') : 
        ['http://localhost:3000', 'http://127.0.0.1:3000'];
    
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

const apiRouter = express.Router();
const onlineUsers = new Map(); // Naudojame Map geresniam našumui

// Utility funkcijos
const utils = {
    // Validuoja ar parametras yra skaičius
    isValidId: (id) => !isNaN(parseInt(id)) && parseInt(id) > 0,
    
    // Saugi stringų konversija
    sanitizeString: (str) => typeof str === 'string' ? str.trim().slice(0, 1000) : '',
    
    // Apsaugo nuo SQL injection - papildomas saugumas
    validateInput: (input, type = 'string') => {
        if (type === 'string') {
            return typeof input === 'string' && input.length > 0 && input.length <= 255;
        }
        if (type === 'number') {
            return !isNaN(parseInt(input)) && parseInt(input) > 0;
        }
        return false;
    },
    
    // XSS apsauga
    sanitizeHTML: (str) => {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    },
    
    // SQL injection apsauga
    sanitizeSQL: (str) => {
        if (typeof str !== 'string') return '';
        return str.replace(/['";\\]/g, '');
    }
};

// Input validation middleware
const validateInput = (schema) => {
    return (req, res, next) => {
        const errors = [];
        
        // Validate body
        if (schema.body) {
            for (const [field, rules] of Object.entries(schema.body)) {
                const value = req.body[field];
                
                if (rules.required && (!value || value.trim() === '')) {
                    errors.push(`${field} yra privalomas`);
                } else if (value) {
                    if (rules.type === 'string' && !utils.validateInput(value, 'string')) {
                        errors.push(`${field} turi būti tekstas (maksimaliai 255 simbolių)`);
                    }
                    if (rules.type === 'number' && !utils.validateInput(value, 'number')) {
                        errors.push(`${field} turi būti skaičius`);
                    }
                    if (rules.minLength && value.length < rules.minLength) {
                        errors.push(`${field} turi būti mažiausiai ${rules.minLength} simbolių`);
                    }
                    if (rules.maxLength && value.length > rules.maxLength) {
                        errors.push(`${field} turi būti ne daugiau ${rules.maxLength} simbolių`);
                    }
                }
            }
        }
        
        if (errors.length > 0) {
            return res.status(400).json({ 
                message: 'Neteisingi duomenys', 
                errors: errors 
            });
        }
        
        next();
    };
};

// Distance calculation function (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
}

const isAdmin = (req, res, next) => {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    return res.status(403).json({ message: 'Veiksmas leidžiamas tik administratoriui.' });
};

// Enhanced admin check with super admin protection
const isSuperAdmin = (req, res, next) => {
    if (req.session && req.session.isAdmin && req.session.userId === 1) {
        return next();
    }
    return res.status(403).json({ message: 'Veiksmas leidžiamas tik pagrindiniam administratoriui.' });
};

// HTML no-cache, kad visada gautume naujausią SPA versiją
app.get(['/', '/index.html'], (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Pašalina 404 dėl favicon, jei jo nėra
app.get('/favicon.ico', (req, res) => res.sendStatus(204));

// --- API Endpoints (šaknies keliu be /gps priedėlio) ---
apiRouter.post('/login', validateInput({
    body: {
        username: { required: true, type: 'string', minLength: 3, maxLength: 50 },
        password: { required: true, type: 'string', minLength: 6, maxLength: 100 }
    }
}), async (req, res) => {
    const { username, password, remember } = req.body;
    
    // Papildoma sanitizacija
    const sanitizedUsername = utils.sanitizeSQL(username);
    const sanitizedPassword = utils.sanitizeSQL(password);
    
    try {
        const result = await pool.query("SELECT id, username, password_hash, is_approved, is_admin FROM users WHERE username = $1", [sanitizedUsername]);
        const user = result.rows[0];
        
        if (!user || !(await bcrypt.compare(sanitizedPassword, user.password_hash))) {
            log.warn(`Nesėkmingas prisijungimo bandymas vartotojui: ${sanitizedUsername}`);
            return res.status(401).json({ message: 'Neteisingas vartotojo vardas arba slaptažodis.' });
        }
        
        if (!user.is_approved) {
            log.info(`Nepatvirtintas vartotojas bandė prisijungti: ${sanitizedUsername}`);
            return res.status(403).json({ message: 'Jūsų paskyra dar nepatvirtinta administratoriaus.' });
        }
        
        req.session.userId = user.id;
        req.session.username = user.username; // Saugome originalų username iš DB
        req.session.isAdmin = user.is_admin;

        // Kritiška: įsitikinti, kad sesija įrašyta prieš WS prisijungimą
        req.session.cookie.maxAge = remember ? (1000 * 60 * 60 * 24 * 30) : (1000 * 60 * 60 * 8);
        req.session.save((saveErr) => {
            if (saveErr) {
                log.error('Sesijos išsaugojimo klaida po login:', saveErr);
                return res.status(500).json({ message: 'Sesijos klaida.' });
            }
            log.info(`Vartotojas sėkmingai prisijungė: ${sanitizedUsername}`);
            res.json({ 
                message: 'Sėkmingai prisijungėte!', 
                user: { id: user.id, username: user.username, isAdmin: user.is_admin } 
            });
        });
    } catch (err) {
        log.error("Prisijungimo klaida:", err);
        res.status(500).json({ message: 'Serverio klaida jungiantis.' });
    }
});

apiRouter.post('/register', validateInput({
    body: {
        username: { required: true, type: 'string', minLength: 3, maxLength: 50 },
        password: { required: true, type: 'string', minLength: 6, maxLength: 100 }
    }
}), async (req, res) => {
    const { username, password } = req.body;
    
    // Papildoma sanitizacija
    const sanitizedUsername = utils.sanitizeSQL(username);
    const sanitizedPassword = utils.sanitizeSQL(password);
    
    try {
        const password_hash = await bcrypt.hash(password, 12); // Padidinta hash stiprumas
        await pool.query(
            "INSERT INTO users (username, password_hash, is_approved, is_admin, created_at) VALUES ($1, $2, FALSE, FALSE, NOW())", 
            [sanitizedUsername, password_hash]
        );
        
        log.info(`Naujas vartotojas užsiregistravo: ${sanitizedUsername}`);
        res.status(201).json({ 
            message: 'Sėkmingai užsiregistravote! Prisijungti galėsite, kai administratorius patvirtins Jūsų paskyrą.' 
        });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ message: 'Vartotojas tokiu vardu jau egzistuoja.' });
        }
        log.error("Registracijos klaida:", err);
        res.status(500).json({ message: 'Serverio klaida registruojant vartotoją.' });
    }
});

apiRouter.post('/logout', (req, res) => {
    const username = req.session?.username;
    req.session.destroy(err => {
        if (err) {
            log.error('Atsijungimo klaida:', err);
            return res.status(500).json({ message: 'Nepavyko atsijungti.' });
        }
        // Išvalome teisingą sesijos slapuką
        res.clearCookie('gps.sid');
        if (username) {
            log.info(`Vartotojas atsijungė: ${username}`);
        }
        res.json({ message: 'Sėkmingai atsijungėte.' });
    });
});

apiRouter.get('/session', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, user: { id: req.session.userId, username: req.session.username, isAdmin: req.session.isAdmin } });
    } else {
        res.json({ loggedIn: false });
    }
});

apiRouter.get('/initial-data', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Nėra autorizacijos.' });
    
    try {
        const onlineUsersList = Array.from(onlineUsers.values());
        let allUsersList = [];
        
        if (req.session.isAdmin) {
            const allUsersResult = await pool.query(
                "SELECT id, username, is_admin, is_approved, created_at FROM users ORDER BY created_at DESC LIMIT 1000"
            );
            allUsersList = allUsersResult.rows;
        }
        
        res.json({ 
            onlineUsers: onlineUsersList, 
            allUsers: allUsersList,
            serverTime: new Date().toISOString() // Pridėtas serverio laikas
        });
    } catch (err) {
        log.error("Klaida gaunant pradinius duomenis:", err);
        res.status(500).json({ message: 'Serverio klaida.' });
    }
});

apiRouter.get('/rooms/:roomId/messages', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Nėra autorizacijos.' });
    try {
        const { roomId } = req.params;
        const participationCheck = await pool.query("SELECT 1 FROM room_participants WHERE room_id = $1 AND user_id = $2", [roomId, req.session.userId]);
        if (participationCheck.rowCount === 0) {
            return res.status(403).json({ message: 'Jūs nepriklausote šiam pokalbių kambariui.' });
        }
        const messagesResult = await pool.query(
            `SELECT m.id, m.content, m.created_at, u.id as sender_id, u.username as sender_username 
             FROM messages m JOIN users u ON m.sender_id = u.id 
             WHERE m.room_id = $1 ORDER BY m.created_at ASC`, [roomId]);
        res.json(messagesResult.rows);
    } catch (err) {
        console.error("Klaida gaunant žinutes:", err);
        res.status(500).json({ message: 'Serverio klaida.' });
    }
});

apiRouter.post('/admin/approve-user', isAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        await pool.query("UPDATE users SET is_approved = TRUE WHERE id = $1", [userId]);
        res.status(200).json({ message: 'Vartotojas patvirtintas.' });
    } catch (err) { res.status(500).json({ message: 'Serverio klaida.' }); }
});

apiRouter.post('/admin/toggle-admin', isAdmin, async (req, res) => {
    try {
        const { userId, isAdmin: newIsAdmin } = req.body;
        await pool.query("UPDATE users SET is_admin = $1 WHERE id = $2", [newIsAdmin, userId]);
        res.status(200).json({ message: 'Vartotojo teisės atnaujintos.' });
    } catch (err) { res.status(500).json({ message: 'Serverio klaida.' }); }
});

// --- ADMINISTRATORIAUS FUNKCIJOS ---

// Ištrinti žinutę (tik administratoriui)
apiRouter.delete('/messages/:messageId', isAdmin, async (req, res) => {
    const { messageId } = req.params;
    
    if (!utils.isValidId(messageId)) {
        return res.status(400).json({ message: 'Neteisingas žinutės ID.' });
    }
    
    try {
        // Patikriname ar žinutė egzistuoja
        const messageCheck = await pool.query("SELECT id, sender_id, content FROM messages WHERE id = $1", [messageId]);
        if (messageCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Žinutė nerasta.' });
        }
        
        const message = messageCheck.rows[0];
        log.info(`Admin ${req.session.username} (ID: ${req.session.userId}) ištrina žinutę ${messageId} nuo vartotojo ${message.sender_id}`);
        
        // Ištriname žinutę
        await pool.query("DELETE FROM messages WHERE id = $1", [messageId]);
        
        // Pranešame visiems prisijungusiems apie žinutės ištrynimą
        io.emit('message deleted', { messageId: parseInt(messageId) });
        
        res.status(200).json({ message: 'Žinutė sėkmingai ištrinta.' });
    } catch (err) {
        log.error("Klaida ištrinant žinutę:", err);
        res.status(500).json({ message: 'Serverio klaida.' });
    }
});

// Ištrinti vartotoją (tik administratoriui, bet ne pagrindinį admin)
apiRouter.delete('/users/:userId', isAdmin, async (req, res) => {
    const { userId } = req.params;
    
    if (!utils.isValidId(userId)) {
        return res.status(400).json({ message: 'Neteisingas vartotojo ID.' });
    }
    
    // Apsauga nuo pagrindinio admin ištrynimo
    if (parseInt(userId) === 1) {
        return res.status(403).json({ message: 'Negalima ištrinti pagrindinio administratoriaus.' });
    }
    
    try {
        // Patikriname ar vartotojas egzistuoja
        const userCheck = await pool.query("SELECT id, username, is_admin FROM users WHERE id = $1", [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Vartotojas nerastas.' });
        }
        
        const user = userCheck.rows[0];
        log.info(`Admin ${req.session.username} (ID: ${req.session.userId}) ištrina vartotoją ${user.username} (ID: ${userId})`);
        
        // Ištriname vartotoją ir visus jo duomenis
        await pool.query("DELETE FROM messages WHERE sender_id = $1", [userId]);
        await pool.query("DELETE FROM room_participants WHERE user_id = $1", [userId]);
        await pool.query("DELETE FROM users WHERE id = $1", [userId]);
        
        // Pašaliname iš online users
        onlineUsers.delete(parseInt(userId));
        io.emit('online users update', Array.from(onlineUsers.values()));
        
        // Pranešame visiems apie vartotojo ištrynimą
        io.emit('user deleted', { userId: parseInt(userId) });
        
        res.status(200).json({ message: 'Vartotojas sėkmingai ištrintas.' });
    } catch (err) {
        log.error("Klaida ištrinant vartotoją:", err);
        res.status(500).json({ message: 'Serverio klaida.' });
    }
});

// Patvirtinti naują vartotoją (tik administratoriui)
apiRouter.post('/users/:userId/approve', isAdmin, async (req, res) => {
    const { userId } = req.params;
    
    if (!utils.isValidId(userId)) {
        return res.status(400).json({ message: 'Neteisingas vartotojo ID.' });
    }
    
    try {
        // Patikriname ar vartotojas egzistuoja ir nėra patvirtintas
        const userCheck = await pool.query("SELECT id, username, is_approved FROM users WHERE id = $1", [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Vartotojas nerastas.' });
        }
        
        const user = userCheck.rows[0];
        if (user.is_approved) {
            return res.status(400).json({ message: 'Vartotojas jau patvirtintas.' });
        }
        
        log.info(`Admin ${req.session.username} (ID: ${req.session.userId}) patvirtina vartotoją ${user.username} (ID: ${userId})`);
        
        // Patvirtiname vartotoją
        await pool.query("UPDATE users SET is_approved = TRUE WHERE id = $1", [userId]);
        
        // Pranešame visiems apie vartotojo patvirtinimą
        io.emit('user approved', { userId: parseInt(userId), username: user.username });
        
        res.status(200).json({ message: 'Vartotojas sėkmingai patvirtintas.' });
    } catch (err) {
        log.error("Klaida patvirtinant vartotoją:", err);
        res.status(500).json({ message: 'Serverio klaida.' });
    }
});

// Gauti nepatvirtintus vartotojus (tik administratoriui)
apiRouter.get('/users/pending', isAdmin, async (req, res) => {
    try {
        const pendingUsers = await pool.query(
            "SELECT id, username, created_at FROM users WHERE is_approved = FALSE ORDER BY created_at ASC"
        );
        
        res.status(200).json(pendingUsers.rows);
    } catch (err) {
        log.error("Klaida gaunant nepatvirtintus vartotojus:", err);
        res.status(500).json({ message: 'Serverio klaida.' });
    }
});

// Visi statiniai ir API maršrutai prijungiami prie šaknies kelio
// Statiniams failams taikome ilgą kešą; index.html pateikiamas be kešo atskirai
app.use('/', express.static('public', {
    setHeaders: (res, filePath) => {
        const ext = filePath.split('.').pop();
        const longCache = ['js', 'css', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'map'];
        if (longCache.includes(ext)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));
app.use('/', apiRouter);

// Paprastas ping endpoint sesijai palaikyti
app.get('/ping', (req, res) => {
    if (req.session) {
        // paliesti sesiją, kad veiktų rolling
        req.session.touch?.();
    }
    res.json({ ok: true, ts: Date.now() });
});

// --- Socket.IO Logika ---
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, (err) => {
        if (err) return next(err);
        const cookies = socket.request.headers?.cookie || '(no-cookie)';
        const sid = socket.request.sessionID || '(no-sessionID)';
        const hasUser = !!socket.request.session?.userId;
        log.info(`WS handshake: cookies=[${cookies}] sid=${sid} hasUser=${hasUser}`);
        next();
    });
});

io.on('connection', async (socket) => {
    const session = socket.request.session;
    if (!session || !session.userId) {
        log.warn(`WS connection without session.userId, disconnecting. sid=${socket.request.sessionID}`);
        return socket.disconnect();
    }
    
    const { userId, username, isAdmin } = session;
    log.info(`Socket prisijungė: ${username} (ID: ${userId}, socketId: ${socket.id})`);
    log.info(`📊 Session data: userId=${userId}, username=${username}, isAdmin=${isAdmin}`);
    
    onlineUsers.set(userId, { userId, username, lat: null, lon: null, isAdmin, socketId: socket.id, connectedAt: new Date().toISOString() });
    
    io.emit('online users update', Array.from(onlineUsers.values()));
    
    socket.on('initiate private chat', async (targetUserId) => {
        log.info(`🚀 Initiate private chat request: user ${userId} -> user ${targetUserId}`);
        log.info(`📊 Socket info: id=${socket.id}, connected=${socket.connected}, userId=${userId}`);
        
        if (userId === targetUserId) {
            log.warn(`❌ User ${userId} trying to chat with themselves`);
            return;
        }
        
        try {
            log.info(`🔍 Checking for existing private room between ${userId} and ${targetUserId}`);
            const existingRoomRes = await pool.query(
                `SELECT rp1.room_id FROM room_participants rp1 
                 JOIN room_participants rp2 ON rp1.room_id = rp2.room_id 
                 JOIN chat_rooms cr ON cr.id = rp1.room_id 
                 WHERE rp1.user_id = $1 AND rp2.user_id = $2 AND cr.is_public = FALSE`, [userId, targetUserId]);
            
            let roomId;
            if (existingRoomRes.rows.length > 0) {
                roomId = existingRoomRes.rows[0].room_id;
                log.info(`✅ Found existing room: ${roomId}`);
            } else {
                log.info(`📝 Creating new private room`);
                const newRoomRes = await pool.query("INSERT INTO chat_rooms (is_public) VALUES (FALSE) RETURNING id");
                roomId = newRoomRes.rows[0].id;
                await pool.query("INSERT INTO room_participants (room_id, user_id) VALUES ($1, $2), ($1, $3)", [roomId, userId, targetUserId]);
                log.info(`✅ Created new room: ${roomId}`);
            }
            
            const targetUserRes = await pool.query("SELECT username FROM users WHERE id = $1", [targetUserId]);
            if (targetUserRes.rows.length === 0) {
                log.error(`❌ Target user ${targetUserId} not found in database`);
                socket.emit('error', { message: 'Vartotojas nerastas duomenų bazėje.' });
                return;
            }
            
            const targetUser = targetUserRes.rows[0];
            log.info(`👤 Target user: ${targetUser.username}`);

            log.info(`📡 Sending 'private chat started' to requester with room ${roomId}`);
            socket.emit('private chat started', { roomId, roomName: targetUser.username });
            
            const targetSocketId = onlineUsers.get(targetUserId)?.socketId;
            if (targetSocketId) {
                log.info(`📡 Sending 'private chat started' to target user ${targetUserId}`);
                io.to(targetSocketId).emit('private chat started', { roomId, roomName: username });
            } else {
                log.warn(`⚠️ Target user ${targetUserId} is not online`);
            }
        } catch (err) { 
            log.error("❌ Klaida kuriant privatų pokalbį:", err);
            socket.emit('error', { message: 'Klaida kuriant pokalbį. Bandykite dar kartą.' });
        }
    });

    // Simple ping-pong for latency measurement
    socket.on('client_ping', (ts) => {
        socket.emit('client_pong', ts);
    });
    
    socket.on('send message', async ({ roomId, content }) => {
        // Input validation
        if (!roomId || !content || typeof content !== 'string') {
            socket.emit('error', { message: 'Neteisingi žinutės duomenys.' });
            return;
        }
        
        // Content validation
        const sanitizedContent = content.trim();
        if (sanitizedContent.length === 0) {
            socket.emit('error', { message: 'Žinutė negali būti tuščia.' });
            return;
        }
        
        if (sanitizedContent.length > 1000) {
            socket.emit('error', { message: 'Žinutė per ilga (maksimalus ilgis: 1000 simbolių).' });
            return;
        }
        
        try {
            // Verify room participation
            const participationCheck = await pool.query(
                "SELECT 1 FROM room_participants WHERE room_id = $1 AND user_id = $2", 
                [roomId, userId]
            );
            
            if (participationCheck.rowCount === 0) {
                socket.emit('error', { message: 'Jūs nepriklausote šiam pokalbių kambariui.' });
                return;
            }
            
            const res = await pool.query(
                "INSERT INTO messages (sender_id, room_id, content) VALUES ($1, $2, $3) RETURNING id, created_at", 
                [userId, roomId, sanitizedContent]
            );
            
            const newMessage = { 
                id: res.rows[0].id, 
                room_id: Number(roomId), 
                content: sanitizedContent, 
                created_at: res.rows[0].created_at, 
                sender_id: userId, 
                sender_username: username 
            };
            
            const participantRes = await pool.query("SELECT user_id FROM room_participants WHERE room_id = $1", [roomId]);
            participantRes.rows.forEach(row => {
                const targetSocketId = onlineUsers.get(row.user_id)?.socketId;
                if(targetSocketId) {
                    io.to(targetSocketId).emit('new message', newMessage);
                }
            });
            
            log.info(`Žinutė išsiųsta: ${username} → kambarys ${roomId}`);

        } catch(err) { 
            log.error(`Klaida siunčiant žinutę:`, err);
            socket.emit('error', { message: 'Serverio klaida siunčiant žinutę.' });
        }
    });
    
    socket.on('update location', (coords) => {
        if (onlineUsers.has(userId) && coords && typeof coords.lat === 'number' && typeof coords.lon === 'number') {
            const user = onlineUsers.get(userId);
            
            // Enhanced location data with meter precision
            user.lat = parseFloat(coords.lat.toFixed(8)); // 8 decimal places = ~1cm precision
            user.lon = parseFloat(coords.lon.toFixed(8)); // 8 decimal places = ~1cm precision
            user.lastLocationUpdate = new Date().toISOString();
            
            // Enhanced accuracy and speed data
            if (typeof coords.accuracy === 'number' && isFinite(coords.accuracy)) {
                user.locationAccuracy = parseFloat(coords.accuracy.toFixed(2)); // 2 decimal places for meters
                // Log if accuracy is poor (more than 10 meters)
                if (coords.accuracy > 10) {
                    log.warn(`Poor GPS accuracy for ${username}: ${coords.accuracy.toFixed(2)}m`);
                }
            }
            
            if (typeof coords.speed === 'number' && isFinite(coords.speed)) {
                user.speed = parseFloat(coords.speed.toFixed(2)); // 2 decimal places for m/s
            }
            
            if (typeof coords.heading === 'number' && isFinite(coords.heading)) {
                user.heading = parseFloat(coords.heading.toFixed(1)); // 1 decimal place for degrees
            }
            
            // Enhanced timestamp
            if (coords.timestamp) {
                user.locationTimestamp = new Date(coords.timestamp).toISOString();
            }
            
            // Calculate distance from previous location with meter precision
            if (user.previousLat && user.previousLon) {
                const distance = calculateDistance(user.previousLat, user.previousLon, coords.lat, coords.lon);
                user.distanceMoved = parseFloat(distance.toFixed(3)); // 3 decimal places = meter precision
                
                // Log significant movements (more than 1 meter)
                if (distance > 0.001) {
                    log.info(`Location update: ${username} - moved ${(distance * 1000).toFixed(1)}m to ${coords.lat.toFixed(8)}, ${coords.lon.toFixed(8)}`);
                }
            } else {
                // First location update
                log.info(`Initial location: ${username} - ${coords.lat.toFixed(8)}, ${coords.lon.toFixed(8)}`);
            }
            
            user.previousLat = coords.lat;
            user.previousLon = coords.lon;
            
            onlineUsers.set(userId, user);
            io.emit('online users update', Array.from(onlineUsers.values()));
        }
    });
    
    // Background mode handling
    socket.on('background_mode', (isBackground) => {
        if (onlineUsers.has(userId)) {
            const user = onlineUsers.get(userId);
            user.isBackground = isBackground;
            user.backgroundModeAt = new Date().toISOString();
            onlineUsers.set(userId, user);
            log.info(`Vartotojas ${username} ${isBackground ? 'perėjo į background' : 'grįžo iš background'}`);
        }
    });
    
    // App going to background event
    socket.on('app_going_background', () => {
        if (onlineUsers.has(userId)) {
            const user = onlineUsers.get(userId);
            user.lastActivity = new Date().toISOString();
            onlineUsers.set(userId, user);
            log.info(`Vartotojas ${username} aplikacija eina į background`);
        }
    });

    socket.on('app_going_foreground', () => {
        if (onlineUsers.has(userId)) {
            const user = onlineUsers.get(userId);
            user.lastActivity = new Date().toISOString();
            onlineUsers.set(userId, user);
            log.info(`Vartotojas ${username} aplikacija grįžta į foreground`);
        }
    });
    
    socket.on('disconnect', () => {
        if(onlineUsers.has(userId)) {
            const user = onlineUsers.get(userId);
            log.info(`Socket atsijungė: ${user.username}`);
            onlineUsers.delete(userId);
            io.emit('online users update', Array.from(onlineUsers.values()));
        }
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    log.info('SIGTERM gautas, uždaromas serveris...');
    server.close(async () => {
        await pool.end();
        process.exit(0);
    });
});

server.listen(PORT, () => {
    log.info(`GPS Pokalbių serveris paleistas ant prievado ${PORT}`);
    log.info(`Aplinka: ${process.env.NODE_ENV || 'development'}`);
});