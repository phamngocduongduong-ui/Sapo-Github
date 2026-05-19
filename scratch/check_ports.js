const net = require('net');

function checkPort(port, host) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 1000;
        socket.setTimeout(timeout);
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });
        socket.connect(port, host);
    });
}

async function main() {
    const port3000 = await checkPort(3000, 'localhost');
    const port3306 = await checkPort(3306, 'localhost');
    console.log(`Port 3000 (Next.js): ${port3000 ? 'OPEN' : 'CLOSED'}`);
    console.log(`Port 3306 (MySQL): ${port3306 ? 'OPEN' : 'CLOSED'}`);
}

main();
