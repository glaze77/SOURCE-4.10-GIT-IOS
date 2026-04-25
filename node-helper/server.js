const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 5174;
const HOST = "127.0.0.1";
const PROJECT_ROOT = path.resolve(__dirname, "..");
const CONTENT_ROOT = path.join(PROJECT_ROOT, "content");
const MAX_BODY_BYTES = 25 * 1024 * 1024;

const TEXT_EXT = ".txt";
const JSON_EXT = ".json";
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function methodNotAllowed(res) {
  sendJson(res, 405, { ok: false, error: "method_not_allowed" });
}

function badRequest(res, error) {
  sendJson(res, 400, { ok: false, error });
}

function notFound(res) {
  sendJson(res, 404, { ok: false, error: "not_found" });
}

function isJsonRequest(req) {
  const type = String(req.headers["content-type"] || "").toLowerCase();
  return type.split(";")[0].trim() === "application/json";
}

function readRequestJson(req) {
  return new Promise((resolve, reject) => {
    if (!isJsonRequest(req)) {
      reject(new Error("json_body_required"));
      return;
    }

    let total = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("body_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(new Error("invalid_json_body"));
      }
    });
    req.on("error", () => reject(new Error("request_error")));
  });
}

function rejectUnsafeRelativePath(inputPath) {
  if (typeof inputPath !== "string" || !inputPath.trim()) {
    throw new Error("empty_path");
  }

  const rawPath = inputPath.trim();
  if (rawPath.indexOf("\0") !== -1) {
    throw new Error("invalid_path");
  }
  if (path.isAbsolute(rawPath) || /^[a-zA-Z]:[\\/]/.test(rawPath)) {
    throw new Error("absolute_paths_not_allowed");
  }

  const slashPath = rawPath.replace(/\\/g, "/");
  const parts = slashPath.split("/").filter(Boolean);
  if (parts.includes("..")) {
    throw new Error("path_traversal_not_allowed");
  }
  if (parts[0] !== "content") {
    throw new Error("path_must_start_with_content");
  }
  if (parts.length < 2) {
    throw new Error("path_must_be_under_content");
  }

  return parts.join(path.sep);
}

function resolveContentPath(relativePath) {
  const safeRelativePath = rejectUnsafeRelativePath(relativePath);
  const resolvedPath = path.resolve(PROJECT_ROOT, safeRelativePath);
  const contentRootWithSep = CONTENT_ROOT + path.sep;

  if (!resolvedPath.startsWith(contentRootWithSep)) {
    throw new Error("path_outside_content");
  }

  return resolvedPath;
}

function assertExtension(filePath, expectedExt) {
  if (path.extname(filePath).toLowerCase() !== expectedExt) {
    throw new Error("invalid_extension");
  }
}

function normalizeWriteJsonBody(body) {
  if (Object.prototype.hasOwnProperty.call(body, "json")) {
    if (typeof body.json === "string") {
      JSON.parse(body.json);
      return body.json;
    }
    return JSON.stringify(body.json, null, 2) + "\n";
  }

  if (Object.prototype.hasOwnProperty.call(body, "data")) {
    if (typeof body.data === "string") {
      JSON.parse(body.data);
      return body.data;
    }
    return JSON.stringify(body.data, null, 2) + "\n";
  }

  throw new Error("json_missing");
}

function extractBase64Image(data) {
  if (typeof data !== "string" || !data.trim()) {
    throw new Error("image_data_missing");
  }

  const value = data.trim();
  const match = value.match(/^data:([^;,]+);base64,(.+)$/i);
  const base64 = match ? match[2] : value;
  const normalized = base64.replace(/\s/g, "");

  if (!normalized || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    throw new Error("invalid_base64");
  }

  const buffer = Buffer.from(normalized, "base64");
  if (!buffer.length) {
    throw new Error("empty_image_data");
  }

  return buffer;
}

