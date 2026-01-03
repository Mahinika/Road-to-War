/**
 * Check if dev server is ready and game loads correctly
 */

import http from 'http';

const checkServer = (port = 3000) => {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}`, { timeout: 5000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    ready: res.statusCode === 200,
                    statusCode: res.statusCode,
                    hasHtml: data.includes('<!DOCTYPE html') || data.includes('<html'),
                    hasVite: data.includes('@vite/client')
                });
            });
        });
        
        req.on('error', () => {
            resolve({ ready: false, error: 'Connection refused' });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({ ready: false, error: 'Timeout' });
        });
    });
};

async function main() {
    console.log('Checking dev server status...\n');
    
    const result = await checkServer(3000);
    
    if (result.ready) {
        console.log('✅ Server is running on port 3000');
        console.log(`   Status: ${result.statusCode}`);
        console.log(`   Has HTML: ${result.hasHtml ? '✅' : '❌'}`);
        console.log(`   Has Vite: ${result.hasVite ? '✅' : '❌'}`);
        
        if (!result.hasHtml || !result.hasVite) {
            console.log('\n⚠️  Server is running but may not be serving game correctly');
            console.log('   Try: npm run dev');
        } else {
            console.log('\n✅ Server appears to be ready for testing');
        }
    } else {
        console.log('❌ Server is not running');
        console.log(`   Error: ${result.error || 'Unknown'}`);
        console.log('\n   Start server with: npm run dev');
        process.exit(1);
    }
}

main();

