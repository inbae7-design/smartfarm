import sqlite3
import datetime
import os
import webbrowser

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

def generate_evening_html(today, sensors, irrigation, pesticide, growth):
    cards_html = ""
    if sensors:
        for zone, avg_t, min_t, max_t, avg_h in sensors:
            if not zone: continue
            cards_html += f"""
            <div class="card">
                <h2>{zone}</h2>
                <div class="metrics">
                    <div class="metric">
                        <span class="label">평균 온도</span>
                        <span class="value temp">{avg_t:.1f}°C</span>
                    </div>
                    <div class="metric">
                        <span class="label">평균 습도</span>
                        <span class="value hum">{avg_h:.1f}%</span>
                    </div>
                    <div class="metric-small">
                        최저 <span class="min">{min_t:.1f}°C</span> / 최고 <span class="max">{max_t:.1f}°C</span>
                    </div>
                </div>
            </div>
            """
    else:
        cards_html = "<div class='no-data'>오늘 수집된 환경 데이터가 없습니다.</div>"

    summary_html = f"""
    <div class="summary-section">
        <div class="summary-card">
            <h3>💧 관수</h3>
            <p class="summary-value">{len(irrigation)}<span class="summary-unit">회</span></p>
        </div>
        <div class="summary-card">
            <h3>🛡️ 방제</h3>
            <p class="summary-value">{len(pesticide)}<span class="summary-unit">건</span></p>
        </div>
        <div class="summary-card">
            <h3>🌱 생육조사</h3>
            <p class="summary-value">{len(growth)}<span class="summary-unit">건</span></p>
        </div>
    </div>
    """

    html_content = f"""
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>스팜 AI - 퇴근길 리포트</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&display=swap" rel="stylesheet">
        <style>
            :root {{
                --bg-color: #0f172a;
                --text-main: #f8fafc;
                --text-muted: #94a3b8;
                --accent-green: #10b981;
                --accent-blue: #3b82f6;
                --accent-purple: #8b5cf6;
                --glass-bg: rgba(255, 255, 255, 0.05);
                --glass-border: rgba(255, 255, 255, 0.1);
            }}
            
            * {{ margin: 0; padding: 0; box-sizing: border-box; font-family: 'Outfit', sans-serif; }}
            
            body {{
                background: linear-gradient(135deg, #1e1b4b, #0f172a, #172554);
                background-size: 400% 400%;
                animation: gradientBG 15s ease infinite;
                color: var(--text-main);
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 2rem;
            }}
            
            @keyframes gradientBG {{
                0% {{ background-position: 0% 50%; }}
                50% {{ background-position: 100% 50%; }}
                100% {{ background-position: 0% 50%; }}
            }}
            
            .dashboard-container {{
                background: var(--glass-bg);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid var(--glass-border);
                border-radius: 24px;
                padding: 3rem;
                width: 100%;
                max-width: 1000px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                animation: fadeIn 1s ease-out;
            }}
            
            @keyframes fadeIn {{
                from {{ opacity: 0; transform: translateY(20px); }}
                to {{ opacity: 1; transform: translateY(0); }}
            }}
            
            .header {{
                text-align: center;
                margin-bottom: 3rem;
            }}
            
            .header h1 {{
                font-size: 2.5rem;
                font-weight: 700;
                margin-bottom: 0.5rem;
                background: linear-gradient(to right, #8b5cf6, #3b82f6);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }}
            
            .header p {{
                color: var(--text-muted);
                font-size: 1.1rem;
            }}
            
            .summary-section {{
                display: flex;
                gap: 1.5rem;
                margin-bottom: 2.5rem;
                justify-content: center;
                flex-wrap: wrap;
            }}
            
            .summary-card {{
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 16px;
                padding: 1.5rem 2rem;
                text-align: center;
                flex: 1;
                min-width: 120px;
                max-width: 200px;
            }}
            
            .summary-card h3 {{
                font-size: 1.1rem;
                color: var(--text-muted);
                margin-bottom: 0.5rem;
                font-weight: 500;
            }}
            
            .summary-value {{
                font-size: 2.5rem;
                font-weight: 700;
                color: var(--text-main);
            }}
            
            .summary-unit {{
                font-size: 1rem;
                color: var(--text-muted);
                margin-left: 0.2rem;
            }}
            
            .grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 2rem;
            }}
            
            .card {{
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 16px;
                padding: 2rem;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }}
            
            .card::before {{
                content: '';
                position: absolute;
                top: 0; left: 0; width: 100%; height: 4px;
                background: linear-gradient(to right, var(--accent-purple), var(--accent-blue));
                opacity: 0;
                transition: opacity 0.3s ease;
            }}
            
            .card:hover {{
                transform: translateY(-5px);
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
                background: rgba(255, 255, 255, 0.05);
            }}
            
            .card:hover::before {{ opacity: 1; }}
            
            .card h2 {{
                font-size: 1.5rem;
                font-weight: 500;
                margin-bottom: 1.5rem;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                padding-bottom: 0.5rem;
            }}
            
            .metrics {{ display: flex; flex-direction: column; gap: 1rem; }}
            
            .metric {{
                display: flex;
                justify-content: space-between;
                align-items: center;
            }}
            
            .metric .label {{ color: var(--text-muted); }}
            .metric .value {{ font-size: 1.8rem; font-weight: 700; }}
            .metric .value.temp {{ color: #f87171; }}
            .metric .value.hum {{ color: #60a5fa; }}
            
            .metric-small {{
                margin-top: 1rem;
                font-size: 0.9rem;
                color: var(--text-muted);
                text-align: right;
            }}
            .metric-small .min {{ color: #9ca3af; font-weight: bold; }}
            .metric-small .max {{ color: #f87171; font-weight: bold; }}
            
            .footer {{
                text-align: center;
                margin-top: 3rem;
                color: var(--text-muted);
                font-size: 0.9rem;
                opacity: 0.7;
            }}
            
            .no-data {{
                grid-column: 1 / -1;
                text-align: center;
                padding: 3rem;
                background: rgba(255,255,255,0.02);
                border-radius: 16px;
                color: var(--text-muted);
            }}
        </style>
    </head>
    <body>
        <div class="dashboard-container">
            <div class="header">
                <h1>🌙 스팜 AI 퇴근길 리포트</h1>
                <p>오늘 ({today}) 하루 동안의 요약입니다</p>
            </div>
            
            {summary_html}
            
            <div class="grid">
                {cards_html}
            </div>
            
            <div class="footer">
                오늘도 고생 많으셨습니다! 스팜이가 내일 아침까지 하우스를 안전하게 지키겠습니다. 🚜
            </div>
        </div>
        
        <script>
            const cards = document.querySelectorAll('.card');
            cards.forEach((card, index) => {{
                card.style.opacity = '0';
                card.style.animation = `fadeIn 0.5s ease-out ${{index * 0.15 + 0.5}}s forwards`;
            }});
        </script>
    </body>
    </html>
    """
    
    os.makedirs(MEMORY_DIR, exist_ok=True)
    html_path = os.path.join(MEMORY_DIR, "latest_evening_report.html")
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
        
    return html_path

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

    # Generate and open HTML popup
    html_path = generate_evening_html(today, sensors, irrigation, pesticide, growth)
    file_url = 'file://' + os.path.abspath(html_path).replace('\\', '/')
    print(f"Opening popup UI: {file_url}")
    webbrowser.open(file_url)

if __name__ == "__main__":
    generate_report()
