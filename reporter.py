import sqlite3
import datetime
import os

DB_PATH = r"C:\Users\copi7_000\smartfarm-web\smartfarm.db"
MEMORY_DIR = r"c:\Users\copi7_000\스마트팜을관리하는인공지능에이전트스팜\memory"

def get_today_data():
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # 1. 환경 데이터 (오늘 기준, 구역별 평균/최저/최고)
    c.execute("""
        SELECT zone, AVG(temp), MIN(temp), MAX(temp), AVG(hum)
        FROM sensor_data 
        WHERE date(timestamp) = ?
        GROUP BY zone
    """, (today,))
    sensors = c.fetchall()
    
    # 2. 관수 기록
    c.execute("""
        SELECT time(timestamp), zone, duration 
        FROM irrigation_log 
        WHERE date(timestamp) = ?
    """, (today,))
    irrigation = c.fetchall()
    
    # 3. 방제 기록
    c.execute("""
        SELECT target, pesticide, ratio, purpose, author
        FROM pesticide_log
        WHERE date = ?
    """, (today,))
    pesticide = c.fetchall()
    
    # 4. 생육 데이터
    c.execute("""
        SELECT farm, surveyor, plant_id, habit
        FROM growth_log
        WHERE date = ?
    """, (today,))
    growth = c.fetchall()
    
    conn.close()
    
    return today, sensors, irrigation, pesticide, growth

def generate_report():
    today, sensors, irrigation, pesticide, growth = get_today_data()
    
    report_lines = []
    report_lines.append(f"# 🌿 스팜이의 일일 리포트 ({today})")
    report_lines.append(f"작성 일시: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report_lines.append("")
    
    report_lines.append("## 🌡️ 환경 제어 데이터 (오늘)")
    if sensors:
        report_lines.append("| 구역 | 평균 온도(°C) | 최저 온도(°C) | 최고 온도(°C) | 평균 습도(%) |")
        report_lines.append("|---|---|---|---|---|")
        for zone, avg_t, min_t, max_t, avg_h in sensors:
            report_lines.append(f"| {zone} | {avg_t:.1f} | {min_t:.1f} | {max_t:.1f} | {avg_h:.1f} |")
    else:
        report_lines.append("> 오늘 수집된 환경 데이터가 없습니다.")
    report_lines.append("")
    
    report_lines.append("## 💧 관수 기록")
    if irrigation:
        report_lines.append("| 시간 | 구역 | 관수 시간(초) |")
        report_lines.append("|---|---|---|")
        for t, zone, dur in irrigation:
            report_lines.append(f"| {t} | {zone} | {dur} |")
    else:
        report_lines.append("> 오늘 실행된 관수 기록이 없습니다.")
    report_lines.append("")
    
    report_lines.append("## 🛡️ 방제 기록")
    if pesticide:
        report_lines.append("| 대상 | 약제 | 비율 | 목적 | 작업자 |")
        report_lines.append("|---|---|---|---|---|")
        for target, pst, ratio, purpose, author in pesticide:
            report_lines.append(f"| {target} | {pst} | {ratio} | {purpose} | {author} |")
    else:
        report_lines.append("> 오늘 등록된 방제 기록이 없습니다.")
    report_lines.append("")
    
    report_lines.append("## 🌱 생육 조사 기록")
    if growth:
        report_lines.append("| 농가 | 조사자 | 개체번호 | 착과습성 |")
        report_lines.append("|---|---|---|---|")
        for farm, surveyor, plant_id, habit in growth:
            report_lines.append(f"| {farm} | {surveyor} | {plant_id} | {habit} |")
    else:
        report_lines.append("> 오늘 등록된 생육 조사 기록이 없습니다.")
    report_lines.append("")
    
    report_lines.append("---")
    report_lines.append("*스팜이가 스마트팜의 데이터를 모아 자동으로 작성한 리포트입니다. 🚜*")
    
    os.makedirs(MEMORY_DIR, exist_ok=True)
    report_path = os.path.join(MEMORY_DIR, f"{today}.md")
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report_lines))
        
    print(f"Report generated successfully: {report_path}")

if __name__ == "__main__":
    generate_report()
