import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
const apiBase = import.meta.env.VITE_API_URL || "/api";
const api = (u, o) =>
  fetch(apiBase + u, {
    headers: { "Content-Type": "application/json" },
    ...o,
  }).then(async (r) => {
    const b = await r.json();
    if (!r.ok) throw b;
    return b;
  });
const stages = {
  PAYMENT_PENDING: "PAYMENT AWAITING",
  LOOKING_FOR_RIDER: "Looking for a rider",
  RIDER_ACCEPTED: "Rider has accepted your order",
  HEADED_TO_PICKUP: "Rider is headed to pickup",
  HEADED_TO_DELIVERY: "Rider is headed to delivery",
  DELIVERED: "Completed",
};
const menus = {
  CUSTOMER: [
    ["Dashboard", "/customer/dashboard"],
    ["My Deliveries", "/customer/deliveries"],
    ["Request Delivery", "/customer/deliveries/new"],
    ["History", "/customer/history"],
    ["Profile", "/customer/profile"],
  ],
  RIDER: [
    ["Dashboard", "/rider/dashboard"],
    ["Available Orders", "/rider/orders"],
    ["Active Delivery", "/rider/active"],
    ["History", "/rider/history"],
    ["Profile", "/rider/profile"],
  ],
  BUSINESS: [
    ["Dashboard", "/business/dashboard"],
    ["Deliveries", "/business/deliveries"],
    ["Available Riders", "/business/riders"],
    ["Create Delivery", "/business/deliveries/new"],
    ["Analytics", "/business/analytics"],
    ["Activity", "/business/activity"],
    ["Business Profile", "/business/profile"],
  ],
  DISPATCHER: [
    ["Dashboard", "/dispatcher/dashboard"],
    ["Deliveries", "/dispatcher/deliveries"],
    ["Riders", "/dispatcher/riders"],
    ["Activity", "/dispatcher/activity"],
  ],
  ADMIN: [
    ["Dashboard", "/admin/dashboard"],
    ["Users", "/admin/users"],
    ["Businesses", "/admin/businesses"],
    ["Riders", "/admin/riders"],
    ["Deliveries", "/admin/deliveries"],
    ["Analytics", "/admin/analytics"],
    ["Activity", "/admin/activity"],
  ],
};
const go = (p) => {
  history.pushState({}, "", p);
  dispatchEvent(new PopStateEvent("popstate"));
};
const back = (role) => menus[role][0][1];
function ThemeToggle({ theme, onToggle }) {
  return (
    <button className="theme-toggle" onClick={onToggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
      <span aria-hidden="true">{theme === "dark" ? "☼" : "☾"}</span>
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
function Landing({ theme, onToggleTheme }) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.14 },
    );
    document.querySelectorAll(".landing-reveal").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <button className="brand landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <span>✦</span> RouteFlow
        </button>
        <div className="landing-nav-links">
          <a href="#workflow">How it works</a>
          <a href="#roles">For teams</a>
          <a href="#proof">Why RouteFlow</a>
        </div>
        <div className="landing-actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button className="link landing-signin" onClick={() => go("/login")}>Sign in</button>
          <button className="primary landing-nav-cta" onClick={() => go("/register")}>Get started</button>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-copy landing-reveal">
          <span className="eyebrow">DELIVERY OPERATIONS, IN ONE FLOW</span>
          <h1>Move every delivery <em>with intention.</em></h1>
          <p>RouteFlow gives customers, riders, and businesses one calm, connected view of what is moving and what happens next.</p>
          <div className="landing-hero-actions">
            <button className="primary landing-hero-cta" onClick={() => go("/register")}>Start moving smarter <span>↗</span></button>
            <a className="landing-text-link" href="#workflow">See how it works <span>↓</span></a>
          </div>
          <div className="landing-trust-line"><span className="trust-dot">●</span> Built for the real rhythm of delivery work</div>
        </div>
        <div className="landing-hero-visual landing-reveal landing-reveal-delay">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="preview-window">
            <div className="preview-topbar"><span className="preview-dots">● ● ●</span><span>RouteFlow / live workspace</span><span className="preview-live">● LIVE</span></div>
            <div className="preview-body">
              <div className="preview-sidebar"><b>✦</b><span className="preview-active">▦</span><span>◫</span><span>⌁</span><span>◎</span></div>
              <div className="preview-main">
                <div className="preview-heading"><div><small>BUSINESS DASHBOARD</small><h3>Operations overview</h3></div><span className="preview-date">Today · Abuja</span></div>
                <div className="preview-stats"><div><small>ACTIVE DELIVERIES</small><strong>24</strong><i>+18.4%</i></div><div><small>ON-TIME RATE</small><strong>96.8%</strong><i>+4.2%</i></div><div><small>AVAILABLE RIDERS</small><strong>18</strong><i>Ready now</i></div></div>
                <div className="preview-map"><span className="map-line map-line-one" /><span className="map-line map-line-two" /><b className="map-pin pin-one">●</b><b className="map-pin pin-two">◆</b><b className="map-pin pin-three">✦</b><div className="map-callout"><span>●</span><div><b>Order #RF-2048</b><small>Rider approaching pickup</small></div><strong>12 min</strong></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-proof landing-reveal" id="proof">
        <div className="proof-intro"><span className="eyebrow">THE ROUTEFLOW DIFFERENCE</span><h2>Less chasing.<br /><em>More delivering.</em></h2></div>
        <div className="proof-metrics"><div><strong>3</strong><span>connected roles</span></div><div><strong>1</strong><span>shared live view</span></div><div><strong>24/7</strong><span>delivery visibility</span></div></div>
      </section>

      <section className="landing-workflow" id="workflow">
        <div className="landing-section-heading landing-reveal"><span className="eyebrow">A CLEARER WAY TO MOVE</span><h2>Every handoff,<br /><em>right where you need it.</em></h2><p>From the first request to the final doorstep, RouteFlow keeps the next action visible and the whole team in sync.</p></div>
        <div className="workflow-grid">
          <article className="workflow-card landing-reveal"><span className="workflow-number">01</span><div className="workflow-icon">⌁</div><h3>Request with clarity</h3><p>Customers and businesses create complete delivery requests without the back-and-forth.</p><a href="#roles">Explore the flow <span>↗</span></a></article>
          <article className="workflow-card workflow-card-feature landing-reveal landing-reveal-delay"><span className="workflow-number">02</span><div className="workflow-icon">✦</div><h3>Dispatch in motion</h3><p>Riders see the right orders, accept with confidence, and keep every status current.</p><a href="#roles">See the roles <span>↗</span></a></article>
          <article className="workflow-card landing-reveal landing-reveal-delay-two"><span className="workflow-number">03</span><div className="workflow-icon">↗</div><h3>Deliver with confidence</h3><p>Everyone gets a reliable view of progress, timing, and what has already been done.</p><a href="#proof">See the difference <span>↗</span></a></article>
        </div>
      </section>

      <section className="landing-roles" id="roles">
        <div className="landing-roles-copy landing-reveal"><span className="eyebrow">ONE PLATFORM, THREE PERSPECTIVES</span><h2>Designed for the people who keep things moving.</h2><p>Every role gets the information and control they need, without adding another layer of logistics overhead.</p><button className="primary" onClick={() => go("/register")}>Choose your starting point <span>↗</span></button></div>
        <div className="role-list landing-reveal landing-reveal-delay"><div className="role-item"><span className="role-icon role-customer">◌</span><div><h3>Customers</h3><p>Request a delivery, follow its progress, and know when it arrives.</p></div><span>↗</span></div><div className="role-item"><span className="role-icon role-rider">✦</span><div><h3>Riders</h3><p>Find available work, navigate the next handoff, and stay in control.</p></div><span>↗</span></div><div className="role-item"><span className="role-icon role-business">▦</span><div><h3>Businesses</h3><p>Coordinate the operation with visibility across every active order.</p></div><span>↗</span></div></div>
      </section>

      <section className="landing-quote landing-reveal"><span className="quote-mark">“</span><blockquote>Good delivery operations should feel less like a scramble and more like a shared rhythm.</blockquote><span className="quote-caption">The idea behind RouteFlow</span></section>
      <footer className="landing-footer"><div className="brand"><span>✦</span> RouteFlow</div><span>Delivery, in a better direction.</span><button className="link" onClick={() => go("/register")}>Create your account ↗</button></footer>
    </main>
  );
}
function Auth({ register, onLogin, theme, onToggleTheme }) {
  const [f, setF] = useState({
      name: "",
      email: "",
      password: "",
      businessName: "",
    }),
    [role, setRole] = useState("CUSTOMER"),
    [error, setError] = useState("");
  const submit = () =>
    api(register ? "/register" : "/login", {
      method: "POST",
      body: JSON.stringify(
        register ? { ...f, role } : { email: f.email, password: f.password },
      ),
    })
      .then(onLogin)
      .catch((e) => setError(e.error || "Unable to sign in"));
  return (
    <main className="login">
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      <div className="brand big">
        <span>✦</span> RouteFlow
      </div>
      <p className="tag">
        Smart delivery dispatch, without the logistics headache.
      </p>
      <section className="login-card">
        <h1>{register ? "Create account" : "Welcome back"}</h1>
        {register && (
          <>
            <label>
              Full name
              <input
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
              />
            </label>
            <label>
              Account type
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="CUSTOMER">Customer</option>
                <option value="RIDER">Delivery rider</option>
                <option value="BUSINESS">Business</option>
              </select>
            </label>
            {role === "BUSINESS" && (
              <label>
                Business name
                <input
                  value={f.businessName}
                  onChange={(e) => setF({ ...f, businessName: e.target.value })}
                />
              </label>
            )}
          </>
        )}
        <label>
          Email
          <input
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="primary wide" onClick={submit}>
          {register ? "Create account" : "Sign in"}
        </button>
        <button
          className="link auth-toggle"
          onClick={() => go(register ? "/login" : "/register")}
        >
          {register ? "Already registered? Sign in" : "Create an account"}
        </button>
      </section>
    </main>
  );
}
function Layout({ user, children }) {
  const logout = () =>
    api("/logout", { method: "POST" })
      .catch(() => null)
      .finally(() => {
        window.location.assign("/login");
      });
  return (
    <div className={`shell role-${user.role}`}>
      <aside>
        <button className="brand" onClick={() => go(back(user.role))}>
          <span>✦</span> RouteFlow
        </button>
        <div className="workspace">{user.role} WORKSPACE</div>
        {(menus[user.role] || []).map(([n, p]) => (
          <button
            className={"nav " + (location.pathname === p ? "active" : "")}
            onClick={() => go(p)}
            key={p}
          >
            {n}
          </button>
        ))}
        <button
          className={
            "nav " + (location.pathname.endsWith("/wallet") ? "active" : "")
          }
          onClick={() => go(`/${user.role.toLowerCase()}/wallet`)}
        >
          Wallet
        </button>
        <div className="side-bottom">
          <div className="workspace-note">Live workspace · Abuja</div>
          <div className="user">
            <div className="avatar">{user.name[0]}</div>
            <div>
              <b>{user.name}</b>
              <small>{user.role}</small>
            </div>
            <button onClick={logout}>↪</button>
          </div>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
function Map({ db }) {
  const active = db.deliveries.filter((d) =>
    [
      "LOOKING_FOR_RIDER",
      "RIDER_ACCEPTED",
      "HEADED_TO_PICKUP",
      "HEADED_TO_DELIVERY",
    ].includes(d.status),
  );
  return (
    <section className="panel map-panel">
      <div className="panel-head">
        <div>
          <h2>Live Abuja delivery map</h2>
          <p className="muted">
            Pickup, destination and simulated rider positions
          </p>
        </div>
        <span className="pill green-pill">● Live</span>
      </div>
      <div className="map">
        {active.map((d) => (
          <div className="map-route" key={d.id}>
            <b>●</b>
            <span>{d.pickup}</span>
            <i>→</i>
            <b>◆</b>
            <span>{d.destination}</span>
          </div>
        ))}
        {db.drivers
          .filter((d) => d.status === "ON_DELIVERY")
          .map((d) => (
            <div className="map-rider" key={d.id}>
              ✦ {d.name}
            </div>
          ))}
        {!active.length && (
          <div className="map-empty">No active deliveries</div>
        )}
      </div>
    </section>
  );
}
function Dashboard({ user, db }) {
  return (
    <>
      <header>
        <div>
          <span className="eyebrow">{user.role} DASHBOARD</span>
          <h1>Operations overview</h1>
          <p className="muted">Live delivery visibility for your workspace.</p>
        </div>
        {["CUSTOMER", "BUSINESS"].includes(user.role) && (
          <button
            className="primary"
            onClick={() => go(`/${user.role.toLowerCase()}/deliveries/new`)}
          >
            + Create delivery
          </button>
        )}
      </header>
      <div className="stats">
        {[
          ["Deliveries", db.deliveries.length],
          [
            "In progress",
            db.deliveries.filter((x) => x.status !== "DELIVERED").length,
          ],
          [
            "Completed",
            db.deliveries.filter((x) => x.status === "DELIVERED").length,
          ],
          [
            "Available riders",
            db.drivers.filter((x) => x.status === "AVAILABLE").length,
          ],
        ].map((x) => (
          <div className="stat" key={x[0]}>
            <span>{x[0]}</span>
            <strong>{x[1]}</strong>
            <small className="green">Live records</small>
          </div>
        ))}
      </div>
      <div className="grid">
        <Map db={db} />
        <section className="panel">
          <h2>Recent deliveries</h2>
          {db.deliveries.length ? (
            db.deliveries.slice(0, 8).map((d) => (
              <button
                className="queue-row"
                key={d.id}
                onClick={() =>
                  go(`/${user.role.toLowerCase()}/deliveries/${d.id}`)
                }
              >
                <b>{d.id}</b>
                <small>{d.destination}</small>
                <span className={"status " + d.status.toLowerCase()}>
                  {stages[d.status] || d.status}
                </span>
              </button>
            ))
          ) : (
            <div className="empty">No deliveries yet.</div>
          )}
        </section>
      </div>
    </>
  );
}
function Deliveries({ user, db, newOrder = false }) {
  const [f, setF] = useState({
      pickup: "",
      destination: "",
      recipient: "",
      package: "",
      vehicleType: "MOTORCYCLE",
      priority: "STANDARD",
    }),
    [quote, setQuote] = useState(null),
    [error, setError] = useState(""),
    [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (f.pickup && f.destination)
      api(
        `/deliveries/quote?pickup=${encodeURIComponent(f.pickup)}&destination=${encodeURIComponent(f.destination)}&vehicleType=${f.vehicleType}&priority=${f.priority}`,
      )
        .then(setQuote)
        .catch(() => setQuote(null));
    else setQuote(null);
  }, [f.pickup, f.destination, f.vehicleType, f.priority]);
  const create = () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    api("/deliveries", { method: "POST", body: JSON.stringify(f) })
      .then(() => go(`/${user.role.toLowerCase()}/deliveries`))
      .catch((e) => {
        setSubmitting(false);
        setError(e.error || "Could not create delivery");
      });
  };
  return (
    <section className="panel full">
      <div className="panel-head">
        <div>
          <h1>{newOrder ? "Request delivery" : "Deliveries"}</h1>
          <p className="muted">Live records from your RouteFlow workspace.</p>
        </div>
        {!newOrder && (
          <button
            className="primary"
            onClick={() =>
              go(menus[user.role].find((x) => x[0].includes("Delivery"))?.[1])
            }
          >
            + Create delivery
          </button>
        )}
      </div>
      {newOrder && (
        <div className="create">
          <h3>Delivery request</h3>
          {["pickup", "destination", "recipient", "package"].map((k) => (
            <input
              key={k}
              placeholder={k}
              value={f[k]}
              onChange={(e) => setF({ ...f, [k]: e.target.value })}
            />
          ))}
          <label>
            Vehicle type
            <select
              value={f.vehicleType}
              onChange={(e) => setF({ ...f, vehicleType: e.target.value })}
            >
              <option value="MOTORCYCLE">Motorcycle</option>
              <option value="CAR">Car</option>
              <option value="VAN">Van</option>
            </select>
          </label>
          <label>
            Priority
            <select
              value={f.priority}
              onChange={(e) => setF({ ...f, priority: e.target.value })}
            >
              <option value="STANDARD">Standard</option>
              <option value="EXPRESS">Express</option>
            </select>
          </label>
          {quote && (
            <div className="toast">
              Estimated {quote.distanceKm} km · {quote.estimatedMinutes} min ·{" "}
              <b>₦{quote.total.toLocaleString()}</b>
              <br />
              <small>
                Rider share ₦{quote.riderEarning.toLocaleString()} · platform
                fee ₦{quote.platformFee.toLocaleString()}
              </small>
            </div>
          )}
          {error && <div className="error">{error}</div>}
          <button className="primary" onClick={create} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit request"}
          </button>
        </div>
      )}
      {!newOrder && (
        <table>
          <thead>
            <tr>
              <th>Delivery</th>
              <th>Route</th>
              <th>Stage</th>
              <th>Rider</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {db.deliveries.map((d) => (
              <tr key={d.id}>
                <td>
                  <b>{d.id}</b>
                </td>
                <td>
                  {d.pickup}
                  <small>→ {d.destination}</small>
                </td>
                <td>
                  <span className={"status " + d.status.toLowerCase()}>
                    {stages[d.status] || d.status}
                  </span>
                </td>
                <td>
                  {db.drivers.find((x) => x.id === d.driverId)?.name ||
                    "Finding rider"}
                </td>
                <td>
                  <button
                    className="outline"
                    onClick={() =>
                      go(`/${user.role.toLowerCase()}/deliveries/${d.id}`)
                    }
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
function Detail({ user, db, id }) {
  const d = db.deliveries.find((x) => x.id === id),
    r = d && db.drivers.find((x) => x.id === d.driverId);
  if (!d)
    return (
      <section className="panel full">
        <div className="empty">Delivery not found.</div>
      </section>
    );
  const pay = () =>
    api(`/deliveries/${d.id}/pay`, { method: "POST" })
      .then(() => location.reload())
      .catch((e) => alert(e.error));
  const accept = () =>
    api(`/deliveries/${d.id}/accept`, { method: "POST" })
      .then(() => location.reload())
      .catch((e) => alert(e.error || "Could not accept this ride"));
  const reject = () =>
    api(`/deliveries/${d.id}/reject`, { method: "POST" })
      .then(() => go("/rider/orders"))
      .catch((e) => alert(e.error || "Could not decline this ride"));
  return (
    <section className="panel full">
      <button
        className="link"
        onClick={() =>
          go(
            menus[user.role].find((x) => x[0] === "Deliveries")?.[1] ||
              back(user.role),
          )
        }
      >
        ← Back
      </button>
      <span className="eyebrow">DELIVERY DETAILS</span>
      <h1>{d.id}</h1>
      <span className={"status " + d.status.toLowerCase()}>
                    {d.paymentStatus === "UNPAID"
                      ? "PAYMENT AWAITING"
          : stages[d.status] || d.status}
      </span>
      <div className="detail-grid">
        <div>
          <small>ROUTE</small>
          <b>{d.pickup}</b>
          <span>↓</span>
          <b>{d.destination}</b>
          <small>
            {d.distanceKm || "—"} km · ₦{(d.total || 0).toLocaleString()}
          </small>
        </div>
        <div>
          <small>RIDER</small>
          <b>{r?.name || "Looking for a rider"}</b>
          <span>
            {r?.vehicle ||
              d.riderNotice ||
              "Rider will be assigned once a rider is free"}
          </span>
        </div>
      </div>
      <div className="progress">
        <i style={{ width: `${d.progress || 0}%` }} />
      </div>
      <div className="timeline">
        {Object.entries(stages).map(([k, v]) => (
          <div className={d.status === k ? "done" : ""} key={k}>
            ● {v}
          </div>
        ))}
      </div>
      <div className="modal-actions">
        {user.role === "RIDER" &&
          !d.driverId &&
          d.paymentStatus === "PAID" &&
          d.status === "LOOKING_FOR_RIDER" && (
            <>
              <button className="primary" onClick={accept}>
                Accept ride
              </button>
              <button className="outline" onClick={reject}>
                Decline ride
              </button>
            </>
          )}
        {d.paymentStatus === "UNPAID" &&
          ["CUSTOMER", "BUSINESS", "ADMIN"].includes(user.role) && (
            <button className="primary" onClick={pay}>
              Pay ₦{(d.total || 0).toLocaleString()}
            </button>
          )}
        {user.role === "ADMIN" &&
          d.status !== "DELIVERED" &&
          d.paymentStatus === "PAID" && (
            <button
              className="primary"
              onClick={() =>
                api(`/deliveries/${d.id}/advance`, { method: "POST" })
                  .then(() => location.reload())
                  .catch((e) => alert(e.error))
              }
            >
              Skip forward
            </button>
          )}
        <a className="outline" href="/api/export/csv">
          Export CSV
        </a>
        <a className="outline" href={`/api/deliveries/${d.id}/export/pdf`}>
          Download PDF
        </a>
      </div>
    </section>
  );
}
function Riders({ db, title = "Riders" }) {
  return (
    <section className="panel full">
      <h1>{title}</h1>
      <div className="driver-grid">
        {db.drivers.map((d) => (
          <div className="driver-card" key={d.id}>
            <div className="avatar large">{d.name[0]}</div>
            <h3>{d.name}</h3>
            <span className={"status " + d.status.toLowerCase()}>
              {d.status.replace("_", " ")}
            </span>
            <p>{d.vehicle}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
function Activity({ db }) {
  return (
    <section className="panel full">
      <h1>Activity history</h1>
      <p className="muted">Persisted delivery and rider events.</p>
      <div className="activity">
        {db.logs?.length ? (
          db.logs.map((x) => (
            <div key={x.id}>
              <b>{x.action.replaceAll("_", " ")}</b>
              <span>{x.description}</span>
              <small>{x.at}</small>
            </div>
          ))
        ) : (
          <div className="empty">No activity yet.</div>
        )}
      </div>
    </section>
  );
}
function Analytics({ db }) {
  const total = db.deliveries.length,
    done = db.deliveries.filter((x) => x.status === "DELIVERED").length;
  return (
    <section className="panel full">
      <h1>Operational analytics</h1>
      <p className="muted">Calculated from live delivery records.</p>
      <div className="analytics-cards">
        <div>
          <small>Total deliveries</small>
          <strong>{total}</strong>
        </div>
        <div>
          <small>Completion rate</small>
          <strong>{total ? Math.round((done / total) * 100) : 0}%</strong>
        </div>
        <div>
          <small>Available riders</small>
          <strong>
            {db.drivers.filter((x) => x.status === "AVAILABLE").length}
          </strong>
        </div>
      </div>
    </section>
  );
}
function Profile({ user, db }) {
  const rider =
    user.role === "RIDER"
      ? db.drivers.find((x) => x.id === user.driverId || x.name === user.name)
      : null;
  return (
    <section className="panel full profile-page">
      <div className="profile-header">
        <div className="avatar large">{user.name[0]}</div>
        <div>
          <span className="eyebrow">ACCOUNT PROFILE</span>
          <h1>{user.name}</h1>
          <p className="muted">{user.role}</p>
        </div>
      </div>
      <div className="detail-grid">
        <div>
          <small>FULL NAME</small>
          <b>{user.name}</b>
        </div>
        <div>
          <small>EMAIL</small>
          <b>{user.email}</b>
        </div>
        <div>
          <small>ACCOUNT TYPE</small>
          <b>{user.role}</b>
        </div>
        {rider && (
          <>
            <div>
              <small>RIDER STATUS</small>
              <b>{rider.status.replace("_", " ")}</b>
            </div>
            <div>
              <small>VEHICLE</small>
              <b>{rider.vehicle}</b>
            </div>
            <div>
              <small>CAPACITY</small>
              <b>{rider.capacity} active deliveries</b>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
function Wallet({ user }) {
  const [w, setW] = useState(null),
    [amount, setAmount] = useState(""),
    [msg, setMsg] = useState("");
  const load = () => api("/wallet").then(setW);
  useEffect(() => {
    load();
  }, []);
  const deposit = () =>
    api("/wallet/deposit", { method: "POST", body: JSON.stringify({ amount }) })
      .then(() => {
        setMsg("Deposit added");
        setAmount("");
        load();
      })
      .catch((e) => setMsg(e.error));
  const withdraw = () =>
    api("/wallet/withdraw", {
      method: "POST",
      body: JSON.stringify({
        amount,
        bankName: "User payout account",
        accountName: user.name,
        accountNumber: "Account details pending",
      }),
    })
      .then(() => {
        setMsg("Withdrawal processed");
        setAmount("");
        load();
      })
      .catch((e) => setMsg(e.error));
  return (
    <section className="panel full wallet-page">
      <span className="eyebrow">WALLET</span>
      <h1>₦{(w?.balance || 0).toLocaleString()}</h1>
      <p className="muted">
        Fund trips, receive rider earnings, and manage payouts.
      </p>
      <div className="create">
        <input
          type="number"
          min="1"
          placeholder="Amount in NGN"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button className="primary" onClick={deposit}>
          Deposit
        </button>
        {user.role === "RIDER" && (
          <button className="outline" onClick={withdraw}>
            Withdraw
          </button>
        )}
      </div>
      {msg && <div className="toast">{msg}</div>}
      <h3>Transactions</h3>
      {w?.transactions?.map((x) => (
        <div className="queue-row" key={x.id}>
          <b>{x.type}</b>
          <span>{x.description}</span>
          <strong>₦{Math.abs(x.amount).toLocaleString()}</strong>
        </div>
      ))}
    </section>
  );
}
function RiderOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const load = () => api("/rider/orders").then(setOrders).catch((e) => setError(e.error || "Could not load available rides"));
  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);
  const accept = (id) =>
    api(`/deliveries/${id}/accept`, { method: "POST" })
      .then(() => go("/rider/active"))
      .catch((e) => setError(e.error || "Could not accept this ride"));
  const reject = (id) =>
    api(`/deliveries/${id}/reject`, { method: "POST" })
      .then(() => load())
      .catch((e) => setError(e.error || "Could not reject this ride"));
  return (
    <section className="panel full">
      <div className="panel-head">
        <div>
          <span className="eyebrow">RIDER QUEUE</span>
          <h1>Available rides</h1>
          <p className="muted">Pick an unassigned, paid delivery.</p>
        </div>
        <button className="outline" onClick={load}>Refresh</button>
      </div>
      {error && <div className="error">{error}</div>}
      {orders.length ? orders.map((order) => (
        <div className="rider-order" key={order.id}>
          <div>
            <span className="eyebrow">{order.id}</span>
            <h2>{order.pickup} <span>→</span> {order.destination}</h2>
            <p className="muted">{order.vehicleType} · ₦{order.riderEarning?.toLocaleString()} rider earning</p>
          </div>
          <div className="modal-actions"><button className="primary" onClick={() => accept(order.id)}>Accept ride</button><button className="outline" onClick={() => reject(order.id)}>Reject</button></div>
        </div>
      )) : !error && <div className="empty">No unassigned rides are available right now.</div>}
    </section>
  );
}
function RiderActive({ user, db }) {
  const riderId = user.driverId || db.drivers.find((x) => x.name === user.name)?.id;
  const active = db.deliveries.filter((d) => d.driverId === riderId && d.status !== "DELIVERED");
  const cancel = (id) => api(`/deliveries/${id}/cancel`, { method: "POST" }).then(() => location.reload()).catch((e) => alert(e.error || "Could not cancel this ride"));
  const advance = (id) => api(`/deliveries/${id}/status`, { method: "POST" }).then(() => location.reload()).catch((e) => alert(e.error || "Could not advance this delivery"));
  return <section className="panel full"><div className="panel-head"><div><span className="eyebrow">RIDER WORKSPACE</span><h1>Active delivery</h1><p className="muted">Track the package currently assigned to you.</p></div><span className="pill green-pill">{active.length} active</span></div>{active.length ? active.map((d) => <div className="rider-order" key={d.id}><div><span className="eyebrow">{d.id}</span><h2>{d.pickup} <span>→</span> {d.destination}</h2><p className="muted">{stages[d.status] || d.status} · {d.progress || 0}% complete</p><div className="progress"><i style={{width:`${d.progress || 0}%`}} /></div></div><div className="modal-actions"><button className="outline" onClick={() => go(`/rider/orders/${d.id}`)}>Open</button>{d.status !== "DELIVERED" && <button className="primary" onClick={() => advance(d.id)}>Skip forward</button>}<button className="outline" onClick={() => cancel(d.id)}>Cancel ride</button></div></div>) : <div className="empty">No active delivery assigned.</div>}</section>;
}
function RiderHistory({ user, db }) {
  const riderId = user.driverId || db.drivers.find((x) => x.name === user.name)?.id;
  const history = db.deliveries.filter((d) => d.driverId === riderId && d.status === "DELIVERED");
  return <section className="panel full"><span className="eyebrow">RIDER WORKSPACE</span><h1>Delivery history</h1><p className="muted">Completed deliveries and earnings.</p>{history.length ? history.map((d) => <div className="queue-row" key={d.id}><div className="order-icon">✓</div><div><b>{d.id}</b><small>{d.pickup} → {d.destination}</small></div><strong>₦{(d.riderEarning || 0).toLocaleString()}</strong></div>) : <div className="empty">No completed deliveries yet.</div>}</section>;
}
function RiderDirectory({ db, title = "Riders" }) {
  const riders = Array.isArray(db.drivers) ? db.drivers : [], available = riders.filter((r) => r.status === "AVAILABLE").length;
  const vehicleType = (rider) => rider.vehicleType || (/\bvan\b/i.test(rider.vehicle || "") ? "VAN" : /\bcar\b/i.test(rider.vehicle || "") ? "CAR" : "MOTORCYCLE");
  return <section className="panel full"><div className="panel-head"><div><span className="eyebrow">DISPATCH DIRECTORY</span><h1>{title}</h1><p className="muted">Every rider currently registered in RouteFlow.</p></div><span className="pill green-pill">{available} available · {riders.length} total</span></div>{riders.length ? <div className="driver-grid">{riders.map((d) => <div className="driver-card" key={d.id}><div className="profile-header"><div className="avatar large">{d.name?.[0] || "R"}</div><div><h3>{d.name}</h3><span className={'status '+String(d.status || 'AVAILABLE').toLowerCase()}>{String(d.status || 'AVAILABLE').replace('_',' ')}</span></div></div><p>{d.vehicle || 'Vehicle details pending'}</p><small>{vehicleType(d)} · capacity {d.capacity || 2}</small></div>)}</div> : <div className="empty">No riders are registered yet.</div>}</section>;
}
function UserDirectory({ db }) {
  const users = Array.isArray(db.users) ? db.users : [];
  return <section className="panel full"><div className="panel-head"><div><span className="eyebrow">ACCOUNT DIRECTORY</span><h1>Users</h1><p className="muted">Customers, businesses, riders and administrators from Supabase.</p></div><span className="pill green-pill">{users.length} total</span></div>{users.length ? <div className="driver-grid">{users.map((item) => <div className="driver-card" key={item.id}><div className="profile-header"><div className="avatar large">{item.name?.[0] || "U"}</div><div><h3>{item.name || "Unnamed user"}</h3><span className="status available">{item.role || "USER"}</span></div></div><p>{item.email}</p><small>{item.phone || "No phone number"}</small></div>)}</div> : <div className="empty">No users found in Supabase.</div>}</section>;
}
function BusinessDirectory({ db }) {
  const businesses = Array.isArray(db.businesses) ? db.businesses : [];
  return <section className="panel full"><div className="panel-head"><div><span className="eyebrow">BUSINESS DIRECTORY</span><h1>Businesses</h1><p className="muted">Registered businesses from Supabase.</p></div><span className="pill green-pill">{businesses.length} total</span></div>{businesses.length ? <div className="driver-grid">{businesses.map((item) => <div className="driver-card" key={item.id}><div className="profile-header"><div className="avatar large">{item.name?.[0] || "B"}</div><div><h3>{item.name || "Unnamed business"}</h3><span className={'status ' + (item.isActive === false ? 'offline' : 'available')}>{item.isActive === false ? "INACTIVE" : "ACTIVE"}</span></div></div><p>{item.email || "No email"}</p><small>{item.phone || item.address || "Business details pending"}</small></div>)}</div> : <div className="empty">No businesses found in Supabase.</div>}</section>;
}
function Generic({ title, db }) {
  return (
    <section className="panel full">
      <h1>{title}</h1>
      <p className="muted">Connected RouteFlow page.</p>
      {db && (
        <p>
          {db.deliveries.length} deliveries · {db.drivers.length} riders
        </p>
      )}
    </section>
  );
}
function SimpleProfile({ user, db }) {
  const rider =
    user.role === "RIDER"
      ? db.drivers.find((x) => x.id === user.driverId || x.name === user.name)
      : null;
  return (
    <section className="panel full profile-page">
      <div className="profile-header">
        <div className="avatar large">{user.name?.[0] || "R"}</div>
        <div>
          <span className="eyebrow">ACCOUNT PROFILE</span>
          <h1>{user.name}</h1>
          <p className="muted">{user.role}</p>
        </div>
      </div>
      <div className="detail-grid">
        <div>
          <small>FULL NAME</small>
          <b>{user.name}</b>
        </div>
        <div>
          <small>EMAIL</small>
          <b>{user.email}</b>
        </div>
        <div>
          <small>ACCOUNT TYPE</small>
          <b>{user.role}</b>
        </div>
        {rider && (
          <>
            <div>
              <small>RIDER STATUS</small>
              <b>{String(rider.status || "AVAILABLE").replace("_", " ")}</b>
            </div>
            <div>
              <small>VEHICLE</small>
              <b>{rider.vehicle || "Vehicle details pending"}</b>
            </div>
            <div>
              <small>CAPACITY</small>
              <b>{rider.capacity || 2} active deliveries</b>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
function App({ user, db }) {
  const p = location.pathname,
    m = p.match(
      /^\/(customer|rider|business|dispatcher|admin)\/([^/]+)(?:\/([^/]+))?/,
    ),
    role = user.role.toLowerCase();
  if (!m)
    return (
      <Layout user={user}>
        <Dashboard user={user} db={db} />
      </Layout>
    );
  if (m[1] !== role) return <Generic title="Access restricted" />;
  const s = m[2],
    id = m[3];
  let page;
  if (id && id !== "new" && (s === "deliveries" || s === "orders"))
    page = <Detail user={user} db={db} id={id} />;
  else if (s === "dashboard") page = <Dashboard user={user} db={db} />;
  else if (s === "deliveries" && id === "new")
    page = <Deliveries user={user} db={db} newOrder />;
  else if (s === "deliveries") page = <Deliveries user={user} db={db} />;
  else if (s === "new") page = <Deliveries user={user} db={db} newOrder />;
  else if (s === "riders") page = <RiderDirectory db={db} title={role === "admin" ? "All riders" : "Riders"} />;
  else if (s === "users") page = <UserDirectory db={db} />;
  else if (s === "businesses") page = <BusinessDirectory db={db} />;
  else if (s === "analytics") page = <Analytics db={db} />;
  else if (s === "activity") page = <Activity db={db} />;
  else if (s === "profile") page = <SimpleProfile user={user} db={db} />;
  else if (s === "wallet") page = <Wallet user={user} />;
  else if (s === "orders") page = <RiderOrders />;
  else if (s === "active" && role === "rider") page = <RiderActive user={user} db={db} />;
  else if (s === "history" && role === "rider") page = <RiderHistory user={user} db={db} />;
  else if (["active", "history"].includes(s)) page = <Generic title={s} db={db} />;
  else page = <Generic title={s} />;
  return <Layout user={user}>{page}</Layout>;
}
class SafeApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    console.error("RouteFlow render error", error);
  }
  render() {
    return this.state.error ? (
      <main className="loading">
        <h2>RouteFlow could not display this page.</h2>
        <p className="muted">
          Your wallet action was not lost. Choose a page below.
        </p>
        <button
          className="primary"
          onClick={() => {
            this.setState({ error: null });
            go(back(this.props.user?.role || "CUSTOMER"));
          }}
        >
          Return to dashboard
        </button>
        <button
          className="link"
          onClick={() => {
            this.setState({ error: null });
            location.reload();
          }}
        >
          Reload page
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function Root() {
  const [user, setUser] = useState(null),
    [db, setDb] = useState(null),
    [ready, setReady] = useState(false),
    [path, setPath] = useState(location.pathname),
    [theme, setTheme] = useState(() => {
      const saved = localStorage.getItem("routeflow-theme");
      return saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    });
  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("routeflow-theme", theme);
  }, [theme]);
  useEffect(() => {
    const load = () => {
      if (user)
        api("/state")
          .then((next) =>
            setDb(
              next || {
                users: [],
                drivers: [],
                deliveries: [],
                logs: [],
                businesses: [],
              },
            ),
          )
          .catch(() => {});
      else
        api("/me")
          .then((u) => setUser(u))
          .catch(() => {})
          .finally(() => setReady(true));
    };
    load();
    const onPop = () => setPath(location.pathname);
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, [user]);
  useEffect(() => {
    if (user) {
      api("/state")
        .then((next) =>
          setDb(
            next || {
              users: [],
              drivers: [],
              deliveries: [],
              logs: [],
              businesses: [],
            },
          ),
        )
        .catch(() => {});
      const t = setInterval(
        () =>
          api("/state")
            .then((next) => next && setDb(next))
            .catch(() => {}),
        3000,
      );
      return () => clearInterval(t);
    }
  }, [user]);
  if (!ready || (user && !db))
    return <div className="loading">Loading RouteFlow…</div>;
  if (user)
    return (
      <SafeApp key={path} user={user}>
        <App user={user} db={db} />
      </SafeApp>
    );
  return path === "/" ? (
    <Landing theme={theme} onToggleTheme={toggleTheme} />
  ) : (
    <Auth
      register={path === "/register"}
      theme={theme}
      onToggleTheme={toggleTheme}
      onLogin={(u) => {
        setUser(u);
        go(back(u.role));
      }}
    />
  );
}
createRoot(document.getElementById("root")).render(<Root />);
