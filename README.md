#🔰 NetFriend  
하이브리드 기반 실시간 침입 탐지 및 동적 대응 시스템  
Hybrid-based Real-Time Intrusion Detection & Dynamic Response System  

[![last commit](https://img.shields.io/github/last-commit/sh456783/NetFriend)](https://github.com/sh456783/NetFriend/commits)
![repo size](https://img.shields.io/github/repo-size/sh456783/NetFriend)
![contributors](https://img.shields.io/github/contributors/sh456783/NetFriend)
[![license MIT](https://img.shields.io/github/license/sh456783/NetFriend)](LICENSE)

---

## 프로젝트 개요

**NetFriend**는 내부 물리 서버(On-Premise)와 AWS EC2 보안 서버를 연동하여  
**실시간 침입 탐지(IDS)**, **동적 IP 차단**, **서버 상태 모니터링**,  
**Auto Scaling 기반 서비스 복제**까지 제공하는 하이브리드 보안 플랫폼입니다.

Suricata IDS, FastAPI, React Dashboard, StrongSwan VPN,  
AWS CloudWatch Agent 등 다양한 보안·운영 컴포넌트를 통합해  
**감지 → 분석 → 대응 → 시각화**가 하나의 흐름으로 작동하도록 설계되었습니다.

---

## 주요 기능

### **1) 침입 탐지 (Intrusion Detection: Suricata)**
- Suricata 기반 실시간 패킷 분석
- eve.json/fast.log 기반 공격 탐지 이벤트 생성
- SSH / HTTP / ICMP 등 주요 포트 모니터링
- Custom Rule 기반 사용자 정의 탐지 가능

---

### **2) 하이브리드 서버 구조 (Hybrid Server Architecture)**
- On-Premise 서버 ↔ AWS 간 Site-to-Site VPN 연결 (StrongSwan IKEv2)
- 물리 서버 CPU 메트릭을 CloudWatch로 전송
- AWS EC2에서 물리 DB에 직접 접근 가능한 구조
- 내부 서비스 + 클라우드 서비스 통합 운영

---

### **3) 동적 대응 시스템 (Dynamic Response)**
- Suricata 탐지 이벤트 기반 자동 대응
- ipset 기반 고속 IP 차단 시스템
- 로그인 실패 5회 → 자동 차단 (Fail2Ban 개선 버전)
- 모든 차단·해제 기능을 웹 대시보드에서 관리

---

### **4) 웹 대시보드 (Server-Monitor)**
**FastAPI + React + Nginx 기반 실시간 모니터링 & 제어 시스템**

- EC2 인스턴스 상태 조회 및 Start/Stop 제어
- CloudWatch CPU 그래프(물리 서버 + EC2 모두 지원)
- IDS 이벤트 로그 실시간 표시
- EC2 시스템 콘솔 로그(Base64 디코딩) 조회 기능
- 수동/자동 IP 차단 목록 관리
- Authentication 기반 접근 제어

---

## 시스템 구조도

사용자 브라우저
│
▼
웹 대시보드 (React)
│
Nginx Reverse Proxy
│
FastAPI Backend
├── Suricata IDS 로그 파싱
├── AWS EC2 / CloudWatch API 연동
└── ipset 기반 자동 차단 시스템

──────────────────────────────────

내부 물리 서버 (On-Premise)
└── StrongSwan VPN(IKEv2) 연결

AWS 보안 서버 (EC2)
├── IDS / Dashboard
├── Auto Scaling 그룹
└── Application Load Balancer

## Repository Structure
NetFriend/
├── EC2_IDS/ # Suricata IDS 구성
├── hybrid_server/ # VPN + 물리서버 연동 구성
├── internal_security/ # Fail2Ban(ipset) 기반 + IPS 보안 시스템
├── server-monitor/ # FastAPI + React 대시보드
└── README.md # 메인 문서

## 📎 Documentation

프로젝트 전체 과정(IDS 설치, VPN 구성, CloudWatch Agent, ASG/LB 등)은  
첨부된 문서(PDF, PPT)에 정리되어 있습니다.

