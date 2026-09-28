import http from 'http';

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            console.log('--- ERROR RECEIVED FROM BROWSER ---');
            console.log(body);
            res.end('ok');
        });
    } else {
        res.end('ok');
    }
});

server.listen(4000, () => console.log('Logger server running on port 4000'));
