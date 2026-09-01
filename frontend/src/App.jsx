import { useEffect, useState } from "react";

function App() {
  const [apiMessage, setApiMessage] = useState(null);
  const [obligations, setObligations] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch(`/api/`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`API root: HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setApiMessage(data.message || JSON.stringify(data));
        }),

      fetch(`/api/obligations`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`Obligations: HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setObligations(data);
        }),
    ]).catch((err) => {
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

      <h2>Sample Obligations</h2>
      {obligations.length === 0 ? (
        <p>Loading obligations…</p>
      ) : (
        <ul>
          {obligations.map((ob) => (
            <li key={ob.id}>
              <strong>{ob.name}</strong> – {ob.category} – ₹{ob.amount} – Due day: {ob.dueDay} – Status: {ob.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;