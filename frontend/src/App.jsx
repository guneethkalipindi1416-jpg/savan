import { useMemo, useState } from "react";
import Plot from "react-plotly.js";

const API = "http://127.0.0.1:8000/api";

function Matrix({ title, records, stocks, decimals = 2 }) {
  const lookup = useMemo(() => Object.fromEntries((records || []).map(x => [`${x.row}|${x.col}`, x.value])), [records]);
  return <div className="panel"><div className="panel-title"><div><span className="label">STATISTICS</span><h3>{title}</h3></div><span className="badge">{stocks.length} companies</span></div><div className="table-wrap"><table><thead><tr><th></th>{stocks.map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>{stocks.map(r=><tr key={r}><th>{r}</th>{stocks.map(c=>{const v=lookup[`${r}|${c}`]; return <td key={c} className={v == null ? "" : v >= 0 ? "positive" : "negative"}>{v == null ? "—" : Number(v).toFixed(decimals)}</td>})}</tr>)}</tbody></table></div></div>;
}

function money(v) {
  return `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function App() {
  const [started, setStarted] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [period, setPeriod] = useState("6mo");
  const [window, setWindow] = useState(20);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [forecastStock, setForecastStock] = useState("");
  const [forecastHorizon, setForecastHorizon] = useState(30);
  const [capital, setCapital] = useState(100000);
  const [riskPct, setRiskPct] = useState(2);
  const [stopPct, setStopPct] = useState(5);

  async function searchCompanies(value) {
    setQuery(value); setError("");
    if (value.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try { const r = await fetch(`${API}/search?q=${encodeURIComponent(value.trim())}`); const data = await r.json(); setResults(Array.isArray(data) ? data : []); }
    catch { setError("Could not search companies. Make sure the backend is running."); }
    finally { setSearching(false); }
  }

  function addCompany(company) {
    if (selected.some(x => x.ticker === company.ticker)) return;
    if (selected.length >= 8) { setError("You can analyze a maximum of 8 companies at a time."); return; }
    setSelected(x => [...x, company]); setQuery(""); setResults([]); setError("");
  }
  function removeCompany(ticker) { setSelected(x => x.filter(s => s.ticker !== ticker)); }

  async function analyze() {
    if (selected.length < 2) { setError("Select at least 2 companies to compare."); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API}/analyze`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({stocks:selected, period, rolling_window:Number(window), forecast_horizon:Number(forecastHorizon)}) });
      const data = await r.json(); if (!r.ok) throw new Error(data.detail || "Analysis failed.");
      setResult(data); setForecastStock(data.stocks[0]); setTab("overview");
      setTimeout(()=>document.getElementById("results")?.scrollIntoView({behavior:"smooth"}),100);
    } catch(e) { setError(e.message); } finally { setLoading(false); }
  }

  const pair = result?.pair_analysis;
  const rollingX = result?.rolling?.map(x=>x.date) || [];
  const rollingY = result?.rolling?.map(x=>x.correlation) || [];
  const riskRows = result ? Object.entries(result.risk_metrics) : [];
  const forecast = result?.forecasts?.[forecastStock]?.[String(forecastHorizon)];
  const latestPrice = result?.latest_prices?.[forecastStock] || 0;
  const riskAmount = Number(capital || 0) * Number(riskPct || 0) / 100;
  const stopPrice = latestPrice * (1 - Number(stopPct || 0) / 100);
  const perShareRisk = Math.abs(latestPrice - stopPrice);
  const shares = perShareRisk > 0 ? Math.floor(riskAmount / perShareRisk) : 0;
  const positionValue = shares * latestPrice;

  const terrain = result ? result.stocks.map(r => result.stocks.map(c => {
    const item = result.pearson.find(x => x.row === r && x.col === c);
    return item?.value ?? 0;
  })) : [];

  return (
    <div className="app">
    <section className="home">
      <div className="orb orb-a"/><div className="orb orb-b"/><div className="grid3d"/>
      <nav><div className="brand"><span>Σ</span> QUANT LAB</div><div className="nav-pill">CORRELATION • REGRESSION • MARKET DATA</div></nav>
      <div className="home-content">
        <div className="home-copy"><span className="label">B.TECH QUANTITATIVE ANALYSIS PROJECT</span><h1>Stock<br/><em>Correlation</em><br/>Analyzer</h1><p>Search companies, understand historical relationships, model risk and explore a transparent regression-based future scenario.</p><button className="primary" onClick={()=>{setStarted(true);setTimeout(()=>document.getElementById("workspace")?.scrollIntoView({behavior:"smooth"}),80)}}>Start Analysis <span>→</span></button></div>
        <div className="hero-card"><div className="hero-card-top"><span>QUANT ENGINE</span><i>● HISTORICAL + MODEL</i></div><div className="mini-chart">{[38,52,43,68,58,78,71,92,83,105,94,120].map((h,i)=><div key={i} style={{height:h}}><b/></div>)}</div><div className="hero-stats"><div><small>Correlation</small><strong>r</strong></div><div><small>Regression</small><strong>β</strong></div><div><small>Forecast</small><strong>7–90D</strong></div></div></div>
      </div>
      <div className="scroll-hint">HISTORICAL ANALYSIS → MODEL SCENARIO <span>↓</span></div>
    </section>

    {started && (
      <main id="workspace" className="workspace">
      <section className="selector panel">
        <div className="selector-head"><div><span className="label">01 / COMPANY SELECTION</span><h2>Search the market</h2><p>Find companies by name or stock symbol. Select 2–8 companies for one analysis.</p></div><div className="count"><strong>{selected.length}</strong><span>/ 8<br/>selected</span></div></div>
        <div className="search-box"><span>⌕</span><input value={query} onChange={e=>searchCompanies(e.target.value)} placeholder="Search company name or symbol — e.g. Tata, TCS, Infosys..."/><kbd>SEARCH</kbd></div>
        {(query.length >= 2) && <div className="search-results">{searching ? <div className="search-state">Searching market listings…</div> : results.length ? results.map(c=><button className="search-result" key={c.ticker} onClick={()=>addCompany(c)}><div><strong>{c.name}</strong><small>{c.symbol} • {c.exchange || "Market listing"}</small></div><span>＋</span></button>) : <div className="search-state">No matching companies found. Try a company name or ticker.</div>}</div>}
        <div className="selected-list">{selected.length ? selected.map(c=><div className="selected-chip" key={c.ticker}><span><b>{c.symbol}</b><small>{c.name}</small></span><button onClick={()=>removeCompany(c.ticker)}>×</button></div>) : <div className="empty-selection">Your selected companies will appear here.</div>}</div>
        <div className="analysis-controls"><label>Historical period<select value={period} onChange={e=>setPeriod(e.target.value)}><option value="6mo">6 months</option><option value="1y">1 year</option><option value="3y">3 years</option><option value="5y">5 years</option></select></label><label>Rolling window<select value={window} onChange={e=>setWindow(e.target.value)}><option value="20">20 days</option><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option></select></label><label>Forecast horizon<select value={forecastHorizon} onChange={e=>setForecastHorizon(Number(e.target.value))}><option value="7">7 trading days</option><option value="30">30 trading days</option><option value="60">60 trading days</option><option value="90">90 trading days</option></select></label><button className="analyze" disabled={loading} onClick={analyze}>{loading ? "Analyzing…" : "Analyze + Model Future →"}</button></div>
        {error && <div className="error">⚠ {error}</div>}
      </section>

      {!result && <section className="features"><article><span>01</span><h3>Correlate</h3><p>Pearson, Spearman, covariance, p-values, rolling correlation and market-adjusted correlation.</p></article><article><span>02</span><h3>Measure risk</h3><p>Historical return, annualized volatility, maximum drawdown and an educational position-size scenario.</p></article><article><span>03</span><h3>Model a scenario</h3><p>Simple regression projects a historical price trend forward with a visible uncertainty band and R².</p></article></section>}

      {result && <section id="results" className="results">
        <div className="results-head"><div><span className="label">02 / ANALYSIS RESULTS</span><h2>Market intelligence</h2><p>{result.date_start} → {result.date_end} · {result.observations} daily return observations</p></div><div className="tabs"><button className={tab==="overview"?"active":""} onClick={()=>setTab("overview")}>Overview</button><button className={tab==="forecast"?"active":""} onClick={()=>setTab("forecast")}>Future Scenario</button><button className={tab==="matrices"?"active":""} onClick={()=>setTab("matrices")}>Matrices</button><button className={tab==="math"?"active":""} onClick={()=>setTab("math")}>Mathematics</button></div></div>

        {tab === "overview" && <>
          <div className="metric-grid">{riskRows.map(([name,m])=><div className="stock-metric panel" key={name}><div className="stock-name"><b>{name}</b><span>{selected.find(x=>x.name===name)?.symbol}</span></div><strong>{m.total_return==null?"—":`${(m.total_return*100).toFixed(1)}%`}</strong><small>Historical return</small><div className="metric-line"><span>Volatility</span><b>{m.annualized_volatility==null?"—":`${(m.annualized_volatility*100).toFixed(1)}%`}</b></div><div className="metric-line"><span>Max drawdown</span><b>{m.max_drawdown==null?"—":`${(m.max_drawdown*100).toFixed(1)}%`}</b></div></div>)}</div>
          <section className="pair panel"><div><span className="label">PRIMARY PAIR</span><h2>{pair.stock_a} <em>↔</em> {pair.stock_b}</h2><p>{pair.interpretation}. This describes historical returns; it is not a guarantee of future co-movement.</p></div><div className="pair-values"><div><small>Pearson</small><b>{pair.pearson?.toFixed(3)}</b></div><div><small>Spearman</small><b>{pair.spearman?.toFixed(3)}</b></div><div><small>p-value</small><b>{pair.pearson_p?.toFixed(5)}</b></div><div><small>Market-adjusted</small><b>{pair.partial_correlation_market_adjusted?.toFixed(3) ?? "—"}</b></div></div></section>
          <div className="charts"><div className="panel"><div className="panel-title"><div><span className="label">TIME-VARYING</span><h3>Rolling correlation</h3></div><span className="badge">{result.rolling_window} day window</span></div><Plot data={[{x:rollingX,y:rollingY,type:"scatter",mode:"lines",line:{color:"#58e6cf",width:3},fill:"tozeroy",fillcolor:"rgba(88,230,207,.08)"}]} layout={{autosize:true,margin:{l:45,r:15,t:5,b:45},paper_bgcolor:"transparent",plot_bgcolor:"transparent",font:{color:"#9aacbf"},yaxis:{range:[-1,1],title:"r",gridcolor:"rgba(255,255,255,.06)"},xaxis:{gridcolor:"rgba(255,255,255,.04)"}}} useResizeHandler style={{width:"100%",height:350}} config={{displayModeBar:false,responsive:true}}/></div><div className="panel"><div className="panel-title"><div><span className="label">3D VIEW</span><h3>Correlation terrain</h3></div></div><Plot data={[{type:"surface",z:terrain,x:result.stocks,y:result.stocks,colorscale:[[0,"#ff5577"],[.5,"#14233e"],[1,"#46e1bd"]],cmin:-1,cmax:1,showscale:false}]} layout={{autosize:true,margin:{l:5,r:5,t:5,b:5},paper_bgcolor:"transparent",scene:{bgcolor:"transparent",xaxis:{color:"#91a4bb"},yaxis:{color:"#91a4bb"},zaxis:{range:[-1,1],color:"#91a4bb"}}}} useResizeHandler style={{width:"100%",height:350}} config={{displayModeBar:false,responsive:true}}/></div></div>
          <section className="panel risk-tools"><div className="panel-title"><div><span className="label">RISK & POSITION CALCULATOR</span><h3>Test an investment scenario</h3></div></div><p className="muted">This is an educational risk calculation. It does not tell you how much you should invest.</p><div className="calc-grid"><label>Total capital (₹)<input type="number" value={capital} onChange={e=>setCapital(e.target.value)}/></label><label>Max risk per position (%)<input type="number" min="0.1" max="100" step="0.1" value={riskPct} onChange={e=>setRiskPct(e.target.value)}/></label><label>Stock for scenario<select value={forecastStock} onChange={e=>setForecastStock(e.target.value)}>{result.stocks.map(s=><option key={s}>{s}</option>)}</select></label><label>Stop-loss distance (%)<input type="number" min="0.1" max="50" step="0.5" value={stopPct} onChange={e=>setStopPct(e.target.value)}/></label></div><div className="calc-output"><div><small>Current price</small><strong>{money(latestPrice)}</strong></div><div><small>Maximum risk amount</small><strong>{money(riskAmount)}</strong></div><div><small>Illustrative position size</small><strong>{shares.toLocaleString("en-IN")} shares</strong></div><div><small>Capital used</small><strong>{money(positionValue)}</strong></div></div></section>
          <section className="panel"><div className="panel-title"><div><span className="label">HISTORICAL READOUT</span><h3>What the data says</h3></div></div><div className="readout-grid">{riskRows.map(([name,m])=><div className="readout" key={name}><b>{name}</b><p>Historical return <strong>{(m.total_return*100).toFixed(1)}%</strong>, annualized volatility <strong>{(m.annualized_volatility*100).toFixed(1)}%</strong>, and maximum drawdown <strong>{(m.max_drawdown*100).toFixed(1)}%</strong> for the selected period.</p></div>)}</div></section>
        </>}

        {tab === "forecast" && <section className="forecast-page">
          <div className="forecast-hero panel"><div><span className="label">04 / REGRESSION FORECAST ENGINE</span><h2>Future scenario — model, not certainty</h2><p>The model fits a simple linear regression to the logarithm of historical closing prices, then projects that historical trend forward. The shaded range represents model error; it is not a guarantee of future price.</p></div><div className="forecast-controls"><label>Company<select value={forecastStock} onChange={e=>setForecastStock(e.target.value)}>{result.stocks.map(s=><option key={s}>{s}</option>)}</select></label><label>Horizon<select value={forecastHorizon} onChange={e=>setForecastHorizon(Number(e.target.value))}><option value="7">7 trading days</option><option value="30">30 trading days</option><option value="60">60 trading days</option><option value="90">90 trading days</option></select></label></div></div>
          {forecast ? <>
            <div className="forecast-cards"><div className="panel"><small>Current price</small><strong>{money(forecast.current_price)}</strong></div><div className="panel"><small>Model projected price</small><strong>{money(forecast.forecast_price)}</strong></div><div className="panel"><small>Model projected return</small><strong className={forecast.forecast_return >= 0 ? "positive-text" : "negative-text"}>{(forecast.forecast_return*100).toFixed(2)}%</strong></div><div className="panel"><small>Historical fit (R²)</small><strong>{forecast.r2.toFixed(3)}</strong></div></div>
            <div className="charts forecast-chart"><div className="panel"><div className="panel-title"><div><span className="label">PRICE PATH</span><h3>{forecastStock} historical price + regression scenario</h3></div><span className="badge">{forecast.reliability}</span></div><Plot data={[{x:forecast.history_dates,y:forecast.history_prices,type:"scatter",mode:"lines",name:"Historical",line:{color:"#9aacbf",width:2}},{x:forecast.forecast_dates,y:forecast.forecast_prices,type:"scatter",mode:"lines",name:"Model trend",line:{color:"#58e6cf",width:3}},{x:[...forecast.forecast_dates,...forecast.forecast_dates.slice().reverse()],y:[...forecast.upper_band,...forecast.lower_band.slice().reverse()],type:"scatter",fill:"toself",fillcolor:"rgba(88,230,207,.12)",line:{color:"transparent"},name:"Model range",hoverinfo:"skip"}]} layout={{autosize:true,margin:{l:55,r:20,t:10,b:50},paper_bgcolor:"transparent",plot_bgcolor:"transparent",font:{color:"#9aacbf"},xaxis:{gridcolor:"rgba(255,255,255,.04)"},yaxis:{gridcolor:"rgba(255,255,255,.06)",title:"Price (₹)"},legend:{orientation:"h",y:1.08}}} useResizeHandler style={{width:"100%",height:430}} config={{displayModeBar:false,responsive:true}}/></div></div>
            <div className="forecast-grid"><section className="panel"><span className="label">MODEL INTERPRETATION</span><h3>What the regression says</h3><div className="scenario-callout"><b>{forecast.direction === "upward" ? "Upward historical trend" : forecast.direction === "downward" ? "Downward historical trend" : "Flat historical trend"}</b><p>For the selected horizon, the fitted trend projects approximately <strong>{(forecast.forecast_return*100).toFixed(2)}%</strong> relative to the latest observed price.</p></div><div className="mini-stats"><div><small>Lower model bound</small><b>{money(forecast.lower_price)}</b></div><div><small>Upper model bound</small><b>{money(forecast.upper_price)}</b></div><div><small>R²</small><b>{forecast.r2.toFixed(3)}</b></div></div></section><section className="panel"><span className="label">DECISION GUIDE</span><h3>How to use this result</h3><ol className="guide"><li>Use the correlation section to understand whether selected stocks historically moved together.</li><li>Use volatility and drawdown to understand historical risk.</li><li>Use the regression scenario to see what a simple historical trend model projects.</li><li>Compare the model range with your own risk limit before making any decision.</li></ol><p className="warning">The model does not know future news, earnings, policy changes or market shocks. Treat the forecast as an educational statistical scenario, not a buy/sell instruction.</p></section></div>
          </> : <div className="panel">Not enough historical data to fit the regression model.</div>}
        </section>}

        {tab === "matrices" && <div className="matrix-grid"><Matrix title="Pearson Correlation" records={result.pearson} stocks={result.stocks}/><Matrix title="Spearman Rank Correlation" records={result.spearman} stocks={result.stocks}/><Matrix title="Covariance" records={result.covariance} stocks={result.stocks} decimals={6}/><Matrix title="Pearson p-values" records={result.pearson_p} stocks={result.stocks} decimals={5}/>{result.dendrogram.traces.length > 0 && <div className="panel full"><div className="panel-title"><div><span className="label">CLUSTERING</span><h3>Hierarchical relationship structure</h3></div></div><Plot data={result.dendrogram.traces.map(t=>({x:t.x,y:t.y,type:"scatter",mode:"lines",line:{color:"#58e6cf",width:2}}))} layout={{autosize:true,margin:{l:50,r:20,t:10,b:20},paper_bgcolor:"transparent",plot_bgcolor:"transparent",font:{color:"#9aacbf"},yaxis:{title:"Distance (1 − r)"},xaxis:{showticklabels:false}}} useResizeHandler style={{width:"100%",height:330}} config={{displayModeBar:false}}/></div>}</div>}

        {tab === "math" && <section className="math panel"><span className="label">03 / MATHEMATICAL ENGINE</span><h2>Module IX mathematics behind the dashboard</h2><p className="math-intro">The core of this project is correlation analysis. The Future Scenario tab extends the project with regression, connecting naturally to Module X.</p><div className="formula-grid"><article><b>Covariance</b><p>Measures how two return variables move together.</p><code>Cov(X,Y) = E[(X−μx)(Y−μy)]</code></article><article><b>Pearson correlation</b><p>Standardizes covariance to a value from −1 to +1.</p><code>r = Cov(X,Y) / (σxσy)</code></article><article><b>Spearman correlation</b><p>Ranks observations before measuring monotonic association.</p><code>ρ = Corr(rank(X), rank(Y))</code></article><article><b>Rolling correlation</b><p>Recomputes correlation over a moving historical window.</p><code>r(t) = Corr(X[t−n:t],Y[t−n:t])</code></article><article><b>Partial correlation</b><p>Measures two-stock association after controlling for market returns.</p><code>rXY·Z = (rXY−rXZrYZ)/√((1−rXZ²)(1−rYZ²))</code></article><article><b>Correlation distance</b><p>Used for hierarchical clustering of companies.</p><code>dij = 1 − rij</code></article><article className="regression-formula"><b>Simple linear regression</b><p>Used by the future-scenario engine to model the historical log-price trend.</p><code>ln(Pt) = a + b·t + εt</code></article><article className="regression-formula"><b>Forecast transformation</b><p>The fitted log-price is transformed back to a price.</p><code>Ŷprice = exp(a + b·(t+h))</code></article></div></section>}
        <div className="disclaimer">Historical statistics describe the selected period. Forecasts are model-based scenarios from historical data and include uncertainty. The position calculator uses user-entered assumptions. Nothing on this dashboard guarantees future returns or tells a user what they personally should buy.</div>
      </section>
      </main>
    )}
    <footer>Σ QUANT LAB <span>Stock Correlation & Forecast Analyzer · Historical market data · Statistical analysis · Regression scenarios</span></footer>
    </div>
  );
}
export default App;
