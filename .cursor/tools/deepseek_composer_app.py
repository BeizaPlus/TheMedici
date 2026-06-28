#!/usr/bin/env python3
"""
DeepSeek Image Composer — Cursor-native-looking app.

HTML/CSS UI (Cursor dark theme + Tabler icons) shown in a borderless Edge app
window, backed by a tiny localhost Flask server. Paste a screenshot -> local OCR
(RapidOCR, verbatim text) + a light vision model (moondream) -> the result drops
in as a COLLAPSED inline chip (Framer/Figma-style) right at your caret, so it
never breaks your sentence. Click the chip to expand/collapse. Copy puts the FULL
text on the clipboard regardless. The image never leaves your machine; only text
reaches the model. Reuses ocr_b64 / describe from deepseek_image_composer.py.

RUN:  python deepseek_composer_app.py   (or START-DEEPSEEK-COMPOSER.bat)
"""
from __future__ import annotations

import base64
import ctypes
import ctypes.wintypes
import io
import json
import os
import subprocess
import threading
import time
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, request

# Light by default: OCR carries the exact text, so the vision pass only needs a
# small describer. moondream (~1.7 GB) is the lightest installed vision model.
# Override with DEEPSEEK_COMPOSER_VISION (e.g. "llava:latest") for more detail.
os.environ["OLLAMA_VISION_MODEL"] = os.environ.get("DEEPSEEK_COMPOSER_VISION", "moondream:latest")

from deepseek_image_composer import describe, ocr_b64, pick_model

PORT = int(os.environ.get("DEEPSEEK_COMPOSER_PORT", "8799"))
EDGE_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]
# Screenshots auto-save here. We write OCR+description INTO the matching screenshot
# file's PNG metadata, and index every one in _transcriptions.jsonl for later search.
SCREENSHOTS = Path(os.environ.get("DEEPSEEK_COMPOSER_SHOTS", r"C:\Users\steve\Pictures\Screenshots"))
INDEX = SCREENSHOTS / "_transcriptions.jsonl"
# Human-readable running log: open it in DeepSeek mode and copy a snippet in place of the image.
MD_LOG = SCREENSHOTS / "_transcriptions.md"
MATCH_WINDOW_SECS = int(os.environ.get("DEEPSEEK_COMPOSER_MATCH_SECS", "300"))

# ── Pin-on-top (Windows topmost toggle via ctypes) ────────────────────────────
_PINNED = False


def _find_edge_hwnd():
    """Find the visible Edge app window for KOSight by title match."""
    result = []
    buf = ctypes.create_unicode_buffer(256)

    @ctypes.WINFUNCTYPE(ctypes.wintypes.BOOL, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
    def callback(hwnd, _lparam):
        if not ctypes.windll.user32.IsWindowVisible(hwnd):
            return True
        ctypes.windll.user32.GetWindowTextW(hwnd, buf, 255)
        title = buf.value
        # Edge app windows show "KOSight" title set in <title>, or fallback to URL
        if title and ("KOSight" in title or "localhost:8799" in title or "127.0.0.1:8799" in title):
            result.append(hwnd)
            return False  # stop at first match
        return True

    ctypes.windll.user32.EnumWindows(callback, 0)
    return result[0] if result else None


def _toggle_topmost():
    """Flip WS_EX_TOPMOST on the Edge window. Returns new pinned state."""
    global _PINNED
    hwnd = _find_edge_hwnd()
    if not hwnd:
        return _PINNED
    SWP_NOMOVE = 0x0002
    SWP_NOSIZE = 0x0001
    HWND_TOPMOST = ctypes.wintypes.HWND(-1)
    HWND_NOTOPMOST = ctypes.wintypes.HWND(-2)
    if _PINNED:
        ctypes.windll.user32.SetWindowPos(hwnd, HWND_NOTOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE)
        _PINNED = False
    else:
        ctypes.windll.user32.SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE)
        _PINNED = True
    return _PINNED

app = Flask(__name__)

