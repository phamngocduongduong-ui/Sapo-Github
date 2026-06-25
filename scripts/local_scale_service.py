import os
import json
import time
import serial
import serial.tools.list_ports
import threading
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
# Enable CORS so the browser Web App (which may run on localhost or another port/IP) can access this API
CORS(app)

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scale_config.json")

# Global states
current_weight = 0.0
active_port = None
baudrate = 9600
serial_conn = None
should_read = True
thread_lock = threading.Lock()
status_message = "Chưa kết nối"
is_virtual = False

def load_config():
    global active_port, baudrate
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
                active_port = config.get("port")
                baudrate = config.get("baudrate", 9600)
                print(f"[Config] Loaded default port successfully: {active_port} (Baudrate: {baudrate})")
        except Exception as e:
            print("[Config] Error loading config.json file:", e)

def save_config(port_name, baud_rate):
    try:
        os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump({"port": port_name, "baudrate": baud_rate}, f, indent=4, ensure_ascii=False)
        print(f"[Config] Saved default port: {port_name}")
    except Exception as e:
        print("[Config] Error saving config.json file:", e)

def close_serial():
    global serial_conn, status_message, is_virtual
    if is_virtual:
        is_virtual = False
        print("[Serial] Closed virtual connection")
    elif serial_conn:
        try:
            serial_conn.close()
            print(f"[Serial] Closed connection with port: {serial_conn.port}")
        except Exception as e:
            print("[Serial] Error closing port:", e)
    serial_conn = None
    status_message = "Disconnected"

def open_serial(port_name, baud_rate):
    global serial_conn, status_message, active_port, baudrate, is_virtual
    
    with thread_lock:
        close_serial()
        
        if not port_name:
            status_message = "No COM port selected"
            return False
            
        if port_name == "COM_VIRTUAL":
            is_virtual = True
            active_port = "COM_VIRTUAL"
            baudrate = baud_rate
            status_message = "Connected (Virtual Scale)"
            print("[Serial] Connected SUCCESSFULLY to COM_VIRTUAL!")
            return True
            
        is_virtual = False
        try:
            print(f"[Serial] Connecting to port {port_name}...")
            # Set a timeout so readline() does not block indefinitely
            serial_conn = serial.Serial(port_name, baud_rate, timeout=1.0)
            active_port = port_name
            baudrate = baud_rate
            status_message = "Connected"
            print(f"[Serial] Connected SUCCESSFULLY to {port_name}!")
            return True
        except Exception as e:
            serial_conn = None
            active_port = port_name
            status_message = f"Connection error: {str(e)}"
            print(f"[Serial] Connection FAILED to {port_name}: {e}")
            return False

