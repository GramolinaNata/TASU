export function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
}

export function openPrintWindow(title, html) {
    const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=800");
    if (!w) return;

    w.document.open();
    w.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<style>
  body{ font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; padding:24px; color:#111; }
  h1{ font-size:20px; margin:0 0 16px; }
  .grid{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:16px; }
  .card{ border:1px solid #e6e6e6; border-radius:12px; padding:12px; }
  .label{ color:#6f6f6f; font-size:12px; margin-bottom:6px; }
  .v{ font-weight:700; }
  table{ width:100%; border-collapse:collapse; margin-top:12px; }
  th,td{ border-bottom:1px solid #eee; padding:10px; text-align:left; font-size:13px; }
  th{ background:#f5f5f5; text-transform:uppercase; letter-spacing:.04em; font-size:11px; color:#6f6f6f; }
  .right{ text-align:right; }
</style>
</head>
<body>
${html}
<script>window.onload=()=>{ window.print(); };</script>
</body>
</html>`);
    w.document.close();
}