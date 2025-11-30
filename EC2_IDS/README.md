# EC2 IDS  
EC2 Security Server & Suricata IDS Setup

EC2 보안 서버 구축과 Suricata IDS 환경을 구성하면서 진행한 설정과 테스트 내용을 정리한 폴더입니다.  
테스트용 룰을 기반으로 IDS 동작 검증까지 포함되어 있습니다.

## 구성 내용

### 1. EC2 보안 서버 초기 설정
- 보안 그룹 및 키 페어 생성  
- IAM Role 및 권한 설정  
- EC2 인스턴스 생성 및 접속  
- 기본 운영 환경 구성(유저/권한/패키지 설정)

### 2. Suricata IDS 설치
- Suricata 패키지 설치 및 서비스 활성화  
- 네트워크 인터페이스 및 HOME_NET 설정  
- Suricata 전용 계정/그룹 구성  
- 서비스 권한(cap_net_raw) 설정

### 3. 테스트용 룰 구성
- local.rules 기반 단순 테스트 룰 작성  
- 특정 포트/패킷 접근 시 알림 발생하도록 설정  
- 실제 서비스용 룰이 아닌 **검증 목적의 최소 룰셋 사용**

### 4. IDS 동작 검증
- fast.log / eve.json 이벤트 확인  
- hping3 등을 이용한 패킷 테스트  
- Suricata 탐지 → 로그 생성 흐름 검증

## 문서 목록
- EC2 보안 서버 설정 문서  
- Suricata IDS 설치 및 테스트 룰 구성 문서  

## 참고
이 폴더는 EC2 기반 IDS 환경을 구성하고 테스트하는 과정을 정리한 자료로 실제 운영용 룰셋은 포함되어 있지 않습니다.
