## 🔰 NetFriend
Hybrid-Based Real-Time Intrusion Detection & Dynamic Response System  
하이브리드 기반 실시간 침입 탐지 및 동적 대응 시스템

[![last commit](https://img.shields.io/github/last-commit/sh456783/NetFriend)](https://github.com/sh456783/NetFriend/commits)
![repo size](https://img.shields.io/github/repo-size/sh456783/NetFriend)
![contributors](https://img.shields.io/github/contributors/sh456783/NetFriend)
[![license MIT](https://img.shields.io/github/license/sh456783/NetFriend)](LICENSE)

---

### 프로젝트 개요
NetFriend는 내부 물리 서버(On-Premise)와 AWS EC2 환경을 함께 사용하는  
하이브리드 보안·모니터링 시스템입니다. Suricata 기반 침입 탐지, 자동 IP 차단, 서버 상태 모니터링, Auto Scaling 기반 확장 기능을 제공합니다.

FastAPI, React Dashboard, StrongSwan VPN, CloudWatch Agent 등을 활용하여 IDS 탐지 → 처리 → 대응 → 시각화까지 하나의 파이프라인으로 구성하였습니다.

---

## 주요 기능

### ► 침입 탐지 (Suricata)
- 패킷 기반 실시간 분석
- eve.json / fast.log 이벤트 파싱
- SSH / HTTP / ICMP 등 주요 프로토콜 감시
- Custom Rule 적용 가능

---

### ► 하이브리드 서버 구조
- On-Premise ↔ AWS 간 Site-to-Site VPN (StrongSwan IKEv2)
- 물리 서버 CPU 지표를 CloudWatch로 전송
- AWS EC2에서 물리 DB 직접 접근 가능
- 내부 서버 + 클라우드 서버 통합 운영 구조

---

### ► 동적 대응 시스템
- Suricata 이벤트 기반 자동 대응
- 위험도가 높은 탐지 이벤트는 IPS 정책으로 즉시 차단
- ipset 기반 고속 IP 차단 처리
- 로그인 실패 5회 시 자동 차단(Fail2Ban 개선 버전)
- 차단·해제 전 과정을 대시보드에서 제어

---

### ► 웹 대시보드 (Server-Monitor)
FastAPI + React 기반의 모니터링 및 제어 인터페이스.

제공 기능:
- EC2 인스턴스 상태 조회 / Start / Stop
- CloudWatch CPU 그래프 (물리 서버 + EC2)
- IDS 이벤트 로그 실시간 표시
- EC2 시스템 로그(Base64 → text) 출력
- 자동/수동 IP 차단 목록 관리
- Authentication 기반 접근 제어

---

## 시스템 구조도

```text
                                        사용자 브라우저
                                             │
                                             ▼

                               ┌───────────────────────────────┐
                               │        React 웹 대시보드       │
                               └───────────────────────────────┘
                                             │
                                             ▼

                               ┌───────────────────────────────┐
                               │       Nginx Reverse Proxy      │
                               └───────────────────────────────┘
                                             │
                                             ▼

                               ┌───────────────────────────────┐
                               │         FastAPI Backend        │
                               │     ├ Suricata IDS 연동        │
                               │     ├ AWS EC2 API 연동         │
                               │     └ ipset 자동 차단          │
                               └───────────────────────────────┘


        ================================================================================
                            VPN Tunnel (StrongSwan IKEv2 - Encrypted)
        ================================================================================
 

                               ┌───────────────────────────────┐
                               │      On-Premise 물리 서버       │
                               │   ├ 내부 서비스 (Local Site)    │
                               │   └ CloudWatch Agent           │
                               └───────────────────────────────┘
                                             │
                                             ▼

                               ┌───────────────────────────────┐
                               │        AWS 보안 서버 (EC2)     │
                               │     ├ IDS / Dashboard          │
                               │     ├ Auto Scaling Group       │
                               │     └ Load Balancer            │
                               └───────────────────────────────┘



📁 디렉터리 구조 (Repository Structure)
NetFriend/
├── EC2_IDS/ # EC2 서버 구축 및 Suricata IDS 구성
├── hybrid_server/ # VPN + 물리 서버 연동 및 오토스케일링 & 로드벨런서
├── internal_security/ # Fail2Ban(ipset) + IPS 기반 보안 기능
├── server-monitor/ # FastAPI + React 대시보드
└── README.md # Main README

📄 문서 (Documentation)
IDS 설치, VPN 구성, CloudWatch 설정, Auto Scaling 환경 등  
전체 구성 과정은 프로젝트 문서(PDF, PPT)에 정리되어 있습니다.
