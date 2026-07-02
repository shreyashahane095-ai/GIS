import { useState, useEffect, useRef } from "react";
import { Search, X, MapPin } from "lucide-react";
import { useMapContext } from "../../context/MapContext";
import "./SearchPanel.css";

function SearchPanel() {
  const { map, showSearch, setShowSearch } = useMapContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (showSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSearch]);

  const search = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5`
      );
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const flyTo = (item) => {
    if (!map) return;
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    map.flyTo([lat, lon], 8);
    setShowSearch(false);
  };

  if (true) return null;

  return (
    <div className="search-panel glass-panel gis-fade-in">
      <div className="search-header">
        <h6 className="m-0 fw-bold">Search</h6>
        <button className="btn-close" onClick={() => setShowSearch(false)} aria-label="Close" />
      </div>
      <form onSubmit={search} className="search-form">
        <div className="input-group">
          <span className="input-group-text bg-white border-end-0">
            <Search size={16} />
          </span>
          <input
            ref={inputRef}
            type="text"
            className="form-control border-start-0"
            placeholder="Search city, place..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "..." : "Go"}
          </button>
        </div>
      </form>
      <div className="search-results">
        {results.length === 0 && !loading && query && (
          <div className="text-muted small p-2">No results found.</div>
        )}
        {results.map((item) => (
          <div
            key={item.place_id}
            className="search-result-item"
            onClick={() => flyTo(item)}
          >
            <MapPin size={16} />
            <div className="search-result-text">
              <div className="search-result-name">{item.display_name}</div>
              <div className="search-result-type text-capitalize">{item.type}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SearchPanel;