function safeImageFilename(filename) {
  if (typeof filename !== "string" || !filename.trim()) {
    throw new Error("filename_missing");
  }

  const raw = filename.trim();
  if (raw.indexOf("\0") !== -1 || raw.includes("/") || raw.includes("\\")) {
    throw new Error("invalid_filename");
  }

  const base = path.basename(raw);
  if (
    base !== raw ||
    base === "." ||
    base === ".." ||
    base.includes("..") ||
    !/^[A-Za-z0-9][A-Za-z0-9._ -]*$/.test(base)
  ) {
    throw new Error("invalid_filename");
  }

  const ext = path.extname(base).toLowerCase();
  if (!IMAGE_EXTS.has(ext)) {
    throw new Error("invalid_image_extension");
  }

  return base;
}

function safeCellId(cellId) {
  if (typeof cellId !== "string" || !/^cell-\d+-\d+$/.test(cellId)) {
    throw new Error("invalid_cell_id");
  }
  return cellId;
}

function imageFolderForSurface(surface) {
  if (surface === "question") return "question-images";
  if (surface === "answer") return "answer-images";
  throw new Error("invalid_surface");
}

async function handleReadText(body) {
  const filePath = resolveContentPath(body.path);
  assertExtension(filePath, TEXT_EXT);
  const text = await fs.promises.readFile(filePath, "utf8");
  return { ok: true, path: body.path, text };
}

async function handleWriteText(body) {
  const filePath = resolveContentPath(body.path);
  assertExtension(filePath, TEXT_EXT);
  if (typeof body.text !== "string") {
    throw new Error("text_missing");
  }
  await fs.promises.writeFile(filePath, body.text, "utf8");
  return { ok: true, path: body.path };
}

async function handleReadJson(body) {
  const filePath = resolveContentPath(body.path);
  assertExtension(filePath, JSON_EXT);
  const text = await fs.promises.readFile(filePath, "utf8");
  return { ok: true, path: body.path, json: JSON.parse(text) };
}

async function handleWriteJson(body) {
  const filePath = resolveContentPath(body.path);
  assertExtension(filePath, JSON_EXT);
  const jsonText = normalizeWriteJsonBody(body);
  JSON.parse(jsonText);
  await fs.promises.writeFile(filePath, jsonText, "utf8");
  return { ok: true, path: body.path };
}

async function handleImportImage(body) {
  const cellId = safeCellId(body.cellId);
  const folder = imageFolderForSurface(body.surface);
  const filename = safeImageFilename(body.filename);
  const imageBuffer = extractBase64Image(body.data);
  const relativePath = ["content", cellId, folder, filename].join("/");
  const filePath = resolveContentPath(relativePath);

  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, imageBuffer);

  return {
    ok: true,
    path: relativePath,
    file: `${folder}/${filename}`
  };
}

async function handleDeleteImage(body) {
  const cellId = safeCellId(body.cellId);
  const folder = imageFolderForSurface(body.surface);
  const filename = safeImageFilename(body.filename);
  const relativePath = ["content", cellId, folder, filename].join("/");
  const filePath = resolveContentPath(relativePath);
  await fs.promises.unlink(filePath);
  return { ok: true, path: relativePath };
}

const routes = {
  "/api/read-text": handleReadText,
  "/api/write-text": handleWriteText,
  "/api/read-json": handleReadJson,
  "/api/write-json": handleWriteJson,
  "/api/import-image": handleImportImage,
  "/api/delete-image": handleDeleteImage
};

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
  const handler = routes[url.pathname];

  if (!handler) {
    notFound(res);
    return;
  }

  if (req.method !== "POST") {
    methodNotAllowed(res);
    return;
  }

  try {
    const body = await readRequestJson(req);
    const result = await handler(body || {});
    sendJson(res, 200, result);
  } catch (err) {
    const code = err && err.code === "ENOENT" ? 404 : 400;
    sendJson(res, code, {
      ok: false,
      error: err && err.message ? err.message : "request_failed"
    });
  }
});

server.on("error", (err) => {
  console.error(`Transfer Trivia node helper failed to start: ${err.message}`);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log(`Transfer Trivia node helper listening at http://${HOST}:${PORT}`);
  console.log(`Content root: ${CONTENT_ROOT}`);
});
