# (Docs) server-monitor
이 디렉터리는 **NetFriend 프로젝트의 웹 대시보드(server-monitor)** 모듈을 구현하면서  
진행한 **설계, 구현, 연동, 배포 과정**을 정리한 문서 모음입니다.

FastAPI × React 기반 웹 대시보드를 중심으로  
Suricata IDS, AWS CloudWatch, EC2 제어, IP 차단 기능이  
어떻게 하나의 흐름으로 연결되는지를 단계별로 설명합니다.

---

## 문서 구성 개요

본 문서는 다음과 같은 흐름으로 구성되어 있습니다.

1. 웹 대시보드 전체 아키텍처 및 동작 흐름  
2. FastAPI 백엔드 구현 내용  
3. React 프론트엔드 구현 내용  
4. Suricata IDS 로그 연동 방식  
5. IP 차단 리스트(자동/수동) 구현  
6. 배포 및 실행 환경 정리

---

## 1. 웹 대시보드 전체 흐름

### 전체 구조 요약
- 사용자 브라우저 → 웹 대시보드 접속
- Nginx → 정적 파일 제공 + `/api` 요청을 FastAPI로 프록시
- FastAPI →  
  - Suricata IDS 로그(`eve.json`) 읽기  
  - AWS EC2 상태 및 CloudWatch 메트릭 조회  
  - IP 차단/해제 명령 수행
- 결과 → 웹 UI에 실시간 시각화

### 핵심 구성 요소
- **Frontend**: React
- **Backend**: FastAPI
- **IDS**: Suricata
- **Cloud**: AWS EC2, CloudWatch
- **Proxy**: Nginx

---

## 2. FastAPI 백엔드 구현

### 주요 역할
- Suricata IDS 로그 파싱 및 API 제공
- EC2 및 Auto Scaling 인스턴스 상태 조회
- CloudWatch CPU 메트릭 조회
- IP 차단/해제 요청 처리
- React 프론트엔드와 REST API 통신

### IDS 관련 주요 기능
- `/api/logs` : Suricata IDS 로그 조회
- `/api/logs/stream` : IDS 이벤트 실시간 스트리밍(SSE)
- `/api/status` : EC2/Auto Scaling 인스턴스 상태 조회
- `/api/metrics` : CloudWatch CPU 메트릭 조회
- `/api/block`, `/api/unblock` : IP 차단/해제 처리

---

## 3. React 프론트엔드 구현

### 주요 화면 구성
- 로그인 화면 (초기 접근 제어)
- EC2 / Auto Scaling 인스턴스 상태 테이블
- CPU 사용률 그래프
- 시스템/콘솔 로그 뷰어
- IDS 알림 패널
- IP 차단 관리 패널

### UI 특징
- 인스턴스 상태에 따라 색상 및 아이콘으로 시각화
- Severity(심각도) 기준 IDS 알림 색상 구분
  - High → 빨강
  - Medium → 주황
  - Low → 초록
- 버튼 클릭으로 EC2 Start / Stop 제어

---

## 4. Suricata IDS 로그 연동

### 로그 처리 흐름
1. Suricata가 네트워크 트래픽 탐지
2. `/var/log/suricata/eve.json` 파일 생성
3. FastAPI에서 로그 파일 직접 읽기
4. JSON 이벤트 파싱 후 필요한 필드만 가공
5. 웹 대시보드에 실시간 또는 리스트 형태로 전달

### 구현 포인트
- 파일 권한 문제 해결을 위한 ACL 설정
- 대량 로그 처리를 위한 최근 N개 로그 조회
- SSE(Server-Sent Events) 기반 실시간 스트리밍 구현

---

## 5. IP 차단 리스트 (Fail2Ban 스타일)

### 차단 방식
- **자동 차단**
  - Suricata 탐지 이벤트 발생 시
  - 위험도 기준으로 공격자 IP 자동 차단
- **수동 차단**
  - 관리자 UI에서 IP 직접 추가 가능
- **차단 해제**
  - 특정 IP 언밴(unban) 기능 제공

### 관리 기능
- 현재 차단된 IP 목록 조회
- 차단 사유 및 시간 확인
- TTL(만료 시간) 기반 차단 관리

> 실제 방화벽 규칙은 FastAPI를 통해 서버에 전달되어 적용됩니다.

---

## 6. 배포 및 실행 환경

### 서버 환경
- Ubuntu Linux
- Nginx Reverse Proxy
- Python 3 + FastAPI
- Node.js + React

### 실행 방식
- FastAPI: systemd 서비스로 등록하여 자동 실행
- React: 빌드 후 Nginx 정적 파일로 배포
- 접속 주소: `http://<EC2 Public IP>/`

---

## 참고
- 웹 대시보드 모듈의 상세 설명은 상위 `server-monitor/README.md`를 참고하세요.
