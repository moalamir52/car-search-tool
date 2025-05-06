import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";

export default function CarSearchTool() {
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState([]);
  const [results, setResults] = useState([]);
  const [showOnlyMismatch, setShowOnlyMismatch] = useState(false);
  const [showReturnedRepairedOnly, setShowReturnedRepairedOnly] =
    useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [maintenanceData, setMaintenanceData] = useState([]);
  const tableRef = useRef(null);

  const normalize = (str) =>
    str?.toString().toLowerCase().replace(/\s+/g, "").trim();

  useEffect(() => {
    const fetchFromGoogleSheet = async () => {
      try {
        const sheetUrl =
          "https://docs.google.com/spreadsheets/d/1XwBko5v8zOdTdv-By8HK_DvZnYT2T12mBw_SIbCfMkE/export?format=csv&gid=769459790";
        const response = await fetch(sheetUrl);
        const text = await response.text();
        const rows = text.split("\n").map((row) => row.split(","));
        const headers = rows.find((row) =>
          row.some((cell) => cell.trim() !== "")
        );
        const values = rows.slice(rows.indexOf(headers) + 1);
        const jsonData = values
          .filter(
            (row) =>
              row.length === headers.length &&
              row.some((cell) => cell.trim() !== "")
          )
          .map((row) =>
            Object.fromEntries(
              row.map((cell, i) => [headers[i]?.trim(), cell?.trim()])
            )
          );
        setData(jsonData);
        setResults(jsonData);
      } catch (error) {
        console.error(error);
        alert("Error fetching Google Sheet data");
      }
    };
    fetchFromGoogleSheet();
  }, []);

  useEffect(() => {
    const fetchMaintenanceData = async () => {
      try {
        const sheetUrl =
          "https://docs.google.com/spreadsheets/d/1v4rQWn6dYPVQPd-PkhvrDNgKVnexilrR2XIUVa5RKEM/export?format=csv&gid=0";
        const response = await fetch(sheetUrl);
        const text = await response.text();
        const rows = text.split("\n").map((row) => row.split(","));
        const headers = rows.find((row) =>
          row.some((cell) => cell.trim() !== "")
        );
        const values = rows.slice(rows.indexOf(headers) + 1);
        const jsonData = values
          .filter(
            (row) =>
              row.length === headers.length &&
              row.some((cell) => cell.trim() !== "")
          )
          .map((row) =>
            Object.fromEntries(
              row.map((cell, i) => [headers[i]?.trim(), cell?.trim()])
            )
          );
        setMaintenanceData(jsonData);
      } catch (error) {
        console.error(error);
        alert("Error fetching maintenance data");
      }
    };
    fetchMaintenanceData();
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

      // Count mismatches
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
    XLSX.writeFile(wb, "yelo_car_data.xlsx");
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

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ color: "#f6b504" }}>
        YELO Car Rental Dashboard - Mohamed Alamir
      </h1>
      <div
        style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}
      >
        <input
          type="text"
          placeholder="🔍 Search across all fields..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleGlobalSearch();
          }}
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
        <button onClick={() => setShowAnalytics((prev) => !prev)}>
          📊 Show Analytics
        </button>
      </div>

      {showAnalytics && (
        <div
          style={{
            marginBottom: 20,
            background: "#f0f0f0",
            padding: 10,
            borderRadius: 6,
          }}
        >
          <h3>🔍 Quick Analytics</h3>
          <p>✅Total Rows: {analytics.total}</p>
          <p>✅INVYGO: {analytics.invygoCount}</p>
          <p>✅Daily: {analytics.dailyCount}</p>
          <p>✅Monthly + Sponsorship: {analytics.monthlyCount}</p>
          <p>✅Leasing: {analytics.leasingCount}</p>
          <p>✅Mismatched: ({switchBackMismatches})</p>
          <p>
            ✅ Ready to Switch Back:{" "}
            {
              results.filter((row) => {
                const booking = row["Booking Number"] || "";
                const isNumericBooking = !isNaN(Number(booking));
                const ejar = normalize(row["EJAR"]);
                const invygo = normalize(row["INVYGO"]);
                const maintenance = maintenanceData.find(
                  (m) => m["Vehicle"] === row["INVYGO"]
                );
                const isRepairDone = maintenance && maintenance["Date IN"];
                return isRepairDone && isNumericBooking && ejar !== invygo;
              }).length
            }
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div style={{ overflowX: "auto", maxHeight: "75vh" }}>
          <table
            ref={tableRef}
            style={{
              borderCollapse: "collapse",
              minWidth: "1600px",
              background: "#fff",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                    minWidth: 50,
                    textAlign: "center",
                    position: "sticky",
                    top: 0,
                    backgroundColor: "#fff",
                    zIndex: 1,
                  }}
                >
                  # (Index)
                </th>
                {headers.map((header, index) => (
                  <th
                    key={index}
                    style={{
                      border: "1px solid #ccc",
                      padding: "8px",
                      minWidth: 150,
                      textAlign: "center",
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((row, idx) => {
                const booking = row["Booking Number"] || "";
                const isNumericBooking = !isNaN(Number(booking));
                const ejar = normalize(row["EJAR"]);
                const invygo = normalize(row["INVYGO"]);
                const maintenance = maintenanceData.find(
                  (m) => m["Vehicle"] === row["INVYGO"]
                );
                const isRepairDone = maintenance && maintenance["Date IN"];
                const isMismatch =
                  isNumericBooking && ejar && invygo && ejar !== invygo;

                return (
                  <tr
                    key={idx}
                    style={{
                      backgroundColor: isMismatch
                        ? isRepairDone
                          ? "#d4edda"
                          : "#fff3cd"
                        : "",
                    }}
                  >
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "6px",
                        textAlign: "center",
                      }}
                    >
                      {idx + 1}
                    </td>
                    {headers.map((header, index) => (
                      <td
                        key={index}
                        style={{
                          border: "1px solid #ddd",
                          padding: "6px",
                          textAlign: "center",
                        }}
                      >
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
