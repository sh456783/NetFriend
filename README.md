# 🔰 NetFriend
> **하이브리드 기반 실시간 침입 탐지 및 동적 대응 시스템**  
> Hybrid-based Real-Time Intrusion Detection & Dynamic Response System  

---

![GitHub last commit](https://img.shields.io/github/last-commit/Parkhs88/NetFriend?color=blue)
![GitHub repo size](https://img.shields.io/github/repo-size/Parkhs88/NetFriend?color=green)
![GitHub contributors](https://img.shields.io/github/contributors/Parkhs88/NetFriend)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## 프로젝트 개요

**NetFriend**는 내부 물리 서버(On-Premise)와 AWS EC2를 결합하여  
**실시간 침입 탐지(IDS)**, **부하 분산을 위한 하이브리드 서버 구조**,  
그리고 **자동 방화벽 대응(동적 대응)** 을 통합한 보안 시스템입니다.  

> 핵심 개념:  
> 내부 보안 시스템은 침입 탐지 결과에 따라  
> **자동으로 공격 IP를 차단하고, 보안 그룹(Security Group)을 실시간으로 조정**합니다.  
> 이러한 동적 대응을 통해 내부 네트워크는 지속적으로 안전한 상태를 유지합니다.
---

## 주요 기능

### 1. 침입 탐지 (Intrusion Detection)
- 네트워크 트래픽을 실시간으로 감시하고, 공격으로 의심되는 패킷을 탐지  
- 탐지된 이벤트는 로그(`eve.json`)로 저장되고 웹 대시보드로 전송  
- SSH, HTTP, ICMP 등 주요 포트를 중심으로 트래픽 분석  

### 2. 하이브리드 서버 구조 (Hybrid Server Architecture)
- 내부 물리 서버와 AWS EC2 서버가 **연결된 이중 구조**  
- 물리 서버가 기본적으로 트래픽을 처리하며,  
  **부하가 발생하면 EC2 서버가 자동으로 지원(Load Balancing)**  
- EC2 서버는 동일한 IDS 환경을 유지하며  
  물리 서버의 안정성과 가용성을 향상시킵니다.  

### 3. 동적 대응 시스템 (Dynamic Response)
- 탐지된 공격 이벤트에 따라 자동으로 **보안 그룹(Security Group)** 규칙을 수정  
- 공격 IP를 즉시 차단하고, 관리자에게 **알림(Slack, Discord, Email, Dashboard)** 발송  
- AWS IAM Role과 Boto3 스크립트를 활용한 **자동화 방화벽 시스템 구현**  

---

## 웹 대시보드 (Server-Monitor)
- **FastAPI + React.js** 기반의 실시간 통합 대시보드  
- Suricata 탐지 로그(`eve.json`) + AWS CloudWatch 메트릭 연동  
- 주요 기능:
  - CPU / Memory / Network 사용률 실시간 모니터링  
  - 공격 탐지 로그를 심각도별로 시각화  
  - 알림 및 차단 현황 표시  

---

## 시스템 구조도

```plaintext
                    사용자 트래픽
                          │
                          ▼
        ┌────────────────────────────┐
        │       내부 서버 (On-Premise) │
        │  ├─ 침입 탐지 모듈 (IDS)      │
        │  └─ 백엔드 서버 (API)         │
        └────────────────────────────┘
                          │
                부하 발생 시 (Load Threshold)
                          │
                          ▼
        ┌────────────────────────────┐
        │         AWS EC2 서버        │
        │  ├─ 내부 서버의 부하 분산 지원 │
        │  └─ 실시간 모니터링 및 대응    │
        └────────────────────────────┘
                          │
                          ▼
               웹 대시보드 (상태 및 탐지 시각화)
