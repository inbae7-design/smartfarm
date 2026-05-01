import os
import datetime
import subprocess
import tkinter as tk
from tkinter import scrolledtext

def get_git_log_today(repo_path):
    try:
        today = datetime.datetime.now().strftime('%Y-%m-%d 00:00:00')
        result = subprocess.run(
            ['git', 'log', '--since', today, '--pretty=format:- %s'],
            cwd=repo_path, capture_output=True, text=True
        )
        return result.stdout if result.stdout else "오늘 커밋된 내용이 없습니다."
    except Exception as e:
        return f"Git 로그를 가져오는 중 오류 발생: {e}"

def save_memory(repo_path, manual_notes, git_notes):
    now = datetime.datetime.now()
    date_str = now.strftime('%Y-%m-%d')
    memory_dir = os.path.join(repo_path, 'memory')
    os.makedirs(memory_dir, exist_ok=True)
    
    file_path = os.path.join(memory_dir, f'{date_str}.md')
    
    content = f"# 프팜 (Peupam) 개발 메모리 - {date_str}\n\n"
    content += "## 🕒 기록 시간\n"
    content += f"{now.strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    
    content += "## 📝 오늘 진행한 작업 (수동 기록)\n"
    content += f"{manual_notes if manual_notes.strip() else '기록 없음'}\n\n"
    
    content += "## 💻 시스템 및 코드 변경 사항 (Git)\n"
    content += f"{git_notes}\n"
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return file_path

def main():
    repo_path = os.path.dirname(os.path.abspath(__file__))
    git_notes = get_git_log_today(repo_path)
    
    # 팝업 UI 생성
    root = tk.Tk()
    root.title("프팜 (Peupam) - 일일 개발 메모리 기록")
    root.geometry("500x400")
    root.attributes('-topmost', True) # 항상 위
    
    tk.Label(root, text="오늘 스마트팜 개발 진행 사항을 기록해주세요:", font=("맑은 고딕", 12)).pack(pady=10)
    
    text_area = scrolledtext.ScrolledText(root, width=50, height=10, font=("맑은 고딕", 10))
    text_area.pack(padx=20, pady=5)
    
    def on_submit():
        manual_notes = text_area.get("1.0", tk.END).strip()
        file_path = save_memory(repo_path, manual_notes, git_notes)
        
        # 완료 메시지로 변경
        for widget in root.winfo_children():
            widget.destroy()
        
        tk.Label(root, text="✅ 저장 완료!", font=("맑은 고딕", 16, "bold"), fg="green").pack(pady=40)
        tk.Label(root, text=f"저장 위치:\n{file_path}", font=("맑은 고딕", 10)).pack(pady=10)
        
        root.after(3000, root.destroy) # 3초 후 자동 종료

    tk.Button(root, text="기록 저장하기", command=on_submit, font=("맑은 고딕", 12, "bold"), bg="#4CAF50", fg="white", width=20).pack(pady=20)
    
    root.mainloop()

if __name__ == "__main__":
    main()
