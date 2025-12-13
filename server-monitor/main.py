from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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
try:
    ec2_client = boto3.client('ec2', region_name=EC2_REGION)
    cloudwatch_client = boto3.client('cloudwatch', region_name=EC2_REGION)
except Exception as e:
    print(f"Boto3 Client Initialization Failed: {e}")

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

@app.get("/api/status")
async def get_server_status():
    try:
        desc_resp = ec2_client.describe_instances()
        instance_details = {}
        
        for reservation in desc_resp['Reservations']:
            for instance in reservation['Instances']:
                instance_id = instance['InstanceId']
                
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
            
            final_statuses.append({
                "InstanceId": instance_id,
                "Name": info.get("Name", "N/A"),
                "PublicIp": info.get("PublicIpAddress"),
                "PrivateIp": info.get("PrivateIpAddress"),
                "InstanceType": info.get("Type"),
                "InstanceState": status['InstanceState']['Name'],
                "SystemStatus": status['SystemStatus']['Status'],
                "InstanceStatus": status['InstanceStatus']['Status'],
                "LastUpdated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
            })
            
        return {
            "success": True,
            "instances": final_statuses
        }
        
    except Exception as e:
        error_message = f"AWS API Call Error: {str(e)}"
        print(error_message)
        return {"success": False, "error_message": error_message}


@app.get("/api/logs/{instance_id}")
async def get_instance_log(instance_id: str):
    try:
        response = ec2_client.get_console_output(
            InstanceId=instance_id,
            Latest=True
        )
        
        if 'Output' in response and response['Output']:
            log_data = base64.b64decode(response['Output']).decode('utf-8')
        else:
            log_data = "Log data not found or instance not running."
            
        return {"success": True, "instance_id": instance_id, "log": log_data}
        
    except Exception as e:
        error_message = f"Log Retrieval Error: {str(e)}"
        print(error_message)
        return {"success": False, "error_message": error_message}


@app.get("/api/metrics/{instance_id}")
async def get_instance_metrics(instance_id: str):
    try:
        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(hours=1)
        
        dimensions = [{'Name': 'InstanceId', 'Value': instance_id}]

        cpu_metrics = cloudwatch_client.get_metric_statistics(
            Namespace='AWS/EC2', MetricName='CPUUtilization', Dimensions=dimensions,
            StartTime=start_time, EndTime=end_time, Period=300, Statistics=['Average']
        )
        network_in_metrics = cloudwatch_client.get_metric_statistics(
            Namespace='AWS/EC2', MetricName='NetworkIn', Dimensions=dimensions,
            StartTime=start_time, EndTime=end_time, Period=300, Statistics=['Average']
        )
        network_out_metrics = cloudwatch_client.get_metric_statistics(
            Namespace='AWS/EC2', MetricName='NetworkOut', Dimensions=dimensions,
            StartTime=start_time, EndTime=end_time, Period=300, Statistics=['Average']
        )
        
        return {
            "success": True,
            "instance_id": instance_id,
            "cpu_utilization": format_metrics(cpu_metrics['Datapoints'], '%'),
            "network_in": format_metrics(network_in_metrics['Datapoints'], 'B'),
            "network_out": format_metrics(network_out_metrics['Datapoints'], 'B'),
        }

    except Exception as e:
        error_message = f"CloudWatch Metric Error: {str(e)}"
        print(error_message)
        raise HTTPException(status_code=500, detail=error_message)


@app.post("/api/control/{instance_id}/{action}")
async def control_instance(instance_id: str, action: str):
    try:
        if action == "start":
            ec2_client.start_instances(InstanceIds=[instance_id])
            message = f"EC2 Instance {instance_id} start request sent."
        elif action == "stop":
            ec2_client.stop_instances(InstanceIds=[instance_id])
            message = f"EC2 Instance {instance_id} stop request sent."
        else:
            raise HTTPException(status_code=400, detail="Invalid action. Use 'start' or 'stop'.")

        return {"success": True, "message": message, "action": action}

    except Exception as e:
        error_message = f"Instance Control Error (Check Permissions): {str(e)}"
        print(error_message)
        raise HTTPException(status_code=500, detail=error_message)