// frontend/src/App.js (전체 복사 후 붙여넣기)

import React, { useState, useEffect, useRef } from 'react';
import styles from './App.module.css'; 
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'; 

function App() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState(null);
  const [instanceLog, setInstanceLog] = useState(null);
  const [instanceMetrics, setInstanceMetrics] = useState(null); 
  const [alertMessage, setAlertMessage] = useState(null); 
  const previousInstanceStates = useRef({}); 

  // 1. 서버 상태 목록을 가져오는 함수
  const fetchStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/status');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      
      if (data.success && data.instances) {
        // 🚨 상태 변화 감지 및 알림 로직
        data.instances.forEach(instance => {
          const prevStatus = previousInstanceStates.current[instance.InstanceId];
          if (prevStatus && prevStatus !== instance.InstanceState) {
            setAlertMessage(`${instance.Name} 상태가 ${prevStatus.toUpperCase()} 에서 ${instance.InstanceState.toUpperCase()} 로 변경되었습니다.`);
            setTimeout(() => setAlertMessage(null), 5000);
          }
          previousInstanceStates.current[instance.InstanceId] = instance.InstanceState; 
        });
        setStatus(data);
      } else {
        setError(data.error_message || "상태 데이터를 가져오는 데 실패했습니다.");
      }
      setError(null);

    } catch (e) {
      console.error("Fetch failed:", e);
      setError("서버 연결 실패. 백엔드가 8000번에서 실행 중인지 확인하세요.");
      setStatus(null);
    }
  };

  // 2. 특정 인스턴스의 로그를 가져오는 함수
  const fetchLog = async (instanceId) => {
    setInstanceLog("로그를 불러오는 중..."); 
    try {
      const response = await fetch(`http://localhost:8000/api/logs/${instanceId}`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setInstanceLog(data.success ? data.log : `로그 조회 실패: ${data.error_message}`);
    } catch (e) {
      setInstanceLog(`로그 조회 오류: ${e.message}`);
    }
  };

  // 3. 특정 인스턴스의 메트릭을 가져오는 함수
  const fetchMetrics = async (instanceId) => {
    setInstanceMetrics(null); 
    try {
      const response = await fetch(`http://localhost:8000/api/metrics/${instanceId}`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();

      if (data.success) {
        const combinedMetrics = data.cpu_utilization.map((cpu, index) => ({
            timestamp: cpu.timestamp,
            cpu: cpu.value,
            networkIn: data.network_in[index] ? data.network_in[index].value : 0,
            networkOut: data.network_out[index] ? data.network_out[index].value : 0,
        }));
        setInstanceMetrics(combinedMetrics);
      } else {
        setInstanceMetrics({ error: data.error_message || "메트릭 조회 실패" });
      }
    } catch (e) {
      setInstanceMetrics({ error: `메트릭 조회 오류: ${e.message}` });
    }
  };

  useEffect(() => {
    fetchStatus(); 
    const intervalId = setInterval(fetchStatus, 5000); 
    return () => clearInterval(intervalId);
  }, []);

  // 인스턴스 클릭 핸들러 (로그, 메트릭 호출)
  const handleInstanceClick = (instanceId) => {
    if (selectedInstanceId === instanceId) {
      setSelectedInstanceId(null); 
      setInstanceLog(null);
      setInstanceMetrics(null);
    } else {
      setSelectedInstanceId(instanceId);
      fetchLog(instanceId);
      fetchMetrics(instanceId); 
    }
  };

  // 🚨 인스턴스 제어 함수 (데모용)
  const controlInstance = async (instanceId, action) => {
      const instanceName = status.instances.find(i => i.InstanceId === instanceId)?.Name || instanceId;
      if (!window.confirm(`정말로 ${instanceName} 서버를 ${action === 'start' ? '시작' : '중지'}하시겠습니까? (데모)`)) {
          return; 
      }
      const response = await fetch(`http://localhost:8000/api/control/${instanceId}/${action}`, {
            method: 'POST'
        });
      const data = await response.json();
      
      setAlertMessage(data.message || `[데모] 서버 제어 요청: ${instanceName} ${action.toUpperCase()}...`);
      setTimeout(() => setAlertMessage(null), 5000);
      fetchStatus();
  };

  if (error) return <div className={styles.errorContainer}>🚨 오류: {error}</div>;
  if (!status) return <div className={styles.loading}>서버 상태를 불러오는 중...</div>;

  return (
    <div className={styles.appContainer}>
      
      {/* 🚨 알림 메시지 표시 (Fixed -> 오른쪽 아래) */}
      {alertMessage && (
        <div className={styles.bottomRightAlert}> 
          {alertMessage}
        </div>
      )}

      <h1>☁️ AWS EC2 서버 상태 모니터</h1>
      <p className={styles.updateTime}>
        마지막 갱신: {status.instances.length > 0 ? status.instances[0].LastUpdated : 'N/A'}
      </p>

      {/* 서버 목록 테이블 */}
      <table className={styles.instanceTable}>
        <thead>
          <tr>
            <th>Name</th>
            <th>ID</th>
            <th>상태</th>
            <th>시스템 체크</th>
            <th>IP 주소</th>
            <th>제어</th> 
          </tr>
        </thead>
        <tbody>
          {status.instances.map((instance) => {
            const isRunning = instance.InstanceState === 'running';
            const statusClass = isRunning ? styles.running : styles.stopped;
            const rowClass = selectedInstanceId === instance.InstanceId ? styles.selectedRow : '';
            
            return (
              <React.Fragment key={instance.InstanceId}>
                <tr 
                  className={`${styles.instanceRow} ${rowClass}`} 
                  onClick={() => handleInstanceClick(instance.InstanceId)}
                >
                  <td>{instance.Name}</td>
                  <td>{instance.InstanceId}</td>
                  <td className={statusClass}>
                    {instance.InstanceState.toUpperCase()}
                  </td>
                  <td className={styles.checkStatus}>
                    {instance.SystemStatus === 'ok' ? '✅' : '❌'}
                  </td>
                  <td>{instance.PublicIp || instance.PrivateIp || 'N/A'}</td>
                  
                  {/* 🚨 제어 버튼 */}
                  <td>
                      {isRunning ? (
                          <button 
                              className={styles.stopButton} 
                              onClick={(e) => { e.stopPropagation(); controlInstance(instance.InstanceId, 'stop'); }}
                          >
                              중지
                          </button>
                      ) : (
                          <button 
                              className={styles.startButton} 
                              onClick={(e) => { e.stopPropagation(); controlInstance(instance.InstanceId, 'start'); }}
                              disabled={instance.InstanceState === 'pending' || instance.InstanceState === 'stopping'}
                          >
                              시작
                          </button>
                      )}
                  </td>
                </tr>

                {/* 상세 정보 (로그 및 메트릭) 표시 행 */}
                {selectedInstanceId === instance.InstanceId && (
                  <tr>
                    <td colSpan="6" className={styles.detailCell}> 
                      <div className={styles.detailContainer}>
                        {/* 로그 영역 */}
                        <div className={styles.logSection}>
                          <h3>시스템 로그</h3>
                          <pre className={styles.logPre}>{instanceLog}</pre>
                        </div>

                        {/* 🚨 메트릭 그래프 영역 */}
                        <div className={styles.metricSection}>
                          <h3>CloudWatch 메트릭 (시뮬레이션)</h3>
                          {instanceMetrics ? (
                            instanceMetrics.error ? (
                              <div className={styles.metricError}>{instanceMetrics.error}</div>
                            ) : (
                              <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={instanceMetrics} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="timestamp" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Line type="monotone" dataKey="cpu" stroke="#8884d8" name="CPU (%)" unit="%" />
                                  <Line type="monotone" dataKey="networkIn" stroke="#82ca9d" name="Net In (Bytes)" unit="B" />
                                  <Line type="monotone" dataKey="networkOut" stroke="#ffc658" name="Net Out (Bytes)" unit="B" />
                                </LineChart>
                              </ResponsiveContainer>
                            )
                          ) : (
                            <div>메트릭을 불러오는 중...</div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default App;