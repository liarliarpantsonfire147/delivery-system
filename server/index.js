require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const PDFDocument = require('pdfkit');

const app = express();
app.use(express.json());
const localFile = path.join(__dirname, 'data.json');
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;
const hash = value => crypto.scryptSync(value, 'routeflow-salt', 64).toString('hex');
const amount = value => Math.round(Number(value) * 100) / 100;
const sessionSecret = process.env.ROUTEFLOW_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'routeflow-development-session-secret';
const signedSession = userId => { const id=String(userId); const signature=crypto.createHmac('sha256',sessionSecret).update(id).digest('hex'); return `${id}.${signature}`; };
const sessionUser = token => { if (!token) return null; const split=token.lastIndexOf('.'); if (split<1) return null; const id=token.slice(0,split),signature=token.slice(split+1),expected=crypto.createHmac('sha256',sessionSecret).update(id).digest('hex'); if (signature!==expected) return null; return db.users.find(user=>user.id===id)||null; };
const safe = user => Object.fromEntries(Object.entries(user).filter(([key]) => !['password', 'passwordHash', 'password_hash'].includes(key)));
const emptyDb = { users: [], drivers: [], deliveries: [], logs: [], statusHistory: [], businesses: [], wallets: { accounts: {}, transactions: [] } };
let db = fs.existsSync(localFile) ? JSON.parse(fs.readFileSync(localFile)) : emptyDb;
const sessions = new Map();
const cookie = req => (req.headers.cookie || '').split('; ').find(item => item.startsWith('rf_session='))?.split('=')[1];
const sessionCookie = token => `rf_session=${token}; HttpOnly; SameSite=Lax; Path=/${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
let saveQueue = Promise.resolve();
const save = async () => {
  saveQueue = saveQueue.catch(error => { console.error('Previous persistence operation failed:', error.message); }).then(async () => {
    if (!supabase) return fs.writeFileSync(localFile, JSON.stringify(db, null, 2));
    try { const { error } = await supabase.from('routeflow_state').upsert({ id: 'main', payload: db, updated_at: new Date().toISOString() }); if (error) console.error('Supabase save failed:', error.message); syncWalletTables().catch(error => console.error('Wallet table sync failed:', error.message)); } catch (error) { console.error('Supabase persistence failed:', error.message); }
  });
  return saveQueue;
};
const load = async () => {
  if (!supabase) return;
  const { data, error } = await supabase.from('routeflow_state').select('payload').eq('id', 'main').maybeSingle();
  if (error) throw error;
  if (data?.payload) db = { ...emptyDb, ...data.payload, wallets: { ...emptyDb.wallets, ...(data.payload.wallets || {}) } };
  else await save();
  const [{ data: users, error: usersError }, { data: businesses, error: businessesError }] = await Promise.all([
    supabase.from('users').select('*'),
    supabase.from('businesses').select('*'),
  ]);
  if (usersError && !/does not exist|schema cache/i.test(usersError.message)) throw usersError;
  if (businessesError && !/does not exist|schema cache/i.test(businessesError.message)) throw businessesError;
  if (Array.isArray(users) && users.length) db.users = users.map(item => ({ ...item, id: String(item.id), passwordHash: item.passwordHash || item.password_hash })).reduce((all, item) => { const index = all.findIndex(existing => existing.id === item.id || existing.email?.toLowerCase() === item.email?.toLowerCase()); if (index >= 0) all[index] = { ...all[index], ...item }; else all.push(item); return all; }, db.users || []);
  if (Array.isArray(businesses) && businesses.length) db.businesses = businesses.map(item => ({ ...item, id: String(item.id), ownerId: item.ownerId || item.owner_id })).reduce((all, item) => { const index = all.findIndex(existing => existing.id === item.id); if (index >= 0) all[index] = { ...all[index], ...item }; else all.push(item); return all; }, db.businesses || []);
};
const log = (action, description, entityId) => { db.logs.unshift({ id: Date.now(), action, description, entityId, at: new Date().toISOString() }); save(); };
const AbujaZones = { wuse: [9.0765, 7.3986], garki: [9.0477, 7.4898], maitama: [9.099, 7.495], jabi: [9.076, 7.429], cbd: [9.0579, 7.4951], asokoro: [9.033, 7.518], gwarinpa: [9.121, 7.408], lugbe: [8.99, 7.44] };
const zoneFor = text => Object.entries(AbujaZones).find(([key]) => String(text || '').toLowerCase().includes(key))?.[1] || AbujaZones.cbd;
const distanceKm = (from, to) => { const a=zoneFor(from), b=zoneFor(to); const rad=x=>x*Math.PI/180; const dLat=rad(b[0]-a[0]), dLng=rad(b[1]-a[1]); const h=Math.sin(dLat/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLng/2)**2; return Math.max(1, Math.round(6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))*1.25*10)/10); };
const geocodeCache = new Map();
const geocode = async address => {
  const key = String(address || '').trim().toLowerCase();
  if (!key) return null;
  if (geocodeCache.has(key)) return geocodeCache.get(key);
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ng&q=${encodeURIComponent(address)}`, { headers: { 'User-Agent': 'RouteFlow/1.0 delivery-planner' } });
    if (!response.ok) return null;
    const rows = await response.json();
    const point = rows[0] ? { lat: Number(rows[0].lat), lng: Number(rows[0].lon) } : null;
    geocodeCache.set(key, point);
    return point;
  } catch (error) { console.error('Address geocoding failed:', error.message); return null; }
};
const routedTrip = async (from, to) => {
  const [start, end] = await Promise.all([geocode(from), geocode(to)]);
  if (!start || !end) { const distance = distanceKm(from, to); return { distance, minutes: Math.max(10, Math.round(distance * 3.5)) }; }
  try {
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=false`);
    if (!response.ok) { const distance = distanceKm(from, to); return { distance, minutes: Math.max(10, Math.round(distance * 3.5)) }; }
    const data = await response.json();
    const route = data.routes?.[0];
    if (!route || !Number.isFinite(route.distance)) { const distance = distanceKm(from, to); return { distance, minutes: Math.max(10, Math.round(distance * 3.5)) }; }
    return { distance: Math.max(1, Math.round(route.distance / 100) / 10), minutes: Math.max(10, Math.round((route.duration || 0) / 60)) };
  } catch (error) { console.error('Route distance lookup failed:', error.message); const distance = distanceKm(from, to); return { distance, minutes: Math.max(10, Math.round(distance * 3.5)) }; }
};
const makeQuote = (input, trip) => { const vehicle=String(input.vehicleType||'MOTORCYCLE').toUpperCase(), priority=String(input.priority||'STANDARD').toUpperCase(); const vehicleMultiplier=vehicle==='CAR'?1.35:vehicle==='VAN'?1.6:1; const priorityMultiplier=priority==='EXPRESS'?1.25:1; const baseFare=1500, distanceCharge=trip.distance*300, timeCharge=trip.minutes*120; const total=Math.ceil((baseFare+distanceCharge+timeCharge)*vehicleMultiplier*priorityMultiplier/50)*50; const platformFee=Math.round(total*0.1); return { distanceKm: trip.distance, vehicleType: vehicle, estimatedMinutes: trip.minutes, total, platformFee, riderEarning: total-platformFee, currency:'NGN' }; };
const quote = input => { const distance = distanceKm(input.pickup, input.destination); return makeQuote(input, { distance, minutes: Math.max(10, Math.round(distance * 3.5)) }); };
const quoteAsync = async input => makeQuote(input, await routedTrip(input.pickup, input.destination));
const wallet = ownerId => { db.wallets ||= { accounts:{}, transactions:[] }; db.wallets.accounts ||= {}; if (!Array.isArray(db.wallets.transactions)) db.wallets.transactions=[]; db.wallets.accounts[ownerId] ||= { balance:0, payoutAccount:null, transactions:[] }; const account=db.wallets.accounts[ownerId]; if (!Number.isFinite(Number(account.balance))) account.balance=0; if (!Array.isArray(account.transactions)) account.transactions=[]; if (!Object.prototype.hasOwnProperty.call(account,'payoutAccount')) account.payoutAccount=null; return account; };
const adminWalletId = () => db.users.find(item => item.role === 'ADMIN')?.id || 'ADMIN';
const credit = (ownerId, amount, type, description, meta={}) => { const account=wallet(ownerId); account.balance=Math.round((account.balance+amount)*100)/100; const tx={id:'txn-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),ownerId,amount,type,description,at:new Date().toISOString(),...meta}; account.transactions.unshift(tx); db.wallets.transactions.unshift(tx); return account; };
const debit = (ownerId, amount, type, description, meta={}) => { const account=wallet(ownerId); if(account.balance<amount) return false; account.balance=Math.round((account.balance-amount)*100)/100; const tx={id:'txn-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),ownerId,amount:-amount,type,description,at:new Date().toISOString(),...meta}; account.transactions.unshift(tx); db.wallets.transactions.unshift(tx); return true; };
const syncWalletTables = async () => {
  if (!supabase || !db.wallets?.accounts) return;
  const now = new Date().toISOString();
  const accounts = Object.entries(db.wallets.accounts).map(([ownerId, account]) => ({ owner_id: ownerId, balance: Number(account.balance) || 0, currency: 'NGN', updated_at: now }));
  const transactions = Object.values(db.wallets.accounts).flatMap(account => Array.isArray(account.transactions) ? account.transactions : []).map(tx => ({ id: String(tx.id), owner_id: String(tx.ownerId), amount: Number(tx.amount) || 0, type: tx.type || 'WALLET', description: tx.description || null, delivery_id: tx.deliveryId ? String(tx.deliveryId) : null, metadata: tx, created_at: tx.at || now }));
  if (accounts.length) { const { error } = await supabase.from('wallet_accounts').upsert(accounts, { onConflict: 'owner_id' }); if (error && !/does not exist|schema cache/i.test(error.message)) console.error('Wallet account sync failed:', error.message); }
  if (transactions.length) { const { error } = await supabase.from('wallet_transactions').upsert(transactions, { onConflict: 'id' }); if (error && !/does not exist|schema cache/i.test(error.message)) console.error('Wallet transaction sync failed:', error.message); }
  const payouts = Object.entries(db.wallets.accounts).filter(([, account]) => account.payoutAccount).map(([ownerId, account]) => ({ owner_id: ownerId, bank_name: account.payoutAccount.bankName || null, account_name: account.payoutAccount.accountName || null, account_number: account.payoutAccount.accountNumber || null, updated_at: now }));
  if (payouts.length) { const { error } = await supabase.from('payout_accounts').upsert(payouts, { onConflict: 'owner_id' }); if (error && !/does not exist|schema cache/i.test(error.message)) console.error('Payout account sync failed:', error.message); }
};
const ensureAdmin = () => {
  const email = process.env.ROUTEFLOW_ADMIN_EMAIL; const password = process.env.ROUTEFLOW_ADMIN_PASSWORD;
  if (!email || !password) return;
  let user = db.users.find(item => item.email?.toLowerCase() === email.toLowerCase());
  if (!user) { user = { id: 'admin-' + Date.now(), name: 'RouteFlow Administrator', email, role: 'ADMIN' }; db.users.push(user); log('ADMIN_PROVISIONED', 'Initial administrator account provisioned'); }
  user.name = user.name || 'RouteFlow Administrator'; user.email = email; user.role = 'ADMIN'; user.passwordHash = hash(password); wallet(user.id);
};
const settleExistingFees = () => {
  const adminId = adminWalletId();
  let changed = false;
  db.deliveries.filter(delivery => delivery.paymentStatus === 'PAID' && !delivery.feeSettled).forEach(delivery => {
    credit(adminId, delivery.platformFee || 0, 'DELIVERY_COMMISSION', `Platform commission from ${delivery.id}`, { deliveryId: delivery.id });
    delivery.feeSettled = true;
    changed = true;
  });
  return changed;
};

const ensureMockDrivers = () => {
  db.drivers ||= [];
  const vehicles = [
    ['driver-10', 'Bala Yusuf', 'Car · Toyota Corolla', 9.071, 7.421, 3],
    ['driver-11', 'Ngozi Okafor', 'Van · Toyota Hiace', 9.084, 7.452, 8],
    ['driver-12', 'Sani Mohammed', 'Car · Honda Civic', 9.102, 7.414, 3],
    ['driver-13', 'Esther John', 'Van · Ford Transit', 9.061, 7.469, 8],
    ['driver-14', 'Tunde Balogun', 'Car · Kia Rio', 9.113, 7.438, 3],
    ['driver-15', 'Hauwa Bello', 'Van · Nissan Urvan', 9.052, 7.396, 8],
    ['driver-16', 'Chukwu Eze', 'Car · Hyundai Elantra', 9.091, 7.477, 3],
    ['driver-17', 'Mary Peter', 'Van · Mercedes Sprinter', 9.128, 7.425, 10],
    ['driver-18', 'Yahaya Garba', 'Car · Toyota Camry', 9.039, 7.449, 3],
    ['driver-19', 'Amina Sule', 'Van · Renault Master', 9.116, 7.389, 10],
    ['driver-20', 'Kunle Adebayo', 'Car · Volkswagen Jetta', 9.067, 7.487, 3],
    ['driver-21', 'Rashida Aliyu', 'Van · Peugeot Boxer', 9.033, 7.431, 10],
    ['driver-22', 'Ifeanyi Obi', 'Car · Nissan Sentra', 9.097, 7.401, 3],
    ['driver-23', 'Zainab Umar', 'Van · Iveco Daily', 9.075, 7.512, 10],
    ['driver-24', 'Seun Lawal', 'Car · Toyota Yaris', 9.043, 7.382, 3],
  ];
  vehicles.forEach(([id, name, vehicle, lat, lng, capacity]) => {
    if (!db.drivers.some(item => item.id === id)) db.drivers.push({ id, name, phone: '', vehicle, status: 'AVAILABLE', lat, lng, capacity });
  });
};
const ensureRiderProfiles = () => {
  db.drivers ||= [];
  db.users.filter(user => user.role === 'RIDER').forEach(user => {
    const driverId = user.driverId || user.driver_id;
    let rider = db.drivers.find(item => item.id === driverId || item.userId === user.id || item.user_id === user.id || item.name === user.name || item.email === user.email);
    if (!rider) {
      rider = { id: driverId || `d-${user.id}`, userId: user.id, name: user.name, email: user.email, phone: user.phone || '', vehicle: user.vehicle || 'Vehicle details pending', status: 'AVAILABLE', lat: 9.0765, lng: 7.3986, capacity: 2 };
      db.drivers.push(rider);
    }
    user.driverId = rider.id;
    rider.userId ||= user.id;
  });
};
const stages = [
  { status: 'LOOKING_FOR_RIDER', label: 'Looking for a rider', start: 0, end: 4 },
  { status: 'RIDER_ACCEPTED', label: 'Rider has accepted your order', start: 4, end: 8 },
  { status: 'HEADED_TO_PICKUP', label: 'Rider is headed to pickup', start: 8, end: 12 },
  { status: 'HEADED_TO_DELIVERY', label: 'Rider is headed to delivery', start: 12, end: 16 },
  { status: 'DELIVERED', label: 'Completed', start: 16, end: 20 }
];
const riderFor = user => db.drivers.find(item => item.id === (user.driverId || user.driver_id)) || db.drivers.find(item => item.userId === user.id || item.user_id === user.id || item.email === user.email || item.name === user.name);
const activeFor = driver => db.deliveries.filter(item => item.driverId === driver.id && item.status !== 'DELIVERED');
const syncRiderStatuses = () => { let changed = false; db.drivers.forEach(driver => { const active = activeFor(driver); const next = active.length ? 'ON_DELIVERY' : 'AVAILABLE'; if (driver.status !== next) { driver.status = next; changed = true; } }); return changed; };
const chooseRider = delivery => {
  syncRiderStatuses();
  const available = db.drivers.filter(item => item.status === 'AVAILABLE' || activeFor(item).some(current => (current.progress || 0) >= 95));
  if (!available.length) { delivery.riderNotice = 'Rider will be assigned once a rider is free'; return null; }
  const selected = available[Math.floor(Math.random() * available.length)];
  selected.status = 'ON_DELIVERY';
  delivery.driverId = selected.id;
  delivery.assignment = { score: Math.floor(80 + Math.random() * 20), reason: 'Nearest available rider selected for this pickup' };
  delete delivery.riderNotice;
  return selected;
};
const stageProgress = delivery => {
  if (delivery.paymentStatus === 'UNPAID' || delivery.status === 'PAYMENT_PENDING') return delivery;
  if (delivery.status === 'DELIVERED') return 100;
  const minutes = Math.max(0, (Date.now() - new Date(delivery.createdAt).getTime()) / 60000);
  const stage = stages.find(item => minutes >= item.start && minutes < item.end) || stages[stages.length - 1];
  if (!delivery.driverId && stage.status !== 'LOOKING_FOR_RIDER') chooseRider(delivery);
  if (!delivery.driverId) { delivery.status = 'LOOKING_FOR_RIDER'; delivery.progress = Math.min(20, Math.round((minutes / 20) * 100)); delivery.riderNotice = 'Rider will be assigned once a rider is free'; return delivery; }
  if (delivery.driverId || stage.status === 'LOOKING_FOR_RIDER') {
    delivery.status = delivery.driverId && stage.status === 'LOOKING_FOR_RIDER' ? 'LOOKING_FOR_RIDER' : stage.status;
    delivery.progress = Math.min(100, Math.round((minutes / 20) * 100));
    if (stage.status === 'DELIVERED') { delivery.status = 'DELIVERED'; delivery.progress = 100; delivery.deliveredAt ||= new Date().toISOString(); const driver = db.drivers.find(item => item.id === delivery.driverId); if (driver) driver.status = 'AVAILABLE'; }
  }
  return delivery;
};
const advanceDelivery = (delivery, actor) => {
  const index = Math.max(0, stages.findIndex(stage => stage.status === delivery.status));
  const next = stages[Math.min(stages.length - 1, index + 1)];
  if (next.status === 'RIDER_ACCEPTED' && !delivery.driverId && !chooseRider(delivery)) return false;
  const previous = delivery.status; delivery.status = next.status; delivery.progress = next.status === 'DELIVERED' ? 100 : Math.round((next.start / 20) * 100);
  delivery.statusChangedAt = new Date().toISOString();
  if (next.status === 'DELIVERED') delivery.deliveredAt = new Date().toISOString();
  db.statusHistory.unshift({ id: Date.now(), deliveryId: delivery.id, previousStatus: previous, newStatus: next.status, changedBy: actor?.id, at: new Date().toISOString() });
  log('STATUS_CHANGED', `${delivery.id}: ${previous} → ${next.status}`, delivery.id);
  return true;
};
const refreshLifecycle = () => { let changed = syncRiderStatuses(); db.deliveries.forEach(item => { const before = `${item.status}:${item.driverId || ''}:${item.progress || 0}`; stageProgress(item); changed ||= before !== `${item.status}:${item.driverId || ''}:${item.progress || 0}`; }); if (changed) save(); };
const canAccess = (user, delivery) => {
  if (['ADMIN', 'DISPATCHER'].includes(user.role)) return true;
  if (user.role === 'CUSTOMER') return delivery.customerId === user.id;
  if (user.role === 'BUSINESS') return delivery.businessId === db.businesses.find(item => item.ownerId === user.id)?.id;
  if (user.role === 'RIDER') return delivery.driverId === riderFor(user)?.id;
  return false;
};
const scopedState = user => {
  refreshLifecycle();
  if (['ADMIN', 'DISPATCHER'].includes(user.role)) return db;
  const base = { users: [user], businesses: [], drivers: [], deliveries: [], logs: [], statusHistory: [] };
  if (user.role === 'RIDER') { const rider = riderFor(user); const deliveries = db.deliveries.filter(item => item.driverId === rider?.id || item.status === 'LOOKING_FOR_RIDER'); return { ...base, drivers: rider ? [rider] : [], deliveries }; }
  if (user.role === 'BUSINESS') { const business = db.businesses.find(item => item.ownerId === user.id); return { ...base, businesses: business ? [business] : [], deliveries: db.deliveries.filter(item => item.businessId === business?.id) }; }
  return { ...base, deliveries: db.deliveries.filter(item => item.customerId === user.id) };
};
const auth = roles => (req, res, next) => { if (!req.user) return res.status(401).json({ error: 'Sign in required' }); if (roles?.length && !roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission for this action' }); next(); };
app.use((req, res, next) => { const token=cookie(req); req.user = sessions.get(token) || sessionUser(token); next(); });
app.use((req, res, next) => { let changed = false; db.deliveries.filter(item => item.status === 'DELIVERED' && item.driverId).forEach(item => { const rider = db.drivers.find(driver => driver.id === item.driverId); if (rider && rider.status !== 'AVAILABLE') { rider.status = 'AVAILABLE'; changed = true; } }); if (changed) save(); next(); });
app.use((req,res,next)=>{let changed=false;db.deliveries.filter(d=>d.status==='DELIVERED'&&d.paymentStatus==='PAID'&&!d.payoutSettled).forEach(d=>{const rider=db.drivers.find(x=>x.id===d.driverId),riderUser=db.users.find(x=>x.driverId===d.driverId),adminId=adminWalletId();if(riderUser)credit(riderUser.id,d.riderEarning||0,'DELIVERY_EARNING',`Earnings from ${d.id}`,{deliveryId:d.id});else credit(adminId,d.riderEarning||0,'AUTOMATED_RIDER_EARNING',`Automated rider earnings from ${d.id}`,{deliveryId:d.id});if(!d.feeSettled) { credit(adminId,d.platformFee||0,'DELIVERY_COMMISSION',`Platform commission from ${d.id}`,{deliveryId:d.id}); d.feeSettled=true; } d.payoutSettled=true;changed=true});if(changed)save();next()});

app.get('/api/state', auth(), (req, res) => { const state = scopedState(req.user); res.json({ ...state, users: state.users.map(safe) }); });
app.get('/api/me', auth(), (req, res) => res.json(safe(req.user)));
app.post('/api/login', (req, res) => { const email = String(req.body.email || '').trim().toLowerCase(); const user = db.users.find(item => item.email?.toLowerCase() === email); const configured = process.env.ROUTEFLOW_ADMIN_EMAIL?.toLowerCase() === email && process.env.ROUTEFLOW_ADMIN_PASSWORD === String(req.body.password || ''); if (!user || (!configured && user.passwordHash !== hash(req.body.password || ''))) return res.status(401).json({ error: 'Invalid email or password' }); const token = signedSession(user.id); sessions.set(token, user); res.setHeader('Set-Cookie', sessionCookie(token)); res.json(safe(user)); });
app.post('/api/logout', (req, res) => { sessions.delete(cookie(req)); res.setHeader('Set-Cookie', 'rf_session=; Max-Age=0; Path=/'); res.json({ ok: true }); });
app.post('/api/register', (req, res) => { const input = req.body || {}; if (!input.name || !input.email || !input.password || input.password.length < 6) return res.status(400).json({ error: 'Name, email and a 6+ character password are required' }); if (db.users.some(user => user.email.toLowerCase() === input.email.toLowerCase())) return res.status(409).json({ error: 'Email is already registered' }); const role = ['RIDER', 'BUSINESS'].includes(input.role) ? input.role : 'CUSTOMER'; const user = { id: 'u' + Date.now(), name: input.name, email: input.email, passwordHash: hash(input.password), role }; if (role === 'RIDER') { user.driverId = 'd' + Date.now(); db.drivers.push({ id: user.driverId, name: input.name, phone: input.phone || '', vehicle: input.vehicle || 'Vehicle details pending', status: 'AVAILABLE', lat: 9.0765, lng: 7.3986, capacity: 2 }); } if (role === 'BUSINESS') db.businesses.push({ id: 'b' + Date.now(), ownerId: user.id, name: input.businessName || input.name, email: input.email, isActive: true, createdAt: new Date().toISOString() }); db.users.push(user); log('USER_REGISTERED', `${user.name} created a ${user.role.toLowerCase()} account`, user.id); const token = signedSession(user.id); sessions.set(token, user); res.setHeader('Set-Cookie', sessionCookie(token)); res.status(201).json(safe(user)); });
app.get('/api/wallet', auth(), (req, res) => res.json(wallet(req.user.id)));
app.post('/api/wallet/deposit', auth(), async (req, res) => { try { const value=amount(req.body.amount); if (!Number.isFinite(value)||value<=0) return res.status(400).json({error:'Enter a valid deposit amount'}); const account=credit(req.user.id,value,'DEPOSIT','Wallet deposit'); await save(); res.json(account); } catch (error) { console.error('Wallet deposit failed:', error); res.status(500).json({error:'Wallet deposit could not be completed', detail:process.env.NODE_ENV==='production'?undefined:error.message}); } });
app.post('/api/wallet/withdraw', auth(), async (req, res) => { const value=amount(req.body.amount), fee=amount(value*0.05), payout=amount(value-fee); if (!Number.isFinite(value)||value<=0) return res.status(400).json({error:'Enter a valid withdrawal amount'}); if (!debit(req.user.id,value,'WITHDRAWAL','Wallet withdrawal')) return res.status(400).json({error:'Insufficient wallet balance'}); credit(adminWalletId(),fee,'COMMISSION',`Withdrawal fee from ${req.user.name}`); await save(); res.json({balance:wallet(req.user.id).balance,fee,payout}); });
app.put('/api/rider/profile', auth(['RIDER']), async (req, res) => { const rider=riderFor(req.user); if (!rider) return res.status(404).json({error:'Rider profile not found'}); rider.vehicle=req.body.vehicle||rider.vehicle; rider.vehicleType=req.body.vehicleType||rider.vehicleType||'MOTORCYCLE'; rider.capacity=Math.max(1,Math.min(10,Number(req.body.capacity)||rider.capacity||2)); rider.phone=req.body.phone??rider.phone; const payout={bankName:req.body.bankName??rider.payoutAccount?.bankName??'',accountName:req.body.accountName??rider.payoutAccount?.accountName??'',accountNumber:req.body.accountNumber??rider.payoutAccount?.accountNumber??''}; rider.payoutAccount=payout; wallet(req.user.id).payoutAccount=payout; await save(); res.json(rider); });
app.get('/api/deliveries/quote', auth(['CUSTOMER','BUSINESS','ADMIN','DISPATCHER']), async (req,res)=>res.json(await quoteAsync(req.query)));

app.get('/api/deliveries', auth(), (req, res) => { const state = scopedState(req.user); let rows = state.deliveries; const q = String(req.query.search || '').toLowerCase(); if (q) rows = rows.filter(item => [item.id, item.pickup, item.destination, item.recipient].some(value => String(value || '').toLowerCase().includes(q))); if (req.query.status) rows = rows.filter(item => item.status === req.query.status); res.json({ data: rows, pagination: { page: 1, limit: rows.length, total: rows.length, totalPages: rows.length ? 1 : 0 } }); });
app.post('/api/deliveries', auth(['ADMIN', 'DISPATCHER', 'CUSTOMER', 'BUSINESS']), async (req, res) => { try { const input = req.body || {}; if (!String(input.pickup||'').trim() || !String(input.destination||'').trim() || !String(input.recipient||'').trim() || !String(input.package||'').trim()) return res.status(400).json({error:'Pickup, destination, recipient and package details are required'}); db.deliveries ||= []; db.businesses ||= []; const business = db.businesses.find(item => item.ownerId === req.user.id); const pricing=await quoteAsync(input); const delivery = { id: 'RF-' + (1043 + db.deliveries.length), ...input, ...pricing, customerId: req.user.role === 'CUSTOMER' ? req.user.id : (input.customerId || req.user.id), businessId: req.user.role === 'BUSINESS' ? business?.id : input.businessId, status: 'PAYMENT_PENDING', paymentStatus:'UNPAID', createdAt: new Date().toISOString(), progress: 0, eta: pricing.estimatedMinutes }; db.deliveries.unshift(delivery); log('DELIVERY_CREATED', `${delivery.id} created with a ₦${pricing.total} fare`, delivery.id); if (!debit(req.user.id, delivery.total, 'DELIVERY_PAYMENT', `Payment for ${delivery.id}`, { deliveryId: delivery.id })) { await save(); return res.status(402).json({error:`Insufficient wallet balance. Add ₦${delivery.total.toLocaleString()} to your wallet before booking this delivery.`, delivery}); } credit(adminWalletId(), delivery.platformFee, 'DELIVERY_COMMISSION', `Platform commission from ${delivery.id}`, { deliveryId: delivery.id }); delivery.feeSettled=true; delivery.paymentStatus='PAID'; delivery.status='LOOKING_FOR_RIDER'; delivery.paidAt=new Date().toISOString(); await save(); res.status(201).json(delivery); } catch (error) { console.error('Delivery creation failed:', error); res.status(500).json({error:'Delivery could not be created', detail:process.env.NODE_ENV==='production'?undefined:error.message}); } });
app.post('/api/deliveries/:id/pay', auth(['CUSTOMER','BUSINESS','ADMIN']), async (req,res)=>{const d=db.deliveries.find(x=>x.id===req.params.id);if(!d||!canAccess(req.user,d))return res.status(404).json({error:'Delivery not found'});if(d.paymentStatus==='PAID')return res.json(d);if(!debit(req.user.id,d.total,'DELIVERY_PAYMENT',`Payment for ${d.id}`,{deliveryId:d.id}))return res.status(402).json({error:`Insufficient wallet balance. Deposit ₦${d.total} to pay for this delivery.`});credit(adminWalletId(), d.platformFee, 'DELIVERY_COMMISSION', `Platform commission from ${d.id}`, { deliveryId: d.id });d.feeSettled=true;d.paymentStatus='PAID';d.status='LOOKING_FOR_RIDER';d.paidAt=new Date().toISOString();await save();res.json(d)});
app.post('/api/deliveries/:id/advance', auth(['ADMIN']), async (req, res) => { const delivery = db.deliveries.find(item => item.id === req.params.id); if (!delivery) return res.status(404).json({ error: 'Delivery not found' }); if (!advanceDelivery(delivery, req.user)) return res.status(409).json({ error: delivery.riderNotice || 'Rider will be assigned once a rider is free' }); await save(); res.json(delivery); });
app.post('/api/deliveries/:id/auto-assign', auth(['ADMIN']), (req, res) => { const delivery = db.deliveries.find(item => item.id === req.params.id); if (!delivery) return res.status(404).json({ error: 'Delivery not found' }); if (!delivery.driverId && !chooseRider(delivery)) return res.status(409).json({ error: 'No available rider is currently available' }); delivery.status = 'RIDER_ACCEPTED'; delivery.progress = 20; log('RIDER_ASSIGNED', `${delivery.id} matched with the nearest available rider`, delivery.id); res.json(delivery); });
app.post('/api/deliveries/:id/accept', auth(['RIDER']), async (req, res) => { const delivery = db.deliveries.find(item => item.id === req.params.id); const rider = riderFor(req.user); if (!delivery || delivery.paymentStatus !== 'PAID' || !rider || delivery.driverId || !['LOOKING_FOR_RIDER', 'PENDING'].includes(delivery.status) || delivery.rejectedBy?.includes(req.user.id)) return res.status(409).json({ error: 'This delivery is not available for acceptance' }); delivery.driverId = rider.id; rider.status = 'ON_DELIVERY'; delivery.status = 'RIDER_ACCEPTED'; delivery.progress = 20; delete delivery.riderNotice; log('RIDER_ACCEPTED', `${rider.name} accepted ${delivery.id}`, delivery.id); await save(); res.json(delivery); });
app.post('/api/deliveries/:id/reject', auth(['RIDER']), async (req, res) => { const delivery = db.deliveries.find(item => item.id === req.params.id); if (!delivery || delivery.paymentStatus !== 'PAID' || delivery.driverId || delivery.status !== 'LOOKING_FOR_RIDER') return res.status(409).json({ error: 'This delivery is no longer available to reject' }); delivery.rejectedBy = [...new Set([...(delivery.rejectedBy || []), req.user.id])]; log('RIDER_REJECTED', `${req.user.name} rejected ${delivery.id}`, delivery.id); await save(); res.json({ ok: true }); });
app.post('/api/deliveries/:id/cancel', auth(['RIDER']), async (req, res) => { const delivery = db.deliveries.find(item => item.id === req.params.id); const rider = riderFor(req.user); if (!delivery || !rider || delivery.driverId !== rider.id || delivery.status === 'DELIVERED') return res.status(409).json({ error: 'This ride cannot be cancelled by you' }); delivery.driverId = null; delivery.status = 'LOOKING_FOR_RIDER'; delivery.progress = 0; delivery.cancelledBy = req.user.id; delivery.riderNotice = 'Rider cancelled; waiting for another rider'; rider.status = 'AVAILABLE'; log('RIDER_CANCELLED', `${rider.name} cancelled ${delivery.id}`, delivery.id); await save(); res.json(delivery); });
app.post('/api/deliveries/:id/status', auth(), async (req, res) => { const delivery = db.deliveries.find(item => item.id === req.params.id); if (!delivery || !canAccess(req.user, delivery)) return res.status(403).json({ error: 'You do not have access to this delivery' }); if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Only an administrator can advance delivery stages' }); if (!advanceDelivery(delivery, req.user)) return res.status(409).json({ error: 'No available rider is currently available' }); await save(); res.json(delivery); });
app.get('/api/rider/orders', auth(['RIDER']), (req, res) => { refreshLifecycle(); res.json(db.deliveries.filter(item => !item.driverId && item.paymentStatus === 'PAID' && item.status === 'LOOKING_FOR_RIDER' && !item.rejectedBy?.includes(req.user.id))); });
app.get('/api/deliveries/:id/history', auth(), (req, res) => { const delivery = db.deliveries.find(item => item.id === req.params.id); if (!delivery) return res.status(404).json({ error: 'Delivery not found' }); if (!canAccess(req.user, delivery)) return res.status(403).json({ error: 'You do not have access to this delivery' }); res.json(db.statusHistory.filter(item => item.deliveryId === delivery.id)); });
app.get('/api/deliveries/:id/activity', auth(), (req, res) => { const delivery = db.deliveries.find(item => item.id === req.params.id); if (!delivery) return res.status(404).json({ error: 'Delivery not found' }); if (!canAccess(req.user, delivery)) return res.status(403).json({ error: 'You do not have access to this delivery' }); res.json(db.logs.filter(item => item.entityId === delivery.id)); });
app.get('/api/deliveries/:id/export/pdf', auth(), (req, res) => { const delivery = db.deliveries.find(item => item.id === req.params.id); if (!delivery || !canAccess(req.user, delivery)) return res.status(404).json({ error: 'Delivery not found' }); const driver = db.drivers.find(item => item.id === delivery.driverId); const doc = new PDFDocument({ margin: 48 }); const chunks = []; doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => { res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="${delivery.id}.pdf"`); res.send(Buffer.concat(chunks)); }); doc.fontSize(24).fillColor('#1b8c83').text('RouteFlow'); doc.fontSize(18).fillColor('#17222d').text(delivery.id); [['Status', delivery.status], ['Pickup', delivery.pickup], ['Destination', delivery.destination], ['Rider', driver?.name || 'Awaiting rider']].forEach(([label, value]) => doc.fontSize(11).text(`${label}: ${value || '—'}`)); doc.end(); });
app.get('/api/export/csv', auth(), (req, res) => { const rows = ['Delivery ID,Pickup,Destination,Status,Priority,Created At', ...scopedState(req.user).deliveries.map(item => [item.id, item.pickup, item.destination, item.status, item.priority, item.createdAt].map(value => `"${String(value || '').replaceAll('"', '""')}"`).join(','))]; res.type('text/csv').send(rows.join('\n')); });
app.get('/api/analytics/overview', auth(['ADMIN', 'DISPATCHER']), (req, res) => { refreshLifecycle(); const total = db.deliveries.length; const completed = db.deliveries.filter(item => item.status === 'DELIVERED').length; res.json({ total, completed, lookingForRider: db.deliveries.filter(item => item.status === 'LOOKING_FOR_RIDER').length, active: db.deliveries.filter(item => item.status !== 'DELIVERED').length, completionRate: total ? Math.round(completed / total * 100) : 0, availableRiders: db.drivers.filter(item => item.status === 'AVAILABLE').length, totalRiders: db.drivers.length }); });
app.get('/api/activity', auth(['ADMIN', 'DISPATCHER']), (req, res) => res.json(db.logs));
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.use((req, res) => res.sendFile(path.join(__dirname, '..', 'dist', 'index.html')));
const ready = load().then(async () => { ensureMockDrivers(); ensureRiderProfiles(); ensureAdmin(); settleExistingFees(); await save(); });
if (require.main === module) ready.then(() => app.listen(process.env.PORT || 3001, '127.0.0.1', () => console.log(`RouteFlow Express API on ${process.env.PORT || 3001} · ${supabase ? 'Supabase connected' : 'local fallback'}`))).catch(error => { console.error('Could not load Supabase state:', error.message); process.exit(1); });
module.exports = async (req, res) => { try { await ready; return app(req, res); } catch (error) { console.error('Could not initialize RouteFlow API:', error.message); return res.status(500).json({ error: 'API initialization failed' }); } };
