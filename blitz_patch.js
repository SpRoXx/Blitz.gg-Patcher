// Auto-install dependencies if missing
const modules = ['level', 'winreg'];
let needInstall = false;
for (const mod of modules) {
    try { require.resolve(mod); }
    catch (e) { needInstall = true; }
}
if (needInstall) {
    console.log("[*] Installing missing modules...");
    const { execSync } = require('child_process');
    try {
        execSync(`npm install ${modules.join(' ')}`, { stdio: 'inherit' });
        console.log("[*] Modules installed. Please re-run the script.");
    } catch (e) {
        console.error("Auto-install failed. Please run as administrator and ensure npm is installed.");
    }
    process.exit(0);
}

// After this point, all modules are present
const { Level } = require('level');
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');
const readline = require('readline');
const WinReg = require('winreg');

const DB_PATH = path.join(process.env.APPDATA, 'Blitz', 'appdb');
const USER_ROLES_KEY = 'userRoles';
const FIREWALL_RULE_NAME = 'BlockBlitzNetwork';
const BLOCK_DURATION = 30000; // 30 seconds

// Registry search
function findBlitzExeInRegistry() {
    const uninstallKeys = [
        { hive: WinReg.HKLM, key: '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall' },
        { hive: WinReg.HKLM, key: '\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall' }
    ];

    return new Promise((resolve) => {
        let found = false;
        let checksRemaining = uninstallKeys.length;

        uninstallKeys.forEach(({ hive, key }) => {
            const regKey = new WinReg({ hive, key });

            regKey.keys((err, subkeys) => {
                if (err || !subkeys) {
                    if (--checksRemaining === 0 && !found) resolve(null);
                    return;
                }

                let subkeysRemaining = subkeys.length;
                if (subkeysRemaining === 0 && --checksRemaining === 0 && !found) resolve(null);

                subkeys.forEach((subkey) => {
                    subkey.values((err, items) => {
                        if (err || !items) {
                            if (--subkeysRemaining === 0 && --checksRemaining === 0 && !found) resolve(null);
                            return;
                        }

                        const displayName = items.find(i => i.name === 'DisplayName');
                        if (displayName && displayName.value.toLowerCase().includes('blitz')) {
                            const installLocation = items.find(i => i.name === 'InstallLocation');
                            if (installLocation && installLocation.value) {
                                const blitzExe = path.join(installLocation.value, 'Blitz.exe');
                                if (fs.existsSync(blitzExe)) {
                                    found = true;
                                    resolve(blitzExe);
                                    return;
                                }
                            }
                            const displayIcon = items.find(i => i.name === 'DisplayIcon');
                            if (displayIcon && displayIcon.value && displayIcon.value.toLowerCase().endsWith('blitz.exe')) {
                                if (fs.existsSync(displayIcon.value)) {
                                    found = true;
                                    resolve(displayIcon.value);
                                    return;
                                }
                            }
                        }

                        if (--subkeysRemaining === 0 && --checksRemaining === 0 && !found) resolve(null);
                    });
                });
            });
        });
    });
}

function promptUserForPath(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

(async () => {
    let blitzExePath = await findBlitzExeInRegistry();

    if (!blitzExePath) {
        console.log("Could not auto-detect Blitz.exe from registry.");
        blitzExePath = await promptUserForPath("Please enter the full path to Blitz.exe: ");
        if (!fs.existsSync(blitzExePath)) {
            console.error("File does not exist at the specified path. Exiting.");
            process.exit(1);
        }
    }

    const blitzExePathFirewall = `"${blitzExePath}"`;
    const blitzExePathPlain = blitzExePath;

    try {
        const db = new Level(DB_PATH, { valueEncoding: 'utf8' });
        const newRoles = JSON.stringify([{ code: 'PRO_SUBSCRIBER' }]);
        await db.put(USER_ROLES_KEY, newRoles);
        await db.close();
        console.log("[*] userRoles updated to include PRO_SUBSCRIBER.");

        // 2. Block network for Blitz.exe
        try {
            console.log(`[*] Blocking network for Blitz.exe (${blitzExePathPlain}) using Windows Firewall...`);
            execSync(`netsh advfirewall firewall add rule name="${FIREWALL_RULE_NAME}" dir=out action=block program=${blitzExePathFirewall} enable=yes`);
            console.log("[*] Network access blocked for Blitz.exe.");
        } catch (e) {
            console.error("[!] Failed to add firewall rule:", e.message);
        }

        // 3. Start Blitz.exe
        console.log("[*] Launching Blitz.exe...");
        const blitzProc = spawn(blitzExePathPlain, { detached: true, stdio: 'ignore' });
        blitzProc.unref();

        console.log(`[*] Waiting ${BLOCK_DURATION / 1000} seconds before restoring network...`);
        await new Promise(resolve => setTimeout(resolve, BLOCK_DURATION));

        // 4. Unblock network for Blitz.exe
        try {
            console.log("[*] Restoring network access for Blitz.exe.");
            execSync(`netsh advfirewall firewall delete rule name="${FIREWALL_RULE_NAME}"`);
            console.log("[*] Network access restored.");
        } catch (e) {
            console.error("[!] Failed to remove firewall rule:", e.message);
        }

        console.log("[*] Done. Exploit completed.");

    } catch (err) {
        console.error("Error during script execution:", err);
    }
})();
