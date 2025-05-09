import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import DailyBookingReport from "./report.tsx";

export default function CarSearchTool() {
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState([]);
  const [results, setResults] = useState([]);
  const [showOnlyMismatch, setShowOnlyMismatch] = useState(false);
  const [showReturnedRepairedOnly, setShowReturnedRepairedOnly] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showDailyReport, setShowDailyReport] = useState(false);
  const [maintenanceData, setMaintenanceData] = useState([]);
  const tableRef = useRef(null);

  const normalize = (str) => str?.toString().toLowerCase().replace(/\s+/g, "").trim();

  useEffect(() => {
    const fetchSheet = async (url) => {
      const response = await fetch(url);
      const text = await response.text();
      const rows = text.split("\n").map((r) => r.split(","));
      const headers = rows.find((row) => row.some((c) => c.trim() !== ""));
      const values = rows.slice(rows.indexOf(headers) + 1);
      return values
        .filter((r) => r.length === headers.length && r.some((c) => c.trim() !== ""))
        .map((r) => Object.fromEntries(r.map((c, i) => [headers[i]?.trim(), c?.trim()])));
    };

    const loadSheets = async () => {
      try {
        const [mainData, maintenance] = await Promise.all([
          fetchSheet("https://docs.google.com/spreadsheets/d/1XwBko5v8zOdTdv-By8HK_DvZnYT2T12mBw_SIbCfMkE/export?format=csv&gid=769459790"),
          fetchSheet("https://docs.google.com/spreadsheets/d/1v4rQWn6dYPVQPd-PkhvrDNgKVnexilrR2XIUVa5RKEM/export?format=csv&gid=0")
        ]);
        setData(mainData);
        setResults(mainData);
        setMaintenanceData(maintenance);
      } catch (err) {
        console.error(err);
        alert("Error fetching Google Sheets");
      }
    };

    loadSheets();
  }, []);

  const getAnalytics = () => {
    let invygoCount = 0;
    let dailyCount = 0;
    let monthlyCount = 0;
    let leasingCount = 0;
    const otherTypes = {};
    let mismatchCount = 0;

    data.forEach((row) => {
      const booking = (row["Booking Number"] || "").toLowerCase();
      if (!booking) return;
      if (!isNaN(Number(booking))) invygoCount++;
      else if (booking.includes("daily")) dailyCount++;
      else if (booking.includes("monthly")) monthlyCount++;
      else if (booking.includes("leasing")) leasingCount++;
      else otherTypes[booking] = (otherTypes[booking] || 0) + 1;

      const ejar = normalize(row["EJAR"]);
      const invygo = normalize(row["INVYGO"]);
      if (ejar && invygo && ejar !== invygo) {
        mismatchCount++;
      }
    });

    return {
      total: results.length,
      invygoCount,
      dailyCount,
      monthlyCount,
      leasingCount,
      otherTypes,
      mismatchCount,
    };
  };

  const analytics = getAnalytics();

  const handleGlobalSearch = () => {
    const keyword = normalize(searchTerm);
    const filtered = data.filter((row) =>
      Object.values(row).some((val) => normalize(val).includes(keyword))
    );
    setResults(filtered);
  };

  const resetFilters = () => {
    setShowOnlyMismatch(false);
    setShowReturnedRepairedOnly(false);
    setResults(data);
  };

  const applyFilters = (mismatchOnly, repairedOnly) => {
    let filtered = [...data];

    if (mismatchOnly) {
      filtered = filtered.filter((row) => {
        const booking = row["Booking Number"] || "";
        const isNumericBooking = !isNaN(Number(booking));
        const ejar = normalize(row["EJAR"]);
        const invygo = normalize(row["INVYGO"]);
        return isNumericBooking && ejar && invygo && ejar !== invygo;
      });
    }

    if (repairedOnly) {
      filtered = filtered.filter((row) => {
        const booking = row["Booking Number"] || "";
        const isNumericBooking = !isNaN(Number(booking));
        const ejar = normalize(row["EJAR"]);
        const invygo = normalize(row["INVYGO"]);
        const maintenance = maintenanceData.find(
          (m) => m["Vehicle"] === row["INVYGO"]
        );
        const isRepairDone = maintenance && maintenance["Date IN"];
        return isRepairDone && isNumericBooking && ejar !== invygo;
      });
    }

    setResults(filtered);
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Filtered Results");
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `YELO_Report_${dateStr}.xlsx`);
  };

  const switchBackMismatches = results.filter((row) => {
    const booking = row["Booking Number"] || "";
    const isNumericBooking = !isNaN(Number(booking));
    const ejar = normalize(row["EJAR"]);
    const invygo = normalize(row["INVYGO"]);
    return isNumericBooking && ejar && invygo && ejar !== invygo;
  }).length;

  const headers = [
    "Contract No.",
    "Booking Number",
    "Customer",
    "Pick-up Branch",
    "EJAR",
    "Model ( Ejar )",
    "INVYGO",
    "Model",
    "Pick-up Date",
  ];

  const Modal = ({ title, children, onClose }) => (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 9999
    }}>
      <div style={{ background: "white", padding: 20, borderRadius: 8, minWidth: 300 }}>
        <h3>{title}</h3>
        <div>{children}</div>
        <button onClick={onClose} style={{ marginTop: 10 }}>❌ Cancel</button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ color: "#f6b504" }}>YELO Car Rental Dashboard - Business Bay Team                         By Mo.Alamir</h1>

      <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="🔍 Search across all fields..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGlobalSearch()}
          style={{ padding: 8, minWidth: 250 }}
        />
        <button onClick={handleGlobalSearch}>🔍 Search</button>
        <button onClick={resetFilters}>♻ Reset Filters</button>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="checkbox"
            checked={showOnlyMismatch}
            onChange={() => {
              const newValue = !showOnlyMismatch;
              setShowOnlyMismatch(newValue);
              applyFilters(newValue, showReturnedRepairedOnly);
            }}
          />
          Show Mismatched Only ({switchBackMismatches})
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="checkbox"
            checked={showReturnedRepairedOnly}
            onChange={() => {
              const newValue = !showReturnedRepairedOnly;
              setShowReturnedRepairedOnly(newValue);
              applyFilters(showOnlyMismatch, newValue);
            }}
          />
          Show Ready to Switch Back
        </label>
        <button onClick={exportToExcel}>📤 Export</button>
        <button onClick={() => setShowAnalytics(true)}>📊 Show Analytics</button>
        <button onClick={() => setShowDailyReport(true)}>📅 Daily Report</button>
      </div>

      {results.length > 0 && (
        <div style={{ overflowX: "auto", maxHeight: "75vh" }}>
          <table ref={tableRef} style={{ borderCollapse: "collapse", minWidth: "1600px", background: "#fff" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #ccc", padding: "8px", minWidth: 50, textAlign: "center", position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1 }}>#</th>
                {headers.map((header, index) => (
                  <th key={index} style={{ border: "1px solid #ccc", padding: "8px", minWidth: 150, textAlign: "center", position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1 }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
  {results.map((row, idx) => {
    const booking = row["Booking Number"] || "";
    const isNumericBooking = !isNaN(Number(booking));
    const ejar = normalize(row["EJAR"]);
    const invygo = normalize(row["INVYGO"]);
    const isMismatch = isNumericBooking && ejar && invygo && ejar !== invygo;

    const maintenance = maintenanceData.find((m) => m["Vehicle"] === row["INVYGO"]);
    const isRepairDone = maintenance && maintenance["Date IN"];
    const isReadyToSwitchBack = isMismatch && isRepairDone;

    let rowStyle = {};
    if (isReadyToSwitchBack) {
      rowStyle.backgroundColor = "#EDE275";
    } else if (isMismatch) {
      rowStyle.backgroundColor = "#E799A3";
    }

    return (
      <tr key={idx} style={rowStyle}>
        <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>{idx + 1}</td>
        {headers.map((header, index) => (
          <td key={index} style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>
            {row[header] || ""}
          </td>
        ))}
      </tr>
    );
  })}
</tbody>
          </table>
        </div>
      )}

      {showAnalytics && (
        <Modal title="Analytics" onClose={() => setShowAnalytics(false)}>
          <p>✅ Total Rows: {analytics.total}</p>
          <p>✅ INVYGO: {analytics.invygoCount}</p>
          <p>✅ Daily: {analytics.dailyCount}</p>
          <p>✅ Monthly + Sponsorship: {analytics.monthlyCount}</p>
          <p>✅ Leasing: {analytics.leasingCount}</p>
          <p>✅ Mismatched: {switchBackMismatches}</p>
          <p>✅ Ready to Switch Back: {
            results.filter((row) => {
              const booking = row["Booking Number"] || "";
              const isNumericBooking = !isNaN(Number(booking));
              const ejar = normalize(row["EJAR"]);
              const invygo = normalize(row["INVYGO"]);
              const maintenance = maintenanceData.find((m) => m["Vehicle"] === row["INVYGO"]);
              const isRepairDone = maintenance && maintenance["Date IN"];
              return isRepairDone && isNumericBooking && ejar !== invygo;
            }).length
          }</p>
        </Modal>
      )}

      {showDailyReport && (
        <Modal title="📅 Daily Report" onClose={() => setShowDailyReport(false)}>
          <DailyBookingReport />
        </Modal>
      )}
    </div>
  );
}