# ── Tabler icons (inline SVG, MIT) ───────────────────────────────────────────
ICONS = {
    "photo": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 8h.01"/><path d="M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12z"/><path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5"/><path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3"/>',
    "copy": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z"/><path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2"/>',
    "trash": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7l16 0"/><path d="M10 11l0 6"/><path d="M14 11l0 6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/>',
    "arrowup": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 5l0 14"/><path d="M16 9l-4 -4"/><path d="M8 9l4 -4"/>',
    "pin": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 4.5l-4 4l-4 1.5l-1.5 1.5l7 7l1.5 -1.5l1.5 -4l4 -4"/><path d="M9 15l-4.5 4.5"/><path d="M14.5 4l5.5 5.5"/>',
    "mic": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M7 11a5 5 0 0 1 10 0"/><path d="M11 18v3"/><path d="M8 22h8"/><path d="M12 2m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/>',
    "micOff": '<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 3l18 18"/><path d="M9 5a3 3 0 0 1 6 0v5a3 3 0 0 1 -.13 .874m-2 2a3 3 0 0 1 -3.87 -2.872v-1"/><path d="M5 10a7 7 0 0 0 10.73 6.22"/><path d="M9 22h6"/><path d="M12 19v-3"/><path d="M15 22h0"/>',
}


def _svg(name, size=18, cls=""):
    c = f' class="{cls}"' if cls else ""
    return (
        f'<svg{c} xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
        f'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
        f'stroke-linecap="round" stroke-linejoin="round">{ICONS[name]}</svg>'
    )


