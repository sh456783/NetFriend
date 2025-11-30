# Hybrid Server Integration
On-Premise × Cloud Unified Monitoring & Secure VPN Setup

이 폴더는 **물리 서버(VM)**와 **AWS EC2 인스턴스**를 하나의 하이브리드 환경으로 통합하여  
실시간 CPU/메모리 모니터링, VPN 기반의 안정적인 통신, 보안 설정을 수행한 전체 과정을 정리한 폴더더입니다.

## Overview
Hybrid Server는 다음 3가지 핵심 기능을 중심으로 구성됩니다:

1. **Site-to-Site VPN 구축**
   - 물리 서버 ↔ AWS VPC 간 강력한 StrongSwan 기반 IPsec 연결
   - 500/4500/ESP 포트 사용
   - 안전한 온프레미스–클라우드 통신 채널 형성

2. **CloudWatch Agent 기반 모니터링**
   - 물리 서버의 CPU idle, user, system, memory 등 지표 수집
   - IAM 전용 접근 키 생성 후 안전하게 credentials 저장
   - CloudWatch Log/Metric으로 실시간 전송

3. **보안 정책 구성**
   - 윈도우 인바운드 차단 및 화이트리스트 기반 outbound 관리
   - 물리 서버의 네트워크 트래픽 보호
   - VM–EC2 간 통신만 허용하는 최소 권한 구성

---

## 📂 Folder Contents
이 폴더에는 아래 항목들이 포함됩니다:

- `Hybrid-Server-CloudWatch-VPN-Setup.pdf`  
  → CloudWatch Agent 설치, VPN 구성, 보안 설정 전체 과정 문서  
- 설정 샘플(JSON/Config)
- 네트워크 구성도 이미지
- VPN/CloudWatch 테스트 스크린샷

---

## 🔧 기술 구성 요소

| Component | Description |
|----------|-------------|
| **StrongSwan IPsec** | 온프레미스 ↔ AWS 간 Site-to-Site VPN |
| **Amazon CloudWatch Agent** | 물리 서버 메트릭 수집 |
| **IAM Access Key** | CloudWatch 연동 전용 키 |
| **VPC (172.31.0.0/16)** | 하이브리드 클라우드 네트워크 |
| **VM Ubuntu Server** | 물리 서버 역할 |
| **ESP / IKEv2 (500/4500/udp)** | VPN 터널링 프로토콜 |

---

## 하이브리드 구조
물리 서버와 EC2 인스턴스는 StrongSwan 기반 VPN으로 직접 연결되며  
CloudWatch Agent를 통해 **온프레미스 메트릭이 클라우드로 전송 → 대시보드에서 시각화**됩니다.

(자세한 구조는 PDF 내 다이어그램 참조)

---

## 📝 참고
CloudWatch Agent 설정 파일(JSON)과  
credentials 저장 위치는 프로젝트에 맞게 수정하여 사용하세요.

