const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const { spawn } = require("node:child_process");
const electronModule = require("electron");
const { app, BrowserWindow, ipcMain, shell } = electronModule;

const logFile = path.join(process.env.TEMP || process.cwd(), "statsapp-electron.log");
function writeLog(message) {
  fs.appendFileSync(logFile, `${new Date().toISOString()} ${message}\n`);
}

const hasRunAsNodeFlag = Object.prototype.hasOwnProperty.call(process.env, "ELECTRON_RUN_AS_NODE");
writeLog(`boot runAsNode=${hasRunAsNodeFlag ? process.env.ELECTRON_RUN_AS_NODE : "unset"} argv=${process.argv.join(" | ")}`);
writeLog(`electron typeof=${typeof electronModule} keys=${Object.keys(electronModule).slice(0, 10).join(",")}`);

if (hasRunAsNodeFlag) {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  writeLog("detected ELECTRON_RUN_AS_NODE, relaunching without it");
  const child = spawn(process.execPath, process.argv.slice(1), {
    detached: true,
    stdio: "ignore",
    env,
  });
  writeLog(`relaunch pid=${child.pid}`);
  child.unref();
  process.exit(0);
}

process.on("uncaughtException", (error) => {
  writeLog(`uncaughtException: ${error?.stack || error}`);
});
process.on("unhandledRejection", (reason) => {
  writeLog(`unhandledRejection: ${String(reason)}`);
});

const OAUTH_CALLBACK_PORT = 54321;
const OAUTH_CALLBACK_PATH = "/auth/callback";
const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;

let mainWindow = null;
let oauthServer = null;
let oauthPending = null;
let oauthQueuedCallbackUrl = null;

const getOauthRedirectUrl = () => `http://127.0.0.1:${OAUTH_CALLBACK_PORT}${OAUTH_CALLBACK_PATH}`;

const sendOAuthResultHtml = (response, success, details = "") => {
  const title = success ? "StatsGrade1 Login Complete" : "StatsGrade1 Login Failed";
  const message = success
    ? "Login was successful. You can close this tab and return to the app."
    : `Login failed. ${details || "Please return to the app and retry."}`;
  const body = `<!doctype html><html><head><meta charset="UTF-8"><title>${title}</title></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:24px;background:#111;color:#eee"><h2>${title}</h2><p>${message}</p></body></html>`;
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(body);
};

const resolveOAuthPending = (callbackUrl) => {
  if (!oauthPending) {
    oauthQueuedCallbackUrl = callbackUrl;
    return;
  }

  clearTimeout(oauthPending.timeoutId);
  const { resolve } = oauthPending;
  oauthPending = null;
  resolve(callbackUrl);
};

const waitForOAuthCallback = () => {
  if (oauthQueuedCallbackUrl) {
    const callbackUrl = oauthQueuedCallbackUrl;
    oauthQueuedCallbackUrl = null;
    return Promise.resolve(callbackUrl);
  }

  if (oauthPending) {
    return oauthPending.promise;
  }

  let resolvePromise;
  let rejectPromise;

  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const timeoutId = setTimeout(() => {
    if (!oauthPending) return;
    oauthPending = null;
    rejectPromise(new Error("OAuth callback timed out. Please retry login."));
  }, OAUTH_TIMEOUT_MS);

  oauthPending = { promise, resolve: resolvePromise, reject: rejectPromise, timeoutId };
  return promise;
};

const ensureOAuthServer = () => {
  if (oauthServer) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    oauthServer = http.createServer((request, response) => {
      try {
        const callbackUrl = new URL(request.url || "/", `http://127.0.0.1:${OAUTH_CALLBACK_PORT}`);
        if (callbackUrl.pathname !== OAUTH_CALLBACK_PATH) {
          response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          response.end("Not Found");
          return;
        }

        const errorDescription =
          callbackUrl.searchParams.get("error_description") ||
          callbackUrl.searchParams.get("error");

        writeLog(`oauth callback received: ${callbackUrl.toString()}`);
        sendOAuthResultHtml(response, !errorDescription, errorDescription || "");
        resolveOAuthPending(callbackUrl.toString());
      } catch (error) {
        writeLog(`oauth callback parse failed: ${error?.stack || error}`);
        sendOAuthResultHtml(response, false, "Failed to parse callback.");
      }
    });

    oauthServer.on("error", (error) => {
      writeLog(`oauth server error: ${error?.stack || error}`);
      reject(error);
    });

    oauthServer.listen(OAUTH_CALLBACK_PORT, "127.0.0.1", () => {
      writeLog(`oauth server listening on ${getOauthRedirectUrl()}`);
      resolve();
    });
  });
};

const closeOAuthServer = () => {
  if (oauthPending) {
    clearTimeout(oauthPending.timeoutId);
    oauthPending.reject(new Error("OAuth flow was interrupted."));
    oauthPending = null;
  }

  if (!oauthServer) {
    return;
  }

  oauthServer.close();
  oauthServer = null;
};

ipcMain.handle("desktop:open-external", async (_event, rawUrl) => {
  const parsed = new URL(rawUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Blocked non-http URL: ${rawUrl}`);
  }
  await shell.openExternal(parsed.toString());
});

ipcMain.handle("auth:begin-oauth", async () => {
  await ensureOAuthServer();
  return { redirectTo: getOauthRedirectUrl() };
});

ipcMain.handle("auth:await-oauth-callback", async () => {
  await ensureOAuthServer();
  return await waitForOAuthCallback();
});

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devServerUrl = process.env.ELECTRON_RENDERER_URL;
  if (devServerUrl) {
    writeLog(`loadURL ${devServerUrl}`);
    window.loadURL(devServerUrl);
    return;
  }

  const indexPath = path.join(__dirname, "..", "dist", "index.html");
  writeLog(`loadFile ${indexPath}`);
  window.loadFile(indexPath);

  mainWindow = window;
}

app.whenReady().then(() => {
  writeLog("app ready");
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  writeLog("window-all-closed");
  closeOAuthServer();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
