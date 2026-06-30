import sqlite3
conn = sqlite3.connect(r'M:\ComfyUI_windows_portablev01 - GenFill - LITE\ComfyUI\user\default\comfyui.db')
cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cur.fetchall()]
print("Tables:", tables)
conn.close()
