#!/usr/bin/env python3
"""
Lumina Bloom — Local Hardware Bridge & Dual-Stack Server
Serves static files on port 8080 (IPv4 & IPv6) and automatically bridges USB Serial
(/dev/cu.usbserial*, /dev/cu.usbmodem*) to the browser via Server-Sent Events (/api/serial-stream).
"""

import http.server
import socket
import os
import sys
import glob
import json
import time
import threading
import queue
import contextlib

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# SSE client queues and lock
sse_clients = []
clients_lock = threading.Lock()

# Serial state
serial_info = {
    "connected": False,
    "port": None,
    "baud": 115200,
    "last_packet": None,
    "last_time": 0
}
serial_lock = threading.Lock()
pause_serial = False

def find_serial_port():
    candidates = (
        glob.glob('/dev/cu.usbserial*') +
        glob.glob('/dev/cu.usbmodem*') +
        glob.glob('/dev/cu.wchusbserial*')
    )
    candidates.sort(key=lambda x: ('usbserial' not in x, x))
    return candidates[0] if candidates else None

def broadcast_line(line):
    with clients_lock:
        dead = []
        for q in sse_clients:
            try:
                q.put_nowait(line)
            except Exception:
                dead.append(q)
        for d in dead:
            if d in sse_clients:
                sse_clients.remove(d)

def serial_worker():
    global pause_serial
    try:
        import serial
    except ImportError:
        print("[Bridge] pyserial not found. USB serial auto-bridge disabled.")
        return

    while True:
        if pause_serial:
            time.sleep(0.5)
            continue

        port_name = find_serial_port()
        if not port_name:
            with serial_lock:
                serial_info["connected"] = False
                serial_info["port"] = None
            time.sleep(1.0)
            continue

        try:
            print(f"[Bridge] Opening serial port {port_name} at 115200 baud...")
            ser = serial.Serial(port_name, 115200, timeout=1.0)
            with serial_lock:
                serial_info["connected"] = True
                serial_info["port"] = port_name

            # Broadcast connection event
            broadcast_line(json.dumps({"_bridge_status": "connected", "port": port_name}))

            while not pause_serial:
                raw = ser.readline()
                if not raw:
                    continue
                line = raw.decode('utf-8', errors='ignore').strip()
                if line:
                    with serial_lock:
                        serial_info["last_packet"] = line
                        serial_info["last_time"] = time.time()
                    broadcast_line(line)

            ser.close()
        except Exception:
            with serial_lock:
                serial_info["connected"] = False
            time.sleep(1.0)

class BloomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Quiet logger for cleaner terminal output
        if '/api/' not in args[0]:
            pass

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_GET(self):
        clean_path = self.path.split('?')[0]

        if clean_path == '/api/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            with serial_lock:
                data = dict(serial_info)
            self.wfile.write(json.dumps(data).encode('utf-8'))
            return

        if clean_path == '/api/serial-stream':
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.end_headers()

            q = queue.Queue(maxsize=100)
            with clients_lock:
                sse_clients.append(q)

            with serial_lock:
                init_msg = json.dumps({
                    "_bridge_status": "connected" if serial_info["connected"] else "searching",
                    "port": serial_info["port"]
                })
            try:
                self.wfile.write(f"data: {init_msg}\n\n".encode('utf-8'))
                self.wfile.flush()

                while True:
                    try:
                        line = q.get(timeout=10.0)
                        msg = f"data: {line}\n\n"
                        self.wfile.write(msg.encode('utf-8'))
                        self.wfile.flush()
                    except queue.Empty:
                        self.wfile.write(b": ping\n\n")
                        self.wfile.flush()
            except (ConnectionResetError, BrokenPipeError, socket.error):
                pass
            finally:
                with clients_lock:
                    if q in sse_clients:
                        sse_clients.remove(q)
            return

        if clean_path == '/api/release-serial':
            global pause_serial
            pause_serial = True
            time.sleep(0.3)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status":"released"}')
            return

        if clean_path == '/api/resume-serial':
            pause_serial = False
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status":"resumed"}')
            return

        return super().do_GET()

class DualStackServer(http.server.ThreadingHTTPServer):
    address_family = socket.AF_INET6
    daemon_threads = True
    allow_reuse_address = True

    def server_bind(self):
        with contextlib.suppress(Exception):
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        return super().server_bind()

def main():
    t = threading.Thread(target=serial_worker, daemon=True)
    t.start()

    try:
        server = DualStackServer(('::', PORT), BloomHandler)
    except Exception:
        # Fallback to IPv4 standard
        server = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), BloomHandler)

    print(f"[Lumina Bloom] Dual-Stack Server running on port {PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        server.server_close()

if __name__ == '__main__':
    main()
