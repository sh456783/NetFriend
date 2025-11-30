# Hybrid Server  
On-Premise × AWS Cloud Integration

이 폴더는 온프레미스 물리 서버(VM)와 AWS EC2 인스턴스를 하나의 하이브리드 환경으로 구성하기 위해 진행한 내용을 정리한 폴더입니다.

## 포함된 구성

### 1. VPN 연결 구성
- StrongSwan 기반 Site-to-Site VPN 구축
- 물리 서버 ↔ AWS VPC 간 안정적인 통신 환경 구성
- 내부망 접근 및 서비스 연동 테스트

### 2. 물리 서버 구성
- CloudWatch Agent 설치 및 메트릭 전송 설정
- CPU/메모리 지표 모니터링
- 내부 서비스 및 DB 통신 환경 구성

### 3. EC2 서비스 환경 구축
- EC2 보안 서버 초기 설정
- 서비스 배포(FastAPI/React), Nginx 환경 구성
- 물리 서버와 EC2 간 연동 구조 구성

### 4. Auto Scaling & Load Balancer 구성
- Launch Template 생성
- CPU 기반 Auto Scaling 정책 구성
- Application Load Balancer 트래픽 분산 설정
- 서버 복제 및 확장 테스트

## 📂 문서 목록
- VPN 구성 자료  
- 물리 서버 구성 자료  
- EC2 서비스 구축 자료  
- Auto Scaling & Load Balancer 구성 자료  

## 📝 참고
이 폴더는 온프레미스–클라우드 통합 구조를 구성하기 위한 단계별 설정 및 테스트 자료를 포함합니다.
