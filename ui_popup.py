import sqlite3
import datetime
import os
import webbrowser

DB_PATH = r"C:\Users\copi7_000\smartfarm-web\smartfarm.db"
MEMORY_DIR = r"c:\Users\copi7_000\스마트팜을관리하는인공지능에이전트스팜\memory"

def get_data():
    now = datetime.datetime.now()
    today_date = now.strftime('%Y-%m-%d')
    yesterday = now - datetime.timedelta(days=1)
    yesterday_date = yesterday.strftime('%Y-%m-%d')
    
    start_time = f"{yesterday_date} 18:00:00"
    end_time = f"{today_date} 09:00:00"
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute("""
        SELECT zone, AVG(temp), MIN(temp), MAX(temp), AVG(hum)
        FROM sensor_data 
        WHERE timestamp >= ? AND timestamp <= ?
        GROUP BY zone
    """, (start_time, end_time))
    sensors = c.fetchall()
    conn.close()
    
    return start_time, end_time, sensors

def generate_html(start_time, end_time, sensors):
    # CSS & HTML Template with rich aesthetics
    cards_html = ""
    if sensors and sensors[0][0] is not None:
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
        cards_html = "<div class='no-data'>해당 시간대에 수집된 데이터가 없습니다.</div>"

    html_content = f"""
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>스팜 AI - 상태창</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&display=swap" rel="stylesheet">
        <style>
            :root {{
                --bg-color: #0f172a;
                --text-main: #f8fafc;
                --text-muted: #94a3b8;
                --accent-green: #10b981;
                --accent-blue: #3b82f6;
                --glass-bg: rgba(255, 255, 255, 0.05);
                --glass-border: rgba(255, 255, 255, 0.1);
            }}
            
            * {{ margin: 0; padding: 0; box-sizing: border-box; font-family: 'Outfit', sans-serif; }}
            
            body {{
                background: linear-gradient(135deg, #0f172a, #1e293b, #0f172a);
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
                background: linear-gradient(to right, #34d399, #3b82f6);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }}
            
            .header p {{
                color: var(--text-muted);
                font-size: 1.1rem;
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
                background: linear-gradient(to right, var(--accent-green), var(--accent-blue));
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
                <h1>🌿 스팜 AI 출근길 리포트</h1>
                <p>기준 시간: {start_time} ~ {end_time}</p>
            </div>
            
            <div class="grid">
                {cards_html}
            </div>
            
            <div class="footer">
                스팜이가 꼼꼼하게 수집한 야간~아침 스마트팜 환경 데이터입니다.
            </div>
        </div>
        
        <script>
            // Subtle entrance animation delay for cards
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
    html_path = os.path.join(MEMORY_DIR, "latest_report.html")
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
        
    return html_path

def main():
    start_time, end_time, sensors = get_data()
    html_path = generate_html(start_time, end_time, sensors)
    
    # Open the HTML file in the default browser
    file_url = 'file://' + os.path.abspath(html_path).replace('\\', '/')
    print(f"Opening popup UI: {file_url}")
    webbrowser.open(file_url)

if __name__ == "__main__":
    main()
