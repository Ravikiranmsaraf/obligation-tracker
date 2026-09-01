import { useEffect, useState } from "react";

function App() {
  const [apiMessage, setApiMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setApiMessage(data.message || JSON.stringify(data));
        setError(null);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message || String(err));
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Hello from Obligation Tracker UI</h1>
      <p>Frontend is running on Vite + React.</p>

      <h2>Backend API response</h2>
      {error && (
        <p style={{ color: "red" }}>
          Error calling API: {error}
        </p>
      )}
      {!error && !apiMessage && <p>Loading API response…</p>}
      {!error && apiMessage && (
        <p>
          API says: <strong>{apiMessage}</strong>
        </p>
      )}
    </div>
  );
}

export default App;