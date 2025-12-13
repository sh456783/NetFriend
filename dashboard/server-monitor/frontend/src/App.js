import React, { useState, useEffect, useRef } from 'react';
import styles from './App.module.css';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush
} from 'recharts';

const host = typeof window !== 'undefined' ? window.location.hostname : '';

let API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) ||   // Vite
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_BASE) || ''; // CRA

if (!API_BASE) {
  if (['localhost', '127.0.0.1'].includes(host)) {
    // 로컬 개발 환경
    API_BASE = 'http://localhost:8000';
  } else if (typeof window !== 'undefined') {
    // EC2에서 열었을 때 → nginx 프록시 경로 사용
    API_BASE = `${window.location.origin}/api`;
  } else {
    API_BASE = 'http://localhost:8000';
  }
}

/* ========================= 로그인 ========================= */
const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hint, setHint] = useState('5회 실패 시 IP가 차단됩니다.');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  // 실시간 차단 배너 (DB/ipset 기준)
  const [banInfo, setBanInfo] = useState({ ip: '-', banned: false });
  const [banLoading, setBanLoading] = useState(true);

  // 공통으로 쓰는 myip 조회 함수
  const loadMyBanStatus = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/bans/myip`, { cache: 'no-store' });
      const d = await r.json();
      setBanInfo({
        ip: d.ip ?? '-',
        banned: !!(d.banned ?? d.banned_db ?? d.banned_ipset)
      });
    } catch {
      setBanInfo({ ip: '-', banned: false });
    } finally {
      setBanLoading(false);
    }
  };

  useEffect(() => {
    loadMyBanStatus();
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  async function handleLogin() {
    if (loading) return;
    setErr('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        onLogin(username);
        return;
      }
      const detail = data?.detail || '로그인 실패';
      setErr(detail);

      const m = detail.match(/\((\d+)\/(\d+)\)/);
      if (m) setHint(`실패 ${m[1]}/${m[2]}회 (5회 실패 시 IP 차단)`);

      // 403이면 내 IP가 실제로 차단됐을 수 있으니 다시 조회
      if (res.status === 403) {
        await loadMyBanStatus();
      }
    } catch {
      setErr('서버 연결 실패');
    } finally {
      setLoading(false);
    }
  }

  const unbanMyIp = async () => {
    try {
      await fetch(`${API_BASE}/api/unban-self`, { method: 'POST' });
    } catch {
      // 무시
    }
    // 해제 후 상태 다시 조회
    setBanLoading(true);
    await loadMyBanStatus();
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginForm}>
        <h2>서버 모니터링 대시보드 로그인</h2>

        {!banLoading && banInfo.banned && (
          <div className={styles.loginError}>
            접속 차단됨: {banInfo.ip}
            <button
              onClick={unbanMyIp}
              className={styles.smallBtnDanger}
              style={{ marginLeft: 8 }}
            >
              내 IP 해제
            </button>
          </div>
        )}
        {!banInfo.banned && (
          <div className={styles.loginHint}>{hint}</div>
        )}
        {err && (
          <div className={styles.loginError} style={{ marginTop: 8 }}>
            {err}
          </div>
        )}

        <input
          type="text"
          placeholder="사용자 이름"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          onClick={handleLogin}
          className={styles.loginButton}
          disabled={loading}
        >
          {loading ? '로그인 중…' : '로그인'}
        </button>
      </div>
    </div>
  );
};

/* ====================== IDS 탐지 패널 ====================== */
const IDSAlertsPanel = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div className={styles.idsPanelPlaceholder}>
        현재 탐지된 보안 알림이 없습니다.
      </div>
    );
  }

  // 백엔드 /api/ids_alerts → signature / severity / src_ip / dest_ip 구조에 맞춤
  const sevClass = (s) =>
    s <= 1
      ? styles.severityHigh
      : s === 2
      ? styles.severityMedium
      : styles.severityLow;

  return (
    <div className={styles.idsPanel}>
      <h3>실시간 IDS 보안 알림 ({alerts.length}건)</h3>
      <div className={styles.alertsList}>
        {alerts.map((a, i) => {
          const severity = Number(a.severity ?? 3);
          return (
            <div
              key={i}
              className={`${styles.alertItem} ${sevClass(severity)}`}
            >
              <div className={styles.alertHeader}>
                <span className={styles.alertTime}>{a.timestamp}</span>
                <span className={styles.alertSeverity}>
                  {severity <= 1 ? '높음' : severity === 2 ? '중간' : '낮음'}
                </span>
              </div>
              <p className={styles.alertSignature}>{a.signature ?? '-'}</p>
              <p className={styles.alertDetail}>
                SRC: {a.src_ip ?? '-'} | DEST: {a.dest_ip ?? '-'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ==================== IP 차단 관리 패널 ==================== */
const BansPanel = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [myIp, setMyIp] = useState({ ip: '-', banned: false });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // 수동 추가
  const [newIp, setNewIp] = useState('');
  const [ttl, setTtl] = useState(3600);
  const [reason, setReason] = useState('');

  const fetchBans = async () => {
    const res = await fetch(
      `${API_BASE}/api/bans?active_only=true`,
      { cache: 'no-store' }
    );
    const bans = await res.json();
    setItems(bans?.items ?? []);
  };

  const fetchMyIp = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/bans/myip`, { cache: 'no-store' });
      const d = await r.json();
      setMyIp({
        ip: d.ip ?? '-',
        banned: !!(d.banned ?? d.banned_db ?? d.banned_ipset)
      });
    } catch {
      setMyIp({ ip: '-', banned: false });
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    setErr('');
    try {
      await Promise.all([fetchBans(), fetchMyIp()]);
    } catch {
      setErr('차단 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const addBan = async () => {
    if (!newIp) {
      setErr('IP 주소를 입력하세요.');
      return;
    }
    const ttlSec = Number(ttl);
    if (!Number.isFinite(ttlSec) || ttlSec <= 0) {
      setErr('TTL(초)은 1 이상 정수여야 합니다.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/bans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: newIp.trim(),
          ttl_seconds: ttlSec,
          reason: reason || 'manual_ban'
        })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setErr(data?.detail || '차단 추가 실패');
        return;
      }
      setMsg(`${newIp} 차단 추가 (TTL ${ttlSec}s)`);
      setNewIp('');
      setReason('');
      fetchAll();
    } catch {
      setErr('서버 통신 오류');
    }
  };

  const unban = async (ip) => {
    if (!window.confirm(`${ip} 차단을 해제할까요?`)) return;
    await fetch(`${API_BASE}/api/bans/${ip}/unban`, { method: 'POST' });
    fetchAll();
  };

  const extend = async (ip, seconds = 1800) => {
    if (
      !window.confirm(
        `${ip} TTL을 ${Math.round(seconds / 60)}분 연장할까요?`
      )
    )
      return;
    await fetch(`${API_BASE}/api/bans/${ip}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl_seconds: seconds })
    });
    fetchAll();
  };

  const unbanSelf = async () => {
    await fetch(`${API_BASE}/api/unban-self`, { method: 'POST' }).catch(() => {});
    fetchAll();
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className={styles.bansPanel}>
      <div className={styles.panelHeader}>
        <h3>IP 차단 관리</h3>
        <button
          onClick={fetchAll}
          className={styles.refreshButton}
          disabled={loading}
        >
          새로고침
        </button>
      </div>

      {/* 내 IP/상태 */}
      <div className={styles.myIpBox}>
        <div>
          내 IP: <strong>{myIp.ip}</strong>
        </div>
        <div>
          상태:{' '}
          {myIp.banned ? (
            <span className={styles.badgeDanger}>차단</span>
          ) : (
            <span className={styles.badgeOk}>정상</span>
          )}
          {myIp.banned && (
            <button
              className={styles.smallBtnDanger}
              onClick={unbanSelf}
              style={{ marginLeft: 8 }}
            >
              내 IP 해제
            </button>
          )}
        </div>
      </div>

      {msg && <div className={styles.infoMsg}>{msg}</div>}
      {err && (
        <div className={styles.loginError} style={{ marginBottom: 10 }}>
          {err}
        </div>
      )}

      {/* 수동 추가 폼 */}
      <div className={styles.banForm}>
        <input
          type="text"
          placeholder="IP 주소 (예: 1.2.3.4)"
          value={newIp}
          onChange={(e) => setNewIp(e.target.value)}
        />
        <input
          type="number"
          placeholder="TTL(초)"
          value={ttl}
          onChange={(e) => setTtl(e.target.value)}
          min={1}
        />
        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">이유 (선택)</option>
          <option value="manual_ban">수동</option>
          <option value="ids_alert">IDS 알림</option>
          <option value="login_fail">로그인 실패</option>
          <option value="test">테스트</option>
        </select>
        <button className={styles.addBtn} onClick={addBan}>
          차단 추가
        </button>
      </div>

      {/* 목록 */}
      <div className={styles.tableWrap}>
        <table className={styles.instanceTable}>
          <thead>
            <tr>
              <th>IP</th>
              <th>이유</th>
              <th>생성</th>
              <th>만료</th>
              <th>TTL(초)</th>
              <th>작성자</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {(items?.length ?? 0) === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{ textAlign: 'center', padding: '16px' }}
                >
                  현재 활성 차단이 없습니다.
                </td>
              </tr>
            ) : (
              items.map((it, i) => (
                <tr key={`${it.ip}-${it.created_at}-${i}`}>
                  <td>{it.ip}</td>
                  <td>{it.reason || '-'}</td>
                  <td>{new Date(it.created_at).toLocaleString()}</td>
                  <td>{new Date(it.expires_at).toLocaleString()}</td>
                  <td>{it.ttl_seconds ?? '-'}</td>
                  <td>{it.actor || '-'}</td>
                  <td>
                    <button
                      className={styles.smallBtn}
                      onClick={() => extend(it.ip, 1800)}
                    >
                      +30m
                    </button>
                    <button
                      className={styles.smallBtnDanger}
                      onClick={() => unban(it.ip)}
                    >
                      해제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ======================== 메인 App ======================== */
// 인스턴스 상태 + 시스템 체크를 합쳐서 아이콘으로 표시
const getSystemIcon = (instance) => {
  const state = (instance.InstanceState || '').toLowerCase();
  const sys = (instance.SystemStatus || '').toLowerCase();

  // 1) 먼저 EC2 자체 상태부터 본다
  if (['stopped', 'shutting-down', 'terminated'].includes(state)) {
    return '⏹️'; // 완전 멈춘 상태
  }
  if (['pending', 'stopping'].includes(state)) {
    return '⏳'; // 켜지는 중 / 꺼지는 중
  }

  // 2) running 일 때는 시스템 체크 값으로 판단
  if (state === 'running') {
    if (sys === 'ok') return '✅'; // 체크 통과
    if (sys === 'initializing' || sys === 'insufficient-data') return '⏳'; // 검사 중
    return '❌'; // impaired 등
  }

  // 3) 혹시 모르는 값들
  return '❔';
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [status, setStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);
  const [statusWarning, setStatusWarning] = useState(null); // prod 전용 메시지
  const [alertMessage, setAlertMessage] = useState(null);
  const previousInstanceStates = useRef({});

  // 상세 행 상태/데이터
  const [selected, setSelected] = useState(null);
  const [log, setLog] = useState(null);
  const [metrics, setMetrics] = useState(null);

  const handleSuccessfulLogin = () => setIsLoggedIn(true);

  const fetchAlerts = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`${API_BASE}/api/ids_alerts`, {
        cache: 'no-store'
      });
      if (!res.ok) {
        setAlerts([]);
        return;
      }
      const raw = await res.json();
      const list = Array.isArray(raw) ? raw : raw?.alerts ?? [];
      setAlerts(list);
    } catch {
      setAlerts([]);
    }
  };

  const fetchStatus = async () => {
    if (!isLoggedIn) return;
    const url = `${API_BASE}/api/status`;
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!data.success && data.error_message) {
        if (data.error_message.includes('prod 환경에서만')) {
          setStatus({ instances: [] });
          setStatusWarning(data.error_message);
          setError(null);
          return;
        }
      }

      if (data.success && data.instances) {
        data.instances.forEach((instance) => {
          const prev = previousInstanceStates.current[instance.InstanceId];
          if (prev && prev !== instance.InstanceState) {
            setAlertMessage(
              `${instance.Name} 상태가 ${prev.toUpperCase()} → ${instance.InstanceState.toUpperCase()} 변경`
            );
            setTimeout(() => setAlertMessage(null), 4000);
          }
          previousInstanceStates.current[instance.InstanceId] =
            instance.InstanceState;
        });
        setStatusWarning(null);
        setStatus(data);
        setError(null);
      } else {
        setError(
          data.error_message || '상태 데이터를 가져오는 데 실패했습니다.'
        );
      }
    } catch {
      setError(`서버 연결 실패 (${url}). 백엔드 8000번 확인`);
      setStatus(null);
    }
  };

  const fetchLog = async (instanceId) => {
    setLog('로그를 불러오는 중...');
    try {
      const res = await fetch(`${API_BASE}/api/logs/${instanceId}`);
      const data = await res.json();
      setLog(
        data.success ? data.log : `로그 조회 실패: ${data.error_message}`
      );
    } catch {
      setLog('로그 조회 오류');
    }
  };

  const fetchMetrics = async (instanceId) => {
    setMetrics(null);
    try {
      const res = await fetch(`${API_BASE}/api/metrics/${instanceId}`);
      const data = await res.json();
      setMetrics(
        data.success
          ? data.metrics
          : { error: data.error_message || '메트릭 조회 실패' }
      );
    } catch {
      setMetrics({ error: '메트릭 조회 오류' });
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setStatus(null);
      setAlerts([]);
      return;
    }
    fetchStatus();
    fetchAlerts();
    const t1 = setInterval(fetchStatus, 5000);
    const t2 = setInterval(fetchAlerts, 5000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [isLoggedIn]);

  const controlInstance = async (instanceId, action) => {
    const instanceName =
      status.instances.find((i) => i.InstanceId === instanceId)?.Name ||
      instanceId;
    if (
      !window.confirm(
        `정말로 ${instanceName} 서버를 ${
          action === 'start' ? '시작' : '중지'
        }하시겠습니까? (데모)`
      )
    )
      return;
    const url = `${API_BASE}/api/control/${instanceId}/${action}`;
    const response = await fetch(url, { method: 'POST' });
    const data = await response.json();
    setAlertMessage(data.message || `[데모] 제어 요청 전송`);
    setTimeout(() => setAlertMessage(null), 4000);
    fetchStatus();
  };

  const handleInstanceClick = (instanceId) => {
    if (selected === instanceId) {
      setSelected(null);
      setLog(null);
      setMetrics(null);
    } else {
      setSelected(instanceId);
      fetchLog(instanceId);
      fetchMetrics(instanceId);
    }
  };

  if (!isLoggedIn) return <LoginScreen onLogin={handleSuccessfulLogin} />;

  if (error)
    return (
      <div className={styles.errorContainer}>🚨 오류: {error}</div>
    );
  if (!status)
    return (
      <div className={styles.loading}>서버 상태를 불러오는 중...</div>
    );

  return (
    <div className={styles.appContainer}>
      {alertMessage && (
        <div className={styles.bottomRightAlert}>{alertMessage}</div>
      )}

      <div className={styles.headerBar}>
        <h1> Server Status and Control Monitor</h1>
        <button
          onClick={() => setIsLoggedIn(false)}
          className={styles.logoutButton}
        >
          로그아웃
        </button>
      </div>

      {statusWarning && (
        <div className={styles.loginHint} style={{ marginBottom: 12 }}>
          ⚠ {statusWarning}
        </div>
      )}

      <div className={styles.topContentGrid}>
        <div className={styles.idsPanel}>
          <IDSAlertsPanel alerts={alerts} />
        </div>
        <BansPanel />
      </div>

      {/* ===== 인스턴스 표 + 상세(로그/메트릭) ===== */}
      <div className={styles.instanceTableContainer}>
        <p className={styles.updateTime}>
          마지막 갱신:{' '}
          {status.instances.length > 0
            ? status.instances[0].LastUpdated
            : 'N/A'}
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
              const statusClass = isRunning
                ? styles.running
                : styles.stopped;
              const rowOpen = selected === instance.InstanceId;

              return (
                <React.Fragment key={instance.InstanceId}>
                  <tr
                    className={`${styles.instanceRow} ${
                      rowOpen ? styles.selectedRow : ''
                    }`}
                    onClick={() => handleInstanceClick(instance.InstanceId)}
                  >
                    <td>{instance.Name}</td>
                    <td>{instance.InstanceId}</td>
                    <td className={statusClass}>
                      {instance.InstanceState.toUpperCase()}
                    </td>
                    <td className={styles.checkStatus}>
                      {getSystemIcon(instance)}
                    </td>

                    <td>
                      {instance.PublicIp || instance.PrivateIp || 'N/A'}
                    </td>
                    <td>
                      {isRunning ? (
                        <button
                          className={styles.stopButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            controlInstance(instance.InstanceId, 'stop');
                          }}
                        >
                          중지
                        </button>
                      ) : (
                        <button
                          className={styles.startButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            controlInstance(instance.InstanceId, 'start');
                          }}
                          disabled={['pending', 'stopping'].includes(
                            instance.InstanceState
                          )}
                        >
                          시작
                        </button>
                      )}
                    </td>
                  </tr>

                  {rowOpen && (
                    <tr>
<td colSpan="6" className={styles.detailCell}>
                        <div className={styles.detailContainer}>
                          <div className={styles.logSection}>
                            <h3>시스템 로그</h3>
                            <pre className={styles.logPre}>{log ?? '불러오는 중…'}</pre>
                          </div>
                          <div className={styles.metricSection}>
                            <h3>CloudWatch 메트릭 (CPU 사용률)</h3>
                            {metrics ? (
                              metrics.error ? (
                                <div className={styles.metricError}>{metrics.error}</div>
                              ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                  <LineChart data={metrics} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="timestamp" />
                                    <YAxis unit="%" domain={[0, 100]} />
                                    <Tooltip formatter={(v, n, p) => [`${v}${p.unit}`, n]} />
                                    <Legend />

                                    <Brush dataKey = "timestamp" height={30} stroke = "#8884d8" />

                                    <Line type="monotone" dataKey="value" name="CPU (%)" unit="%" stroke="#FF5733" strokeWidth={4} />
                                  </LineChart>
                                </ResponsiveContainer>
                              )
                            ) : '메트릭을 불러오는 중…'}
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
  );
}

export default App;