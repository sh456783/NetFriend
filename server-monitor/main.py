from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time
import boto3
import base64
from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

EC2_REGION = 'ap-northeast-2'

# 🚨 실제 AWS API 호출을 위해 Boto3 클라이언트를 초기화합니다.
try:
    ec2_client = boto3.client('ec2', region_name=EC2_REGION)
    cloudwatch_client = boto3.client('cloudwatch', region_name=EC2_REGION)
except Exception as e:
    # AWS 인증 실패 시 여기서 오류가 발생하며, 이는 정상적인 경고입니다.
    print(f"Boto3 Client Initialization Warning: {e}. Check IAM Role/Credentials.")

def get_name_tag(tags: List[Dict[str, str]]) -> str:
    if tags:
        for tag in tags:
            if tag.get('Key') == 'Name':
                return tag.get('Value')
    return 'No Name Tag'

def format_metrics(datapoints: List[Dict[str, Any]], unit: str) -> List[Dict[str, Any]]:
    if not datapoints:
        return []
    
    sorted_data = sorted(datapoints, key=lambda x: x['Timestamp'])
    
    return [
        {
            'timestamp': dp['Timestamp'].strftime("%H:%M"),
            'value': round(dp['Average'], 2) if 'Average' in dp else round(dp['Sum'], 2),
            'unit': unit
        }
        for dp in sorted_data
    ]

# ----------------------------------------------------
# 🔑 인증 엔드포인트 (현재는 클라이언트 측과 일치하는 임시 인증)
# ----------------------------------------------------
class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/login")
async def login(request: LoginRequest):
    # 실제 환경에서는 데이터베이스 조회 및 안전한 비밀번호 검증이 필수입니다.
    # 클라이언트(App.js)와 일치하는 'netfriend' / 'netfriend'로 설정합니다.
    if request.username == "netfriend" and request.password == "netfriend": 
        return {"success": True, "message": "로그인 성공", "token": "dummy-jwt-token"}
    else:
        raise HTTPException(status_code=401, detail="인증 실패: 유효하지 않은 자격 증명")


# ----------------------------------------------------
# 🚀 실제 AWS API 호출 엔드포인트
# ----------------------------------------------------

