import React, { useState } from 'react';
import './LandingPage.css';
import heroImg from './assets/vinyl_house.png';

const featuresData = [
  {
    id: 1,
    icon: '🤖',
    title: 'AI 정밀 제어',
    desc: '생육 단계별 최적 온습도 알고리즘을 통해 수동 조작 없이도 최상의 환경을 유지합니다.',
    impl: '현재 Ollama 기반의 Gemma 4 로컬 모델을 연동하여 24시간 자율 제어 루프를 실행 중입니다. 데이터 분석을 통해 최적의 온습도를 자동으로 유지합니다.'
  },
  {
    id: 2,
    icon: '⚡',
    title: '엣지 게이트웨이',
    desc: '지연 없는 실시간 데이터 처리를 위해 각 동마다 독립적인 엣지 컴퓨팅 노드를 구축합니다.',
    impl: '127.0.0.1 브릿지를 활용하여 프론트엔드 대시보드와 로컬 Python 서버 간의 데이터를 지연 없이 실시간으로 중계하고 있습니다.'
  },
  {
    id: 3,
    icon: '📈',
    title: '데이터 파이프라인',
    desc: '수집된 빅데이터를 시계열 분석하여 수확 시기를 예측하고 품질을 표준화합니다.',
    impl: '센서 수집 데이터를 SQLite 데이터베이스에 누적하고 있으며, 아침/일간 보고서 생성 스크립트가 자동으로 작동하여 리포트를 발행합니다.'
  },
  {
    id: 4,
    icon: '💧',
    title: '지능형 관비',
    desc: '토양 상태에 따라 필요한 양분과 수분을 정확한 타이밍에 공급하여 자원을 절약합니다.',
    impl: '코코피트 배지 기반의 양액재배 시스템에서 각 오이 개체별로 설치된 드리퍼(리퍼)를 통해 필요한 양액을 정밀하게 분무/공급합니다.'
  },
  {
    id: 5,
    icon: '🛡️',
    title: '병해충 자동 기록',
    desc: '방제 이력을 데이터화하여 재발을 방지하고 효과적인 방제 타이밍을 제시합니다.',
    impl: '대시보드 내에 병해충 발생 구역 및 방제 이력 기록 모듈이 구현되어 있어 데이터베이스에 이력을 저장하고 관리합니다.'
  },
  {
    id: 6,
    icon: '📹',
    title: 'RTSP 실시간 스트리밍',
    desc: '언제 어디서나 고화질 영상을 통해 하우스 내부 상태를 육안으로 확인할 수 있습니다.',
    impl: '온실 내 카메라의 RTSP 스트림을 대시보드 내 모니터링 뷰에서 실시간으로 확인할 수 있도록 연동이 완료되었습니다.'
  }
];

const LandingPage = ({ onGoToApp }) => {
  const [activeFeature, setActiveFeature] = useState(null);
  return (
    <div className="landing-container">
      <div className="bg-gradient-overlay" />
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full p-4 sm:p-6 flex justify-between items-center z-50 backdrop-blur-xl border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="text-xl sm:text-2xl">🥒</span>
          <span className="font-black tracking-tighter text-lg sm:text-xl">FUTURICS</span>
        </div>
        
        {/* 메뉴: 모바일에서도 보이도록 hidden md:flex 제거 및 스타일 조정 */}
        <div className="flex gap-3 sm:gap-8 font-bold text-[10px] sm:text-sm text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">특징</a>
          <a href="#technology" className="hover:text-white transition-colors">기술</a>
          <a href="#contact" className="hover:text-white transition-colors">문의</a>
        </div>

        <button onClick={onGoToApp} className="px-3 py-1.5 sm:px-5 sm:py-2 bg-emerald-500 hover:bg-emerald-400 rounded-full text-[10px] sm:text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all shrink-0">
          스마트팜 농장 접속
        </button>
      </nav>

      {/* Hero Section */}
      <section className="hero-section pt-20 sm:pt-0">
        <div className="hero-content">
          <h1>THE FUTURE OF<br />CUCUMBER FARMING</h1>
          <p>
            데이터로 재배하고 AI로 완성하는 오이의 진화. <br />
            Futurics Smart Farm은 농업의 전통과 인공지능의 정밀함을 결합합니다.
          </p>
          
          <div className="image-showcase">
            <img src={heroImg} alt="Smart Cucumber Farm" />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-6">최고의 오이를 위한<br />지능형 솔루션</h2>
          <p className="text-slate-400">에이전트들이 설계한 3계층 아키텍처 기반의 통합 제어 시스템이 하우스를 24시간 지킵니다.</p>
        </div>
        
        <div className="features-grid">
          {featuresData.map((feature) => (
            <div 
              key={feature.id} 
              className="glass-card feature-item cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setActiveFeature(feature)}
            >
              <span className="feature-icon">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-20 border-t border-white/5 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-black mb-8">스마트팜의 미래를<br />함께 시작하세요.</h2>
          <p className="text-slate-400 mb-10">귀농 준비부터 대규모 농장 자동화까지, 전문가들이 맞춤형 솔루션을 제안해 드립니다.</p>
          <div className="flex justify-center gap-6 text-sm font-bold">
            <span className="text-primary">010-XXXX-XXXX</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300">support@futurics.farm</span>
          </div>
          <div className="mt-12 text-slate-600 text-xs">
            © 2026 FUTURICS SMART FARM. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Modal */}
      {activeFeature && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={() => setActiveFeature(null)}>
          <div className="bg-slate-900 border border-white/10 p-6 sm:p-8 rounded-2xl max-w-lg w-full relative" onClick={e => e.stopPropagation()}>
            <button 
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl"
              onClick={() => setActiveFeature(null)}
            >
              ✕
            </button>
            <span className="text-4xl mb-4 block">{activeFeature.icon}</span>
            <h3 className="text-2xl font-bold mb-2">{activeFeature.title}</h3>
            <p className="text-slate-300 leading-relaxed mb-6">{activeFeature.desc}</p>
            
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg">
              <h4 className="text-emerald-400 text-sm font-bold mb-1">현재 스마트팜 구현 사항</h4>
              <p className="text-slate-300 text-sm">{activeFeature.impl}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
