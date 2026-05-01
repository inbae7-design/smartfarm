import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ComposedChart, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const MY_SERVER_URL = "http://jjufarm.tplinkdns.com:8080";
const ZONES = Array.of("1동", "2동", "3동", "4동", "작업장");
const ZONE_COLORS = { "1동": "#0ea5e9", "2동": "#10b981", "3동": "#f59e0b", "4동": "#8b5cf6", "작업장": "#f43f5e" };

const initMotor = () => ({ state: 'stop', percent: 0, target: null, duration: 60 });
const defaultMotors = {
  side1L: initMotor(), side1R: initMotor(), side2L: initMotor(), side2R: initMotor(),
  side3L: initMotor(), side3R: initMotor(), side4L: initMotor(), side4R: initMotor(),
  roof: initMotor(), shade: initMotor()
};
const defaultRelays = { fan: false, exhaust: false, heater: false };

const getTodayDate = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T').at(0);
};

const LoginView = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const handleLogin = (e) => {
    e.preventDefault();
    if (password === '7777') onLogin(true);
    else { setError(true); setPassword(''); }
  };
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-4 z-10 animate-fadeIn bg-slate-50 w-full">
      <div className="text-center mb-2">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500 mb-2" style={{filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.3))'}}>FUTURICS</h1>
        <p className="text-emerald-600 text-xs sm:text-sm font-bold" style={{letterSpacing: '0.3em'}}>SMART FARM OS</p>
      </div>
      <form onSubmit={handleLogin} className="bg-white p-6 sm:p-8 rounded-3xl border border-emerald-100 flex flex-col gap-6 w-full max-w-sm shadow-2xl">
        <div className="text-center"><span className="text-5xl">🥒</span><h2 className="text-slate-800 font-bold mt-4 text-lg sm:text-xl">스마트팜 시스템 로그인</h2></div>
        <div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호 입력" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 sm:py-5 text-emerald-600 font-bold text-center text-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all" style={{letterSpacing: '0.2em'}} />
          {error && <p className="text-rose-500 text-xs text-center mt-3 font-bold animate-pulse">비밀번호가 일치하지 않습니다.</p>}
        </div>
        <button type="submit" className="w-full py-4 sm:py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-lg rounded-2xl shadow-md active:scale-95 transition-all">농장 접속하기</button>
      </form>
    </div>
  );
};

