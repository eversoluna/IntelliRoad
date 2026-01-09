import { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { AnchorRegistryAbi } from './abi';

type Feature = { type: string; confidence?: number; bbox?: [number, number, number, number] };

type Observation = {
  id: string;
  createdAt: string;
  lat: number;
  lng: number;
  timestamp: string;
  features: Feature[];
  hashHex: string;
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(digest));
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `0x${hex}`;
}

function fmtDate(x: string) {
  try {
    return new Date(x).toLocaleString();
  } catch {
    return x;
  }
}

export default function App() {
  const [lat, setLat] = useState<number>(10.762622);
  const [lng, setLng] = useState<number>(106.660172);
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString());
  const [features, setFeatures] = useState<Feature[]>([
    { type: 'pothole', confidence: 0.87 },
    { type: 'traffic_sign', confidence: 0.78 }
  ]);
  const [hashHex, setHashHex] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [observations, setObservations] = useState<Observation[]>([]);

  const canonical = useMemo(() => {
    return JSON.stringify({ lat, lng, timestamp, features });
  }, [lat, lng, timestamp, features]);

  useEffect(() => {
    sha256Hex(canonical).then(setHashHex).catch(() => setHashHex(''));
  }, [canonical]);

  async function useCurrentLocation() {
    setStatus('Getting location...');
    return new Promise<void>((resolve) => {
      if (!navigator.geolocation) {
        setStatus('Geolocation not available in this browser.');
        return resolve();
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setStatus('Location updated.');
          resolve();
        },
        () => {
          setStatus('Could not fetch location (permission denied or unavailable).');
          resolve();
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  function updateFeature(i: number, patch: Partial<Feature>) {
    setFeatures((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  function addFeature() {
    setFeatures((prev) => [...prev, { type: 'road_hazard', confidence: 0.6 }]);
  }

  function removeFeature(i: number) {
    setFeatures((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submitObservation() {
    setStatus('Submitting to backend...');
    try {
      const res = await fetch(`${BACKEND_URL}/api/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, timestamp, features, hashHex })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || json?.error || 'Request failed');
      setStatus(`Saved. Observation id: ${json.id}`);
      await refresh();
    } catch (e: any) {
      setStatus(`Submit failed: ${e?.message || String(e)}`);
    }
  }

  async function refresh() {
    const res = await fetch(`${BACKEND_URL}/api/observations?limit=25`);
    const json = await res.json();
    if (json.ok) setObservations(json.observations);
  }

  useEffect(() => {
    refresh().catch(() => void 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function anchorOnChain() {
    if (!CONTRACT_ADDRESS) {
      setStatus('No contract address set. Add VITE_CONTRACT_ADDRESS in apps/frontend/.env.local');
      return;
    }
    const ethAny = (window as any).ethereum;
    if (!ethAny) {
      setStatus('MetaMask not found. Install MetaMask to anchor on-chain.');
      return;
    }

    setStatus('Requesting wallet connection...');
    try {
      const provider = new ethers.BrowserProvider(ethAny);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, AnchorRegistryAbi, signer);
      setStatus('Sending transaction...');
      const tx = await contract.anchor(hashHex);
      setStatus(`Tx sent: ${tx.hash}. Waiting for confirmation...`);
      await tx.wait();
      setStatus('Anchored on-chain ✅');
    } catch (e: any) {
      setStatus(`Anchor failed: ${e?.shortMessage || e?.message || String(e)}`);
    }
  }

  const card: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
  };

  const label: React.CSSProperties = { fontSize: 12, color: '#4b5563', marginBottom: 6 };

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto', maxWidth: 980, margin: '32px auto', padding: '0 16px' }}>
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>IntelliRoad</h1>
        <div style={{ color: '#6b7280' }}>Road-signal demo: hash → store → (optional) anchor</div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, marginTop: 16 }}>
        <section style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Create observation</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={label}>Latitude</div>
              <input value={lat} onChange={(e) => setLat(Number(e.target.value))} style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #d1d5db' }} />
            </div>
            <div>
              <div style={label}>Longitude</div>
              <input value={lng} onChange={(e) => setLng(Number(e.target.value))} style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #d1d5db' }} />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={label}>Timestamp</div>
            <input value={timestamp} onChange={(e) => setTimestamp(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #d1d5db' }} />
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={useCurrentLocation} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}>
              Use my location
            </button>
            <button onClick={() => setTimestamp(new Date().toISOString())} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}>
              Now
            </button>
            <button onClick={addFeature} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}>
              Add feature
            </button>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Detected features</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>edit to see hash change</div>
            </div>

            <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
              {features.map((f, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 90px', gap: 8, alignItems: 'center' }}>
                  <input
                    value={f.type}
                    onChange={(e) => updateFeature(i, { type: e.target.value })}
                    placeholder="type (e.g. pothole)"
                    style={{ padding: 10, borderRadius: 10, border: '1px solid #d1d5db' }}
                  />
                  <input
                    value={f.confidence ?? ''}
                    onChange={(e) => updateFeature(i, { confidence: e.target.value === '' ? undefined : Number(e.target.value) })}
                    placeholder="confidence"
                    style={{ padding: 10, borderRadius: 10, border: '1px solid #d1d5db' }}
                  />
                  <button
                    onClick={() => removeFeature(i)}
                    style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Observation hash (SHA-256 of canonical JSON)</div>
            <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', fontSize: 12, marginTop: 6, wordBreak: 'break-all' }}>{hashHex || '(computing...)'}</div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={submitObservation} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #111827', background: '#111827', color: 'white', cursor: 'pointer' }}>
              Submit to backend
            </button>
            <button onClick={anchorOnChain} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}>
              Anchor on-chain
            </button>
            <button onClick={refresh} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}>
              Refresh list
            </button>
          </div>

          <div style={{ marginTop: 12, color: '#374151', fontSize: 13 }}>{status}</div>

          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer', color: '#6b7280' }}>Show canonical JSON</summary>
            <pre style={{ marginTop: 8, padding: 12, borderRadius: 12, background: '#0b1020', color: '#e5e7eb', overflowX: 'auto' }}>{canonical}</pre>
          </details>
        </section>

        <aside style={card}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Recent observations</h2>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Stored in backend SQLite. Hash is verified server-side.</div>

          <div style={{ display: 'grid', gap: 10 }}>
            {observations.map((o) => (
              <div key={o.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtDate(o.createdAt)}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{o.features.length} features</div>
                </div>
                <div style={{ fontSize: 12, color: '#374151', marginTop: 6 }}>
                  {o.lat.toFixed(6)}, {o.lng.toFixed(6)}
                </div>
                <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', fontSize: 11, color: '#6b7280', marginTop: 6, wordBreak: 'break-all' }}>{o.hashHex}</div>
              </div>
            ))}
            {observations.length === 0 && <div style={{ color: '#6b7280', fontSize: 13 }}>No observations yet. Submit one.</div>}
          </div>

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb', fontSize: 12, color: '#6b7280' }}>
            <div><b>Backend:</b> {BACKEND_URL}</div>
            <div><b>Contract:</b> {CONTRACT_ADDRESS || '(not set)'}</div>
          </div>
        </aside>
      </div>

      <footer style={{ marginTop: 20, color: '#9ca3af', fontSize: 12 }}>
        Tip: deploy the contract locally with Hardhat, then set <code>VITE_CONTRACT_ADDRESS</code> to anchor hashes.
      </footer>
    </div>
  );
}
