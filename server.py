from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import socket
import sqlite3
import time
import urllib.request
import json
import ssl
import cv2
import threading
import os
import io
import csv
import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(("*",)),
    allow_credentials=True,
    allow_methods=list(("*",)),
    allow_headers=list(("*",)),
)

ZONES = {
    "1동": "192.168.1.177",
    "2동": "192.168.1.178",
    "3동": "192.168.1.179",
    "4동": "192.168.1.180",
}

class IrrigationLog(BaseModel):
    zone: str
    duration: int

class PesticideLog(BaseModel):
    date: str
    target: str
    pesticide: str
    ratio: str
    purpose: str
    author: str

class GrowthLog(BaseModel):
    date: str
    farm: str
    surveyor: str
    plant_id: str
    habit: str
    data_json: str

# ==========================================
# ⭐ 1. CCTV 실시간 스트리밍
# ==========================================
class CCTVStreamer:
    def __init__(self, rtsp_url):
        self.rtsp_url = rtsp_url
        self.latest_frame = None
        self.is_running = True
        self.thread = threading.Thread(target=self._capture_thread, daemon=True)
        self.thread.start()

    def _capture_thread(self):
        os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;udp"
        cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        while self.is_running:
            success, frame = cap.read()
            if success: self.latest_frame = frame
            else:
                time.sleep(1)
                cap.release()
                cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    def get_jpeg_frame(self):
        if self.latest_frame is None: return None
        ret, jpeg = cv2.imencode('.jpg', self.latest_frame, list((int(cv2.IMWRITE_JPEG_QUALITY), 70)))
        return jpeg.tobytes() if ret else None

cam1 = CCTVStreamer("rtsp://192.168.1.110:554/stream1")

def generate_frames():
    while True:
        frame_bytes = cam1.get_jpeg_frame()
        if frame_bytes: yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        else: time.sleep(0.1)

@app.get("/api/stream/1")
def video_feed_1():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")