# Plain (non-f) template so JS/CSS braces and ${} template literals stay untouched.
HTML_TEMPLATE = r"""<!doctype html>
<html><head><meta charset="utf-8"><title>KOSight</title>
<style>
  :root {
    --bg:#1e1e1e; --panel:#252526; --panel2:#2d2d30; --border:#3a3a3c;
    --fg:#d4d4d4; --muted:#8b8b8b; --accent:#4493f8; --green:#3fb950; --red:#f85149; --amber:#d29922;
    --chip:#243447; --chiptext:#9fd0ff;
  }
  * { box-sizing:border-box; }
  html,body { margin:0; height:100%; background:var(--bg); color:var(--fg);
    font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; font-size:13px; }
  body { display:flex; flex-direction:column; padding:12px; gap:10px; }
  .topbar { display:flex; align-items:center; gap:8px; padding:2px 4px; }
  .topbar .title { font-weight:600; font-size:13px; }
  .topbar .hint { color:var(--muted); font-size:11px; }
  .topbar .spacer { flex:1; }
  .status { display:flex; align-items:center; gap:6px; color:var(--muted); font-size:11px; }
  .dot { width:8px; height:8px; border-radius:50%; background:var(--muted); }
  .dot.ok { background:var(--green); } .dot.bad { background:var(--red); }
  .composer { flex:1; display:flex; flex-direction:column; background:var(--panel);
    border:1px solid var(--border); border-radius:12px; overflow:hidden; }
  .composer.drag { border-color:var(--accent); }
  .editor-wrap { flex:1; position:relative; overflow:auto; }
  .ph { position:absolute; top:14px; left:16px; right:16px; color:var(--muted);
    pointer-events:none; line-height:1.55; font-size:13.5px; }
  .box { min-height:100%; outline:0; padding:14px 16px; font-size:13.5px; line-height:1.7;
    white-space:pre-wrap; word-break:break-word; }
  .toolbar { display:flex; align-items:center; gap:6px; padding:8px 10px; border-top:1px solid var(--border);
    background:var(--panel2); }
  .toolbar .spacer { flex:1; }
  .iconbtn { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px;
    border-radius:8px; border:0; background:transparent; color:var(--muted); cursor:pointer; }
  .iconbtn:hover { background:#3a3a3c; color:var(--fg); }
  .toast { color:var(--muted); font-size:11px; margin-right:6px; }
  .primary { display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 12px; border-radius:8px;
    border:1px solid var(--border); background:var(--panel); color:var(--fg); cursor:pointer; font-size:12px; }
  .primary:hover { background:#3a3a3c; }
  .sendbtn { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px;
    border-radius:9px; border:0; background:var(--accent); color:#fff; cursor:pointer; }
  .sendbtn:hover { filter:brightness(1.12); }
  .sendbtn:disabled { background:#3a3a3c; color:var(--muted); cursor:default; }
  .pinbtn { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px;
    border-radius:8px; border:0; background:transparent; color:var(--muted); cursor:pointer; }
  .pinbtn:hover { background:#3a3a3c; color:var(--fg); }
  .pinbtn.active { background:#1a3a52; color:var(--accent); }

  /* Framer/Figma-style inline chip */
  .imgchip { display:inline-flex; flex-direction:column; vertical-align:-3px; max-width:100%;
    margin:0 3px; border:1px solid #335; border-radius:8px; background:var(--chip);
    overflow:hidden; }
  .imgchip .chip-head { display:inline-flex; align-items:center; gap:6px; padding:2px 8px;
    cursor:pointer; user-select:none; white-space:nowrap; color:var(--chiptext); font-size:12px; }
  .imgchip .chip-head svg { width:14px; height:14px; }
  .imgchip .chev { transition:transform .15s ease; opacity:.8; }
  .imgchip.expanded .chev { transform:rotate(180deg); }
  .imgchip .chip-body { display:none; padding:8px 10px; border-top:1px solid #335;
    font-family:Consolas,"Cascadia Code",monospace; font-size:11.5px; line-height:1.5;
    white-space:pre-wrap; color:var(--fg); max-height:260px; overflow:auto; user-select:text; }
  .imgchip.expanded .chip-body { display:block; }
  .imgchip.loading .chip-head { color:var(--amber); }
  .imgchip.done .chip-head { color:var(--green); }

  /* live voice bar */
  .livevoice { display:none; align-items:center; gap:6px; padding:4px 10px; border-top:1px solid var(--border);
    background:var(--panel2); color:var(--amber); font-size:12px; min-height:26px; }
  .livevoice.show { display:flex; }
  .livevoice.hold { color:var(--muted); }
  .micbtn { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px;
    border-radius:8px; border:0; background:transparent; color:var(--muted); cursor:pointer; }
  .micbtn:hover { background:#3a3a3c; color:var(--fg); }
  .micbtn.recording { background:#4d1a1a; color:var(--red); animation: micpulse 1.5s ease-in-out infinite; }
  @keyframes micpulse { 0%,100% { opacity:1; } 50% { opacity:.6; } }
</style></head>
<body>
  <div class="topbar">
    <span class="title">KOSight</span>
    <span class="hint">local OCR + vision · DeepSeek-safe</span>
    <span class="spacer"></span>
    <span class="status"><span id="dot" class="dot"></span><span id="model">checking...</span></span>
  </div>
  <div class="composer" id="composer">
    <div class="editor-wrap">
      <div class="ph" id="ph">Type your message. Paste a screenshot (Ctrl+V) and it drops in as a chip right here - click it to expand. Then Copy and paste into Cursor.</div>
      <div class="box" id="box" contenteditable="true" spellcheck="false"></div>
    </div>
    <div class="toolbar">
      <button class="iconbtn" id="pasteBtn" title="Paste image from clipboard">__ICON_PHOTO__</button>
      <button class="micbtn" id="micBtn" title="Start voice dictation">__ICON_MIC__</button>
      <button class="iconbtn" id="clearBtn" title="Clear">__ICON_TRASH__</button>
      <button class="pinbtn" id="pinBtn" title="Pin on top">__ICON_PIN__</button>
      <span class="spacer"></span>
      <span class="toast" id="toast"></span>
      <button class="sendbtn" id="sendBtn" title="Copy all &amp; clear, ready for next (Enter)">__ICON_SEND__</button>
    </div>
  </div>
  <div class="livevoice" id="livevoice"><span id="livevoicetext"></span></div>
<script>
  const ICON_PHOTO = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 8h.01"/><path d="M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12z"/><path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5"/><path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3"/></svg>';
  const ICON_CHEV = '<svg class="chev" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 9l6 6l6 -6"/></svg>';

  const box = document.getElementById('box');
  const ph = document.getElementById('ph');
  const toast = document.getElementById('toast');
  const dot = document.getElementById('dot');
  const modelEl = document.getElementById('model');
  const composer = document.getElementById('composer');
  let seq = 0;
  let savedRange = null;

  function setToast(msg, color) { toast.textContent = msg || ''; toast.style.color = color || 'var(--muted)'; }
  function updatePh() { ph.style.display = (box.textContent.trim() === '' && !box.querySelector('.imgchip')) ? 'block' : 'none'; }

  function saveRange() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && box.contains(sel.anchorNode)) savedRange = sel.getRangeAt(0).cloneRange();
  }
  box.addEventListener('keyup', saveRange);
  box.addEventListener('mouseup', saveRange);
  box.addEventListener('input', updatePh);

  function insertNodeAtCaret(node) {
    box.focus();
    const sel = window.getSelection();
    let range = (savedRange && box.contains(savedRange.startContainer)) ? savedRange : null;
    if (!range) { range = document.createRange(); range.selectNodeContents(box); range.collapse(false); }
    range.collapse(false);
    range.insertNode(node);
    const sp = document.createTextNode('\u00a0');
    node.after(sp);
    const r2 = document.createRange(); r2.setStartAfter(sp); r2.collapse(true);
    sel.removeAllRanges(); sel.addRange(r2);
    savedRange = r2.cloneRange();
    updatePh();
  }

  function makeChip() {
    const id = ++seq;
    const chip = document.createElement('span');
    chip.className = 'imgchip loading';
    chip.contentEditable = 'false';
    chip.dataset.full = '';
    chip.dataset.n = id;
    const head = document.createElement('span');
    head.className = 'chip-head';
    head.innerHTML = ICON_PHOTO + '<span class="chip-label">image #' + id + ' - reading...</span>' + ICON_CHEV;
    const body = document.createElement('span');
    body.className = 'chip-body';
    chip.appendChild(head); chip.appendChild(body);
    head.addEventListener('mousedown', e => e.preventDefault());
    head.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); chip.classList.toggle('expanded'); });
    chip._label = head.querySelector('.chip-label');
    chip._body = body;
    return chip;
  }

  function serialize() {
    let out = '';
    (function walk(node) {
      node.childNodes.forEach(n => {
        if (n.nodeType === 3) { out += n.nodeValue; }
        else if (n.nodeType === 1) {
          if (n.classList && n.classList.contains('imgchip')) { out += '\n' + (n.dataset.full || '') + '\n'; }
          else if (n.tagName === 'BR') { out += '\n'; }
          else if (n.tagName === 'DIV' || n.tagName === 'P') { out += '\n'; walk(n); }
          else { walk(n); }
        }
      });
    })(box);
    return out.replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }

  async function autoCopy() {
    try { await navigator.clipboard.writeText(serialize()); return true; } catch (e) { return false; }
  }

  function blobToB64(blob) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).split(',')[1]);
      fr.onerror = rej; fr.readAsDataURL(blob);
    });
  }

  async function processB64(b64) {
    const chip = makeChip();
    insertNodeAtCaret(chip);
    setToast('reading text (OCR) + describing...', 'var(--amber)');
    try {
      const r = await fetch('/process', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ b64 }) });
      const d = await r.json();
      chip.classList.remove('loading');
      chip.classList.add('done');
      chip.dataset.full = d.block;
      chip._label.textContent = 'image #' + chip.dataset.n + ' \u2714';
      chip._body.textContent = d.block;
      setToast('Chip added. Type around it, then Enter or the arrow to send (copy + clear).', 'var(--green)');
    } catch (e) {
      chip.classList.remove('loading');
      chip._label.textContent = 'image (failed)';
      chip.dataset.full = '[image processing failed: ' + e + ']';
      setToast('failed: ' + e, 'var(--red)');
    }
    updatePh();
  }

  function insertText(txt) {
    const node = document.createTextNode(txt);
    insertNodeAtCaret(node);
  }

  document.addEventListener('paste', async (ev) => {
    const items = (ev.clipboardData || {}).items || [];
    for (const it of items) {
      if (it.type && it.type.startsWith('image/')) {
        ev.preventDefault();
        const b64 = await blobToB64(it.getAsFile());
        processB64(b64); return;
      }
    }
    ev.preventDefault();
    const txt = ev.clipboardData ? ev.clipboardData.getData('text/plain') : '';
    if (txt) insertText(txt);
  });

  document.getElementById('pasteBtn').addEventListener('click', async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const it of items) {
        const t = it.types.find(t => t.startsWith('image/'));
        if (t) { const b64 = await blobToB64(await it.getType(t)); processB64(b64); return; }
      }
      setToast('No image on clipboard - snip with Win+Shift+S, then Ctrl+V.', 'var(--red)');
    } catch (e) { setToast('Press Ctrl+V to paste the image.', 'var(--amber)'); }
  });

  async function sendNow() {
    if (!serialize()) { setToast('Nothing to copy yet.', 'var(--red)'); return; }
    const ok = await autoCopy();
    if (ok) { box.innerHTML = ''; savedRange = null; updatePh(); box.focus();
      setToast('Copied & cleared - paste into Cursor (DeepSeek).', 'var(--green)'); }
    else setToast('Copy failed - try again.', 'var(--red)');
  }
  document.getElementById('sendBtn').addEventListener('click', sendNow);
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendNow(); }  // Enter = copy+clear (Shift+Enter = newline)
  });

  document.getElementById('clearBtn').addEventListener('click', () => { box.innerHTML = ''; savedRange = null; setToast(''); updatePh(); box.focus(); });

  // -- Pin on top --
  const pinBtn = document.getElementById('pinBtn');
  async function togglePin() {
    try { const d = await (await fetch('/pin', {method:'POST'})).json(); pinBtn.classList.toggle('active', d.pinned); }
    catch(e) { setToast('pin toggle failed', 'var(--red)'); }
  }
  pinBtn.addEventListener('click', togglePin);
  // poll also syncs pin state

  // -- Live speech-to-text (Web Speech API, same as MeWorld quick chat) --
  const livevoice = document.getElementById('livevoice');
  const livevoicetext = document.getElementById('livevoicetext');
  const micBtn = document.getElementById('micBtn');
  let speechRec = null;
  let speechSupported = false;
  let recording = false;

  try { speechSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition); } catch(e) {}

  function startDictation() {
    if (!speechSupported) { setToast('Speech recognition not available in this browser.', 'var(--red)'); return; }
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    speechRec = new Ctor();
    speechRec.continuous = true;
    speechRec.interimResults = true;
    speechRec.lang = 'en-US';
    speechRec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const t = r[0]?.transcript || '';
        if (r.isFinal) { insertText(t + ' '); livevoicetext.textContent = ''; }
        else { interim += t; }
      }
      livevoicetext.textContent = interim;
      livevoice.classList.toggle('show', !!interim);
      livevoice.classList.toggle('hold', !interim && recording);
    };
    speechRec.onerror = (e) => {
      if (e.error === 'no-speech') return;
      if (e.error === 'aborted') return;
      setToast('Voice error: ' + e.error, 'var(--red)');
      stopDictation();
    };
    speechRec.onend = () => {
      if (recording) { try { speechRec.start(); } catch(e) { stopDictation(); } }
      else { livevoice.classList.remove('show', 'hold'); }
    };
    speechRec.start();
    recording = true;
    micBtn.classList.add('recording');
    micBtn.title = 'Stop voice dictation';
    livevoice.classList.add('hold');
    livevoicetext.textContent = 'Listening\u2026';
    setToast('Speaking\u2026 words drop into the composer live.', 'var(--amber)');
    box.focus();
  }

  function stopDictation() {
    recording = false;
    if (speechRec) { try { speechRec.stop(); } catch(e) {} }
    micBtn.classList.remove('recording');
    micBtn.title = 'Start voice dictation';
    livevoice.classList.remove('show', 'hold');
    livevoicetext.textContent = '';
    setToast('');
  }

  micBtn.addEventListener('click', () => { recording ? stopDictation() : startDictation(); });

  ['dragover', 'dragenter'].forEach(e => composer.addEventListener(e, ev => { ev.preventDefault(); composer.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(e => composer.addEventListener(e, ev => { ev.preventDefault(); composer.classList.remove('drag'); }));
  composer.addEventListener('drop', async (ev) => {
    const f = [...(ev.dataTransfer.files || [])].find(f => f.type.startsWith('image/'));
    if (f) processB64(await blobToB64(f));
  });

  async function poll() {
    try { const d = await (await fetch('/status')).json();
      dot.className = 'dot ' + (d.ok ? 'ok' : 'bad'); modelEl.textContent = d.ok ? d.model : 'ollama down';
      pinBtn.classList.toggle('active', !!d.pinned); }
    catch (e) { dot.className = 'dot bad'; modelEl.textContent = 'server?'; }
    setTimeout(poll, 5000);
  }
  updatePh(); poll(); box.focus();
</script>
</body></html>"""


