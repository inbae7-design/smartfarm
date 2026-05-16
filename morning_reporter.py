import sqlite3
import datetime
import os
import logging

DB_PATH = r"C:\Users\copi7_000\smartfarm.db"
MEMORY_DIR = r"c:\Users\copi7_000\smartfarm-web\memory"

logging.basicConfig(
    filename=os.path.join(r"c:\Users\copi7_000\smartfarm-web", "morning_reporter.log"),
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    encoding='utf-8'
)

def get_morning_data():
    now = datetime.datetime.now()
    today_date = now.strftime('%Y-%m-%d')
    yesterday = now - datetime.timedelta(days=1)
    yesterday_date = yesterday.strftime('%Y-%m-%d')
    
    # 전날 오후 6시(18:00)부터 오늘 오전 9시(09:00)까지: 주로 밤사이 상태
    start_time = f"{yesterday_date} 18:00:00"
    end_time = f"{today_date} 09:00:00"
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # 1. 야간~아침 환경 데이터 (구역별 평균/최저/최고 온도 및 습도)
    c.execute("""
        SELECT zone, AVG(temp), MIN(temp), MAX(temp), AVG(hum)
        FROM sensor_data 
        WHERE timestamp >= ? AND timestamp <= ?
        GROUP BY zone
    """, (start_time, end_time))
    sensors = c.fetchall()
    
    # 2. 야간~아침 관수 기록
    c.execute("""
        SELECT timestamp, zone, duration 
        FROM irrigation_log 
        WHERE timestamp >= ? AND timestamp <= ?
    """, (start_time, end_time))
    irrigation = c.fetchall()
    
    # 3. 생육/방제는 보통 낮에 하므로 아침 리포트에서는 생략하거나 필요시 추가
    
    conn.close()
    
    return today_date, start_time, end_time, sensors, irrigation

def generate_morning_report():
    today, start_time, end_time, sensors, irrigation = get_morning_data()
    
    report_lines = []
    report_lines.append(f"# 🌅 스팜이의 출근길 리포트 ({today} 아침)")
    report_lines.append(f"**기준 시간**: {start_time} ~ {end_time}")
    report_lines.append(f"**작성 일시**: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report_lines.append("")
    report_lines.append("> 밤사이 하우스에 어떤 일이 있었는지 스팜이가 요약해 드립니다! 🚜")
    report_lines.append("")
    
    report_lines.append("## 🌡️ 밤사이 환경 제어 데이터 (야간~아침)")
    if sensors and sensors[0][0] is not None:
        report_lines.append("| 구역 | 평균 온도(°C) | 최저 온도(°C) | 최고 온도(°C) | 평균 습도(%) |")
        report_lines.append("|---|---|---|---|---|")
        for zone, avg_t, min_t, max_t, avg_h in sensors:
            if zone:
                report_lines.append(f"| {zone} | {avg_t:.1f} | {min_t:.1f} | {max_t:.1f} | {avg_h:.1f} |")
    else:
        report_lines.append("> 해당 시간대에 수집된 환경 데이터가 없습니다.")
    report_lines.append("")
    
    report_lines.append("## 💧 야간~아침 관수 기록")
    if irrigation:
        report_lines.append("| 시간 | 구역 | 관수 시간(초) |")
        report_lines.append("|---|---|---|")
        for t, zone, dur in irrigation:
            report_lines.append(f"| {t} | {zone} | {dur} |")
    else:
        report_lines.append("> 밤사이 실행된 관수 기록이 없습니다.")
    report_lines.append("")
    
    report_lines.append("---")
    report_lines.append("*오늘 하루도 스마트팜 관리를 화이팅하세요! 🌿*")
    
    os.makedirs(MEMORY_DIR, exist_ok=True)
    report_path = os.path.join(MEMORY_DIR, f"{today}_morning.md")
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report_lines))
        
    logging.info(f"Morning report generated successfully: {report_path}")
    print(f"Morning report generated successfully: {report_path}")

if __name__ == "__main__":
    generate_morning_report()
