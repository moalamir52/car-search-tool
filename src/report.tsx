
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function DailyBookingReport() {
  const [data, setData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const fetchSheet = async () => {
      try {
        const response = await fetch(
          "https://docs.google.com/spreadsheets/d/1XwBko5v8zOdTdv-By8HK_DvZnYT2T12mBw_SIbCfMkE/export?format=csv&gid=769459790"
        );
        const text = await response.text();
        const rows = text.split("\n").map((r) => r.split(","));
        const headers = rows.find((row) => row.some((c) => c.trim() !== ""));
        const values = rows.slice(rows.indexOf(headers) + 1);
        const parsed = values
          .filter((r) => r.length === headers.length && r.some((c) => c.trim() !== ""))
          .map((r) => Object.fromEntries(r.map((c, i) => [headers[i]?.trim(), c?.trim()])));
        setData(parsed);
      } catch (error) {
        console.error("Error loading report:", error);
      }
    };
    fetchSheet();
  }, []);

  const pad = (v) => (v ? v.toString().padStart(2, "0") : "00");

  const filteredByDate = data.filter((row) => {
    const rawDate = row["Pick-up Date"];
    if (!rawDate) return false;
    const cleaned = rawDate.split(" ")[0].replaceAll("/", "-");
    const parts = cleaned.split("-");
    let yyyy, mm, dd;
    if (parts[0]?.length === 4) {
      [yyyy, mm, dd] = parts;
    } else {
      [dd, mm, yyyy] = parts;
    }
    const normalized = `${yyyy}-${pad(mm)}-${pad(dd)}`;
    return normalized === selectedDate;
  });

  const allCarCount = (() => {
    const grouped = {};
    data.forEach((row) => {
      const booking = row["Booking Number"] || "";
      if (!booking || isNaN(Number(booking))) return;
      let model = row["Model"] || "غير محدد";
      if (model.toLowerCase().includes("tiggo 4 pro")) {
        model = "Tiggo 4 2025";
      }
      grouped[model] = (grouped[model] || 0) + 1;
    });
    return grouped;
  })();

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ textAlign: "center" }}>تقرير الحجز اليومي - Invygo</h2>
      <div style={{ marginBottom: 10, textAlign: "center" }}>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
      </div>
      <div
        style={{
          display: "flex",
          gap: "20px",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "flex-start"
        }}
      >
        <div style={{ background: "#f9f9f9", padding: 10, border: "1px solid #ccc", flex: "1 1 45%", minWidth: "300px" }}>
          <h3> Total of Cars 📦 </h3>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #ccc", padding: 6 }}>Model</th>
                <th style={{ border: "1px solid #ccc", padding: 6 }}>Total Cars</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(allCarCount).map(([model, count], idx) => (
                <tr key={idx}>
                  <td style={{ border: "1px solid #ddd", padding: 6 }}>{model}</td>
                  <td style={{ border: "1px solid #ddd", padding: 6 }}>{count}</td>
                </tr>
              ))}
              <tr>
                <td style={{ border: "1px solid #ccc", padding: 6 }}><strong>TOTAL</strong></td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  <strong>{Object.values(allCarCount).reduce((a, b) => a + b, 0)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ background: "#f9f9f9", padding: 10, border: "1px solid #ccc", flex: "1 1 45%", minWidth: "300px" }}>
          <h4> Booked Cars 🚘{selectedDate}</h4>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #ccc", padding: 6 }}>Model</th>
                <th style={{ border: "1px solid #ccc", padding: 6 }}>Plate Number</th>
              </tr>
            </thead>
            <tbody>
              {filteredByDate.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ border: "1px solid #ddd", padding: 6 }}>{row["Model"]}</td>
                  <td style={{ border: "1px solid #ddd", padding: 6 }}>{row["INVYGO"]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
