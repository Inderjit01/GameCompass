from pathlib import Path
from PyInstaller.utils.hooks import collect_submodules, collect_data_files
import os


# ============================================================
# Paths
# ============================================================

BACKEND_DIR = Path("backend")

PLAYWRIGHT_DIR = (
    Path.home()
    / "AppData"
    / "Local"
    / "ms-playwright"
)


# ============================================================
# Hidden imports
# ============================================================

hiddenimports = (
    collect_submodules("api")
    + collect_submodules("database")
    + collect_submodules("models")
    + collect_submodules("scrapers")
    + collect_submodules("utilities")
	+ collect_submodules("howlongtobeatpy")  
	#+ ["html.parser"]
)


# ============================================================
# Playwright browser files
# ============================================================

fake_useragent_datas = collect_data_files('fake_useragent')

datas = [
	(
        str(BACKEND_DIR / "api" / ".env"),
        "api",
    ),
    (
        str(PLAYWRIGHT_DIR / "chromium-1234"),
        "ms-playwright/chromium-1234",
    ),
    (
        str(PLAYWRIGHT_DIR / "chromium_headless_shell-1234"),
        "ms-playwright/chromium_headless_shell-1234",
    ),
    (
        str(PLAYWRIGHT_DIR / "ffmpeg-1011"),
        "ms-playwright/ffmpeg-1011",
    ),
    (
        str(PLAYWRIGHT_DIR / "winldd-1007"),
        "ms-playwright/winldd-1007",
    ),
] + fake_useragent_datas


# ============================================================
# Analysis
# ============================================================

a = Analysis(
    ["backend/server.py"],
    pathex=[str(BACKEND_DIR)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)


# ============================================================
# Python archive
# ============================================================

pyz = PYZ(
    a.pure,
    a.zipped_data,
    cipher=None,
)


# ============================================================
# Executable
# ============================================================

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="backend-x86_64-pc-windows-msvc",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
)