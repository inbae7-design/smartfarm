# 🎨 Designer — 정의된 KPI와 목표에 맞춰 스마트팜 대시보드의 전체 레이아웃, 색상 팔레트, 그리고 시각적 디자인 컨셉(UI/UX)을 구체적으로 설계

🎨 Designer: 작업 시작합니다.

## 💡 스마트팜 대시보드 UI/UX 디자인 설계

요청하신 KPI와 목표에 기반하여, '오이농장'의 브랜드 정체성(농업, 신뢰, 데이터 기반)을 반영한 스마트팜 대시보드의 전체 레이아웃, 색상 팔레트, 시각적 디자인 컨셉(UI/UX)을 구체적으로 설계합니다.

### 1. 브랜드 디자인 시스템 (Visual System)

**1.1. 브랜드 컬러 팔레트 (Color Palette)**
농업의 자연스러움과 스마트 기술의 신뢰성을 동시에 표현하는 차분하면서도 생동감 있는 팔레트를 제안합니다.

| 역할 | 색상 이름 | HEX 코드 | RGB | 용도 |
| :--- | :--- | :--- | :--- | :--- |
| **Primary (Primary Green)** | 오이 그린 | `#38A169` | (56, 161, 105) | 핵심 데이터, 활성 상태, 긍정적 지표 |
| **Secondary (Earth Tone)** | 흙 베이지 | `#F7EEDD` | (247, 237, 221) | 배경, 카드 영역, 전체적인 안정감 제공 |
| **Accent (Tech Blue)** | 스마트 블루 | `#4299E1` | (66, 153, 225) | 제어 버튼, 알림, 중요 액션 항목 |
| **Neutral (Dark Text)** | 딥 그레이 | `#2D3748` | (45, 55, 72) | 본문 텍스트, 헤더, 중요한 레이블 |
| **Warning (Alert)** | 경고 오렌지 | `#D69E2E` | (214, 158, 46) | 온도/습도 이상, 경고 알림 |

**1.2. 타이포그래피 시스템 (Typography)**
가독성과 전문성을 최우선으로 하며, 데이터의 중요도를 시각적으로 구분합니다.

*   **Font Family:** Noto Sans KR (시스템 기본 폰트 사용 및 가독성 확보)
*   **Heading (H1, H2):** Noto Sans KR Bold (데이터 제목, 섹션 구분)
*   **Body (Data, Labels):** Noto Sans KR Regular (실제 수치 및 설명)
*   **Data Emphasis (KPI):** Noto Sans KR SemiBold (핵심 KPI 강조)

**1.3. 레이아웃 및 UI/UX 컨셉 (Layout & UX Concept)**

*   **전체 컨셉:** **"Organic Data Flow"** (유기적인 데이터 흐름)
    *   자연의 흐름처럼 부드럽고 직관적인 흐름을 강조하며, 데이터가 농업 환경의 상태를 자연스럽게 반영하도록 설계합니다.
*   **레이아웃 구조:** **3-Panel Grid System**
    1.  **좌측 사이드바 (Navigation):** 주요 모듈(환경 모니터링, 제어, 리포트, 설정)을 계층적으로 배치하여 깊이 있는 접근을 제공합니다. (넓이: 200px)
    2.  **상단 헤더 (Header):** 현재 시간, 시스템 상태(온도/습도 요약), 알림 배지를 배치하여 즉각적인 상태 인지를 돕습니다.
    3.  **메인 콘텐츠 영역 (Main Dashboard):** 가장 중요한 KPI를 카드 형태로 배치하고, 환경 모니터링 그래프를 중심으로 배치합니다. (넓이: 780px)

*   **핵심 컴포넌트 디자인:**
    *   **KPI 카드:** 배경색은 `F7EEDD` (흙 베이지)를 사용하고, 핵심 수치(예: 현재 온도, 수확량 예측)는 `Primary Green` (`#38A169`)으로 강조하여 긍정적인 상태를 시각화합니다.
    *   **환경 그래프:** 온도와 습도 변화는 부드러운 곡선(Line Chart)으로 표현하고, 이상 징후 발생 시 `Warning Orange` 색상을 경고 라인으로 표시합니다.
    *   **제어 패널:** 온도/습도 조절 버튼은 `Accent Blue` (`#4299E1`)로 강조하여 사용자가 쉽게 상호작용할 수 있도록 합니다.

---

### 2. HTML 웹 화면 시뮬레이션 (Mockup)

위의 디자인 시스템을 적용하여 스마트팜 대시보드의 핵심 레이아웃을 HTML 형식으로 시뮬레이션합니다.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>오이농장 스마트팜 대시보드</title>
    <style>
        /* 1. Color Palette & Font Setup */
        :root {
            --color-primary-green: #38A169;
            --color-earth-beige: #F7EEDD;
            --color-accent-blue: #4299E1;
            --color-dark-gray: #2D3748;
            --color-warning-orange: #D69E2E;
        }
        body {
            font-family: 'Noto Sans KR', sans-serif;
            background-color: var(--color-earth-beige);
            color: var(--color-dark-gray);
            margin: 0;
            padding: 0;
            display: flex;
            min-height: 100vh;
        }
        /* 2. Layout Structure (3-Panel Grid) */
        .sidebar {
            width: 200px;
            background-color: var(--color-dark-gray);
            color: white;
            padding: 20px 0;
            box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
            flex-shrink: 0;
        }
        .main-content {
            flex-grow: 1;
            padding: 30px;
            overflow-y: auto;
        }
        /* 3. Header Styling */
        .header {
            