const PageHeader = ({ title, onChangeView, currentView, onLogout }) => {
  const navItems = Array.of(
    { id: 'monitor', name: '모니터링', icon: '📊' }, 
    { id: 'remote', name: '환경제어', icon: '⚙️' }, 
    { id: 'irrigation', name: '관수제어', icon: '💧' },
    { id: 'data', name: '데이터분석', icon: '📈' }, 
    { id: 'cctv', name: 'CCTV', icon: '📹' }
  );
  return (
    <header className="sticky top-0 z-50 flex flex-col items-center border-b border-emerald-200 pb-3 pt-3 mb-3 shrink-0 gap-3 bg-white/95 backdrop-blur-md shadow-sm -mx-2 px-2 sm:-mx-4 sm:px-4">
      <div className="flex items-center w-full justify-between">
        <button onClick={() => onChangeView('home')} className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-black rounded-xl text-xs shadow-sm transition-colors flex items-center gap-1">🏠 HOME</button>
        <h1 className="text-sm sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 whitespace-nowrap">{title}</h1>
        {onLogout ? <button onClick={onLogout} className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-500 border border-rose-200 hover:bg-rose-100 shadow-sm transition-colors">로그아웃</button> : <div></div>}
      </div>
      <div className="flex w-full overflow-x-auto no-scrollbar py-1 gap-2">
        {navItems.map((item) => (
          <button key={item.id} onClick={() => onChangeView(item.id)} className={`flex-1 whitespace-nowrap px-3 py-2.5 sm:py-2 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-1 text-[11px] sm:text-sm ${currentView === item.id ? 'bg-emerald-500 text-white shadow-emerald-500/40' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'}`}>
            <span>{item.icon}</span> <span>{item.name}</span>
          </button>
        ))}
      </div>
    </header>
  );
};

// 💡 모던 하이엔드 모터 제어 카드 컴포넌트
const ModernMotorCard = ({ id, label, motor, isDisabled, onMotorAction, onTargetSet, onDurationChange, sizeStr }) => {
  const [targetInput, setTargetInput] = useState("");
  const [durationInput, setDurationInput] = useState(motor.duration.toString());
  const pct = Math.round(motor.percent);

  useEffect(() => { setDurationInput(motor.duration.toString()); }, Array.of(motor.duration));

  const handleTargetGo = () => {
    if (isDisabled) return alert("자동 모드 가동 중입니다.");
    const val = parseInt(targetInput);
    if (isNaN(val) || val < 0 || val > 100) return alert("0에서 100 사이의 숫자를 입력해주세요.");
    onTargetSet(id, val);
    setTargetInput("");
  };

  const handleDurationTyping = (e) => {
    setDurationInput(e.target.value);
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) onDurationChange(id, val);
  };

  const isMini = sizeStr === 'mini';

  return (
    <div className={`relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm rounded-2xl flex flex-col w-full transition-all duration-300 hover:shadow-md hover:bg-white/90 ${isMini ? 'p-2.5 gap-2' : 'p-4 gap-3'}`}>
      
      {/* 백그라운드 글로우 이펙트 */}
      <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-500 ${motor.state === 'open' ? 'bg-emerald-500' : motor.state === 'close' ? 'bg-rose-500' : 'bg-slate-300'}`}></div>

      <div className="flex justify-between items-center z-10">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full shadow-sm ${motor.state === 'open' ? 'bg-emerald-400 animate-pulse' : motor.state === 'close' ? 'bg-rose-400 animate-pulse' : 'bg-slate-300'}`}></span>
          <span className={`font-extrabold tracking-tight ${isDisabled ? 'text-slate-400' : 'text-slate-700'}`} style={{fontSize: isMini ? '11px' : '13px'}}>{label}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className={`font-black tracking-tighter ${motor.state === 'open' ? 'text-emerald-500' : motor.state === 'close' ? 'text-rose-500' : 'text-slate-600'}`} style={{fontSize: isMini ? '14px' : '18px', textShadow: '0 2px 4px rgba(0,0,0,0.05)'}}>
            {pct}<span className="text-[10px] text-slate-400 ml-0.5">%</span>
          </span>
          {motor.target !== null && !isMini && <span className="text-[9px] text-emerald-600 font-bold">목표: {motor.target}%</span>}
        </div>
      </div>
      
      {/* 커스텀 프로그레스 바 */}
      <div className="bg-slate-100/80 rounded-full overflow-hidden border border-slate-200/50 relative shadow-inner z-10" style={{height: isMini ? '6px' : '8px'}}>
        <div className={`h-full transition-all duration-300 ease-out relative ${motor.state === 'close' ? 'bg-gradient-to-r from-rose-400 to-rose-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`} style={{ width: `${motor.percent}%` }}>
          <div className="absolute inset-0 bg-white/20 w-full h-full" style={{backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)'}}></div>
        </div>
      </div>
      
      {/* 세그먼트 컨트롤 버튼 (열림/정지/닫힘) */}
      <div className="flex p-0.5 bg-slate-100/80 rounded-xl border border-slate-200/50 shadow-inner z-10">
        <button onClick={()=>onMotorAction(id, 'open')} disabled={isDisabled} className={`flex-1 rounded-lg font-black transition-all duration-200 flex items-center justify-center gap-1 ${motor.state==='open' ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100':'text-slate-500 hover:text-emerald-600 hover:bg-white/50 border border-transparent'}`} style={{padding: isMini ? '4px 0' : '8px 0', fontSize: isMini ? '10px' : '11px'}}>▲ 열림</button>
        <button onClick={()=>onMotorAction(id, 'stop')} disabled={isDisabled} className={`flex-1 rounded-lg font-black transition-all duration-200 flex items-center justify-center gap-1 ${motor.state==='stop' ? 'bg-white text-slate-700 shadow-sm border border-slate-200':'text-slate-500 hover:text-slate-700 hover:bg-white/50 border border-transparent'}`} style={{padding: isMini ? '4px 0' : '8px 0', fontSize: isMini ? '10px' : '11px'}}>■ 정지</button>
        <button onClick={()=>onMotorAction(id, 'close')} disabled={isDisabled} className={`flex-1 rounded-lg font-black transition-all duration-200 flex items-center justify-center gap-1 ${motor.state==='close' ? 'bg-white text-rose-600 shadow-sm border border-rose-100':'text-slate-500 hover:text-rose-600 hover:bg-white/50 border border-transparent'}`} style={{padding: isMini ? '4px 0' : '8px 0', fontSize: isMini ? '10px' : '11px'}}>▼ 닫힘</button>
      </div>
      
      {/* 타겟 설정 및 듀레이션 입력 (isMini가 아닐 때만) */}
      {!isMini && (
        <div className="flex items-stretch gap-1.5 mt-1 border-t border-slate-200/50 pt-2 z-10">
          <input type="number" value={durationInput} onChange={handleDurationTyping} disabled={isDisabled} className="w-10 bg-slate-50/50 text-teal-600 font-bold text-center border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:bg-white" style={{fontSize: '10px'}} title="소요시간(초)" />
          <input type="number" min="0" max="100" placeholder={pct.toString()} value={targetInput} onChange={e=>setTargetInput(e.target.value)} disabled={isDisabled} className="flex-1 bg-white text-blue-500 font-bold text-center border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:border-blue-300" style={{fontSize: '11px'}} title="목표(%)" />
          <button onClick={handleTargetGo} disabled={isDisabled} className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-bold hover:shadow-md px-3 transition-all" style={{fontSize: '10px'}}>이동</button>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [sensorData, setSensorData] = useState({});
  const sensorDataRef = useRef({});

  const [farmSettings, setFarmSettings] = useState({
    farmName: '김인배',
    surveyor: '김인배'
  });

  const [zoneStates, setZoneStates] = useState(() => {
    const initial = {};
    ZONES.forEach(z => {
      Reflect.set(initial, z, {
        mode: 'manual', 
        motors: { ...defaultMotors }, 
        relays: { ...defaultRelays }, 
        autoConfig: { targetTemp: 25, closeTemp: 18, rainProtect: true, windProtect: true }, 
        autoPercent: 0, autoStartTime: null, lastOpenTime: null, lastCloseTime: null
      });
    });
    return initial;
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${MY_SERVER_URL}/api/sensors`);
        const data = await res.json();
        if (data) { setSensorData(data); sensorDataRef.current = data; }
      } catch (e) {}
    };
    fetchData();
    const itv = setInterval(fetchData, 2000);
    return () => clearInterval(itv);
  }, Array.of());

  useEffect(() => {
    const tickMs = 1000;
    const motorEngine = setInterval(() => {
      setZoneStates(prevZones => {
        let nextZones = { ...prevZones };
        let hasChanges = false;
        const now = Date.now();

        ZONES.forEach(z => {
          const zone = Reflect.get(nextZones, z);
          const sData = Reflect.get(sensorDataRef.current, z);
          const temp = sData ? sData.temp : 0;
          let newMotors = { ...zone.motors };
          let zoneChanged = false;

          if (zone.mode === 'auto' && zone.autoStartTime && (now - zone.autoStartTime >= 3000)) {
            let targetPct = 0;
            if (temp > 30) {
              targetPct = 50;
            } else if (temp >= zone.autoConfig.targetTemp) {
              targetPct = Math.min(100, Math.floor(temp - zone.autoConfig.targetTemp) * 10 + 10);
            } else if (temp <= zone.autoConfig.closeTemp) {
              targetPct = 0;
            } else {
              targetPct = newMotors.side1L.target !== null ? newMotors.side1L.target : newMotors.side1L.percent;
            }
            
            // 이미 목표치에 도달했거나 움직일 필요가 없는 경우 target 업데이트 방지 (플리커링 해결)
            if (newMotors.side1L.target !== targetPct && Math.abs(newMotors.side1L.percent - targetPct) >= 1) {
              newMotors.side1L.target = targetPct; newMotors.side1R.target = targetPct; zoneChanged = true;
            }
          }

          Object.keys(newMotors).forEach(mId => {
            let m = { ...Reflect.get(newMotors, mId) };
            let mChanged = false;
            if (m.target !== null) {
              if (Math.abs(m.percent - m.target) < 1) { m.percent = m.target; m.state = 'stop'; m.target = null; mChanged = true; } 
              else if (m.percent < m.target && m.state !== 'open') { m.state = 'open'; mChanged = true; } 
              else if (m.percent > m.target && m.state !== 'close') { m.state = 'close'; mChanged = true; }
            }
            if (m.state === 'open' && m.percent < 100) { m.percent += (100 / m.duration) * (tickMs / 1000); if (m.percent >= 100) { m.percent = 100; m.state = 'stop'; m.target = null; } mChanged = true; } 
            else if (m.state === 'close' && m.percent > 0) { m.percent -= (100 / m.duration) * (tickMs / 1000); if (m.percent <= 0) { m.percent = 0; m.state = 'stop'; m.target = null; } mChanged = true; }
            if (mChanged) { Reflect.set(newMotors, mId, m); zoneChanged = true; }
          });
          if (zoneChanged) { hasChanges = true; Reflect.set(nextZones, z, { ...zone, motors: newMotors }); }
        });
        return hasChanges ? nextZones : prevZones;
      });
    }, 1000);
    return () => clearInterval(motorEngine);
  }, Array.of());

  const handleLogout = () => { setIsLoggedIn(false); setCurrentView('home'); };

  if (!isLoggedIn) return (<div className="h-screen w-full bg-slate-50 text-slate-800 flex justify-center items-center select-none"><LoginView onLogin={setIsLoggedIn} /></div>);

  return (
    <div className="h-screen w-full bg-slate-100 text-slate-800 overflow-hidden flex flex-col relative font-sans p-2 sm:p-4 select-none">
      <div className="relative z-10 flex-grow flex flex-col h-full max-w-7xl mx-auto w-full">
        {currentView === 'home' && <HomeView onChangeView={setCurrentView} onLogout={handleLogout} farmSettings={farmSettings} setFarmSettings={setFarmSettings} />}
        {currentView === 'monitor' && <MonitorView onChangeView={setCurrentView} onLogout={handleLogout} sensorData={sensorData} />}
        {currentView === 'remote' && <EnvironmentControlView onChangeView={setCurrentView} onLogout={handleLogout} zoneStates={zoneStates} setZoneStates={setZoneStates} sensorData={sensorData} />}
        {currentView === 'irrigation' && <IrrigationView onChangeView={setCurrentView} onLogout={handleLogout} />}
        {currentView === 'data' && <DataAnalysisView onChangeView={setCurrentView} onLogout={handleLogout} farmSettings={farmSettings} />}
        {currentView === 'cctv' && <CCTVView onChangeView={setCurrentView} onLogout={handleLogout} />}
      </div>
    </div>
  );
}

const HomeView = ({ onChangeView, onLogout, farmSettings, setFarmSettings }) => {
  const [weather, setWeather] = useState({ temp: 0.0, hum: 0, ws: 0.0, desc: "로딩...", forecast: Array.of() });
  const [latestReport, setLatestReport] = useState({ content: "리포트를 불러오는 중...", filename: "" });

  useEffect(() => {
    const fetchWeather = async () => { try { const res = await fetch(`${MY_SERVER_URL}/api/weather`); const data = await res.json(); setWeather(data); } catch(e) {} };
    fetchWeather(); const wItv = setInterval(fetchWeather, 300000); return () => clearInterval(wItv);
  }, Array.of());

  useEffect(() => {
    const fetchReport = async () => { try { const res = await fetch(`${MY_SERVER_URL}/api/latest-report`); const data = await res.json(); setLatestReport(data); } catch(e) { setLatestReport({content: "리포트 불러오기 실패", filename: ""}) } };
    fetchReport();
  }, Array.of());

  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# ')) return <h1 key={i} className="text-emerald-700 font-black text-lg mt-3 mb-2">{line.replace('# ', '')}</h1>;
      if (line.startsWith('## ')) return <h2 key={i} className="text-teal-600 font-bold text-sm mt-2 mb-1 border-b border-slate-200 pb-1">{line.replace('## ', '')}</h2>;
      if (line.startsWith('### ')) return <h3 key={i} className="text-slate-700 font-bold text-xs mt-1">{line.replace('### ', '')}</h3>;
      if (line.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-emerald-400 pl-2 text-slate-500 italic text-[11px] my-1 bg-emerald-50/50 py-1 rounded-r pr-2">{line.replace('> ', '')}</blockquote>;
      if (line.includes('|---|')) return null;
      if (line.startsWith('|')) {
        const cells = line.split('|').filter(c => c.trim() !== '');
        return (
          <div key={i} className="flex border-b border-slate-100 text-[10px] py-1 px-1 hover:bg-slate-50">
            {cells.map((c, j) => <div key={j} className="flex-1 font-bold text-slate-700 text-center truncate px-1">{c.trim()}</div>)}
          </div>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const textPart = line.substring(2);
        if (textPart.includes('오늘 하루도 스마트팜 관리를 화이팅하세요')) return <p key={i} className="text-[11px] text-emerald-600 font-bold mt-2 text-center">{textPart}</p>;
        return <li key={i} className="text-[11px] text-slate-600 ml-4 list-disc">{textPart}</li>;
      }
      if (line === '---') return <hr key={i} className="my-3 border-slate-200" />;
      if (line.trim() === '') return <div key={i} className="h-1.5"></div>;
      
      let formattedLine = line;
      if (formattedLine.includes('**')) {
        const parts = formattedLine.split('**');
        return <p key={i} className="text-[11px] text-slate-600 leading-relaxed">{parts.map((p, idx) => idx % 2 === 1 ? <span key={idx} className="font-black text-slate-800">{p}</span> : p)}</p>;
      }
      return <p key={i} className="text-[11px] text-slate-600 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="flex flex-col items-center justify-start h-full gap-3 text-center overflow-y-auto no-scrollbar py-4 w-full">
      {/* 1. 타이틀 (여백 최소화) */}
      <div className="mt-1 mb-1 shrink-0">
        <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500" style={{filter: 'drop-shadow(0 0 5px rgba(16,185,129,0.2))'}}>FUTURICS</h1>
      </div>

      {/* 2. 날씨 위젯 (글씨와 뱃지 크기를 대폭 줄여서 모바일에 최적화) */}
      <div className="bg-white rounded-2xl border border-emerald-100 p-2.5 sm:p-3 flex flex-row items-center justify-between shadow-sm w-full max-w-3xl gap-2 shrink-0">
        <div className="flex flex-col text-left shrink-0">
          <span className="text-emerald-600 font-black mb-0.5" style={{fontSize: '9px'}}>📡 안성 실시간</span>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
            <span className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{weather.temp}°C</span>
            <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100 whitespace-nowrap w-fit mt-1 sm:mt-0" style={{fontSize: '9px'}}>{weather.desc}</span>
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {weather.forecast && weather.forecast.map((day, idx) => (
            <div key={idx} className="bg-slate-50 px-1.5 py-1 rounded-lg flex flex-col items-center justify-center shrink-0 border border-slate-100 min-w-[38px]">
              <span className="text-slate-400 font-bold" style={{fontSize: '8px'}}>{day.date}</span>
              <span className="mt-0.5 font-bold text-slate-700" style={{fontSize: '10px'}}>{day.desc.split(' ').at(0)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 메뉴 버튼 3x2 바둑판 배열 (모바일 한 화면에 보이도록 크기/여백 조정) */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-3xl px-1 mt-1 shrink-0">
        <button onClick={() => onChangeView('monitor')} className="py-3 sm:py-4 bg-white border border-emerald-100 rounded-2xl text-[11px] sm:text-xs font-black text-slate-700 hover:border-emerald-400 shadow-sm flex flex-col items-center gap-1.5 active:scale-95 transition-all"><span className="text-2xl sm:text-3xl">📊</span> 모니터링</button>
        <button onClick={() => onChangeView('remote')} className="py-3 sm:py-4 bg-white border border-emerald-100 rounded-2xl text-[11px] sm:text-xs font-black text-slate-700 hover:border-emerald-400 shadow-sm flex flex-col items-center gap-1.5 active:scale-95 transition-all"><span className="text-2xl sm:text-3xl">⚙️</span> 환경제어</button>
        <button onClick={() => onChangeView('irrigation')} className="py-3 sm:py-4 bg-white border border-emerald-100 rounded-2xl text-[11px] sm:text-xs font-black text-slate-700 hover:border-emerald-400 shadow-sm flex flex-col items-center gap-1.5 active:scale-95 transition-all"><span className="text-2xl sm:text-3xl">💧</span> 관수제어</button>
        <button onClick={() => onChangeView('data')} className="py-3 sm:py-4 bg-white border border-emerald-100 rounded-2xl text-[11px] sm:text-xs font-black text-slate-700 hover:border-emerald-400 shadow-sm flex flex-col items-center gap-1.5 active:scale-95 transition-all"><span className="text-2xl sm:text-3xl">📈</span> 데이터분석</button>
        <button onClick={() => onChangeView('cctv')} className="py-3 sm:py-4 bg-white border border-emerald-100 rounded-2xl text-[11px] sm:text-xs font-black text-slate-700 hover:border-emerald-400 shadow-sm flex flex-col items-center gap-1.5 active:scale-95 transition-all"><span className="text-2xl sm:text-3xl">📹</span> CCTV</button>
        <button onClick={onLogout} className="py-3 sm:py-4 bg-rose-50 border border-rose-100 rounded-2xl text-[11px] sm:text-xs font-black text-rose-500 hover:bg-rose-100 shadow-sm flex flex-col items-center gap-1.5 active:scale-95 transition-all"><span className="text-2xl sm:text-3xl">🔒</span> 시스템종료</button>
      </div>
      
      {/* 4. 사용자 설정 (컴팩트) */}
      <div className="mt-1 bg-white border border-emerald-200 p-3 rounded-2xl w-full max-w-3xl text-left shadow-sm px-4 shrink-0">
        <h3 className="text-emerald-600 font-black mb-2" style={{fontSize: '11px'}}>⚙️ 기본 농가 설정</h3>
        <div className="flex gap-2">
          <div className="flex-1">
            <input type="text" value={farmSettings.farmName} onChange={e=>setFarmSettings({...farmSettings, farmName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-bold focus:border-emerald-500 focus:outline-none" style={{fontSize: '11px'}} placeholder="농가명" />
          </div>
          <div className="flex-1">
            <input type="text" value={farmSettings.surveyor} onChange={e=>setFarmSettings({...farmSettings, surveyor: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-bold focus:border-emerald-500 focus:outline-none" style={{fontSize: '11px'}} placeholder="조사자" />
          </div>
        </div>
      </div>

      {/* 5. 스팜이 리포트 요약 카드 */}
      <div className="mt-1 bg-white border border-emerald-200 p-3 rounded-2xl w-full max-w-3xl text-left shadow-sm flex flex-col shrink-0" style={{maxHeight: '300px'}}>
        <div className="flex justify-between items-center mb-2 border-b border-emerald-100 pb-2">
          <h3 className="text-emerald-600 font-black text-xs">📝 스팜이 리포트 요약</h3>
          {latestReport.filename && <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{latestReport.filename}</span>}
        </div>
        <div className="flex-grow overflow-y-auto no-scrollbar bg-slate-50/50 p-2 rounded-xl border border-slate-100 relative">
          {renderMarkdown(latestReport.content)}
        </div>
      </div>
    </div>
  );
};

const MonitorView = ({ onChangeView, onLogout, sensorData }) => {
  const [liveChartData, setLiveChartData] = useState(Array.of());
  const [historyData, setHistoryData] = useState(Array.of());
  const [timeRange, setTimeRange] = useState('1일'); 
  
  const [visibleZones, setVisibleZones] = useState(() => {
    const initObj = {};
    ZONES.forEach(z => Reflect.set(initObj, z, true));
    return initObj;
  });

  useEffect(() => { handleTimeRangeChange('1일'); }, Array.of());

  useEffect(() => {
    if (timeRange === '실시간') {
      const now = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
      setLiveChartData(p => {
        const newData = { time: now };
        ZONES.forEach(z => {
           const sData = Reflect.get(sensorData, z);
           Reflect.set(newData, `${z}_temp`, sData ? sData.temp : 0);
        });
        return p.concat(newData).slice(-15);
      });
    }
  }, Array.of(sensorData, timeRange));

  const handleTimeRangeChange = async (range) => {
    setTimeRange(range); if (range === '실시간') return;
    try { const res = await fetch(`${MY_SERVER_URL}/api/history?range=${range}`); const data = await res.json(); setHistoryData(data); } catch (e) {}
  };

  const handleExportExcel = () => window.open(`${MY_SERVER_URL}/api/export`);
  const displayChartData = timeRange === '실시간' ? liveChartData : historyData;
  
  const toggleZoneVisibility = (zone) => {
    setVisibleZones(prev => {
      const next = { ...prev };
      Reflect.set(next, zone, !Reflect.get(prev, zone));
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader title="📊 실시간 모니터링" onChangeView={onChangeView} currentView="monitor" onLogout={onLogout} />
      
      {/* 한 화면에 다 들어오도록 여백을 최소화했습니다 */}
      <div className="flex-grow overflow-y-auto no-scrollbar pb-4 flex flex-col gap-2 px-1">
        
        {/* 1. 상단: 온도 트렌드 그래프 (화면 상단 고정, 높이 조절) */}
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-3 flex flex-col shrink-0" style={{height: '45vh', minHeight: '220px'}}>
          <div className="flex justify-between items-center mb-2 gap-2">
            <h3 className="text-emerald-600 font-black text-xs shrink-0">📈 온도 트렌드</h3>
            <div className="flex gap-1 overflow-x-auto no-scrollbar flex-grow bg-slate-50 p-1 rounded-lg border border-slate-200">
              {Array.of('실시간', '1일', '3일', '1주', '보름', '1달').map(r => (<button key={r} onClick={() => handleTimeRangeChange(r)} className={`px-2 py-1 rounded whitespace-nowrap font-bold transition-all text-slate-500 hover:bg-white hover:text-emerald-600 ${timeRange === r ? 'bg-emerald-500 text-white shadow-sm' : ''}`} style={{fontSize: '10px'}}>{r}</button>))}
            </div>
            <button onClick={handleExportExcel} className="shrink-0 flex items-center justify-center gap-1 px-2 py-1 bg-teal-500 text-white font-bold rounded-lg shadow-sm" style={{fontSize: '9px'}}>📥 저장</button>
          </div>
          <div className="flex-grow w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayChartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" tickMargin={5} style={{fontSize: '9px', fontWeight: 'bold'}} />
                <YAxis stroke="#94a3b8" style={{fontSize: '9px', fontWeight: 'bold'}} />
                <RechartsTooltip contentStyle={{backgroundColor:'#fff', borderColor:'#e2e8f0', color:'#333', borderRadius:'8px', fontWeight: 'bold', fontSize: '10px'}} />
                {ZONES.map(z => Reflect.get(visibleZones, z) && <Line key={z} type="monotone" dataKey={`${z}_temp`} name={z} stroke={Reflect.get(ZONE_COLORS, z)} dot={false} strokeWidth={2} isAnimationActive={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. 하단: 구역별 온습도 카드 (초압축 그리드) */}
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-2 shrink-0">
          {ZONES.map(z => {
             const isVis = Reflect.get(visibleZones, z);
             const sData = Reflect.get(sensorData, z);
             return (
              <div key={z} onClick={() => toggleZoneVisibility(z)} className={`p-2 sm:p-3 rounded-2xl flex flex-col relative overflow-hidden shadow-sm cursor-pointer transition-all border ${isVis ? 'bg-white border-emerald-200' : 'bg-slate-50 border-slate-100 opacity-50 grayscale'}`}>
                <div className="absolute top-0 left-0 w-full h-1" style={{backgroundColor: Reflect.get(ZONE_COLORS, z)}}></div>
                <span className="font-black text-slate-700 mb-1 mt-1" style={{fontSize: '11px'}}>{z}</span>
                <div className="flex flex-col justify-center gap-1">
                  <div className="flex justify-between items-baseline"><span className="text-slate-400 font-bold" style={{fontSize: '9px'}}>온도</span><span className="font-black text-rose-500" style={{fontSize: '14px'}}>{sData ? Number(sData.temp).toFixed(1) : "0.0"}<span style={{fontSize: '8px'}}>°C</span></span></div>
                  <div className="flex justify-between items-baseline"><span className="text-slate-400 font-bold" style={{fontSize: '9px'}}>습도</span><span className="font-black text-blue-500" style={{fontSize: '12px'}}>{sData ? Number(sData.hum).toFixed(0) : "0"}%</span></div>
                </div>
              </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};

// 💡 [환경제어 화면] - 리모델링 (프리미엄 하이엔드 모던 UI)
const EnvironmentControlView = ({ onChangeView, onLogout, zoneStates, setZoneStates, sensorData }) => {
  const [selectedZone, setSelectedZone] = useState('1동');
  const [isGlobalControl, setIsGlobalControl] = useState(false);
  const currentZone = Reflect.get(zoneStates, selectedZone);

  // 💡 스마트 자동 토글 (일괄 제어 여부에 따라 전체 또는 개별 적용)
  const toggleAutoMode = () => {
    const newMode = currentZone.mode === 'auto' ? 'manual' : 'auto';
    const zonesToUpdate = isGlobalControl ? Array.of('1동', '2동', '3동', '4동') : Array.of(selectedZone);
    
    setZoneStates(prev => {
      let nextStates = { ...prev };
      zonesToUpdate.forEach(z => {
        const pz = Reflect.get(prev, z);
        let resetMotors = { ...pz.motors };
        if (newMode === 'manual') {
           Object.keys(resetMotors).forEach(mId => { 
              const rm = { ...Reflect.get(resetMotors, mId), state: 'stop', target: null };
              Reflect.set(resetMotors, mId, rm);
           });
        }
        Reflect.set(nextStates, z, { ...pz, mode: newMode, autoStartTime: newMode === 'auto' ? Date.now() : null, motors: resetMotors });
      });
      return nextStates;
    });
  };

  const setGlobalAutoConfig = (key, value) => {
    const zonesToUpdate = isGlobalControl ? Array.of('1동', '2동', '3동', '4동') : Array.of(selectedZone);
    setZoneStates(prev => {
      let nextStates = { ...prev };
      zonesToUpdate.forEach(z => { 
         const pz = Reflect.get(prev, z);
         const newConf = { ...pz.autoConfig };
         Reflect.set(newConf, key, value);
         Reflect.set(nextStates, z, { ...pz, autoConfig: newConf }); 
      });
      return nextStates;
    });
  };

  const handleMotorAction = (id, action) => {
    if (currentZone.mode !== 'manual') return alert("수동 제어 모드에서만 조작 가능합니다.");
    const zonesToUpdate = isGlobalControl ? Array.of('1동', '2동', '3동', '4동') : Array.of(selectedZone);
    
    setZoneStates(prev => {
       const ns = { ...prev };
       zonesToUpdate.forEach(z => {
          const sz = Reflect.get(ns, z);
          const nm = { ...sz.motors };
          const updatedMotor = { ...Reflect.get(nm, id), state: action, target: null };
          Reflect.set(nm, id, updatedMotor);
          Reflect.set(ns, z, { ...sz, motors: nm });
       });
       return ns;
    });
  };

  const handleTargetSet = (id, val) => {
    const zonesToUpdate = isGlobalControl ? Array.of('1동', '2동', '3동', '4동') : Array.of(selectedZone);
    setZoneStates(prev => {
       const ns = { ...prev };
       zonesToUpdate.forEach(z => {
          const sz = Reflect.get(ns, z);
          const nm = { ...sz.motors };
          const updatedMotor = { ...Reflect.get(nm, id), target: val };
          Reflect.set(nm, id, updatedMotor);
          Reflect.set(ns, z, { ...sz, motors: nm });
       });
       return ns;
    });
  };

  const handleDurationChange = (id, val) => {
    const zonesToUpdate = isGlobalControl ? Array.of('1동', '2동', '3동', '4동') : Array.of(selectedZone);
    setZoneStates(prev => {
       const ns = { ...prev };
       zonesToUpdate.forEach(z => {
          const sz = Reflect.get(ns, z);
          const nm = { ...sz.motors };
          const updatedMotor = { ...Reflect.get(nm, id), duration: val };
          Reflect.set(nm, id, updatedMotor);
          Reflect.set(ns, z, { ...sz, motors: nm });
       });
       return ns;
    });
  };

  const handleRelay = (id) => {
    if (currentZone.mode !== 'manual') return alert("수동 제어 모드에서만 조작 가능합니다.");
    const zonesToUpdate = isGlobalControl ? Array.of('1동', '2동', '3동', '4동') : Array.of(selectedZone);
    setZoneStates(prev => {
       const ns = { ...prev };
       zonesToUpdate.forEach(z => {
          const sz = Reflect.get(ns, z);
          const nr = { ...sz.relays };
          Reflect.set(nr, id, !Reflect.get(nr, id));
          Reflect.set(ns, z, { ...sz, relays: nr });
       });
       return ns;
    });
  };

  const getSideStyle = (motorObj, isLeft) => {
    let shift = (motorObj.percent / 100) * 12; // 스키매틱 열림 폭 확대
    let color = 'rgba(255,255,255,0.4)'; // Glass 느낌
    let border = 'rgba(255,255,255,0.8)';
    if (motorObj.state === 'open') { color = 'rgba(16, 185, 129, 0.7)'; border = '#10b981'; }
    else if (motorObj.state === 'close') { color = 'rgba(244, 63, 94, 0.7)'; border = '#f43f5e'; }
    else if (motorObj.percent > 0) { color = 'rgba(59, 130, 246, 0.6)'; border = '#3b82f6'; }
    
    return { 
      transform: `translateX(${isLeft ? -shift : shift}px)`, 
      backgroundColor: color, 
      borderColor: border,
      boxShadow: motorObj.state !== 'stop' ? `0 0 10px ${border}` : 'none',
      backdropFilter: 'blur(4px)'
    };
  };

  const sDataSel = Reflect.get(sensorData, selectedZone);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      <PageHeader title="⚙️ 환경 제어" onChangeView={onChangeView} currentView="remote" onLogout={onLogout} />
      
      {/* 💡 상단: 모던 구역 선택 및 일괄제어 토글 */}
      <div className="flex-none px-2 mb-2 z-20 w-full max-w-5xl mx-auto">
        <div className="flex gap-2 w-full bg-white/70 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-slate-200/60">
          <div className="flex flex-1 gap-1">
            {Array.of('1동', '2동', '3동', '4동').map(z => (
              <button key={z} onClick={()=>setSelectedZone(z)} className={`flex-1 relative overflow-hidden whitespace-nowrap px-2 py-2 font-black rounded-xl transition-all duration-300 ${selectedZone === z ? 'text-white shadow-md' : 'text-slate-500 hover:bg-white hover:shadow-sm'}`} style={{fontSize: '13px'}}>
                {selectedZone === z && <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500"></div>}
                <span className="relative z-10">{z}</span>
              </button>
            ))}
          </div>
          <button onClick={()=>setIsGlobalControl(!isGlobalControl)} className={`relative overflow-hidden px-4 py-2 font-black rounded-xl transition-all duration-300 shadow-sm shrink-0 border ${isGlobalControl ? 'border-transparent text-white' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`} style={{fontSize: '12px'}}>
             {isGlobalControl && <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500"></div>}
             <span className="relative z-10 flex items-center gap-1.5">{isGlobalControl ? '🌐 전체 동기화 ON' : '📍 개별 제어'}</span>
          </button>
        </div>
      </div>

      {/* 💡 스크롤 영역: 모식도 + 패널들 */}
      <div className="flex-grow overflow-y-auto no-scrollbar pb-6 flex flex-col px-2 gap-3 w-full max-w-5xl mx-auto">
        
        {/* 온실 모식도 (Glassmorphism & Neon) */}
        <div className="bg-slate-800/95 backdrop-blur-xl border border-slate-700 rounded-3xl flex flex-col items-center justify-center relative shadow-2xl overflow-hidden shrink-0" style={{height: '140px'}}>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900 opacity-50"></div>
          
          <div className="absolute top-3 left-4 flex flex-col gap-1.5 z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></span>
              <span className="text-white font-extrabold tracking-widest text-[10px]">{isGlobalControl ? '전체 동기화 연동중' : `${selectedZone} 실시간 상태`}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
              <span className="text-emerald-300 font-black text-sm">{sDataSel ? `${sDataSel.temp}°C` : "--"}</span>
              <span className="text-slate-400 mx-1">/</span>
              <span className="text-blue-300 font-bold text-xs">{sDataSel ? `${sDataSel.hum}%` : "--"}</span>
            </div>
          </div>

          <div className="relative mt-8" style={{width: '180px', height: '80px'}}>
            <div className={`absolute -top-7 left-1/2 -translate-x-1/2 font-black ${currentZone.motors.roof.percent > 0 ? 'text-emerald-400 text-shadow-glow' : 'text-slate-500'}`} style={{fontSize: '11px', textShadow: currentZone.motors.roof.percent > 0 ? '0 0 10px rgba(52, 211, 153, 0.5)' : 'none'}}>{Math.round(currentZone.motors.roof.percent)}%</div>
            
            {/* 천창 (Roof) 애니메이션 바 */}
            <div className={`absolute -top-3 left-1/2 -translate-x-1/2 h-2 transition-all duration-1000 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.2)] border border-white/20 backdrop-blur-md`} style={{width: '80px', transform: `translate(-50%, ${currentZone.motors.roof.percent > 0 ? -6 : 0}px)`, backgroundColor: currentZone.motors.roof.state === 'open' ? 'rgba(16, 185, 129, 0.8)' : currentZone.motors.roof.state === 'close' ? 'rgba(244, 63, 94, 0.8)' : 'rgba(255,255,255,0.2)'}}></div>
            
            {/* 온실 뼈대 */}
            <div className="absolute top-0 w-full h-10 border-t-[4px] border-l-[4px] border-r-[4px] border-white/20 rounded-t-[50%]"></div>
            
            <div className="absolute top-10 w-full h-12 border-l-[4px] border-r-[4px] border-b-[4px] border-white/20 flex justify-center items-center bg-emerald-500/5 backdrop-blur-sm" style={{gap: '20px', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px'}}>
              {/* 측창 퍼센트 표시 */}
              <div className="absolute top-0 -left-8 flex flex-col items-end" style={{gap: '2px'}}>
                {Array.of(1, 2, 3, 4).map(lvl => {
                   const mL = Reflect.get(currentZone.motors, `side${lvl}L`);
                   return <span key={lvl} className={`font-black ${mL.percent > 0 ? 'text-emerald-400' : 'text-slate-600'}`} style={{fontSize: '8px'}}>{Math.round(mL.percent)}%</span>
                })}
              </div>
              <div className="absolute top-0 -right-8 flex flex-col items-start" style={{gap: '2px'}}>
                {Array.of(1, 2, 3, 4).map(lvl => {
                   const mR = Reflect.get(currentZone.motors, `side${lvl}R`);
                   return <span key={lvl} className={`font-black ${mR.percent > 0 ? 'text-emerald-400' : 'text-slate-600'}`} style={{fontSize: '8px'}}>{Math.round(mR.percent)}%</span>
                })}
              </div>

              {/* 측창 1~4중 바 */}
              {Array.of(1, 2, 3, 4).map(lvl => {
                 const mL = Reflect.get(currentZone.motors, `side${lvl}L`);
                 const mR = Reflect.get(currentZone.motors, `side${lvl}R`);
                 return (
                  <React.Fragment key={lvl}>
                    <div className="absolute top-0 w-1.5 h-11 transition-all duration-1000 rounded-full border" style={{...getSideStyle(mL, true), left: `${lvl*5 - 12}px`}}></div>
                    <div className="absolute top-0 w-1.5 h-11 transition-all duration-1000 rounded-full border" style={{...getSideStyle(mR, false), right: `${lvl*5 - 12}px`}}></div>
                  </React.Fragment>
                 )
              })}
              {/* 환풍기 아이콘 */}
              <span className={`text-2xl ${currentZone.relays.fan ? 'animate-spin opacity-100 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]':'opacity-20 grayscale'} transition-all`}>🌀</span>
              <span className={`text-2xl ${currentZone.relays.fan ? 'animate-spin opacity-100 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]':'opacity-20 grayscale'} transition-all`}>🌀</span>
            </div>
          </div>
        </div>

        {/* 스마트 자동 제어 설정 영역 (Modern Sliders) */}
        <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg p-4 rounded-3xl flex flex-col gap-3 shrink-0">
           <div className="flex justify-between items-center pb-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${currentZone.mode === 'auto' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}><span className="text-xl">🤖</span></div>
                <h3 className="text-slate-800 font-black text-sm">스마트 자동 제어</h3>
              </div>
              <button onClick={toggleAutoMode} className={`relative overflow-hidden px-5 py-2 rounded-xl text-xs font-black transition-all shadow-md ${currentZone.mode === 'auto' ? 'text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
                 {currentZone.mode === 'auto' && <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 animate-pulse"></div>}
                 <span className="relative z-10 flex items-center gap-1">{currentZone.mode === 'auto' ? '✨ 자동 제어 가동중' : '수동 모드 대기'}</span>
              </button>
           </div>
           
           <div className="flex gap-3 mt-1">
              <div className="flex-1 bg-slate-50/50 p-3 rounded-2xl border border-slate-100 shadow-inner">
                <div className="flex justify-between font-black mb-3">
                  <span className="text-slate-500 text-[10px] uppercase tracking-widest">개방 목표 (1중)</span> 
                  <span className="text-rose-500 text-sm bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">{currentZone.autoConfig.targetTemp}°C</span>
                </div>
                <input type="range" min="15" max="35" value={currentZone.autoConfig.targetTemp} onChange={e=>setGlobalAutoConfig('targetTemp', e.target.value)} className="w-full h-2 bg-slate-200 rounded-full appearance-none accent-rose-500 cursor-pointer" />
              </div>
              <div className="flex-1 bg-slate-50/50 p-3 rounded-2xl border border-slate-100 shadow-inner">
                <div className="flex justify-between font-black mb-3">
                  <span className="text-slate-500 text-[10px] uppercase tracking-widest">보온 닫힘</span> 
                  <span className="text-blue-500 text-sm bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{currentZone.autoConfig.closeTemp}°C</span>
                </div>
                <input type="range" min="5" max="25" value={currentZone.autoConfig.closeTemp} onChange={e=>setGlobalAutoConfig('closeTemp', e.target.value)} className="w-full h-2 bg-slate-200 rounded-full appearance-none accent-blue-500 cursor-pointer" />
              </div>
           </div>
        </div>

        {/* 제어 그리드: 공조/천창 + 측창 */}
        <div className="flex flex-col md:flex-row gap-3">
           
           {/* 천창 및 공조 패널 */}
           <div className="flex flex-col gap-3 md:w-1/3 shrink-0">
              <div className="bg-white/80 backdrop-blur-xl p-3 rounded-3xl border border-white shadow-lg flex flex-col gap-2">
                 <div className="flex items-center gap-1.5 mb-1 px-1">
                   <span className="text-slate-400">🌤️</span>
                   <span className="font-extrabold text-slate-800 text-[12px] tracking-tight">상단 제어 시스템</span>
                 </div>
                 <ModernMotorCard id="roof" label="천창 (Roof)" motor={currentZone.motors.roof} isDisabled={false} onMotorAction={handleMotorAction} onTargetSet={handleTargetSet} onDurationChange={handleDurationChange} sizeStr="mini" />
                 <ModernMotorCard id="shade" label="차광막 (Shade)" motor={currentZone.motors.shade} isDisabled={false} onMotorAction={handleMotorAction} onTargetSet={handleTargetSet} onDurationChange={handleDurationChange} sizeStr="mini" />
              </div>
              
              <div className="bg-white/80 backdrop-blur-xl p-3 rounded-3xl border border-white shadow-lg flex flex-col gap-2">
                 <div className="flex items-center gap-1.5 mb-1 px-1">
                   <span className="text-slate-400">⚡</span>
                   <span className="font-extrabold text-slate-800 text-[12px] tracking-tight">공조 전원 (Relays)</span>
                 </div>
                 <div className="grid grid-cols-3 gap-2">
                    <button onClick={()=>handleRelay('fan')} className={`relative overflow-hidden flex flex-col items-center justify-center py-3 rounded-2xl border transition-all duration-300 ${currentZone.relays.fan ? 'bg-blue-50 border-blue-200 shadow-[0_4px_15px_rgba(59,130,246,0.2)]' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-white hover:shadow-sm'}`}>
                      {currentZone.relays.fan && <div className="absolute inset-0 bg-blue-400/10"></div>}
                      <span className={`text-2xl z-10 transition-transform duration-500 ${currentZone.relays.fan ? 'animate-spin drop-shadow-md' : 'grayscale opacity-40'}`}>🌀</span>
                      <span className={`font-extrabold mt-1.5 z-10 ${currentZone.relays.fan ? 'text-blue-600' : ''}`} style={{fontSize: '10px'}}>유동팬</span>
                    </button>
                    <button onClick={()=>handleRelay('exhaust')} className={`relative overflow-hidden flex flex-col items-center justify-center py-3 rounded-2xl border transition-all duration-300 ${currentZone.relays.exhaust ? 'bg-teal-50 border-teal-200 shadow-[0_4px_15px_rgba(20,184,166,0.2)]' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-white hover:shadow-sm'}`}>
                      {currentZone.relays.exhaust && <div className="absolute inset-0 bg-teal-400/10"></div>}
                      <span className={`text-2xl z-10 transition-all duration-300 ${currentZone.relays.exhaust ? 'drop-shadow-md scale-110' : 'grayscale opacity-40'}`}>💨</span>
                      <span className={`font-extrabold mt-1.5 z-10 ${currentZone.relays.exhaust ? 'text-teal-600' : ''}`} style={{fontSize: '10px'}}>환풍기</span>
                    </button>
                    <button onClick={()=>handleRelay('heater')} className={`relative overflow-hidden flex flex-col items-center justify-center py-3 rounded-2xl border transition-all duration-300 ${currentZone.relays.heater ? 'bg-rose-50 border-rose-200 shadow-[0_4px_15px_rgba(244,63,94,0.2)]' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-white hover:shadow-sm'}`}>
                      {currentZone.relays.heater && <div className="absolute inset-0 bg-rose-400/10"></div>}
                      <span className={`text-2xl z-10 transition-all duration-300 ${currentZone.relays.heater ? 'drop-shadow-md scale-110' : 'grayscale opacity-40'}`}>🔥</span>
                      <span className={`font-extrabold mt-1.5 z-10 ${currentZone.relays.heater ? 'text-rose-600' : ''}`} style={{fontSize: '10px'}}>온풍기</span>
                    </button>
                 </div>
              </div>
           </div>

           {/* 측창 패널 */}
           <div className="bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-white shadow-lg flex-grow h-fit flex flex-col gap-3">
              <div className="flex items-center gap-1.5 px-1">
                <span className="text-slate-400">🪟</span>
                <span className="font-extrabold text-slate-800 text-[12px] tracking-tight">다중 측창 제어 (Side Windows)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.of(1, 2, 3, 4).map(level => {
                   const mL = Reflect.get(currentZone.motors, `side${level}L`);
                   const mR = Reflect.get(currentZone.motors, `side${level}R`);
                   return (
                    <div key={level} className="flex flex-col gap-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 shadow-inner">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-800 bg-white px-2 py-0.5 rounded-md shadow-sm border border-slate-200" style={{fontSize: '10px'}}>{level}중 측창</span>
                      </div>
                      <div className="flex flex-col xl:flex-row gap-2">
                        <ModernMotorCard id={`side${level}L`} label="좌측 (L)" motor={mL} isDisabled={currentZone.mode === 'auto' && level === 1} onMotorAction={handleMotorAction} onTargetSet={handleTargetSet} onDurationChange={handleDurationChange} sizeStr="mini" />
                        <ModernMotorCard id={`side${level}R`} label="우측 (R)" motor={mR} isDisabled={currentZone.mode === 'auto' && level === 1} onMotorAction={handleMotorAction} onTargetSet={handleTargetSet} onDurationChange={handleDurationChange} sizeStr="mini" />
                      </div>
                    </div>
                   )
                })}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

// 💡 [관수 제어 화면] (원페이지, 상단 고정 스키매틱 유지)
const IrrigationView = ({ onChangeView, onLogout }) => {
  const [deviceStates, setDeviceStates] = useState({ supply: false, irrigate: false, mixer: false, nutA: false, nutB: false, nutC: false, nutD: false, zoneA: false, zoneB: false });
  const [autoSettings, setAutoSettings] = useState({ duration: 60, useNutA: true, useNutB: true, useNutC: false, useNutD: false });
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [irrigationCount, setIrrigationCount] = useState(0);
  const [statusMsg, setStatusMsg] = useState("대기 중");
  const isRunningRef = useRef(false);

  const [controlMode, setControlMode] = useState('manual');
  const [manualTimerInputs, setManualTimerInputs] = useState({ supply: 5, mixer: 5, irrigate: 5 });
  const [activeTimers, setActiveTimers] = useState({ supply: 0, mixer: 0, irrigate: 0 });

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimers(prev => {
        let updated = { ...prev };
        let hasChanges = false;
        Array.of('supply', 'mixer', 'irrigate').forEach(key => {
          if (Reflect.get(updated, key) > 0) {
            Reflect.set(updated, key, Reflect.get(updated, key) - 1);
            hasChanges = true;
            if (Reflect.get(updated, key) === 0) {
              setDeviceStates(ds => { const nds = {...ds}; Reflect.set(nds, key, false); return nds; });
            }
          }
        });
        return hasChanges ? updated : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, Array.of());

  const toggleDeviceManual = (id) => {
    if (isRunningRef.current) return alert("현재 1회 자동 관수 가동 중에는 수동 조작이 불가능합니다.");
    setDeviceStates(p => {
       const nextState = !Reflect.get(p, id);
       if (!nextState && (id === 'supply' || id === 'mixer' || id === 'irrigate')) {
          setActiveTimers(timers => { const nt = {...timers}; Reflect.set(nt, id, 0); return nt; });
       }
       const np = { ...p }; Reflect.set(np, id, nextState); return np;
    });
  };

  const startManualTimer = (id) => {
    const mins = parseInt(Reflect.get(manualTimerInputs, id));
    if (isNaN(mins) || mins <= 0) return alert("작동할 시간(분)을 정확히 입력하세요.");
    if (isRunningRef.current) return alert("현재 1회 자동 관수 가동 중에는 개별 타이머를 켤 수 없습니다.");

    setDeviceStates(prev => { const np = {...prev}; Reflect.set(np, id, true); return np; });
    setActiveTimers(prev => { const nt = {...prev}; Reflect.set(nt, id, mins * 60); return nt; }); 
  };

  const recordIrrigation = async (zone, duration) => {
    try { await fetch(`${MY_SERVER_URL}/api/irrigation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zone, duration }) }); } catch(e) {}
  };

  const runSequence = async () => {
    if (isRunningRef.current) {
      isRunningRef.current = false; setIsRunning(false);
      setDeviceStates({supply:false, irrigate:false, mixer:false, nutA:false, nutB:false, nutC:false, nutD:false, zoneA:false, zoneB:false});
      setStatusMsg("시스템 강제 종료됨"); setTimeLeft(0); return;
    }
    isRunningRef.current = true; setIsRunning(true);
    for (const zone of Array.of('zoneA', 'zoneB')) {
      if (!isRunningRef.current) break; 
      setStatusMsg(`${zone === 'zoneA' ? 'A구역' : 'B구역'} 시작 (양액 투입)`);
      setDeviceStates(p => ({ ...p, mixer: true, nutA: autoSettings.useNutA, nutB: autoSettings.useNutB, nutC: autoSettings.useNutC, nutD: autoSettings.useNutD }));
      await sleep(1000); if (!isRunningRef.current) break;
      setStatusMsg(`${zone === 'zoneA' ? 'A구역' : 'B구역'} 밸브 개방`);
      setDeviceStates(p => { const np = {...p}; Reflect.set(np, zone, true); return np; });
      await sleep(1000); if (!isRunningRef.current) break;
      setStatusMsg(`${zone === 'zoneA' ? 'A구역' : 'B구역'} 관수 진행 중...`);
      setDeviceStates(p => ({...p, irrigate: true}));
      
      let count = parseInt(autoSettings.duration); setTimeLeft(count);
      for(let i=0; i<count; i++) { if(!isRunningRef.current) break; await sleep(1000); setTimeLeft(p => p - 1); }
      if (!isRunningRef.current) break;
      
      recordIrrigation(zone === 'zoneA' ? '1동' : '2동', parseInt(autoSettings.duration));

      setStatusMsg(`${zone === 'zoneA' ? 'A구역' : 'B구역'} 종료 중...`);
      setDeviceStates(p => ({...p, irrigate: false}));
      await sleep(1000); if (!isRunningRef.current) break;
      setDeviceStates(p => { const np = {...p}; Reflect.set(np, zone, false); return np; });
      await sleep(1000); if (!isRunningRef.current) break;
      setDeviceStates(p => ({...p, nutA:false, nutB:false, nutC:false, nutD:false, mixer:false}));
      if(zone === 'zoneA' && isRunningRef.current) { setStatusMsg("B구역 전환 대기 중 (2초)..."); await sleep(2000); }
    }
    if (isRunningRef.current) {
      setIrrigationCount(c => c + 1); isRunningRef.current = false; setIsRunning(false);
      setStatusMsg("모든 구역 관수 완료 (DB 기록 저장됨)"); setTimeLeft(0);
    } else {
      setDeviceStates({supply:false, irrigate:false, mixer:false, nutA:false, nutB:false, nutC:false, nutD:false, zoneA:false, zoneB:false}); setTimeLeft(0);
    }
  };

  const ManualBtn = ({ id, label, activeColor, sizeStr }) => {
    let paddingText = 'py-2 px-2 text-xs';
    if (sizeStr === 'mini') paddingText = 'py-1.5 px-1 text-[10px]';
    else if (sizeStr === 'small') paddingText = 'py-2 px-1 text-[11px]';

    return (
      <button onClick={() => toggleDeviceManual(id)} className={`${paddingText} w-full rounded-xl border-2 font-black transition-all shadow-sm ${Reflect.get(deviceStates, id) ? `${activeColor} border-transparent text-white shadow-md scale-105` : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
        {label}
      </button>
    );
  };

  const TimerControl = ({ id }) => (
    <div className="flex w-full bg-slate-100 border border-slate-200 p-1.5 rounded-lg shadow-inner mt-2 items-center h-[34px]">
      {Reflect.get(activeTimers, id) > 0 ? (
        <div className="text-[10px] font-black text-rose-500 w-full text-center animate-pulse">
          {Math.floor(Reflect.get(activeTimers, id)/60)}분 {String(Reflect.get(activeTimers, id)%60).padStart(2,'0')}초
        </div>
      ) : (
        <div className="flex w-full gap-1 h-full">
          <input type="number" value={Reflect.get(manualTimerInputs, id)} onChange={e=>setManualTimerInputs(prev => { const np = {...prev}; Reflect.set(np, id, e.target.value); return np; })} className="w-full text-center text-[10px] font-black focus:outline-none focus:border-emerald-500 text-slate-700 bg-white border border-slate-300 rounded shadow-sm min-w-[30px]" placeholder="분" />
          <button onClick={()=>startManualTimer(id)} className="w-full bg-slate-700 border border-slate-800 text-white font-bold rounded hover:bg-emerald-500 hover:border-emerald-400 transition-colors shadow-sm text-[9px] whitespace-nowrap min-w-[40px]">시작</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 relative">
      <PageHeader title="💧 관수 제어" onChangeView={onChangeView} currentView="irrigation" onLogout={onLogout} />
      
      {/* 💡 상단 100% 고정 영역: 순수 모니터링 스키매틱 뷰 */}
      <div className="flex-none bg-white p-2 sm:p-3 rounded-2xl border border-emerald-100 shadow-md flex flex-col relative overflow-hidden z-20 mx-1 mb-2">
        <div className="w-full flex justify-between items-center mb-1 z-10 px-2">
           <span className="text-[9px] sm:text-xs text-emerald-600 font-black tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 shadow-sm">SYSTEM STATUS</span>
           <span className="text-[9px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-200 sm:hidden flex items-center gap-1"><span className="text-emerald-500 animate-pulse">👉</span> 스크롤</span>
        </div>
        
        <div className="w-full overflow-x-auto no-scrollbar z-10 pb-1">
          <div className="flex justify-between items-center mx-auto" style={{minWidth: '400px', maxWidth: '600px'}}>
            
            {/* 1. Supply */}
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-10 border-[2px] rounded-t-lg relative flex items-end overflow-hidden ${deviceStates.supply ? 'border-blue-400 bg-blue-50 shadow-[0_0_10px_rgba(96,165,250,0.5)]':'border-slate-200 bg-slate-50'}`}>
                {deviceStates.supply && <div className="w-full h-1/2 bg-blue-400 animate-pulse"></div>}
              </div>
              <span className={`text-[9px] font-black ${deviceStates.supply ? 'text-blue-500' : 'text-slate-400'}`}>급수펌프</span>
            </div>

            <span className={deviceStates.supply ? "text-blue-500 font-black text-base animate-pulse": "text-slate-200 text-base"}>▶</span>

            {/* 2. Mixer */}
            <div className="flex flex-col items-center gap-1">
              <div className={`w-12 h-12 border-[3px] rounded-full flex flex-col items-center justify-center shadow-inner ${deviceStates.mixer ? 'border-indigo-400 bg-indigo-50 animate-spin-slow shadow-[0_0_10px_rgba(129,140,248,0.5)]':'border-slate-200 bg-white'}`}>
                <span className={`text-xl ${deviceStates.mixer ? '' : 'grayscale opacity-30'}`}>🌀</span>
              </div>
              <div className="flex gap-1 mt-0.5">
                 {Array.of('A','B','C','D').map(n => (
                    <div key={n} className={`w-2 h-2 rounded-full shadow-sm border border-black/10 ${Reflect.get(deviceStates, `nut${n}`) ? (n==='A'?'bg-rose-500':n==='B'?'bg-amber-500':n==='C'?'bg-yellow-400':'bg-emerald-500') : 'bg-slate-200'}`}></div>
                 ))}
              </div>
              <span className={`text-[9px] font-black mt-0.5 ${deviceStates.mixer ? 'text-indigo-500' : 'text-slate-400'}`}>교반탱크</span>
            </div>

            <span className={deviceStates.irrigate ? "text-teal-500 font-black text-base animate-pulse": "text-slate-200 text-base"}>▶</span>

            {/* 3. Zone */}
            <div className="flex flex-col items-center gap-1 w-20">
              <div className={`w-8 h-8 border-[2px] rounded-full flex items-center justify-center mb-1 ${deviceStates.irrigate ? 'border-teal-400 bg-teal-50 shadow-[0_0_10px_rgba(45,212,191,0.5)]':'border-slate-200 bg-slate-50'}`}>
                 <span className={`text-sm ${deviceStates.irrigate ? '' : 'grayscale opacity-30'}`}>💦</span>
              </div>
              <div className="flex gap-1.5 w-full">
                <div className={`flex-1 py-1 rounded border-2 text-[9px] font-black text-center shadow-sm ${deviceStates.zoneA ? 'border-orange-400 text-white bg-orange-400':'border-slate-200 text-slate-400 bg-white'}`}>A</div>
                <div className={`flex-1 py-1 rounded border-2 text-[9px] font-black text-center shadow-sm ${deviceStates.zoneB ? 'border-orange-400 text-white bg-orange-400':'border-slate-200 text-slate-400 bg-white'}`}>B</div>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* 💡 하단 스크롤 영역: 수동 조작 및 1회 자동 관수 통합 컨트롤 패널 */}
      <div className="flex-grow overflow-y-auto no-scrollbar pb-6 flex flex-col gap-3 px-1">
        
        {/* 1. 수동 제어 패널 */}
        <div className="bg-white border border-emerald-100 p-3 sm:p-4 rounded-2xl shadow-sm flex flex-col gap-2 shrink-0">
          <h3 className="text-emerald-600 font-black text-xs border-b border-slate-100 pb-2">🛠️ 개별 수동 조작 및 타이머</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* 좌측 열: 급수 & 하우스 관수 */}
            <div className="flex flex-col gap-2">
               <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                 <span className="font-black text-blue-500 mb-1.5 block text-[10px]">1. 원수 공급</span>
                 <div className="flex gap-2">
                   <div className="flex-1"><ManualBtn id="supply" label="급수펌프" activeColor="bg-blue-500" sizeStr="small" /></div>
                   <div className="flex-1"><TimerControl id="supply" /></div>
                 </div>
               </div>
               <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                 <span className="font-black text-teal-500 mb-1.5 block text-[10px]">3. 하우스 관수</span>
                 <div className="flex gap-2 mb-2">
                   <div className="flex-1"><ManualBtn id="irrigate" label="메인펌프" activeColor="bg-teal-500" sizeStr="small" /></div>
                   <div className="flex-1"><TimerControl id="irrigate" /></div>
                 </div>
                 <div className="grid grid-cols-2 gap-1.5 border-t border-slate-200 pt-2">
                   <ManualBtn id="zoneA" label="A동 밸브" activeColor="bg-orange-500" sizeStr="small" />
                   <ManualBtn id="zoneB" label="B동 밸브" activeColor="bg-orange-500" sizeStr="small" />
                 </div>
               </div>
            </div>

            {/* 우측 열: 양액 및 교반 */}
            <div className="flex flex-col bg-slate-50 p-2 rounded-xl border border-slate-200">
               <span className="font-black text-indigo-500 mb-1.5 block text-[10px]">2. 양액 및 교반</span>
               <div className="grid grid-cols-4 gap-1.5 mb-2">
                  <ManualBtn id="nutA" label="A액" activeColor="bg-rose-500" sizeStr="mini" />
                  <ManualBtn id="nutB" label="B액" activeColor="bg-amber-500" sizeStr="mini" />
                  <ManualBtn id="nutC" label="C액" activeColor="bg-yellow-400" sizeStr="mini" />
                  <ManualBtn id="nutD" label="D액" activeColor="bg-emerald-500" sizeStr="mini" />
               </div>
               <div className="flex flex-col gap-2 h-full justify-center border-t border-slate-200 pt-2">
                 <ManualBtn id="mixer" label="교반기 모터" activeColor="bg-indigo-500" sizeStr="small" />
                 <TimerControl id="mixer" />
               </div>
            </div>
          </div>
        </div>

        {/* 2. 1회 자동 관수 패널 */}
        <div className="bg-white border border-teal-200 p-3 sm:p-4 rounded-2xl shadow-md flex flex-col gap-2 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
          <h3 className="text-teal-700 font-black text-xs flex justify-between items-center relative z-10 border-b border-teal-50 pb-2">
            <span>🤖 1회 관수 프로그램 (자동)</span>
            <span className="text-[10px] text-slate-500 font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full shadow-sm">금일: <span className="text-teal-600">{irrigationCount}회</span></span>
          </h3>
          
          <div className="grid grid-cols-2 gap-2 relative z-10">
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
              <label className="text-[10px] text-slate-700 font-black block mb-2">⏱️ 작동시간(초)</label>
              <div className="flex gap-1">
                <input type="number" value={autoSettings.duration} onChange={e => setAutoSettings({...autoSettings, duration: e.target.value})} disabled={isRunningRef.current} className="w-full min-w-[40px] bg-white border border-slate-300 rounded px-1 py-1 text-teal-600 font-black text-center text-xs focus:outline-none focus:border-teal-500 shadow-inner" />
                <button onClick={() => setAutoSettings({...autoSettings, duration: 60})} disabled={isRunningRef.current} className="px-2 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-600 hover:bg-slate-100 shadow-sm whitespace-nowrap">1분</button>
                <button onClick={() => setAutoSettings({...autoSettings, duration: 600})} disabled={isRunningRef.current} className="px-2 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-600 hover:bg-slate-100 shadow-sm whitespace-nowrap">10분</button>
              </div>
            </div>
            
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
              <label className="text-[10px] text-slate-700 font-black block mb-2">🧪 양액 선택</label>
              <div className="grid grid-cols-4 gap-1 h-[26px]">
                {Array.of('A', 'B', 'C', 'D').map(nut => {
                  const key = `useNut${nut}`; const isActive = Reflect.get(autoSettings, key); const colorMap = {'A':'bg-rose-500', 'B':'bg-amber-500', 'C':'bg-yellow-400', 'D':'bg-emerald-500'};
                  return (<button key={nut} onClick={() => { if(!isRunningRef.current) setAutoSettings(p=>{const np={...p}; Reflect.set(np, key, !isActive); return np;}) }} className={`rounded text-[9px] font-black border transition-all shadow-sm ${isActive ? `${Reflect.get(colorMap, nut)} border-transparent text-white shadow-md` : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>{nut}</button>);
                })}
              </div>
            </div>
          </div>

          <div className="mt-1 relative z-10 bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-inner flex items-center justify-between">
             <span className="text-[10px] font-black text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full border border-teal-200 shadow-sm">{statusMsg}</span>
             <span className="text-xl sm:text-2xl font-black text-slate-800 tabular-nums">{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</span>
          </div>
          
          <button onClick={runSequence} className={`w-full py-3 sm:py-4 rounded-xl font-black text-sm sm:text-base transition-all shadow-md active:scale-95 relative z-10 border-2 mt-1 ${isRunning ? 'bg-rose-500 border-rose-600 text-white shadow-rose-500/40' : 'bg-teal-500 border-teal-600 text-white shadow-teal-500/40'}`}>
            {isRunning ? "■ 시스템 강제 정지" : "▶ 1회 관수 프로그램 작동"}
          </button>
        </div>

      </div>
    </div>
  );
};

const DataAnalysisView = ({ onChangeView, onLogout, farmSettings }) => {
  const [dataTab, setDataTab] = useState('summary'); 
  const [envSummary, setEnvSummary] = useState({max:0, min:0, avg:0, dif:0});
  const [irrigationData, setIrrigationData] = useState([]);
  const [pesticideLogs, setPesticideLogs] = useState([]);
  const [growthLogs, setGrowthLogs] = useState([]); 
  const [difData, setDifData] = useState([]); 
  const [periodStats, setPeriodStats] = useState({morning: 0, afternoon: 0, night: 0});
  
  const [accStartDate, setAccStartDate] = useState(getTodayDate());
  const [accTarget, setAccTarget] = useState(200); 
  const [accTemp, setAccTemp] = useState(0);

  const [showModal, setShowModal] = useState(false); 
  const [newLog, setNewLog] = useState({ date: getTodayDate(), target: '전체 동', pesticide: '', ratio: '1000배', purpose: '', author: farmSettings.surveyor });

  const [editingGrowthId, setEditingGrowthId] = useState(null); 
  const [growthFormHeader, setGrowthFormHeader] = useState({
    date: getTodayDate(), plantId: '1', habit: '어미'
  });
  const [growthRows, setGrowthRows] = useState(Array.of(createEmptyGrowthRow()));

  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  function createEmptyGrowthRow() {
    return { vineType: '1', mainNode: '', branchNode: '', internode: '', stemThick: '', leafLen: '', leafWidth: '', leafState: '1', femaleFl: '0', harvest: '0', fruitState: '1', curve: '', straight: '', fruitWidth: '', note: '' };
  }

  const formTopRef = useRef(null);

  useEffect(() => {
    fetch(`${MY_SERVER_URL}/api/env-summary`).then(r => r.json()).then(setEnvSummary).catch(()=>{});
    fetch(`${MY_SERVER_URL}/api/irrigation-stats`).then(r => r.json()).then(setIrrigationData).catch(()=>{});
    fetch(`${MY_SERVER_URL}/api/pesticide`).then(r => r.json()).then(setPesticideLogs).catch(()=>{});
    fetch(`${MY_SERVER_URL}/api/dif-stats`).then(r => r.json()).then(setDifData).catch(()=>{});
    fetch(`${MY_SERVER_URL}/api/current-period-stats`).then(r => r.json()).then(setPeriodStats).catch(()=>{});
    fetch(`${MY_SERVER_URL}/api/growth`).then(r => r.json()).then(setGrowthLogs).catch(()=>{});
  }, Array.of());

  useEffect(() => {
    fetch(`${MY_SERVER_URL}/api/accumulated-temp?start_date=${accStartDate}`)
      .then(r => r.json()).then(data => setAccTemp(data.accumulated)).catch(()=>{});
  }, Array.of(accStartDate));

  const handleSavePesticide = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${MY_SERVER_URL}/api/pesticide`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newLog) });
      setShowModal(false);
      const res = await fetch(`${MY_SERVER_URL}/api/pesticide`);
      const data = await res.json();
      setPesticideLogs(data);
    } catch(e) { alert("저장 실패!"); }
  };

  const handleResetGrowthForm = () => {
    setEditingGrowthId(null);
    setGrowthFormHeader({ date: getTodayDate(), plantId: '1', habit: '어미' });
    setGrowthRows(Array.of(createEmptyGrowthRow()));
  };

  const handleEditGrowthBtn = (log) => {
    setEditingGrowthId(log.id);
    setGrowthFormHeader({ date: log.date, plantId: log.plant_id, habit: log.habit });
    setGrowthRows(log.data);
    
    if (formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDeleteGrowth = async (id) => {
    if(!window.confirm("해당 조사 기록을 완전히 삭제하시겠습니까?")) return;
    try {
      await fetch(`${MY_SERVER_URL}/api/growth/${id}`, { method: 'DELETE' });
      const res = await fetch(`${MY_SERVER_URL}/api/growth`);
      setGrowthLogs(await res.json());
      if (editingGrowthId === id) handleResetGrowthForm();
    } catch(e) { alert("삭제 실패!"); }
  };

  const handleSaveGrowth = async (e) => {
    e.preventDefault();
    try {
      const sortedRows = growthRows.slice().sort((a, b) => {
        const numA = parseInt(a.mainNode);
        const numB = parseInt(b.mainNode);
        const valA = isNaN(numA) ? 999 : numA; 
        const valB = isNaN(numB) ? 999 : numB;
        return valA - valB; 
      });

      const payload = {
        date: growthFormHeader.date,
        farm: farmSettings.farmName,
        surveyor: farmSettings.surveyor,
        plant_id: growthFormHeader.plantId,
        habit: growthFormHeader.habit,
        data_json: JSON.stringify(sortedRows) 
      };

      if (editingGrowthId) {
        await fetch(`${MY_SERVER_URL}/api/growth/${editingGrowthId}`, { 
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) 
        });
        alert("기록이 수정 및 정렬되어 저장되었습니다.");
      } else {
        await fetch(`${MY_SERVER_URL}/api/growth`, { 
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) 
        });
        alert("새 기록이 정렬되어 저장되었습니다.");
      }

      handleResetGrowthForm();
      const res = await fetch(`${MY_SERVER_URL}/api/growth`);
      const data = await res.json();
      setGrowthLogs(data);
    } catch(e) { alert("저장 실패!"); }
  };

  const handleExportGrowthExcel = () => {
    window.open(`${MY_SERVER_URL}/api/export-growth`);
  };

  const updateGrowthRow = (index, field, value) => {
    const newRows = growthRows.slice();
    const targetRow = Reflect.get(newRows, index);
    Reflect.set(targetRow, field, value);
    setGrowthRows(newRows);
  };

  const getFlattenedLogs = () => {
    const flattened = Array.of();
    growthLogs.forEach(log => {
      log.data.forEach((nodeData) => {
        flattened.push({
          logId: log.id,
          date: log.date,
          plantId: log.plant_id,
          originalLog: log,
          ...nodeData
        });
      });
    });
    return flattened;
  };
  
  const flattenedGrowthLogs = getFlattenedLogs();

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedFlattenedLogs = useMemo(() => {
    let sortableItems = flattenedGrowthLogs.slice();
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aVal = Reflect.get(a, sortConfig.key) || "";
        let bVal = Reflect.get(b, sortConfig.key) || "";

        let numA = parseFloat(aVal);
        let numB = parseFloat(bVal);

        if (!isNaN(numA) && !isNaN(numB)) {
          if (numA < numB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (numA > numB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, Array.of(flattenedGrowthLogs, sortConfig));

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return '';
    return sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽';
  };

  const defaultDifData = Array.of(
    { date: "예시1일", 주간온도: 26.5, 야간온도: 18.2, DIF: 8.3 },
    { date: "예시2일", 주간온도: 25.8, 야간온도: 17.5, DIF: 8.3 },
    { date: "예시3일", 주간온도: 27.1, 야간온도: 18.0, DIF: 9.1 },
    { date: "예시4일", 주간온도: 24.5, 야간온도: 19.1, DIF: 5.4 },
    { date: "예시5일", 주간온도: 26.0, 야간온도: 17.8, DIF: 8.2 }
  );
  
  const hasRealData = difData && difData.length > 0 && difData.some(d => d.주간온도 !== null || d.야간온도 !== null);
  const baseData = hasRealData ? difData : defaultDifData;
  const isDifDummy = !hasRealData;

  const safeChartData = baseData.map(d => ({
    ...d,
    DIF_Chart: d.DIF === null ? 0 : d.DIF 
  }));

  const accPercent = Math.min(100, (accTemp / accTarget) * 100) || 0;

  return (
    <div className="h-full flex flex-col overflow-hidden relative bg-slate-50 text-slate-800">
      <PageHeader title="📈 재배환경 및 통계 분석" onChangeView={onChangeView} currentView="data" onLogout={onLogout} />
      
      <div className="flex gap-2 mb-4 shrink-0 overflow-x-auto no-scrollbar pb-2 px-1 z-10">
        {Array.of(
          { id: 'summary', name: '📊 종합 대시보드' }, 
          { id: 'env', name: '🌡️ 온습도 통계 (DIF)' }, 
          { id: 'growth', name: '🌱 오이 생육데이터' }, 
          { id: 'log', name: '📝 방제 및 영농일지' }
        ).map(tab => (
          <button key={tab.id} onClick={() => setDataTab(tab.id)} className={`px-5 py-3 sm:py-2.5 rounded-xl text-sm sm:text-xs font-black whitespace-nowrap transition-all shadow-sm flex-1 sm:flex-none ${dataTab === tab.id ? 'bg-emerald-500 text-white shadow-emerald-500/30 border-transparent' : 'bg-white border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}>
            {tab.name}
          </button>
        ))}
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar pb-10 px-1">
        
        {dataTab === 'summary' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm flex flex-col gap-4">
              <h3 className="text-emerald-600 font-bold text-sm">🌡️ 전일 환경 요약 (전체 평균)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center"><p className="text-slate-500 mb-1 font-bold" style={{fontSize: '11px'}}>최고 온도</p><p className="text-xl font-black text-rose-500">{envSummary.max}°C</p></div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center"><p className="text-slate-500 mb-1 font-bold" style={{fontSize: '11px'}}>최저 온도</p><p className="text-xl font-black text-blue-500">{envSummary.min}°C</p></div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center"><p className="text-slate-500 mb-1 font-bold" style={{fontSize: '11px'}}>일평균 온도</p><p className="text-xl font-black text-slate-700">{envSummary.avg}°C</p></div>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white px-2 py-0.5 rounded-bl-xl font-bold shadow-sm" style={{fontSize: '10px'}}>DIF</div>
                  <p className="text-emerald-600 mb-1 font-bold" style={{fontSize: '11px'}}>주야간 온도차</p><p className="text-xl font-black text-emerald-600">{envSummary.dif}°C</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-sm flex flex-col gap-4 md:row-span-2">
              <h3 className="text-amber-500 font-bold text-sm">🥒 생육 관리 목표 (목표 vs 현재)</h3>
              <div className="flex flex-col gap-4 text-xs flex-grow">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-slate-500 whitespace-nowrap font-black text-sm" style={{width: '30%'}}>오전 <span className="font-normal text-slate-400 block sm:inline mt-1 sm:mt-0" style={{fontSize: '10px'}}>(06~12시)</span></span>
                  <span className="text-slate-500 text-center text-sm" style={{width: '35%'}}>목표: <span className="text-rose-500 font-bold">25~28°C</span></span>
                  <span className="text-slate-700 text-right bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200" style={{width: '35%'}}>현재: <span className="font-black text-lg">{periodStats.morning}°C</span></span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-slate-500 whitespace-nowrap font-black text-sm" style={{width: '30%'}}>오후 <span className="font-normal text-slate-400 block sm:inline mt-1 sm:mt-0" style={{fontSize: '10px'}}>(12~18시)</span></span>
                  <span className="text-slate-500 text-center text-sm" style={{width: '35%'}}>목표: <span className="text-amber-500 font-bold">20~23°C</span></span>
                  <span className="text-slate-700 text-right bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200" style={{width: '35%'}}>현재: <span className="font-black text-lg">{periodStats.afternoon}°C</span></span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-slate-500 whitespace-nowrap font-black text-sm" style={{width: '30%'}}>야간 <span className="font-normal text-slate-400 block sm:inline mt-1 sm:mt-0" style={{fontSize: '10px'}}>(18~06시)</span></span>
                  <span className="text-slate-500 text-center text-sm" style={{width: '35%'}}>목표: <span className="text-blue-500 font-bold">15~18°C</span></span>
                  <span className="text-slate-700 text-right bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200" style={{width: '35%'}}>현재: <span className="font-black text-lg">{periodStats.night}°C</span></span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-slate-500 whitespace-nowrap font-black text-sm" style={{width: '30%'}}>지온 <span className="font-normal text-slate-400 block sm:inline mt-1 sm:mt-0" style={{fontSize: '10px'}}>(뿌리활력)</span></span>
                  <span className="text-slate-500 text-center text-sm" style={{width: '35%'}}>목표: <span className="text-amber-500 font-bold">20~23°C</span></span>
                  <span className="text-slate-400 text-center bg-slate-100 px-2 py-1.5 rounded-xl" style={{width: '35%', fontSize: '10px'}}>센서 대기중</span>
                </div>
                <div className="flex flex-col pt-2 gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-600 font-bold">목표 DIF (마디길이 조절)</span>
                    <span className="text-emerald-700 font-black text-lg bg-emerald-50 border border-emerald-100 px-4 py-1.5 rounded-xl shadow-sm">0 ~ +2°C</span>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-inner">
                    <p className="text-slate-600 leading-relaxed mb-3 border-b border-emerald-200 pb-3" style={{fontSize: '11px'}}>
                      <strong className="text-sm">💡 DIF 란? (Day-Night Temperature Difference)</strong><br/>주간 평균온도에서 야간 평균온도를 뺀 차이값을 말합니다.
                    </p>
                    <ul className="text-slate-600 space-y-2 font-bold" style={{fontSize: '11px'}}>
                      <li>• <strong className="text-rose-500 bg-rose-50 px-1 rounded">+DIF (낮이 따뜻함)</strong> : 오이 마디(절간)가 길어집니다.</li>
                      <li>• <strong className="text-blue-500 bg-blue-50 px-1 rounded">-DIF (밤이 따뜻함) / 0</strong> : 마디가 짧아지고 굵어져 웃자람을 방지합니다.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-teal-100 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-teal-600 font-bold text-sm">⏱️ 적산온도 (수확 예측)</h3>
                <input type="date" value={accStartDate} onChange={e=>setAccStartDate(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-600 font-bold px-3 py-1.5 rounded-lg focus:outline-none focus:border-teal-500 shadow-sm" style={{fontSize: '11px'}} />
              </div>
              <div className="flex-grow flex flex-col justify-center gap-4 mt-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-slate-500 font-bold">설정일로부터 누적</span>
                  <span className="text-5xl font-black text-slate-700 tracking-tighter">{accTemp} <span className="text-base font-bold text-slate-400">°C</span></span>
                </div>
                <div className="h-6 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner relative">
                  <div className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-1000" style={{ width: `${accPercent}%` }}></div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                   <div className="flex items-center gap-2 w-full justify-between sm:justify-start">
                     <span className="text-slate-500 font-bold text-xs">목표 달성률:</span>
                     <span className="font-black text-teal-600 text-sm bg-white px-2 py-0.5 rounded border border-slate-200">{Math.round(accPercent)}%</span>
                   </div>
                   <div className="flex items-center gap-2 w-full justify-between sm:justify-end border-t border-slate-200 sm:border-none pt-2 sm:pt-0">
                     <span className="text-slate-500 font-bold text-xs">수확 목표:</span>
                     <div className="flex items-center bg-white border border-slate-300 rounded px-2">
                       <input type="number" value={accTarget} onChange={e=>setAccTarget(e.target.value)} className="w-12 bg-transparent py-1 font-black text-slate-700 text-right focus:outline-none" style={{fontSize: '14px'}} />
                       <span className="text-slate-400 font-bold ml-1" style={{fontSize: '10px'}}>°C</span>
                     </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm flex flex-col gap-4 md:col-span-2 xl:col-span-1">
              <h3 className="text-blue-500 font-bold text-sm">💧 최근 7일 관수량 (단위: 분)</h3>
              <div className="flex-grow" style={{minHeight: '180px'}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={irrigationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" tick={{fontSize: 11, fontWeight: 'bold'}} />
                    <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{backgroundColor: '#fff', borderColor: '#e2e8f0', color:'#333', borderRadius:'8px', fontWeight:'bold'}} />
                    <Bar dataKey="관수량" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {dataTab === 'env' && (
          <div className="flex flex-col gap-4">
            
            <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm">
              <h3 className="text-emerald-600 font-black text-sm">🌡️ 하우스 전체 평균 주/야간 온도 및 DIF 상세 분석</h3>
              {isDifDummy && <span className="bg-rose-50 text-rose-500 border border-rose-200 px-3 py-1.5 rounded-lg font-bold animate-pulse text-xs shadow-sm">DB 누적 대기중</span>}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                <h4 className="text-slate-600 font-black text-sm mb-4 text-center">📈 주/야간 온도 변화 추이</h4>
                <div className="flex-grow" style={{minHeight: '250px'}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={safeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" tick={{fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis stroke="#64748b" tick={{fontSize: 10, fontWeight: 'bold'}} />
                      <RechartsTooltip contentStyle={{backgroundColor:'#fff', borderColor:'#e2e8f0', color:'#333', borderRadius:'8px', fontWeight: 'bold'}} />
                      <Line type="monotone" dataKey="주간온도" stroke="#ef4444" strokeWidth={3} dot={{r:5}} connectNulls={true} isAnimationActive={false} />
                      <Line type="monotone" dataKey="야간온도" stroke="#3b82f6" strokeWidth={3} dot={{r:5}} connectNulls={true} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                <h4 className="text-emerald-600 font-black text-sm mb-4 text-center">↕️ 주야간 온도차 (DIF) 추이</h4>
                <div className="flex-grow" style={{minHeight: '250px'}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={safeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" tick={{fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis stroke="#64748b" tick={{fontSize: 10, fontWeight: 'bold'}} />
                      <RechartsTooltip contentStyle={{backgroundColor:'#fff', borderColor:'#e2e8f0', color:'#333', borderRadius:'8px', fontWeight: 'bold'}} cursor={{fill: '#f8fafc'}} />
                      <Bar dataKey="DIF_Chart" name="DIF" fill="#10b981" isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
              <h4 className="text-slate-700 font-black text-sm mb-2">📊 최근 7일 온습도 통계 원본 데이터</h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-inner">
                <table className="w-full text-center text-slate-600" style={{fontSize: '12px', minWidth: '500px'}}>
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-3 font-black border-b border-slate-200">날짜</th>
                      <th className="p-3 text-rose-500 font-black border-b border-slate-200">주간 평균 (06~18시)</th>
                      <th className="p-3 text-blue-500 font-black border-b border-slate-200">야간 평균 (18~06시)</th>
                      <th className="p-3 text-emerald-600 font-black border-b border-slate-200">DIF (온도차)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {baseData.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold">{row.date}</td>
                        <td className="p-3 font-bold">{row.주간온도 ? `${row.주간온도}°C` : '-'}</td>
                        <td className="p-3 font-bold">{row.야간온도 ? `${row.야간온도}°C` : '-'}</td>
                        <td className="p-3 font-black text-emerald-500">
                          {row.DIF !== null ? `${row.DIF}°C` : <span className="text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200" style={{fontSize: '10px'}}>야간 대기중</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {dataTab === 'growth' && (
          <div className="flex flex-col gap-6 h-full" ref={formTopRef}>
            
            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-emerald-200 shadow-md flex flex-col shrink-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <h3 className="text-emerald-600 font-black text-base sm:text-lg flex items-center gap-2">
                  <span>📋</span> 
                  <span>생육데이터 {editingGrowthId ? '수정 모드' : '직접 입력'}</span>
                </h3>
                {editingGrowthId && (
                  <button onClick={handleResetGrowthForm} className="bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-black transition-all shadow-sm text-xs w-full sm:w-auto">
                    수정 취소하고 신규 작성
                  </button>
                )}
              </div>
              
              <form onSubmit={handleSaveGrowth} className="flex flex-col gap-3">
                <div className="text-slate-500 mb-2 bg-slate-50 p-3 rounded-xl border border-slate-200 w-full sm:w-fit shadow-sm text-xs font-bold flex flex-wrap gap-2">
                  <span>🏢 농가명: <strong className="text-emerald-600 text-sm bg-white px-2 py-0.5 rounded border border-slate-100">{farmSettings.farmName}</strong></span>
                  <span className="hidden sm:inline">|</span>
                  <span>🧑‍🌾 조사자: <strong className="text-emerald-600 text-sm bg-white px-2 py-0.5 rounded border border-slate-100">{farmSettings.surveyor}</strong></span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 text-sm mb-2">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <label className="text-slate-500 block mb-1 font-black text-xs px-1">조사일자</label>
                    <input type="date" value={growthFormHeader.date} onChange={e=>setGrowthFormHeader({...growthFormHeader, date:e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-800 font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none transition-all shadow-sm" required />
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <label className="text-slate-500 block mb-1 font-black text-xs px-1">개체번호</label>
                    <input type="number" value={growthFormHeader.plantId} onChange={e=>setGrowthFormHeader({...growthFormHeader, plantId:e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-800 font-bold text-center focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none transition-all shadow-sm" required />
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <label className="text-slate-500 block mb-1 font-black text-xs px-1">착과습성</label>
                    <select value={growthFormHeader.habit} onChange={e=>setGrowthFormHeader({...growthFormHeader, habit:e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-800 font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none transition-all shadow-sm">
                      <option value="어미">어미</option>
                      <option value="어미+아들">어미+아들</option>
                      <option value="아들">아들</option>
                    </select>
                  </div>
                </div>

                <div className="relative mt-2">
                  <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1 sm:hidden"><span className="text-emerald-500 animate-pulse">👉</span> 표를 좌우로 스크롤하여 모든 항목을 입력하세요</p>
                  <div className="overflow-x-auto bg-white p-1 rounded-2xl border border-slate-200 overflow-y-auto shadow-inner" style={{height: '350px'}}>
                    <table className="w-full text-center text-slate-700 relative" style={{fontSize: '11px', minWidth: '1200px'}}>
                      <thead className="bg-emerald-50 text-emerald-800 sticky top-0 z-10 shadow-sm border-b-2 border-emerald-200">
                        <tr>
                          <th className="p-3 w-10 font-black">삭제</th>
                          <th className="p-3 w-16 font-black">덩굴<br/>(1엄/2아)</th>
                          <th className="p-3 w-16 font-black">본주<br/>마디</th>
                          <th className="p-3 w-16 font-black">아들<br/>마디</th>
                          <th className="p-3 bg-emerald-100 font-black">절간장<br/>(cm)</th>
                          <th className="p-3 font-black">줄기굵기<br/>(mm)</th>
                          <th className="p-3 font-black">엽장<br/>(cm)</th>
                          <th className="p-3 font-black">엽폭<br/>(cm)</th>
                          <th className="p-3 w-20 font-black">엽상태<br/>(1/2/3)</th>
                          <th className="p-3 w-16 font-black">암꽃<br/>(1유/0무)</th>
                          <th className="p-3 w-16 font-black">수확<br/>(1수/2적)</th>
                          <th className="p-3 w-24 font-black">열매상태<br/>(0/1/2)</th>
                          <th className="p-3 bg-teal-100 font-black">곡선(cm)</th>
                          <th className="p-3 bg-teal-100 font-black">직선(cm)</th>
                          <th className="p-3 bg-teal-100 font-black">과폭(mm)</th>
                          <th className="p-3 w-40 font-black">비고</th>
                        </tr>
                      </thead>
                      <tbody>
                        {growthRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                            <td className="p-1.5"><button type="button" onClick={()=>setGrowthRows(growthRows.filter((_,i)=>i!==idx))} className="bg-rose-50 text-rose-500 w-full py-2 rounded-lg hover:bg-rose-500 hover:text-white font-black border border-rose-200 shadow-sm transition-colors">✕</button></td>
                            <td className="p-1.5 border-l border-r border-slate-100"><select value={row.vineType} onChange={e=>updateGrowthRow(idx, 'vineType', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-center font-bold focus:border-emerald-500 focus:outline-none shadow-inner"><option value="1">1</option><option value="2">2</option></select></td>
                            <td className="p-1.5 border-r border-slate-100"><input type="number" value={row.mainNode} onChange={e=>updateGrowthRow(idx, 'mainNode', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-center font-bold focus:border-emerald-500 focus:outline-none shadow-inner" /></td>
                            <td className="p-1.5 border-r border-slate-100"><input type="number" value={row.branchNode} onChange={e=>updateGrowthRow(idx, 'branchNode', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-center font-bold focus:border-emerald-500 focus:outline-none shadow-inner" /></td>
                            <td className="p-1.5 border-r border-slate-100 bg-emerald-50/50"><input type="number" step="0.1" value={row.internode} onChange={e=>updateGrowthRow(idx, 'internode', e.target.value)} className="w-full bg-white border border-emerald-200 rounded p-2 text-center text-emerald-600 font-black focus:border-emerald-500 focus:outline-none shadow-inner" /></td>
                            <td className="p-1.5 border-r border-slate-100"><input type="number" step="0.1" value={row.stemThick} onChange={e=>updateGrowthRow(idx, 'stemThick', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-center font-bold focus:border-emerald-500 focus:outline-none shadow-inner" /></td>
                            <td className="p-1.5 border-r border-slate-100"><input type="number" step="0.1" value={row.leafLen} onChange={e=>updateGrowthRow(idx, 'leafLen', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-center font-bold focus:border-emerald-500 focus:outline-none shadow-inner" /></td>
                            <td className="p-1.5 border-r border-slate-100"><input type="number" step="0.1" value={row.leafWidth} onChange={e=>updateGrowthRow(idx, 'leafWidth', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-center font-bold focus:border-emerald-500 focus:outline-none shadow-inner" /></td>
                            <td className="p-1.5 border-r border-slate-100"><select value={row.leafState} onChange={e=>updateGrowthRow(idx, 'leafState', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-center font-bold focus:border-emerald-500 focus:outline-none shadow-inner"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></td>
                            <td className="p-1.5 border-r border-slate-100"><select value={row.femaleFl} onChange={e=>updateGrowthRow(idx, 'femaleFl', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-center font-bold focus:border-emerald-500 focus:outline-none shadow-inner"><option value="1">1</option><option value="0">0</option></select></td>
                            <td className="p-1.5 border-r border-slate-100"><select value={row.harvest} onChange={e=>updateGrowthRow(idx, 'harvest', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-center font-bold focus:border-emerald-500 focus:outline-none shadow-inner"><option value="0">-</option><option value="1">1</option><option value="2">2</option></select></td>
                            <td className="p-1.5 border-r border-slate-100"><select value={row.fruitState} onChange={e=>updateGrowthRow(idx, 'fruitState', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-center font-bold focus:border-emerald-500 focus:outline-none shadow-inner"><option value="0">0</option><option value="1">1</option><option value="2">2</option></select></td>
                            <td className="p-1.5 border-r border-slate-100 bg-teal-50/50"><input type="number" step="0.1" value={row.curve} onChange={e=>updateGrowthRow(idx, 'curve', e.target.value)} className="w-full bg-white border border-teal-200 rounded p-2 text-center font-bold focus:border-teal-500 focus:outline-none shadow-inner" /></td>
                            <td className="p-1.5 border-r border-slate-100 bg-teal-50/50"><input type="number" step="0.1" value={row.straight} onChange={e=>updateGrowthRow(idx, 'straight', e.target.value)} className="w-full bg-white border border-teal-200 rounded p-2 text-center font-bold focus:border-teal-500 focus:outline-none shadow-inner" /></td>
                            <td className="p-1.5 border-r border-slate-100 bg-teal-50/50"><input type="number" step="0.1" value={row.fruitWidth} onChange={e=>updateGrowthRow(idx, 'fruitWidth', e.target.value)} className="w-full bg-white border border-teal-200 rounded p-2 text-center font-bold focus:border-teal-500 focus:outline-none shadow-inner" /></td>
                            <td className="p-1.5"><input type="text" value={row.note} onChange={e=>updateGrowthRow(idx, 'note', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:border-emerald-500 focus:outline-none shadow-inner" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" onClick={()=>setGrowthRows(growthRows.concat(createEmptyGrowthRow()))} className="w-full mt-3 py-4 bg-slate-50 border-2 border-dashed border-slate-300 text-slate-500 font-black rounded-xl hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-all shadow-sm">
                    + 측정 마디(Row) 추가하기
                  </button>
                </div>

                <div className="flex gap-2 mt-4">
                  <button type="submit" className="flex-1 py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-base sm:text-lg shadow-lg shadow-emerald-500/30 transition-all active:scale-95">
                    💾 DB에 {editingGrowthId ? '수정본 덮어쓰기 (자동 정렬)' : '새 조사표 저장하기 (자동 정렬)'}
                  </button>
                </div>
              </form>
            </div>

            <div className="flex-grow bg-white p-4 sm:p-6 rounded-3xl border border-emerald-200 shadow-md flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <h3 className="text-slate-700 font-black text-sm sm:text-base flex flex-col sm:flex-row sm:items-center gap-1">
                  <span>📁 과거 조사 상세 기록부</span>
                  <span className="text-emerald-500 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100" style={{fontSize: '10px'}}>헤더 클릭 시 정렬</span>
                </h3>
                <button onClick={handleExportGrowthExcel} className="w-full sm:w-auto bg-teal-500 hover:bg-teal-600 text-white px-4 py-3 sm:py-2 rounded-xl font-black transition-all shadow-sm flex items-center justify-center gap-2 text-xs sm:text-sm">📥 엑셀 다운로드</button>
              </div>
              <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1 sm:hidden"><span className="text-emerald-500 animate-pulse">👉</span> 표를 좌우로 스크롤하여 확인하세요</p>
              <div className="flex-grow overflow-auto border-2 border-slate-200 rounded-2xl bg-slate-50 shadow-inner">
                <table className="w-full text-center text-slate-600" style={{fontSize: '11px', minWidth: '1400px'}}>
                  <thead className="bg-emerald-100 text-emerald-800 sticky top-0 shadow-sm border-b-2 border-emerald-200 z-10">
                    <tr>
                      <th className="p-3 w-20 cursor-pointer hover:bg-emerald-200 transition-colors font-black" onClick={() => requestSort('date')}>조사일자{getSortIcon('date')}</th>
                      <th className="p-3 w-12 cursor-pointer hover:bg-emerald-200 transition-colors font-black" onClick={() => requestSort('plantId')}>개체{getSortIcon('plantId')}</th>
                      <th className="p-3 w-10 cursor-pointer hover:bg-emerald-200 transition-colors font-black" onClick={() => requestSort('vineType')}>덩굴{getSortIcon('vineType')}</th>
                      <th className="p-3 w-10 cursor-pointer hover:bg-emerald-200 transition-colors text-emerald-700 font-black" onClick={() => requestSort('mainNode')}>본주{getSortIcon('mainNode')}</th>
                      <th className="p-3 w-10 cursor-pointer hover:bg-emerald-200 transition-colors font-black" onClick={() => requestSort('branchNode')}>아들{getSortIcon('branchNode')}</th>
                      <th className="p-3 cursor-pointer hover:bg-emerald-200 transition-colors text-teal-700 font-black" onClick={() => requestSort('internode')}>절간장{getSortIcon('internode')}</th>
                      <th className="p-3 cursor-pointer hover:bg-emerald-200 transition-colors font-black" onClick={() => requestSort('stemThick')}>줄기굵기{getSortIcon('stemThick')}</th>
                      <th className="p-3 cursor-pointer hover:bg-emerald-200 transition-colors font-black" onClick={() => requestSort('leafLen')}>엽장{getSortIcon('leafLen')}</th>
                      <th className="p-3 cursor-pointer hover:bg-emerald-200 transition-colors font-black" onClick={() => requestSort('leafWidth')}>엽폭{getSortIcon('leafWidth')}</th>
                      <th className="p-3 cursor-pointer hover:bg-emerald-200 transition-colors font-black" onClick={() => requestSort('leafState')}>엽상태{getSortIcon('leafState')}</th>
                      <th className="p-3 cursor-pointer hover:bg-emerald-200 transition-colors font-black" onClick={() => requestSort('femaleFl')}>암꽃{getSortIcon('femaleFl')}</th>
                      <th className="p-3 cursor-pointer hover:bg-emerald-200 transition-colors font-black" onClick={() => requestSort('harvest')}>수확{getSortIcon('harvest')}</th>
                      <th className="p-3 cursor-pointer hover:bg-emerald-200 transition-colors font-black" onClick={() => requestSort('fruitState')}>열매상태{getSortIcon('fruitState')}</th>
                      <th className="p-3 cursor-pointer hover:bg-emerald-200 transition-colors font-black" onClick={() => requestSort('curve')}>곡선{getSortIcon('curve')}</th>
                      <th className="p-3 cursor-pointer hover:bg-emerald-200 transition-colors font-black" onClick={() => requestSort('straight')}>직선{getSortIcon('straight')}</th>
                      <th className="p-3 cursor-pointer hover:bg-emerald-200 transition-colors font-black" onClick={() => requestSort('fruitWidth')}>과폭{getSortIcon('fruitWidth')}</th>
                      <th className="p-3 cursor-pointer hover:bg-emerald-200 transition-colors font-black" onClick={() => requestSort('note')}>비고{getSortIcon('note')}</th>
                      <th className="p-3 w-28 font-black">관리 (개체전체)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFlattenedLogs.length === 0 && <tr><td colSpan="18" className="text-center p-10 text-slate-400 font-bold">작성된 기록이 없습니다. 위 폼에서 새로 입력해 주세요.</td></tr>}
                    {sortedFlattenedLogs.map((row, idx) => (
                      <tr key={idx} className={`border-b border-slate-200 hover:bg-white transition-colors ${editingGrowthId === row.logId ? 'bg-emerald-100/50' : ''}`}>
                        <td className="p-2 font-black text-slate-700">{row.date}</td>
                        <td className="p-2 font-black text-emerald-600 bg-emerald-50">{row.plantId}</td>
                        <td className="p-2 font-bold">{row.vineType}</td>
                        <td className="p-2 font-black text-emerald-600 bg-emerald-50">{row.mainNode}</td>
                        <td className="p-2 font-bold">{row.branchNode}</td>
                        <td className="p-2 text-teal-600 font-black bg-teal-50">{row.internode}</td>
                        <td className="p-2 font-bold">{row.stemThick}</td>
                        <td className="p-2 font-bold">{row.leafLen}</td>
                        <td className="p-2 font-bold">{row.leafWidth}</td>
                        <td className="p-2 font-bold">{row.leafState}</td>
                        <td className="p-2 font-bold">{row.femaleFl}</td>
                        <td className="p-2 font-bold">{row.harvest}</td>
                        <td className="p-2 font-bold">{row.fruitState}</td>
                        <td className="p-2 font-bold">{row.curve}</td>
                        <td className="p-2 font-bold">{row.straight}</td>
                        <td className="p-2 font-bold">{row.fruitWidth}</td>
                        <td className="p-2 font-bold">{row.note}</td>
                        
                        <td className="p-2 flex justify-center gap-1.5">
                          {idx === 0 || Reflect.get(sortedFlattenedLogs, idx - 1).logId !== row.logId ? (
                            <React.Fragment>
                              <button onClick={() => handleEditGrowthBtn(row.originalLog)} className="bg-blue-50 text-blue-500 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-500 hover:text-white transition-all font-black shadow-sm text-[10px]">수정</button>
                              <button onClick={() => handleDeleteGrowth(row.logId)} className="bg-rose-50 text-rose-500 border border-rose-200 px-3 py-1.5 rounded-lg hover:bg-rose-500 hover:text-white transition-all font-black shadow-sm text-[10px]">삭제</button>
                            </React.Fragment>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {dataTab === 'log' && (
          <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <h3 className="text-emerald-600 font-black text-sm">🧪 공용 농약 방제 기록</h3>
              <button onClick={() => setShowModal(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-black transition-all shadow-sm w-full sm:w-auto text-xs">새 기록 작성</button>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-slate-600" style={{fontSize: '11px', minWidth: '600px'}}>
                <thead className="bg-slate-100 text-slate-700">
                  <tr><th className="p-3 font-black">방제일자</th><th className="p-3 font-black">대상</th><th className="p-3 font-black">농약명</th><th className="p-3 font-black">비율</th><th className="p-3 font-black">목적</th><th className="p-3 text-center font-black">작성자</th></tr>
                </thead>
                <tbody>
                  {pesticideLogs.length === 0 && <tr><td colSpan="6" className="text-center p-6 text-slate-400 font-bold">기록이 없습니다.</td></tr>}
                  {pesticideLogs.map((log, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-700">{log.date}</td><td className="p-3 font-bold">{log.target}</td><td className="p-3 text-emerald-600 font-black bg-emerald-50/50">{log.pesticide}</td><td className="p-3 font-bold">{log.ratio}</td><td className="p-3 font-bold">{log.purpose}</td><td className="p-3 text-center font-bold">{log.author}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="absolute top-0 left-0 w-full h-full bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSavePesticide} className="bg-white border border-emerald-200 p-6 sm:p-8 rounded-3xl w-full max-w-md flex flex-col gap-5 shadow-2xl">
            <h2 className="text-emerald-600 font-black text-xl mb-2">새 방제 기록 작성</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-slate-500 block mb-2 font-black text-xs">날짜</label><input type="date" value={newLog.date} onChange={e=>setNewLog({...newLog, date:e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all" required /></div>
              <div><label className="text-slate-500 block mb-2 font-black text-xs">대상 구역</label><input type="text" value={newLog.target} onChange={e=>setNewLog({...newLog, target:e.target.value})} placeholder="예: 전체 하우스" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all" required /></div>
            </div>
            <div><label className="text-slate-500 block mb-2 font-black text-xs">사용 농약명</label><input type="text" value={newLog.pesticide} onChange={e=>setNewLog({...newLog, pesticide:e.target.value})} placeholder="예: 오티바 수화제" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all" required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-slate-500 block mb-2 font-black text-xs">희석 비율</label><input type="text" value={newLog.ratio} onChange={e=>setNewLog({...newLog, ratio:e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all" required /></div>
              <div><label className="text-slate-500 block mb-2 font-black text-xs">작성자</label><input type="text" value={newLog.author} onChange={e=>setNewLog({...newLog, author:e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all" required /></div>
            </div>
            <div><label className="text-slate-500 block mb-2 font-black text-xs">방제 목적 (대상 병해충)</label><input type="text" value={newLog.purpose} onChange={e=>setNewLog({...newLog, purpose:e.target.value})} placeholder="예: 흰가루병 예방" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all" required /></div>
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 font-black text-sm transition-colors border border-slate-200">작성 취소</button>
              <button type="submit" className="flex-1 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-md shadow-emerald-500/30 transition-colors">DB 저장하기</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const CCTVView = ({ onChangeView, onLogout }) => {
  const [selectedCam, setSelectedCam] = useState(null);
  const cams = Array.of("1동", "2동", "3동", "4동", "작업장");
  const streamUrls = { "1동": `${MY_SERVER_URL}/api/stream/1`, "2동": null, "3동": null, "4동": null, "작업장": null };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">
      <PageHeader title="📹 CCTV 실시간 관제" onChangeView={onChangeView} currentView="cctv" onLogout={onLogout} />
      <div className={`grid gap-4 h-full pb-10 ${selectedCam ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {cams.map((name, i) => {
          if (selectedCam && selectedCam !== name) return null;
          const isStreaming = Reflect.get(streamUrls, name) !== null;
          return (
            <div key={i} onClick={() => setSelectedCam(selectedCam ? null : name)} className={`relative bg-slate-200 rounded-3xl border-2 transition-all cursor-pointer overflow-hidden group shadow-sm ${selectedCam ? 'h-full border-emerald-400 shadow-[0_10px_30px_rgba(16,185,129,0.2)]' : 'h-48 sm:h-60 border-slate-300 hover:border-emerald-300 hover:shadow-md'}`}>
              <div className="absolute top-4 left-4 z-10 bg-white/90 px-4 py-2 rounded-xl text-xs font-black text-emerald-600 border border-emerald-100 shadow-sm backdrop-blur-md flex items-center gap-2">{name} {isStreaming && <span className="inline-block w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>}</div>
              {isStreaming ? (
                <img src={Reflect.get(streamUrls, name)} alt={`${name} CCTV`} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" onError={(e) => { e.target.onerror = null; e.target.src = ""; e.target.className = "hidden"; e.target.nextSibling.className = "w-full h-full flex flex-col items-center justify-center"; }} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100/50"><span className="text-6xl mb-4 opacity-20 text-slate-500 drop-shadow-md">📹</span><span className="text-xs text-slate-500 font-black tracking-widest bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">NO SIGNAL</span></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};