import React, { useState, useEffect, useRef } from 'react';
import styles from './App.module.css'; 
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'; 

// ----------------------------------------------------
// 🚨 로그인 화면 컴포넌트
// ----------------------------------------------------
const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    
    // 💡 ID/PW: netfriend/netfriend로 검증
    if (username === 'netfriend' && password === 'netfriend') {
      onLogin(username);
    } else {
      setError('유효하지 않은 사용자 이름 또는 비밀번호입니다.');
    }
  };

  return (
    <div className={styles.loginContainer}>
      <form onSubmit={handleLogin} className={styles.loginForm}>
        <h2>AWS 모니터링 대시보드 로그인</h2>
        {error && <div className={styles.loginError}>{error}</div>}
        <input
          type="text"
          placeholder="사용자 이름 (netfriend)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="비밀번호 (netfriend)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className={styles.loginButton}>로그인</button>
      </form>
    </div>
  );
};

// ----------------------------------------------------
// 🚨 IDS 알림 패널 컴포넌트
// ----------------------------------------------------
const IDSAlertsPanel = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return <div className={styles.idsPanelPlaceholder}>현재 탐지된 보안 알림이 없습니다.</div>;
  }

  // 심각도(Severity)에 따라 클래스 매핑 (0: Critical, 1: High, 2: Medium, 3: Low)
  const getSeverityClass = (severity) => {
    switch (severity) {
      case 0:
      case 1:
        return styles.severityHigh;
      case 2:
        return styles.severityMedium;
      case 3:
        return styles.severityLow;
      default:
        return styles.severityUnknown;
    }
  };
  
  // UTC 시간을 로컬 시간으로 변환하는 헬퍼 함수
  const formatLocalTime = (utcTimestamp) => {
    try {
      const date = new Date(utcTimestamp);
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch (e) {
      return '시간 오류';
    }
  };

  return (
    <div className={styles.idsPanel}>
      <h3>실시간 IDS 보안 알림 ({alerts.length}건)</h3>
      <div className={styles.alertsList}>
        {alerts.map((alert, index) => (
          <div key={index} className={`${styles.alertItem} ${getSeverityClass(alert.alert.severity)}`}>
            <div className={styles.alertHeader}>
                <span className={styles.alertTime}>{formatLocalTime(alert.timestamp)}</span>
                <span className={styles.alertSeverity}>
                    {alert.alert.severity <= 1 ? '높음' : alert.alert.severity === 2 ? '중간' : '낮음'}
                </span>
            </div>
            <p className={styles.alertSignature}>{alert.alert.signature}</p>
            <p className={styles.alertDetail}>
                <span className={styles.alertIP}>SRC: {alert.src_ip}</span> | 
                <span className={styles.alertIP}> DEST: {alert.dest_ip}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 💡 메인 App 컴포넌트
// ----------------------------------------------------
function App() {
  // 🚨 로그인 상태 추가
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const [status, setStatus] = useState(null);
  const [alerts, setAlerts] = useState(null); // 🚨 NEW: IDS 알림 상태
  const [error, setError] = useState(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState(null);
  const [instanceLog, setInstanceLog] = useState(null);
  const [instanceMetrics, setInstanceMetrics] = useState(null); 
  const [alertMessage, setAlertMessage] = useState(null); 
  const previousInstanceStates = useRef({}); 

  // 🚨 로그인 처리 함수
  const handleSuccessfulLogin = (user) => {
    setIsLoggedIn(true);
  };
  
  // 4. NEW: IDS 알림을 가져오는 함수
  const fetchAlerts = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/ids_alerts');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      
      if (data.success && data.alerts) {
        setAlerts(data.alerts);
      }
    } catch (e) {
      console.error("Alerts Fetch failed:", e);
    }
  };


  // 1. 서버 상태 목록을 가져오는 함수
  const fetchStatus = async () => {
    // 로그인이 안 되어있으면 API 호출 스킵
    if (!isLoggedIn) return;

    try {
      // 💡 백엔드 URL이 8000번 포트로 가정됨
      const response = await fetch('http://localhost:8000/api/status');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      
      if (data.success && data.instances) {
        // 상태 변화 감지 및 알림 로직
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

  // 3. 특정 인스턴스의 메트릭을 가져오는 함수 (CPU 전용)
  const fetchMetrics = async (instanceId) => {
    setInstanceMetrics(null); 
    try {
      const response = await fetch(`http://localhost:8000/api/metrics/${instanceId}`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();

      if (data.success) {
        setInstanceMetrics(data.metrics);
      } else {
        setInstanceMetrics({ error: data.error_message || "메트릭 조회 실패" });
      }
    } catch (e) {
      setInstanceMetrics({ error: `메트릭 조회 오류: ${e.message}` });
    }
  };
  
  // 🚨 useEffect: 5초마다 상태 및 알림 갱신
  useEffect(() => {
    if (!isLoggedIn) {
      setStatus(null);
      setAlerts(null);
      return; 
    }
    
    // 초기 로드 시 실행
    fetchStatus(); 
    fetchAlerts(); 

    // 5초마다 상태 및 알림 갱신
    const statusIntervalId = setInterval(fetchStatus, 5000); 
    const alertsIntervalId = setInterval(fetchAlerts, 5000); 

    return () => {
        clearInterval(statusIntervalId);
        clearInterval(alertsIntervalId);
    };
  }, [isLoggedIn]); 

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

  // 인스턴스 제어 함수 (데모용)
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

  // 렌더링 조건: 로그인 화면 표시
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleSuccessfulLogin} />;
  }

  // 렌더링 조건: 로딩/에러 화면 표시 (로그인 성공 후)
  if (error) return <div className={styles.errorContainer}>🚨 오류: {error}</div>;
  if (!status) return <div className={styles.loading}>서버 상태를 불러오는 중...</div>;

  return (
    <div className={styles.appContainer}>
      
      {/* 알림 메시지 표시 (Fixed -> 오른쪽 아래) */}
      {alertMessage && (
        <div className={styles.bottomRightAlert}> 
          {alertMessage}
        </div>
      )}

      {/* 헤더 바와 로그아웃 버튼 */}
      <div className={styles.headerBar}>
        <h1>☁️ AWS EC2 서버 상태 모니터</h1>
        <button onClick={() => setIsLoggedIn(false)} className={styles.logoutButton}>
            로그아웃
        </button>
      </div>

      {/* 🚨 NEW: IDS 알림 패널과 테이블을 감싸는 컨테이너 */}
      <div className={styles.topContentGrid}>
          {/* 🚨 IDS 알림 패널 */}
          <IDSAlertsPanel alerts={alerts} /> 

          {/* 🚨 서버 상태 테이블 */}
          <div className={styles.instanceTableContainer}>
              <p className={styles.updateTime}>
                  마지막 갱신: {status.instances.length > 0 ? status.instances[0].LastUpdated : 'N/A'}
              </p>
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
                                      
                                      <td>
                                          {isRunning ? (
                                              <button className={styles.stopButton} onClick={(e) => { e.stopPropagation(); controlInstance(instance.InstanceId, 'stop'); }}>중지</button>
                                          ) : (
                                              <button className={styles.startButton} onClick={(e) => { e.stopPropagation(); controlInstance(instance.InstanceId, 'start'); }} disabled={instance.InstanceState === 'pending' || instance.InstanceState === 'stopping'}>시작</button>
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

                                                  {/* 메트릭 그래프 영역 (CPU 전용) */}
                                                  <div className={styles.metricSection}>
                                                      <h3>CloudWatch 메트릭 (CPU 사용률)</h3>
                                                      {instanceMetrics ? (
                                                          instanceMetrics.error ? (
                                                              <div className={styles.metricError}>{instanceMetrics.error}</div>
                                                          ) : (
                                                              <ResponsiveContainer width="100%" height={300}>
                                                                  <LineChart data={instanceMetrics} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                                      <CartesianGrid strokeDasharray="3 3" />
                                                                      <XAxis dataKey="timestamp" />
                                                                      <YAxis unit="%" domain={[0, 100]} /> 
                                                                      <Tooltip formatter={(value, name, props) => [`${value}${props.unit}`, name]}/>
                                                                      <Legend />
                                                                      <Line type="monotone" dataKey="value" stroke="#8884d8" name="CPU (%)" unit="%" strokeWidth={2}/>
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
      </div>
    </div>
  );
}

export default App;
