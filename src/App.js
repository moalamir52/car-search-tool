import { useState, useRef, useEffect } from "react";
import Select from "react-select";
import * as XLSX from "xlsx";

export default function CarSearchTool() {
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState([]);
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState({});
  const [showOnlyMismatch, setShowOnlyMismatch] = useState(false);
  const tableRef = useRef(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .resizer {
        position: absolute;
        right: 0;
        top: 0;
        width: 5px;
        height: 100%;
        cursor: col-resize;
        user-select: none;
        background-color: transparent;
        z-index: 1;
      }
      th.resizable {
        position: relative;
      }
      thead th {
        position: sticky;
        top: 0;
        background: #fff;
        z-index: 2;
      }
      .mismatch {
        background-color: #fff3cd !important;
      }
    `;
    document.head.appendChild(style);

    const table = tableRef.current;
    if (!table) return;

    const cols = table.querySelectorAll("th.resizable");
    cols.forEach((col, index) => {
      const resizer = document.createElement("div");
      resizer.className = "resizer";
      col.appendChild(resizer);

      let startX, startWidth;
      const onMouseMove = (e) => {
        const newWidth = startWidth + (e.pageX - startX);
        col.style.width = newWidth + "px";
        const rows = table.querySelectorAll("tbody tr");
        rows.forEach((row) => {
          const cell = row.children[index];
          if (cell) cell.style.width = newWidth + "px";
        });
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      resizer.addEventListener("mousedown", (e) => {
        startX = e.pageX;
        startWidth = col.offsetWidth;
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });
    });
  }, [results]);

  // قراءة البيانات من Google Sheets عند تحميل الصفحة
  useEffect(() => {
    const fetchFromGoogleSheet = async () => {
      try {
        // رابط الـ Google Sheets بصيغة CSV
        const sheetUrl = "https://docs.google.com/spreadsheets/d/1XwBko5v8zOdTdv-By8HK_DvZnYT2T12mBw_SIbCfMkE/export?format=csv&gid=769459790";
        const response = await fetch(sheetUrl);
        const text = await response.text();

        // تحويل البيانات إلى JSON
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
  }, []); // هذه الفاصلة فارغة تعني أنها تعمل مرة واحدة عند تحميل الصفحة

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

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Filtered Results");
    XLSX.writeFile(wb, "yelo_car_data.xlsx");
  };

  const normalize = (str) => str?.toString().toLowerCase().replace(/\s+/g, "").trim();

  const handleFilterChange = (key, values) => {
    const updatedFilters = { ...filters, [key]: values };
    setFilters(updatedFilters);
    applyFilters(updatedFilters, showOnlyMismatch);
  };

  const resetFilters = () => {
    setFilters({});
    setResults(data);
  };

  const handleGlobalSearch = () => {
    const keyword = normalize(searchTerm);
    const filtered = data.filter((row) =>
      Object.values(row).some((val) => normalize(val).includes(keyword))
    );
    setResults(filtered);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleGlobalSearch();
    }
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
      filtered = filtered.filter((row) => normalize(row["EJAR"]) !== normalize(row["INVYGO"]));
    }
    setResults(filtered);
  };

  const toggleMismatchFilter = () => {
    const newValue = !showOnlyMismatch;
    setShowOnlyMismatch(newValue);
    applyFilters(filters, newValue);
  };

  const getUniqueValues = (column) => {
    const values = data.map(row => row[column] || "").filter(Boolean);
    return Array.from(new Set(values.map(normalize)));
  };

  const headers = [
    "Contract No.", "Booking Number", "Customer", "Pick-up Branch", "EJAR", "INVYGO", "Model", "Pick-up Date"
  ];

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ color: '#f6b504' }}>YELO Car Rental Dashboard - Mohamed Alamir</h1>
      <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="🔍 Search across all fields..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyPress}
          style={{ padding: 8, minWidth: 250 }}
        />
        <button onClick={handleGlobalSearch}>🔍 Search</button>
        <button onClick={resetFilters}>♻ Reset Filters</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={showOnlyMismatch} onChange={toggleMismatchFilter} />
          Show Mismatched Only
        </label>
        <button onClick={exportToExcel}>📤 Export</button>
        <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
      </div>
      {results.length > 0 && (
        <div style={{ overflowX: "auto", maxHeight: "75vh" }}>
          <table ref={tableRef} style={{ borderCollapse: "collapse", minWidth: "1600px", background: "#fff" }}>
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index} className="resizable" style={{ border: "1px solid #ccc", padding: "8px", minWidth: 150 }}>{header}</th>
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
                const mismatch = normalize(row["EJAR"]) !== normalize(row["INVYGO"]);
                return (
                  <tr key={idx} className={mismatch ? "mismatch" : ""}>
                    {headers.map((header, index) => (
                      <td key={index} style={{ border: "1px solid #ddd", padding: "6px" }}>{row[header]}</td>
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