@app.get("/api/status")
async def get_server_status():
    try:
        # 🚨 실제 AWS EC2 상태 조회
        desc_resp = ec2_client.describe_instances()
        instance_details = {}
        
        for reservation in desc_resp['Reservations']:
            for instance in reservation['Instances']:
                instance_id = instance['InstanceId']
                
                # 'running' 또는 'stopped' 상태의 인스턴스만 포함
                if instance['State']['Name'] not in ['terminated']:
                    instance_details[instance_id] = {
                        "Name": get_name_tag(instance.get('Tags', [])),
                        "PublicIp": instance.get('PublicIpAddress'),
                        "PrivateIp": instance.get('PrivateIpAddress'),
                        "Type": instance.get('InstanceType'),
                        "InstanceState": instance['State']['Name'],
                    }

        status_resp = ec2_client.describe_instance_status(IncludeAllInstances=True)
        final_statuses = []
        
        for status in status_resp.get('InstanceStatuses', []):
            instance_id = status['InstanceId']
            info = instance_details.get(instance_id, {})
            
            # describe_instances에서 수집된 인스턴스만 처리 (terminated 제외)
            if instance_id in instance_details:
                final_statuses.append({
                    "InstanceId": instance_id,
                    "Name": info.get("Name", "N/A"),
                    "PublicIp": info.get("PublicIpAddress"),
                    "PrivateIp": info.get("PrivateIpAddress"),
                    "InstanceType": info.get("Type"),
                    "InstanceState": info.get("InstanceState", "N/A"), # describe_instances에서 가져온 상태
                    "SystemStatus": status['SystemStatus']['Status'],
                    "InstanceStatus": status['InstanceStatus']['Status'],
                    "LastUpdated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                })
        
        # describe_instance_status에 없지만 describe_instances에 있는 인스턴스 (예: stopped) 처리
        # 이전에 describe_instances에서 상태를 가져왔으므로, 상태를 덮어씁니다.
        for instance_id, info in instance_details.items():
            if instance_id not in [s['InstanceId'] for s in status_resp.get('InstanceStatuses', [])]:
                final_statuses.append({
                    "InstanceId": instance_id,
                    "Name": info.get("Name", "N/A"),
                    "PublicIp": info.get("PublicIpAddress"),
                    "PrivateIp": info.get("PrivateIpAddress"),
                    "InstanceType": info.get("Type"),
                    "InstanceState": info.get("InstanceState", "N/A"),
                    "SystemStatus": "not-applicable" if info.get("InstanceState") == "stopped" else "initializing",
                    "InstanceStatus": "not-applicable" if info.get("InstanceState") == "stopped" else "initializing",
                    "LastUpdated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                })
        
        # 중복 제거 (describe_instances와 describe_instance_status에 모두 있을 경우)
        unique_statuses = {item['InstanceId']: item for item in final_statuses}.values()

        return {
            "success": True,
            "instances": list(unique_statuses)
        }
        
    except Exception as e:
        error_message = f"AWS API Call Error (Status): {str(e)}. Check IAM Role/Credentials."
        print(error_message)
        return {"success": False, "error_message": error_message}


@app.get("/api/logs/{instance_id}")
async def get_instance_log(instance_id: str):
    try:
        # 🚨 실제 AWS EC2 콘솔 로그 조회
        response = ec2_client.get_console_output(
            InstanceId=instance_id,
            Latest=True
        )
        
        if 'Output' in response and response['Output']:
            log_data = base64.b64decode(response['Output']).decode('utf-8')
        else:
            log_data = "로그 데이터를 찾을 수 없거나 인스턴스가 실행 중이 아닙니다."
            
        return {"success": True, "instance_id": instance_id, "log": log_data}
        
    except Exception as e:
        error_message = f"Log Retrieval Error: {str(e)}"
        print(error_message)
        raise HTTPException(status_code=500, detail=error_message)


@app.get("/api/metrics/{instance_id}")
async def get_instance_metrics(instance_id: str):
    try:
        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(hours=1)
        
        dimensions = [{'Name': 'InstanceId', 'Value': instance_id}]
        period = 300 

        # 🚨 실제 AWS CloudWatch CPU 메트릭 조회
        cpu_metrics = cloudwatch_client.get_metric_statistics(
            Namespace='AWS/EC2', MetricName='CPUUtilization', Dimensions=dimensions,
            StartTime=start_time, EndTime=end_time, Period=period, Statistics=['Average']
        )
        
        return {
            "success": True,
            "instance_id": instance_id,
            "metrics": format_metrics(cpu_metrics['Datapoints'], '%'), 
        }

    except Exception as e:
        error_message = f"CloudWatch Metric Error: {str(e)}"
        print(error_message)
        raise HTTPException(status_code=500, detail=error_message)


@app.post("/api/control/{instance_id}/{action}")
async def control_instance(instance_id: str, action: str):
    try:
        # 🚨 실제 AWS EC2 인스턴스 제어
        if action == "start":
            ec2_client.start_instances(InstanceIds=[instance_id])
            message = f"EC2 인스턴스 {instance_id} 시작 요청을 전송했습니다."
        elif action == "stop":
            ec2_client.stop_instances(InstanceIds=[instance_id])
            message = f"EC2 인스턴스 {instance_id} 중지 요청을 전송했습니다."
        else:
            raise HTTPException(status_code=400, detail="유효하지 않은 동작입니다. 'start' 또는 'stop'을 사용하세요.")

        return {"success": True, "message": message, "action": action}

    except Exception as e:
        error_message = f"Instance Control Error (Check Permissions): {str(e)}"
        print(error_message)
        # 실패 시 실제 HTTP 500 오류를 반환하여 프론트엔드가 사용자에게 알리도록 합니다.
        raise HTTPException(status_code=500, detail=error_message)


# ----------------------------------------------------
# 💡 IDS 알림 엔드포인트 (외부 시스템 연결 필요 - Mock 유지)
# ----------------------------------------------------
@app.get("/api/ids_alerts")
async def get_ids_alerts():
    """
    실제 환경에서는 이 엔드포인트가 CloudWatch Logs, Splunk, 또는 별도의 
    IDS/IPS 시스템 API와 연결되어 실시간 데이터를 받아와야 합니다.
    """
    now = datetime.now(timezone.utc)

    mock_alerts = [
        {
            "timestamp": (now - timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%S+00:00"),
            "event_type": "alert",
            "src_ip": "203.0.113.5",
            "dest_ip": "192.0.2.10",
            "alert": {
                "signature": "ET SCAN SSH Brute Force attempt",
                "category": "Attempted Administrator Privilege Gain",
                "severity": 1 # High
            }
        },
        {
            "timestamp": (now - timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%S+00:00"),
            "event_type": "alert",
            "src_ip": "10.0.0.1",
            "dest_ip": "192.0.2.10",
            "alert": {
                "signature": "HTTP Protocol Anomaly",
                "category": "Detection of a Non-Standard Protocol or Data Structure",
                "severity": 3 # Low
            }
        },
        {
            "timestamp": (now - timedelta(minutes=15)).strftime("%Y-%m-%dT%H:%M:%S+00:00"),
            "event_type": "alert",
            "src_ip": "172.16.0.5",
            "dest_ip": "10.0.1.20",
            "alert": {
                "signature": "Suspicious internal traffic flow",
                "category": "Detection of Malicious or Suspicious Activity",
                "severity": 2 # Medium
            }
        },
    ]
    return {"success": True, "alerts": mock_alerts}