def _page():
    html = HTML_TEMPLATE
    html = html.replace("__ICON_PHOTO__", _svg("photo"))
    html = html.replace("__ICON_TRASH__", _svg("trash"))
    html = html.replace("__ICON_COPY__", _svg("copy", 16))
    html = html.replace("__ICON_SEND__", _svg("arrowup", 18))
    html = html.replace("__ICON_PIN__", _svg("pin"))
    html = html.replace("__ICON_MIC__", _svg("mic"))
    return html


@app.route("/")
def index():
    return _page()


@app.route("/status")
def status():
    try:
        return jsonify({"ok": True, "model": pick_model(), "pinned": _PINNED})
    except Exception:
        return jsonify({"ok": False, "model": None, "pinned": _PINNED})


@app.route("/pin", methods=["POST"])
def pin():
    pinned = _toggle_topmost()
    return jsonify({"pinned": pinned})


def _find_recent_screenshot(pasted):
    """Newest screenshot file that matches the pasted image's size, was saved
    recently, and isn't already tagged by us. None if nothing fits."""
    try:
        from PIL import Image

        now = time.time()
        files = [p for p in SCREENSHOTS.iterdir()
                 if p.is_file() and p.suffix.lower() in (".png", ".jpg", ".jpeg")]
        files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
        for p in files[:12]:
            if now - p.stat().st_mtime > MATCH_WINDOW_SECS:
                break
            try:
                with Image.open(p) as im:
                    if im.size == pasted.size and im.info.get("source") != "deepseek-image-composer":
                        return p
            except Exception:
                continue
    except Exception:
        pass
    return None


