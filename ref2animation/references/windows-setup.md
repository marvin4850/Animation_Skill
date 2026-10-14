# Windows 11 native setup

The new implementation uses Python pathlib/subprocess and Node built-ins/Playwright; no bash, Unix process signals or POSIX-only paths are required for setup, preview and export. Legacy utilities are optional Python tools with their original project-layout expectations. The original shell setup is not used. WSL2 is not required by the new pipeline.

PowerShell prerequisites:

```powershell
winget install --id Python.Python.3.12 --exact
winget install --id OpenJS.NodeJS.LTS --exact
winget install --id Gyan.FFmpeg --exact
```

Open a new PowerShell session so PATH reflects installations. Download/extract `ref2animation.zip`, then:

```powershell
Set-Location "C:\path\to\ref2animation"
py -3.12 scripts\install-skill.py
Set-Location "$env:USERPROFILE\.codex\skills\ref2animation"
py -3.12 scripts\setup.py
node scripts\serve.mjs --port 8765
```

Setup invokes npm through Node's npm CLI on Windows, creates `.venv\Scripts\python.exe`, installs pinned packages, installs Playwright Chromium and runs functional QA. It neither requires PowerShell execution-policy changes nor activates a venv shell script. ffmpeg and ffprobe must both be on PATH. For an existing browser:

```powershell
py -3.12 scripts\setup.py --system-browser "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

Use `--software-gl` when the headless GPU path fails; it selects Chromium SwiftShader rather than disabling TLS/package validation. Restart Codex after installation. Open a local browser on loopback port 8765, `/runtime/index.html`.

```powershell
node scripts\qa.mjs
node scripts\livecheck.mjs
node scripts\render.mjs video --out output\animation.mp4
.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py"
```

These Windows commands and code paths were audited; native Windows execution was **not available in the Linux cloud environment**. Verified execution was Linux/Python 3.12/Node 24/Chromium 154/FFmpeg 7.1.5. Do not treat that as a Windows test result. If browser download is blocked, permit its actual Playwright CDN destination or use an installed browser; never disable certificate verification. No cloud secrets are needed.
