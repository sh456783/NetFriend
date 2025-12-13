# Hybrid Server  
On-Premise × AWS Cloud Integration

이 폴더는 물리 서버(VM)와 AWS EC2를 연동해 하이브리드 환경을 구성한 과정들을 정리한 폴더입니다.

## 구성 내용

### 1. VPN 연결 구성
- StrongSwan 기반 Site-to-Site VPN 구축  
- 물리 서버 ↔ AWS VPC 간 암호화된 통신  
- 내부망 접근 및 서비스 연동 테스트

### 2. 물리 서버 구성
- CloudWatch Agent 설치 및 메트릭 전송 설정  
- CPU/메모리 지표 수집  
- 내부 서비스 및 DB 통신 환경 구성

### 3. EC2 서비스 환경 구축
- EC2 보안 서버 초기 세팅  
- 서비스 배포(FastAPI/React), Nginx 설정  
- 물리 서버와 EC2 간 연동 구조 구성

### 4. Auto Scaling & Load Balancer 구성
- Launch Template 작성  
- CPU 기반 Auto Scaling 정책 적용  
- Application Load Balancer 트래픽 분산  
- 서버 복제 및 확장 테스트

### 5. Hybrid Auto Scaling 연동 (Lambda 기반 트래픽 제어)
- EventBridge를 통해 Auto Scaling 이벤트 감지  
- 실행 중인 EC2 인스턴스 수에 따라 트래픽 흐름 자동 제어  
- EC2 인스턴스가 존재할 경우  
  → AWS EC2 ↔ 물리 서버 트래픽 50 : 50 분산 (Hybrid 모드)  
- EC2 인스턴스가 모두 종료된 경우  
  → 트래픽을 물리 서버(On-Premise)로 100% 전환  
- 특정 Auto Scaling Group만 처리하도록 필터링 로직 적용  
- 클라우드 장애 및 축소 상황에서도 서비스 연속성 유지

## 문서 목록
- VPN 구성 문서  
- 물리 서버 구성 문서  
- EC2 서비스 구축 문서  
- Auto Scaling & Load Balancer 구성 문서  
- Hybrid Auto Scaling Lambda 구성 문서  

## 참고
온프레미스–클라우드 통합 구조를 구성하기 위해 진행한 단계별 설정 및 테스트 내용이 포함되어 있습니다.  
Auto Scaling 상태에 따라 트래픽을 자동으로 제어하는 Lambda 함수 코드는  
`Hybrid_server/lambda` 디렉터리에 포함되어 있습니다.