# ==========================================
# ⭐ 2. 스마트팜 DB 및 센서/날씨 API
# ==========================================
def init_db():
    conn = sqlite3.connect("smartfarm.db")
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS sensor_data (timestamp DATETIME, zone TEXT, temp REAL, hum REAL, relay INTEGER)''')
    c.execute('''CREATE TABLE IF NOT EXISTS irrigation_log (timestamp DATETIME, zone TEXT, duration INTEGER)''')
    c.execute('''CREATE TABLE IF NOT EXISTS pesticide_log (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, target TEXT, pesticide TEXT, ratio TEXT, purpose TEXT, author TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS growth_log (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, farm TEXT, surveyor TEXT, plant_id TEXT, habit TEXT, data_json TEXT)''')
    conn.commit()
    conn.close()

init_db()

def db_auto_saver():
    while True:
        for zone, ip in ZONES.items():
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(2.0)
                sock.connect((ip, 80))
                sock.sendall(("GET_DATA\n").encode())
                response = sock.recv(1024).decode('utf-8').strip()
                sock.close()
                
                temp, hum, relay = response.split(',')
                conn = sqlite3.connect("smartfarm.db")
                c = conn.cursor()
                c.execute("INSERT INTO sensor_data VALUES (datetime('now', 'localtime'), ?, ?, ?, ?)", 
                          (zone, float(temp), float(hum), int(relay)))
                conn.commit()
                conn.close()
            except Exception as e: pass
        time.sleep(300)

threading.Thread(target=db_auto_saver, daemon=True).start()

@app.get("/api/sensors")
def read_sensors():
    res = {}
    for zone, ip in ZONES.items():
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2.0) 
            sock.connect((ip, 80))
            sock.sendall(("GET_DATA\n").encode())
            response = sock.recv(1024).decode('utf-8').strip()
            sock.close()
            temp, hum, relay = response.split(',')
            res[zone] = {"temp": float(temp), "hum": float(hum), "status": "정상"}
        except:
            res[zone] = {"temp": 0.0, "hum": 0.0, "status": "통신장애"}
    return res

cached_weather = {"temp": 0.0, "hum": 0, "ws": 0.0, "desc": "로딩중", "forecast": list(())}
last_weather_fetch = 0

@app.get("/api/weather")
def get_weather():
    global cached_weather, last_weather_fetch
    current_time = time.time()
    if current_time - last_weather_fetch >= 300:
        try:
            url = "https://api.open-meteo.com/v1/forecast?latitude=37.009&longitude=127.277&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul&forecast_days=5"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            context = ssl._create_unverified_context()
            with urllib.request.urlopen(req, context=context) as response:
                data = json.loads(response.read().decode('utf-8'))
                
                current = data.get('current', {})
                cached_weather["temp"] = float(current.get('temperature_2m', 0))
                cached_weather["hum"] = int(current.get('relative_humidity_2m', 0))
                cached_weather["ws"] = round(float(current.get('wind_speed_10m', 0)) / 3.6, 1)
                
                def get_desc(code):
                    if code == 0: return "☀️맑음"
                    elif code == 1 or code == 2 or code == 3: return "☁️구름/흐림"
                    elif code == 45 or code == 48: return "🌫️안개"
                    elif 50 <= code <= 69 or 80 <= code <= 84: return "🌧️비"
                    elif 70 <= code <= 79 or 85 <= code <= 86: return "❄️눈"
                    elif code >= 95: return "⚡천둥번개"
                    return "☁️흐림"

                cached_weather["desc"] = get_desc(current.get('weather_code', 0))
                
                daily = data.get('daily', {})
                t_list = daily.get('time', list(()))
                max_list = daily.get('temperature_2m_max', list(()))
                min_list = daily.get('temperature_2m_min', list(()))
                code_list = daily.get('weather_code', list(()))
                
                forecast = list(())
                for t_val, mx, mn, cd in zip(t_list, max_list, min_list, code_list):
                    y, m, d_str = t_val.split('-')
                    forecast.append({"date": f"{m}-{d_str}", "max": mx, "min": mn, "desc": get_desc(cd)})
                    if len(forecast) == 5: break
                    
                cached_weather["forecast"] = forecast
            last_weather_fetch = current_time
        except Exception as e: pass
    return cached_weather

@app.get("/api/history")
def get_history(range: str):
    conn = sqlite3.connect("smartfarm.db")
    c = conn.cursor()
    time_modifier = '-1 day'
    grouping_sql = "strftime('%m-%d %H:', timestamp) || substr('00' || ((CAST(strftime('%M', timestamp) AS INTEGER) / 5) * 5), -2)"
    if range == '3일': time_modifier = '-3 days'
    elif range == '1주': time_modifier, grouping_sql = '-7 days', "strftime('%m-%d %H:00', timestamp)"
    elif range == '보름': time_modifier, grouping_sql = '-15 days', "strftime('%m-%d %H:00', timestamp)"
    elif range == '1달': time_modifier, grouping_sql = '-1 month', "strftime('%m-%d %H:00', timestamp)"
    elif range == '전체': time_modifier, grouping_sql = '-10 years', "strftime('%Y-%m-%d', timestamp)"

    c.execute(f"SELECT {grouping_sql} as time_group, zone, AVG(temp) as avg_temp, AVG(hum) as avg_hum FROM sensor_data WHERE timestamp >= datetime('now', 'localtime', '{time_modifier}') GROUP BY time_group, zone ORDER BY time_group ASC")
    rows = c.fetchall()
    conn.close()

    formatted_data = {}
    for row in rows:
        time_group, zone, temp, hum = row
        if time_group not in formatted_data: formatted_data[time_group] = {"time": time_group}
        formatted_data[time_group][f"{zone}_temp"] = round(temp, 1)
        formatted_data[time_group][f"{zone}_hum"] = round(hum, 1)
    return list(formatted_data.values())

@app.get("/api/export")
def export_excel():
    conn = sqlite3.connect("smartfarm.db")
    c = conn.cursor()
    c.execute("SELECT timestamp, zone, temp, hum, relay FROM sensor_data ORDER BY timestamp DESC")
    rows = c.fetchall()
    conn.close()

    stream = io.StringIO()
    stream.write('\ufeff') 
    writer = csv.writer(stream)
    writer.writerow(list(("측정시간", "구역", "온도(°C)", "습도(%)", "펌프상태")))
    writer.writerows(rows)
    response = StreamingResponse(iter(list((stream.getvalue(),))), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=smartfarm_data.csv"
    return response

# ==========================================
# ⭐ 3. 데이터 분석용 API
# ==========================================
@app.get("/api/env-summary")
def get_env_summary():
    conn = sqlite3.connect("smartfarm.db")
    c = conn.cursor()
    c.execute("SELECT MAX(temp), MIN(temp), AVG(temp) FROM sensor_data WHERE date(timestamp) = date('now', '-1 day', 'localtime')")
    row = c.fetchone()
    
    if row:
        max_v, min_v, avg_v = row
        if max_v is None:
            c.execute("SELECT MAX(temp), MIN(temp), AVG(temp) FROM sensor_data WHERE date(timestamp) = date('now', 'localtime')")
            row = c.fetchone()
            if row:
                max_v, min_v, avg_v = row
                
    conn.close()
    
    if row and max_v is not None:
        return {"max": round(max_v, 1), "min": round(min_v, 1), "avg": round(avg_v, 1), "dif": round(max_v - min_v, 1)}
    return {"max": 0, "min": 0, "avg": 0, "dif": 0}

@app.get("/api/current-period-stats")
def get_current_period_stats():
    conn = sqlite3.connect("smartfarm.db")
    c = conn.cursor()
    c.execute("""
        SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hour, temp
        FROM sensor_data 
        WHERE timestamp >= datetime('now', '-24 hours', 'localtime')
    """)
    rows = c.fetchall()
    conn.close()

    morning, afternoon, night = list(()), list(()), list(())
    for hour, temp in rows:
        if 6 <= hour < 12: morning.append(temp)
        elif 12 <= hour < 18: afternoon.append(temp)
        else: night.append(temp)
        
    return {
        "morning": round(sum(morning)/len(morning), 1) if morning else 0,
        "afternoon": round(sum(afternoon)/len(afternoon), 1) if afternoon else 0,
        "night": round(sum(night)/len(night), 1) if night else 0,
    }

@app.get("/api/accumulated-temp")
def get_accumulated_temp(start_date: str):
    conn = sqlite3.connect("smartfarm.db")
    c = conn.cursor()
    c.execute("SELECT SUM(avg_temp) FROM (SELECT AVG(temp) as avg_temp FROM sensor_data WHERE date(timestamp) >= ? GROUP BY date(timestamp))", (start_date,))
    row = c.fetchone()
    conn.close()
    
    if row:
        acc_v, = row
        if acc_v is not None:
            return {"accumulated": round(acc_v, 1)}
    return {"accumulated": 0}

@app.post("/api/irrigation")
def add_irrigation(log: IrrigationLog):
    conn = sqlite3.connect("smartfarm.db")
    c = conn.cursor()
    c.execute("INSERT INTO irrigation_log VALUES (datetime('now', 'localtime'), ?, ?)", (log.zone, log.duration))
    conn.commit()
    conn.close()
    return {"status": "ok"}

@app.get("/api/irrigation-stats")
def get_irrigation_stats():
    conn = sqlite3.connect("smartfarm.db")
    c = conn.cursor()
    c.execute("SELECT date(timestamp) as dt, SUM(duration) FROM irrigation_log WHERE timestamp >= date('now', '-6 days', 'localtime') GROUP BY dt")
    rows = dict(c.fetchall())
    conn.close()
    
    result = list(())
    kor_days = list(("월", "화", "수", "목", "금", "토", "일"))
    today = datetime.datetime.now()
    for i in range(6, -1, -1):
        d = today - datetime.timedelta(days=i)
        val = rows.get(d.strftime("%Y-%m-%d"), 0) // 60 
        result.append({"name": kor_days[d.weekday()], "관수량": val})
    return result

@app.get("/api/pesticide")
def get_pesticide():
    conn = sqlite3.connect("smartfarm.db")
    c = conn.cursor()
    c.execute("SELECT date, target, pesticide, ratio, purpose, author FROM pesticide_log ORDER BY date DESC LIMIT 20")
    rows = c.fetchall()
    conn.close()
    
    res = list(())
    for r in rows:
        dt, tgt, pst, rto, pur, ath = r
        res.append({"date": dt, "target": tgt, "pesticide": pst, "ratio": rto, "purpose": pur, "author": ath})
    return res

@app.post("/api/pesticide")
def add_pesticide(log: PesticideLog):
    conn = sqlite3.connect("smartfarm.db")
    c = conn.cursor()
    c.execute("INSERT INTO pesticide_log (date, target, pesticide, ratio, purpose, author) VALUES (?, ?, ?, ?, ?, ?)", (log.date, log.target, log.pesticide, log.ratio, log.purpose, log.author))
    conn.commit()
    conn.close()
    return {"status": "ok"}

@app.get("/api/dif-stats")
def get_dif_stats():
    conn = sqlite3.connect("smartfarm.db")
    c = conn.cursor()
    
    today = datetime.datetime.now()
    date_list = list(())
    for i in range(6, -1, -1):
        d = today - datetime.timedelta(days=i)
        date_list.append(d.strftime('%Y-%m-%d'))
    
    c.execute("""
        SELECT substr(timestamp, 1, 10) as dt, CAST(strftime('%H', timestamp) AS INTEGER) as hour, temp 
        FROM sensor_data 
        WHERE timestamp >= date('now', '-7 days', 'localtime')
    """)
    rows = c.fetchall()
    conn.close()
    
    stats = {}
    for d in date_list:
        stats[d] = {'day': list(()), 'night': list(())}
        
    for r in rows:
        dt, hour, temp = r
        if dt not in stats: continue
        
        try:
            y, m_str, d_str = dt.split('-')
            month = int(m_str)
        except: 
            month = today.month
        
        if month == 6 or month == 7 or month == 8:
            day_start, day_end = 5, 19
        elif month == 12 or month == 1 or month == 2:
            day_start, day_end = 7, 17
        else:
            day_start, day_end = 6, 18
        
        if day_start <= hour < day_end: stats[dt]['day'].append(temp)
        else: stats[dt]['night'].append(temp)
        
    result = list(())
    for dt in date_list:
        day_t, night_t = stats[dt]['day'], stats[dt]['night']
        avg_day = sum(day_t)/len(day_t) if day_t else None
        avg_night = sum(night_t)/len(night_t) if night_t else None
        
        dif_val = round(avg_day - avg_night, 1) if (avg_day is not None and avg_night is not None) else None
        
        y, m_str, d_str = dt.split('-')
        formatted_date = f"{m_str}/{d_str}"
        
        result.append({
            "date": formatted_date, 
            "주간온도": round(avg_day, 1) if avg_day is not None else None, 
            "야간온도": round(avg_night, 1) if avg_night is not None else None, 
            "DIF": dif_val
        })
    return result

# ==========================================
# 💡 오이 생육 데이터 API (엑셀 저장 기능 포함)
# ==========================================
@app.get("/api/growth")
def get_growth():
    conn = sqlite3.connect("smartfarm.db")
    c = conn.cursor()
    c.execute("SELECT id, date, farm, surveyor, plant_id, habit, data_json FROM growth_log ORDER BY date DESC LIMIT 50")
    rows = c.fetchall()
    conn.close()
    
    res = list(())
    for r in rows:
        g_id, dt, fm, sv, pid, hb, dj = r
        res.append({
            "id": g_id, "date": dt, "farm": fm, "surveyor": sv, 
            "plant_id": pid, "habit": hb, "data": json.loads(dj)
        })
    return res

@app.post("/api/growth")
def add_growth(log: GrowthLog):
    conn = sqlite3.connect("smartfarm.db")
    c = conn.cursor()
    c.execute("INSERT INTO growth_log (date, farm, surveyor, plant_id, habit, data_json) VALUES (?, ?, ?, ?, ?, ?)",
              (log.date, log.farm, log.surveyor, log.plant_id, log.habit, log.data_json))
    conn.commit()
    conn.close()
    return {"status": "ok"}

@app.put("/api/growth/{log_id}")
def update_growth(log_id: int, log: GrowthLog):
    conn = sqlite3.connect("smartfarm.db")
    c = conn.cursor()
    c.execute("""
        UPDATE growth_log 
        SET date=?, farm=?, surveyor=?, plant_id=?, habit=?, data_json=? 
        WHERE id=?
    """, (log.date, log.farm, log.surveyor, log.plant_id, log.habit, log.data_json, log_id))
    conn.commit()
    conn.close()
    return {"status": "ok"}

@app.delete("/api/growth/{log_id}")
def delete_growth(log_id: int):
    conn = sqlite3.connect("smartfarm.db")
    c = conn.cursor()
    c.execute("DELETE FROM growth_log WHERE id=?", (log_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}

# 💡 생육 데이터 엑셀 다운로드 API
@app.get("/api/export-growth")
def export_growth_excel():
    conn = sqlite3.connect("smartfarm.db")
    c = conn.cursor()
    c.execute("SELECT date, farm, surveyor, plant_id, habit, data_json FROM growth_log ORDER BY date DESC, plant_id ASC")
    rows = c.fetchall()
    conn.close()

    stream = io.StringIO()
    stream.write('\ufeff') 
    writer = csv.writer(stream)
    
    headers = list(("조사일자", "농가명", "조사자", "개체번호", "착과습성", "덩굴구분(1:어미/2:아들)", "본주마디", "아들주마디", "절간장(cm)", "줄기굵기(mm)", "엽장(cm)", "엽폭(cm)", "엽상태(1:정상/2:직/3:노)", "암꽃(1:유/0:무)", "수확(1:수/2:적)", "열매상태(0:비/1:미/2:성)", "곡선(cm)", "직선(cm)", "과폭(mm)", "비고"))
    writer.writerow(headers)
    
    for r in rows:
        dt, fm, sv, pid, hb, dj = r
        parsed_data = json.loads(dj)
        for item in parsed_data:
            row_data = list((
                dt, fm, sv, pid, hb,
                item.get("vineType", ""), item.get("mainNode", ""), item.get("branchNode", ""),
                item.get("internode", ""), item.get("stemThick", ""), item.get("leafLen", ""),
                item.get("leafWidth", ""), item.get("leafState", ""), item.get("femaleFl", ""),
                item.get("harvest", ""), item.get("fruitState", ""), item.get("curve", ""),
                item.get("straight", ""), item.get("fruitWidth", ""), item.get("note", "")
            ))
            writer.writerow(row_data)
            
    response = StreamingResponse(iter(list((stream.getvalue(),))), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=cucumber_growth_data.csv"
    return response

# 💡 스팜이 최신 리포트 불러오기 API
@app.get("/api/latest-report")
def get_latest_report():
    memory_dir = r"c:\Users\copi7_000\스마트팜을관리하는인공지능에이전트스팜\memory"
    if not os.path.exists(memory_dir):
        # 방금 만든 현재 워크스페이스의 memory도 체크
        memory_dir = r"c:\Users\copi7_000\smartfarm-web\memory"
        if not os.path.exists(memory_dir):
            return {"content": "스팜이의 리포트 디렉토리를 찾을 수 없습니다.", "filename": ""}
    
    files = [f for f in os.listdir(memory_dir) if f.endswith('.md') and f != 'README.md']
    if not files:
        return {"content": "아직 작성된 리포트가 없습니다.", "filename": ""}
    
    files.sort(key=lambda x: os.path.getmtime(os.path.join(memory_dir, x)))
    latest_file = files[-1]
    
    with open(os.path.join(memory_dir, latest_file), 'r', encoding='utf-8') as f:
        content = f.read()
        
    return {"content": content, "filename": latest_file}


if __name__ == "__main__":
    import uvicorn
    print("🚀 스마트팜 백엔드 서버 가동 중...")
    uvicorn.run(app, host="0.0.0.0", port=8080)