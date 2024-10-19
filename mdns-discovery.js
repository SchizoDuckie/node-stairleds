import { spawn } from 'child_process';

const avahiBrowse = spawn('avahi-browse', ['-art']);

avahiBrowse.stdout.on('data', (data) => {
    console.log(`Output: ${data}`);
});

avahiBrowse.stderr.on('data', (data) => {
    console.error(`Error: ${data}`);
});

avahiBrowse.on('exit', (code) => {
    console.log(`avahi-browse exited with code ${code}`);
});