def serial_reader_thread():
    global current_weight, serial_conn, should_read, status_message, is_virtual
    print("[Thread] Serial reader thread started.")
    
    virtual_weight = 450.0
    
    while should_read:
        if is_virtual:
            import random
            fluctuation = (random.random() - 0.5) * 0.2
            virtual_weight = max(0.0, virtual_weight + fluctuation)
            with thread_lock:
                current_weight = virtual_weight
        elif serial_conn and serial_conn.is_open:
            try:
                # Read all available bytes in the serial buffer
                waiting = serial_conn.in_waiting
                if waiting > 0:
                    raw_line = serial_conn.read(waiting)
                else:
                    # If empty, block to read at least 1 byte (or timeout)
                    raw_line = serial_conn.read(1)
                
                if raw_line:
                    print(f"[Serial Debug] Raw data: {raw_line}")
                    line = raw_line.decode('utf-8', errors='ignore')
                    if line:
                        import re
                        # Find all complete frames between \x02 and \x03
                        frames = re.findall(r'\x02([^\x02\x03]+)\x03', line)
                        if frames:
                            # Parse the latest complete frame in the buffer
                            latest_frame = frames[-1]
                            match = re.search(r'([+-])(\d+)', latest_frame)
                            if match:
                                sign = match.group(1)
                                digit_str = match.group(2)
                                if len(digit_str) >= 2:
                                    weight_part = digit_str[:-1]
                                    decimal_part = int(digit_str[-1])
                                    try:
                                        val = float(weight_part)
                                        if decimal_part <= 4:
                                            val = val / (10 ** decimal_part)
                                        if sign == '-':
                                            val = -val
                                        with thread_lock:
                                            current_weight = val
                                    except ValueError:
                                        pass
                        else:
                            # Fallback: parse raw numbers if no complete \x02...\x03 frame exists
                            match = re.search(r'([+-])(\d+)', line)
                            if match:
                                sign = match.group(1)
                                digit_str = match.group(2)
                                if len(digit_str) >= 2:
                                    weight_part = digit_str[:-1]
                                    decimal_part = int(digit_str[-1])
                                    try:
                                        val = float(weight_part)
                                        if decimal_part <= 4:
                                            val = val / (10 ** decimal_part)
                                        if sign == '-':
                                            val = -val
                                        with thread_lock:
                                            current_weight = val
                                    except ValueError:
                                        pass
                            else:
                                digits = []
                                has_dot = False
                                for char in line:
                                    if char.isdigit():
                                        digits.append(char)
                                    elif char == '.' and not has_dot:
                                        digits.append(char)
                                        has_dot = True
                                    elif char == '-' and len(digits) == 0:
                                        digits.append(char)
                                        
                                cleaned = ''.join(digits)
                                if cleaned:
                                    try:
                                        val = float(cleaned)
                                        with thread_lock:
                                            current_weight = val
                                    except ValueError:
                                        pass
            except Exception as e:
                print(f"[Thread] Error reading data from COM port: {e}")
                with thread_lock:
                    status_message = f"Reading error: {str(e)}"
                    # Try to reconnect or close
                    close_serial()
        time.sleep(0.1)

# API Endpoints
@app.route('/ports', methods=['GET'])
def list_ports():
    ports_list = []
    try:
        ports = serial.tools.list_ports.comports()
        for p in ports:
            ports_list.append(p.device)
        print(f"[API] Available ports: {ports_list}")
    except Exception as e:
        print("[API] Error listing COM ports:", e)
    
    if "COM_VIRTUAL" not in ports_list:
        ports_list.append("COM_VIRTUAL")
    return jsonify({"ports": ports_list})

@app.route('/config', methods=['POST'])
def update_config():
    data = request.json or {}
    port_name = data.get("port")
    baud_rate = int(data.get("baudrate", 9600))
    
    if not port_name:
        return jsonify({"success": False, "message": "Please provide the COM port name"}), 400
        
    # Attempt to open port
    success = open_serial(port_name, baud_rate)
    if success:
        save_config(port_name, baud_rate)
        return jsonify({
            "success": True, 
            "message": f"Successfully connected to port {port_name}",
            "port": active_port,
            "status": status_message
        })
    else:
        return jsonify({
            "success": False, 
            "message": f"Could not connect to port {port_name}. {status_message}",
            "port": active_port,
            "status": status_message
        }), 500

@app.route('/weight', methods=['GET'])
def get_weight():
    # Return mock weight fluctuations if not connected to simulate active reading
    is_connected = (serial_conn is not None and serial_conn.is_open) or is_virtual
    
    with thread_lock:
        weight_val = current_weight
        status = status_message
        port = active_port
        
    return jsonify({
        "weight": weight_val,
        "port": port,
        "status": "connected" if is_connected else "disconnected",
        "detail": status
    })

def start_service():
    load_config()
    
    # Try opening the default configured port on startup
    if active_port:
        open_serial(active_port, baudrate)
    else:
        print("[Startup] No default COM port configured. Please configure via Web App.")
        
    # Start the serial port reader thread
    t = threading.Thread(target=serial_reader_thread, daemon=True)
    t.start()
    
    # Run the server on port 5000
    print("[Startup] Web Service started at http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

if __name__ == '__main__':
    start_service()