def _archive(b64, ocr, desc):
    """Write OCR+description into the matching screenshot's PNG metadata (or save a
    new PNG if none matched), and append to the searchable JSONL index."""
    try:
        from PIL import Image, PngImagePlugin

        SCREENSHOTS.mkdir(parents=True, exist_ok=True)
        ts = datetime.now()
        pasted = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")
        target = _find_recent_screenshot(pasted)
        matched = target is not None and target.suffix.lower() == ".png"

        meta = PngImagePlugin.PngInfo()
        meta.add_text("ocr", ocr or "")
        meta.add_text("description", desc or "")
        meta.add_text("created", ts.isoformat())
        meta.add_text("source", "deepseek-image-composer")

        if matched:
            with Image.open(target) as im:
                im.convert("RGB").save(target, "PNG", pnginfo=meta)  # tag the real screenshot in place
            path = target
        elif target is not None:
            path = target  # non-PNG screenshot: index only, don't rewrite the file
        else:
            stamp = ts.strftime("%Y-%m-%d_%H%M%S_") + f"{ts.microsecond // 1000:03d}"
            path = SCREENSHOTS / f"shot-{stamp}.png"
            pasted.save(path, "PNG", pnginfo=meta)

        with open(INDEX, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(
                {"ts": ts.isoformat(), "file": str(path), "matched": matched, "ocr": ocr, "desc": desc},
                ensure_ascii=False) + "\n")
        _md_append(ts, path, ocr, desc)
        return str(path)
    except Exception as exc:
        return f"(archive failed: {exc})"


