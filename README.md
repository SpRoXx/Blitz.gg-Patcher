# Blitz Pro Role Patcher
Automated, all-in-one Node.js script Patcher.
It can:
- Detect and install dependencies automatically
- Locate `Blitz.exe` on your system using the Windows Registry
- Overwrite the `userRoles` key in the local LevelDB database
- Temporarily block Blitz’s network access with the Windows Firewall
- Launch Blitz, then restore network access after a specified interval

---

## ⚠️ Disclaimer

This tool is for **responsible security testing and demonstration only**.  
Never use on systems you do not own or without explicit permission.  
Misuse may violate Blitz’s Terms of Service or local laws.

---

## 🚀 Getting Started

### 1. Prerequisites

- **Windows** operating system
- [Node.js](https://nodejs.org/) (v16+ recommended)
- Command Prompt or PowerShell **run as Administrator**
- Blitz client installed

### 2. Usage

1. **Download** `blitz_test.js` from this repository.
2. **Open** Command Prompt or PowerShell as Administrator.
3. **Run**:
    ```sh
    node blitz_test.js
    ```
    - On first run, it will auto-install dependencies (`level`, `winreg`) and ask you to run it again.
    - On subsequent runs, it will:
      - Detect `Blitz.exe` automatically, or prompt for the path if not found.
      - Edit your Blitz local database to set the `PRO_SUBSCRIBER` role.
      - Temporarily block Blitz’s network access.
      - Launch Blitz.
      - Restore network access after 30 seconds (customizable).
      - 
---

## 🔧 How It Works

1. **Dependency Auto-Installer:**  
   Installs `level` and `winreg` if missing, using `npm`.

2. **Registry Path Detection:**  
   Searches Windows uninstall registry keys for `Blitz.exe`.  
   Falls back to manual input if not found.

3. **Database Modification:**  
   Uses `level` to connect to Blitz’s LevelDB and overwrite the `userRoles` key.

4. **Network Blocking:**  
   Uses `netsh` to block Blitz’s outbound traffic during startup to force offline role checks.

5. **Automatic Recovery:**  
   After a set period, removes the firewall block and logs completion.

---

## 📚 Troubleshooting

- If Blitz is not detected, enter the path manually when prompted.
- Always run as **Administrator** for firewall access.
- If npm auto-install fails, install dependencies manually:
    ```sh
    npm install level winreg
    ```

---

## 📄 License

This repository is distributed under the MIT License.  
**Use for educational, research, and responsible disclosure only.**

---
