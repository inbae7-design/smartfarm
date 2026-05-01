import webbrowser

def open_dashboard():
    url = "http://localhost:5173"
    print(f"Opening Smart Farm Dashboard at {url}")
    webbrowser.open(url)

if __name__ == "__main__":
    open_dashboard()