def _md_append(ts, path, ocr, desc):
    """Append a copy-ready snippet to the running markdown log. In DeepSeek mode you
    open this file and paste a block in place of the image."""
    try:
        new = not MD_LOG.exists()
        ocr_part = (ocr or "").strip() or "(no text detected)"
        desc_part = (desc or "").strip() or "(no description)"
        with open(MD_LOG, "a", encoding="utf-8") as fh:
            if new:
                fh.write(
                    "# Screenshot transcriptions\n\n"
                    "Local OCR + vision snippets. In DeepSeek mode, copy a block below "
                    "(between the `[image …]` / `[/image]` markers) and paste it in place "
                    "of the screenshot.\n\n---\n\n"
                )
            fh.write(
                f"## {ts.strftime('%Y-%m-%d %H:%M:%S')} · `{Path(path).name}`\n\n"
                f"[open image]({Path(path).as_uri()})\n\n"
                "```text\n"
                "[image — local OCR + vision]\n"
                f"OCR (verbatim text):\n{ocr_part}\n\n"
                f"Visual description:\n{desc_part}\n"
                "[/image]\n"
                "```\n\n---\n\n"
            )
    except Exception:
        pass


@app.route("/process", methods=["POST"])
def process():
    b64 = (request.get_json(force=True, silent=True) or {}).get("b64", "")
    if not b64:
        return jsonify({"block": "[no image data]"}), 400
    ocr = ocr_b64(b64)
    try:
        desc = describe(b64)
    except Exception as exc:
        desc = f"(local vision unavailable: {exc})"
    saved = _archive(b64, ocr, desc)
    ocr_part = (ocr or "").strip() or "(no text detected)"
    block = (
        "[image — local OCR + vision]\n"
        f"OCR (verbatim text):\n{ocr_part}\n\n"
        f"Visual description:\n{desc}\n[/image]"
    )
    return jsonify({"ocr": ocr, "desc": desc, "block": block, "saved": saved})


