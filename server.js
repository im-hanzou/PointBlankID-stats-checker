const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');
const os = require('os');
const readline = require('readline');

const app = express();
const HOST = process.env.HOST || '0.0.0.0';

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    
    Object.keys(interfaces).forEach((interfaceName) => {
        interfaces[interfaceName].forEach((interface) => {
            if (!interface.internal && interface.family === 'IPv4') {
                ips.push(interface.address);
            }
        });
    });
    
    return ips;
}

function promptPort() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log(colorize('\n🚀 Point Blank Account Checker Server', 'cyan'));
        console.log(colorize('═══════════════════════════════════════', 'blue'));
        console.log(colorize('📝 Server Configuration', 'yellow'));
        console.log(colorize('───────────────────────', 'yellow'));
        
        const question = colorize('🔧 Enter custom port (or press Enter for default 1337): ', 'green');
        rl.question(question, (input) => {
            rl.close();
            
            const port = input.trim();
            if (port === '') {
                console.log(colorize('✅ Using default port: 1337', 'green'));
                resolve(1337);
            } else {
                const portNumber = parseInt(port);
                if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
                    console.log(colorize('❌ Invalid port number! Using default port: 1337', 'red'));
                    resolve(1337);
                } else {
                    console.log(colorize(`✅ Using custom port: ${portNumber}`, 'green'));
                    resolve(portNumber);
                }
            }
        });
    });
}

async function checkPortAvailable(port) {
    return new Promise((resolve) => {
        const net = require('net');
        const server = net.createServer();
        
        server.listen(port, (err) => {
            if (err) {
                resolve(false);
            } else {
                server.once('close', () => resolve(true));
                server.close();
            }
        });
        
        server.on('error', () => resolve(false));
    });
}

async function startServer() {
    try {
        const PORT = await promptPort();
        
        console.log(colorize('\n🔍 Checking port availability...', 'yellow'));
        const isPortAvailable = await checkPortAvailable(PORT);
        
        if (!isPortAvailable) {
            console.log(colorize(`❌ Port ${PORT} is already in use!`, 'red'));
            console.log(colorize('💡 Try a different port or stop the service using that port.', 'yellow'));
            process.exit(1);
        }

        console.log(colorize('✅ Port is available!', 'green'));
        console.log(colorize('\n🔧 Starting server...', 'cyan'));

        app.use(cors());
        app.use(express.static(path.join(__dirname)));

        const proxyOptions = {
            target: 'https://capp.pointblank.id:18443',
            changeOrigin: true,
            secure: true,
            pathRewrite: {
                '^/api': '',
            },
            onProxyReq: (proxyReq, req, res) => {
                proxyReq.setHeader('User-Agent', 'okhttp/3.12.1');
                proxyReq.setHeader('Accept-Encoding', 'gzip, deflate, br');
                proxyReq.setHeader('Connection', 'keep-alive');
                console.log(colorize(`📡 Proxying: ${req.method} ${req.url}`, 'cyan'));
            },
            onError: (err, req, res) => {
                console.error(colorize(`❌ Proxy Error: ${err.message}`, 'red'));
                res.status(500).json({ 
                    error: 'Proxy Error', 
                    message: err.message 
                });
            }
        };

        app.use('/api', createProxyMiddleware(proxyOptions));

        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });

        app.listen(PORT, HOST, () => {
            const localIPs = getLocalIPs();
            
            console.log(colorize('\n═══════════════════════════════════════', 'blue'));
            console.log(colorize('🚀 SERVER STARTED SUCCESSFULLY!', 'green'));
            console.log(colorize('═══════════════════════════════════════', 'blue'));
            console.log(colorize(`📡 Proxying /api/* to: https://capp.pointblank.id:18443`, 'magenta'));
            console.log(colorize('\n📍 Access the application at:', 'yellow'));
            console.log(colorize(`   🏠 http://localhost:${PORT}`, 'white'));
            
            if (localIPs.length > 0) {
                localIPs.forEach(ip => {
                    console.log(colorize(`   🌐 http://${ip}:${PORT}`, 'white'));
                });
            }
            
            console.log(colorize('\n🔔 If running on VPS, use the network IP above', 'cyan'));
            console.log(colorize(`⚠️  Make sure port ${PORT} is open in firewall!`, 'yellow'));
            console.log(colorize('\n💡 Press Ctrl+C to stop the server', 'magenta'));
            console.log(colorize('═══════════════════════════════════════\n', 'blue'));
        });

    } catch (error) {
        console.error(colorize(`❌ Error starting server: ${error.message}`, 'red'));
        process.exit(1);
    }
}

process.on('SIGINT', () => {
    console.log(colorize('\n\n🛑 Server shutting down gracefully...', 'yellow'));
    console.log(colorize('👋 Goodbye!', 'cyan'));
    process.exit(0);
});

startServer();
