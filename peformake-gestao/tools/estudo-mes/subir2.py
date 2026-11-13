import sys, json, base64, urllib.request
tok, client, folder, name, path = sys.argv[1:6]
mime = sys.argv[6] if len(sys.argv) > 6 else "application/pdf"
body = json.dumps({"token": tok, "client_id": client, "folder": folder, "name": name, "file": base64.b64encode(open(path,'rb').read()).decode(), "mime": mime}).encode()
r = urllib.request.Request("https://wkkzcjnxyylrqoolmmhi.supabase.co/functions/v1/agent-upload", data=body, headers={"Content-Type": "application/json"})
try: print(urllib.request.urlopen(r, timeout=120).read().decode())
except urllib.error.HTTPError as e: print(e.code, e.read().decode())