def _launch_edge():
    # Reuse existing KOSight window if already open (don't spawn duplicates)
    hwnd = _find_edge_hwnd()
    if hwnd:
        # Bring existing window to front
        SW_SHOW = 5
        ctypes.windll.user32.ShowWindow(hwnd, SW_SHOW)
        ctypes.windll.user32.SetForegroundWindow(hwnd)
        return None

    edge = next((p for p in EDGE_CANDIDATES if os.path.exists(p)), None)
    url = f"http://127.0.0.1:{PORT}/"
    profile = os.path.join(os.environ.get("LOCALAPPDATA", os.getcwd()), "DeepSeekComposerEdge")
    if edge:
        w = os.environ.get("DEEPSEEK_COMPOSER_W", "1024")
        h = os.environ.get("DEEPSEEK_COMPOSER_H", "190")
        return subprocess.Popen([
            edge, f"--app={url}", f"--window-size={w},{h}",
            f"--user-data-dir={profile}", "--no-first-run",
        ])
    os.startfile(url)
    return None


def main():
    threading.Thread(
        target=lambda: app.run(host="127.0.0.1", port=PORT, threaded=True, use_reloader=False),
        daemon=True,
    ).start()
    time.sleep(1.0)
    _launch_edge()
    # Keep Flask alive — Edge may delegate to an existing process, so proc.wait()
    # can return immediately. The main thread must stay up so the daemon survives.
    while True:
        time.sleep(3600)


if __name__ == "__main__":
    main()
