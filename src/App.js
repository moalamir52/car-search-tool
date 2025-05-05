import { useState, useRef, useEffect } from "react";
import Select from "react-select";
import * as XLSX from "xlsx";

export default function CarSearchTool() {
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState([]);
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState({});
  const [showOnlyMismatch, setShowOnlyMismatch] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const tableRef = useRef(null);

  const normalize = (str) => str?.toString().toLowerCase().replace(/\s+/g, "").trim();

  useEffect(() => {
    const fetchFromGoogleSheet = async () => {
      try {
        const sheetUrl = "https://docs.google.com/spreadsheets/d/1XwBko5v8zOdTdv-By8HK_DvZnYT2T12mBw_SIbCfMkE/export?format=csv&gid=769459790";
        const response = await fetch(sheetUrl);
        const text = await response.text();
        const rows = text.split("\n").map((row) => row.split(","));
        const headers = rows.find((row) => row.some((cell) => cell.trim() !== ""));
        const values = rows.slice(rows.indexOf(headers) + 1);
        const jsonData = values
          .filter((row) => row.length === headers.length && row.some((cell) => cell.trim() !== ""))
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

  const handleGlobalSearch = () => {
    const keyword = normalize(searchTerm);
    const filtered = data.filter((row) =>
      Object.values(row).some((val) => normalize(val).includes(keyword))
    );
    setResults(filtered);
  };

  const resetFilters = () => {
    setFilters({});
    applyFilters({}, showOnlyMismatch);
  };

  const applyFilters = (activeFilters, mismatchOnly) => {
    let filtered = data.filter((row) =>
      Object.entries(activeFilters).every(([col, vals]) => {
        if (!vals || vals.length === 0) return true;
        const val = normalize(row[col] || "");
        return vals.some((v) => val === v);
      })
    );
    if (mismatchOnly) {
      filtered = filtered.filter((row) => {
        const booking = row["Booking Number"] || "";
        const isNumericBooking = !isNaN(Number(booking));
        const ejar = normalize(row["EJAR"]);
        const invygo = normalize(row["INVYGO"]);
        return isNumericBooking && ejar && invygo && ejar !== invygo;
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const jsonData = XLSX.utils.sheet_to_json(ws);
      const filteredData = jsonData.filter((row) =>
        Object.values(row).some((val) => val?.toString().trim() !== "")
      );
      setData(filteredData);
      setResults(filteredData);
    };
    reader.readAsBinaryString(file);
  };

  const getAnalytics = () => {
    let invygoCount = 0;
    let dailyCount = 0;
    let monthlyCount = 0;
    let leasingCount = 0;
    const otherTypes = {};

    data.forEach((row) => {
      const booking = (row["Booking Number"] || "").toLowerCase();
      if (!booking) return;
      if (!isNaN(Number(booking))) invygoCount++;
      else if (booking.includes("daily")) dailyCount++;
      else if (booking.includes("monthly")) monthlyCount++;
      else if (booking.includes("leasing")) leasingCount++;
      else otherTypes[booking] = (otherTypes[booking] || 0) + 1;
    });

    return {
      total: results.length,
      invygoCount,
      dailyCount,
      monthlyCount,
      leasingCount,
      otherTypes,
    };
  };

  const analytics = getAnalytics();

  const switchBackMismatches = results.filter(row => {
    const booking = row["Booking Number"] || "";
    const isNumericBooking = !isNaN(Number(booking));
    const ejar = normalize(row["EJAR"]);
    const invygo = normalize(row["INVYGO"]);
    return isNumericBooking && ejar && invygo && ejar !== invygo;
  }).length;

  const headers = [
    "Contract No.", "Booking Number", "Customer", "Pick-up Branch",
    "EJAR", "Model ( Ejar )", "INVYGO", "Model", "Pick-up Date"
  ];

  const getUniqueValues = (column) => {
    const values = data.map(row => row[column] || "").filter(Boolean);
    return Array.from(new Set(values.map(normalize)));
  };

  const handleFilterChange = (key, values) => {
    const updatedFilters = { ...filters, [key]: values };
    setFilters(updatedFilters);
    applyFilters(updatedFilters, showOnlyMismatch);
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ color: '#f6b504' }}>YELO Car Rental Dashboard - Mohamed Alamir</h1>
      <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="🔍 Search across all fields..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleGlobalSearch(); }}
          style={{ padding: 8, minWidth: 250 }}
        />
        <button onClick={handleGlobalSearch}>🔍 Search</button>
        <button onClick={resetFilters}>♻ Reset Filters</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={showOnlyMismatch} onChange={() => {
            const newValue = !showOnlyMismatch;
            setShowOnlyMismatch(newValue);
            applyFilters(filters, newValue);
          }} />
          Show Mismatched Only ({switchBackMismatches})
        </label>
        <button onClick={exportToExcel}>📤 Export</button>
        <button onClick={() => setShowAnalytics(!showAnalytics)}>📊 Analytics</button>
        <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
      </div>

      {showAnalytics && (
        <div style={{ marginBottom: 20, background: "#f0f0f0", padding: 10, borderRadius: 6 }}>
          <h3>🔍 Quick Analytics</h3>
          <p>Total Bookings: {analytics.total}</p>
          <p>Invygo Bookings (numeric only): {analytics.invygoCount}</p>
          <p>Daily Bookings: {analytics.dailyCount}</p>
          <p>Monthly Bookings: {analytics.monthlyCount}</p>
          <p>Leasing Bookings: {analytics.leasingCount}</p>
          <p>Switch Back Mismatches: {switchBackMismatches}</p>
          {Object.entries(analytics.otherTypes).map(([type, count]) => (
            <p key={type} style={{ margin: 0 }}>
              {type.charAt(0).toUpperCase() + type.slice(1)} Bookings: {count}
            </p>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div style={{ overflowX: "auto", maxHeight: "75vh" }}>
          <table ref={tableRef} style={{ borderCollapse: "collapse", minWidth: "1600px", background: "#fff" }}>
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index} style={{ border: "1px solid #ccc", padding: "8px", minWidth: 150, textAlign: "center" }}>{header}</th>
                ))}
              </tr>
              <tr>
                {headers.map((header, index) => {
                  const options = getUniqueValues(header).map((v) => ({ label: v, value: v }));
                  return (
                    <th key={index} style={{ padding: 4 }}>
                      <Select
                        isMulti
                        options={options}
                        value={filters[header]?.map((v) => ({ label: v, value: v })) || []}
                        onChange={(selected) => handleFilterChange(header, selected.map((s) => s.value))}
                        placeholder={`Filter ${header}`}
                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                        menuPortalTarget={document.body}
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {results.map((row, idx) => {
                const booking = row["Booking Number"] || "";
                const isNumericBooking = !isNaN(Number(booking));
                const ejar = normalize(row["EJAR"]);
                const invygo = normalize(row["INVYGO"]);
                const isMismatch = isNumericBooking && ejar && invygo && ejar !== invygo;

                const duplicateBookings = results.map(r => r["Booking Number"]).filter(v => v === booking);
                const isBookingNumberDuplicated = duplicateBookings.filter(v => !isNaN(v)).length > 1;

                return (
                  <tr key={idx} style={{ backgroundColor: isMismatch ? "#fff3cd" : "" }}>
                    {headers.map((header, index) => (
                      <td
                        key={index}
                        style={{
                          border: "1px solid #ddd",
                          padding: "6px",
                          textAlign: "center",
                          color:
                            header === "Booking Number" && isBookingNumberDuplicated
                              ? "red"
                              : undefined,
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
