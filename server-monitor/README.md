# server-monitor [Web Dashboard]  
FastAPI × React 기반 서버 모니터링 대시보드

이 폴더는 **EC2 보안 서버**, **Auto Scaling으로 생성된 복제 인스턴스**,  
그리고 **온프레미스 물리 서버(VM)** 에서 수집한 데이터를  
웹 UI로 통합 확인할 수 있도록 구성된 서버 모니터링 대시보드입니다.

Suricata IDS 로그, CloudWatch 메트릭(EC2 + 물리 서버),  
EC2 제어 기능과 함께 **IP 차단 목록(자동/수동)을 한 화면에서 관리**할 수 있습니다.

---

## 주요 기능

### ● IDS 로그 모니터링
- Suricata가 생성한 `eve.json` 이벤트를 FastAPI에서 수집 및 가공  
- 탐지 시간, 시그니처, 출발지/목적지 IP 등 기본 탐지 정보 표시  
- 위험도(Severity)에 따라 탐지 이벤트를 구분하여 시각화

### ● 시스템 메트릭 모니터링 (EC2 + 물리 서버)
- EC2 인스턴스 CPU 메트릭을 CloudWatch에서 수집하여 그래프로 표시  
- **온프레미스 물리 서버도 CloudWatch Agent를 설치해 CPU 지표를 CloudWatch로 전송**  
  → 대시보드에서 EC2 인스턴스와 동일한 방식으로 조회 가능  
- Auto Scaling으로 생성된 복제 인스턴스도 자동으로 목록에 포함되어 메트릭 조회 가능

### ● 콘솔 / 시스템 로그 확인
- EC2 및 Auto Scaling 인스턴스의 시스템 로그 확인 가능  
- 장애 상황 분석 및 서버 상태 점검에 활용

### ● EC2 인스턴스 제어
- EC2 인스턴스 Start / Stop / 상태 조회 기능 제공  
- 메인 서버뿐 아니라 Auto Scaling 인스턴스도 동일한 방식으로 제어 가능

### ● IP 차단 관리 (차단 목록 대시보드)
- Suricata 탐지 이벤트 기반 **ipset 자동 차단** 기능 구현  
- 차단된 IP 리스트 조회  
- **수동 차단 추가 / 차단 해제(언밴) / 만료 시간(TTL) 기반 관리** 지원

---

## 참고
- 본 대시보드는 **Nginx Reverse Proxy 환경 기준**으로 배포되었습니다.  
- 로컬 개발 환경에서는 기본 포트로 React(3000), FastAPI(8000)를 사용합니다.  
- **물리 서버 CPU 지표는 CloudWatch Agent를 통해 AWS CloudWatch로 전송**되며,  
  대시보드에서 EC2 인스턴스와 동일한 방식으로 표시됩니다.  
- Auto Scaling 인스턴스는 생성/삭제에 따라 **대시보드 목록에 자동 반영**됩니다.

---

## 📄 문서 안내
- 웹 대시보드 **구현 과정, IP 차단 리스트 설계, 동작 흐름**에 대한  
  상세 설명 문서는 `docs/` 디렉터리에 정리되어 있습니다. 
## 📂 폴더 구조

```text
server-monitor/
├── README.md              # 웹 대시보드 모듈 설명
├── main.py                # FastAPI 백엔드 (로그/메트릭/제어 API)
├── frontend/              # React 기반 대시보드
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js
│       ├── index.js
│       └── components/    # 그래프, 카드, 로그 리스트 등 UI 컴포넌트
│           └── ...
└── docs/                  # 구현 및 설계 문서
    └── README.md
