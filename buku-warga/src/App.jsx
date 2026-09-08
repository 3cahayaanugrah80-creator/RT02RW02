import { useState, useEffect, useMemo } from "react";
import {
  Home, Users, MapPin, Plus, Search, Trash2, Pencil, X,
  ChevronDown, ChevronRight, Phone, User, ArrowLeft, Save,
  AlertCircle, Loader2, LogOut, Megaphone, Wallet, UsersRound,
  Shield, CalendarDays
} from "lucide-react";
import * as db from "./supabaseClient";

const RELASI = ["Suami", "Istri", "Anak", "Orang Tua", "Mertua", "Famili Lain", "Pembantu/ART"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const PENDIDIKAN = ["Tidak/Belum Sekolah", "SD", "SMP", "SMA/SMK", "D1/D2/D3", "S1", "S2", "S3"];
const STATUS_DOMISILI = ["Tetap", "Kontrak", "Kost", "Numpang"];
const STATUS_PERKAWINAN = ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"];

function newId() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyAnggota() {
  return {
    id: newId(), nama: "", nik: "", relasi: "Anak", jenisKelamin: "L", tempatLahir: "", tanggalLahir: "",
    pekerjaan: "", pendidikan: "", domisili: "", statusPerkawinan: "", keterangan: "",
  };
}

function emptyKeluarga() {
  return {
    id: newId(), noKK: "", namaKK: "", jenisKelaminKK: "L", nikKK: "", tempatLahirKK: "", tanggalLahirKK: "",
    pekerjaanKK: "", pendidikanKK: "", domisiliKK: "", statusPerkawinanKK: "", keteranganKK: "",
    alamat: "", lingkungan: "Kwarasan", rt: "02", rw: "02", telepon: "", lat: "", lng: "", anggota: [],
  };
}

function hitungUsia(tanggalLahir) {
  if (!tanggalLahir) return null;
  const lahir = new Date(tanggalLahir);
  if (isNaN(lahir)) return null;
  const now = new Date();
  let usia = now.getFullYear() - lahir.getFullYear();
  const m = now.getMonth() - lahir.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < lahir.getDate())) usia--;
  return usia;
}

function formatRupiah(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function formatPeriode(p) {
  const [y, m] = p.split("-");
  return `${BULAN[parseInt(m, 10) - 1]} ${y}`;
}

function navItemsFor(role) {
  const full = [
    { id: "dashboard", label: "Dasbor", icon: Home },
    { id: "list", label: "Data warga", icon: Users },
    { id: "peta", label: "Peta rumah", icon: MapPin },
    { id: "iuran", label: "Iuran warga", icon: Wallet },
    { id: "dasawisma", label: "Dasawisma", icon: UsersRound },
    { id: "pengumuman", label: "Pengumuman", icon: Megaphone },
  ];
  if (role === "pengurus") return full;
  if (role === "bendahara") {
    const order = ["iuran", "list", "peta", "dasawisma", "pengumuman"];
    return order.map((id) => full.find((i) => i.id === id));
  }
  const order = ["pengumuman", "peta", "list", "iuran", "dasawisma"];
  return order.map((id) => full.find((i) => i.id === id));
}

export default function AplikasiRT() {
  const [families, setFamilies] = useState([]);
  const [iuranRecords, setIuranRecords] = useState([]);
  const [tarifIuran, setTarifIuran] = useState(20000);
  const [dasawisma, setDasawisma] = useState([]);
  const [pengumuman, setPengumuman] = useState([]);
  const [accessCode, setAccessCode] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState("dashboard");
  const [editingFamily, setEditingFamily] = useState(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({});
  const [selectedMapId, setSelectedMapId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showChangeCode, setShowChangeCode] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await db.loadAll();
        setFamilies(data.families);
        setIuranRecords(data.iuranRecords);
        setTarifIuran(data.tarif);
        setDasawisma(data.dasawisma);
        setPengumuman(data.pengumuman);
        setAccessCode(data.accessCode);
      } catch (e) {
        console.error(e);
        setLoadError("Tidak bisa terhubung ke database. Cek Project URL dan API key di src/supabaseClient.js, lalu pastikan skema SQL sudah dijalankan.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (role !== "pengurus" && (view === "dashboard" || view === "form")) {
      setView(role === "bendahara" ? "iuran" : "pengumuman");
    }
  }, [role, view]);

  function persistFamilies(next) {
    const prev = families;
    setFamilies(next);
    const nextIds = new Set(next.map((f) => f.id));
    prev.filter((f) => !nextIds.has(f.id)).forEach((f) => db.deleteFamily(f.id).catch(console.error));
    next.forEach((f) => db.saveFamily(f).catch(console.error));
  }

  function persistIuran(next) {
    const prev = iuranRecords;
    setIuranRecords(next);
    const nextIds = new Set(next.map((r) => r.id));
    prev.filter((r) => !nextIds.has(r.id)).forEach((r) => db.deleteIuranRecord(r.id).catch(console.error));
    next.forEach((r) => db.upsertIuran(r).catch(console.error));
  }

  function persistTarif(next) {
    setTarifIuran(next);
    db.setPengaturan("tarif_iuran", next).catch(console.error);
  }

  function persistDasawisma(next) {
    const prev = dasawisma;
    setDasawisma(next);
    const nextIds = new Set(next.map((g) => g.id));
    prev.filter((g) => !nextIds.has(g.id)).forEach((g) => db.deleteDasawismaGroup(g.id).catch(console.error));
    next.forEach((g) => db.upsertDasawismaGroup(g).catch(console.error));
  }

  function persistPengumuman(next) {
    const prev = pengumuman;
    setPengumuman(next);
    const nextIds = new Set(next.map((p) => p.id));
    prev.filter((p) => !nextIds.has(p.id)).forEach((p) => db.deletePengumumanItem(p.id).catch(console.error));
    next.forEach((p) => db.upsertPengumuman(p).catch(console.error));
  }

  function persistAccessCode(next) {
    setAccessCode(next);
    db.setPengaturan("kode_pengurus", next.pengurus).catch(console.error);
    db.setPengaturan("kode_bendahara", next.bendahara).catch(console.error);
  }

  function saveFamily(fam) {
    const exists = families.some((f) => f.id === fam.id);
    const next = exists ? families.map((f) => (f.id === fam.id ? fam : f)) : [...families, fam];
    persistFamilies(next);
    setView("list");
    setEditingFamily(null);
  }

  function deleteFamily(id) {
    persistFamilies(families.filter((f) => f.id !== id));
    setConfirmDelete(null);
    if (selectedMapId === id) setSelectedMapId(null);
  }

  function handleLogin(r) {
    setRole(r);
    setView(r === "pengurus" ? "dashboard" : r === "bendahara" ? "iuran" : "pengumuman");
  }

  function handleLogout() {
    setRole(null);
    setEditingFamily(null);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return families;
    return families.filter((f) => {
      if (f.namaKK.toLowerCase().includes(q)) return true;
      if (f.noKK.toLowerCase().includes(q)) return true;
      if (f.alamat.toLowerCase().includes(q)) return true;
      if ((f.lingkungan || "").toLowerCase().includes(q)) return true;
      return f.anggota.some((a) => a.nama.toLowerCase().includes(q));
    });
  }, [families, search]);

  if (loading) {
    return (
      <div style={{ fontFamily: "var(--f-sans)" }} className="flex items-center justify-center py-24">
        <RootStyles />
        <Loader2 className="animate-spin" size={22} color="var(--forest)" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-4" style={{ background: "var(--paper)", fontFamily: "var(--f-sans)" }}>
        <RootStyles />
        <div style={{ maxWidth: 420, border: "1px solid var(--line)", background: "#fff" }} className="p-6">
          <p className="text-[15px]" style={{ fontWeight: 500, color: "var(--brick)" }}>Gagal memuat data</p>
          <p className="text-[13.5px] mt-2" style={{ color: "var(--ink-soft)" }}>{loadError}</p>
        </div>
      </div>
    );
  }

  if (!role) {
    return <Login accessCode={accessCode} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col sm:flex-row" style={{ background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--f-sans)" }}>
      <RootStyles />
      <Sidebar view={view} setView={setView} count={families.length} role={role} onLogout={handleLogout} onChangeCode={() => setShowChangeCode(true)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileNav view={view} setView={setView} role={role} onLogout={handleLogout} />
        <main className="flex-1 min-w-0 px-4 sm:px-10 py-6 sm:py-9">
          {view === "dashboard" && role === "pengurus" && (
            <Dashboard
              families={families}
              goTambah={() => { setEditingFamily(emptyKeluarga()); setView("form"); }}
              goList={() => setView("list")}
            />
          )}
          {view === "list" && (
            <ListView
              families={filtered} allCount={families.length} search={search} setSearch={setSearch}
              expanded={expanded} setExpanded={setExpanded} role={role}
              onEdit={(f) => { setEditingFamily(f); setView("form"); }}
              onDelete={(id) => setConfirmDelete(id)}
              onTambah={() => { setEditingFamily(emptyKeluarga()); setView("form"); }}
            />
          )}
          {view === "peta" && (
            <MapView families={families} role={role} selectedId={selectedMapId} setSelectedId={setSelectedMapId} />
          )}
          {view === "iuran" && (
            <IuranView families={families} iuranRecords={iuranRecords} tarif={tarifIuran} persistIuran={persistIuran} persistTarif={persistTarif} role={role} />
          )}
          {view === "dasawisma" && (
            <DasawismaView families={families} dasawisma={dasawisma} persistDasawisma={persistDasawisma} role={role} />
          )}
          {view === "pengumuman" && (
            <PengumumanView pengumuman={pengumuman} persistPengumuman={persistPengumuman} role={role} />
          )}
          {view === "form" && editingFamily && role === "pengurus" && (
            <FormView initial={editingFamily} onCancel={() => { setView("list"); setEditingFamily(null); }} onSave={saveFamily} />
          )}
        </main>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          nama={families.find((f) => f.id === confirmDelete)?.namaKK}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteFamily(confirmDelete)}
        />
      )}
      {showChangeCode && (
        <ChangeCodeDialog
          role={role}
          codes={accessCode}
          onCancel={() => setShowChangeCode(false)}
          onSave={(nextCodes) => { persistAccessCode(nextCodes); setShowChangeCode(false); }}
        />
      )}
    </div>
  );
}

function RootStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,450;9..144,550;9..144,650&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
      :root {
        --paper: #F5F2E9;
        --paper-alt: #ECE7D8;
        --ink: #1E2A22;
        --ink-soft: #55645A;
        --forest: #33513F;
        --forest-dark: #223629;
        --gold: #B08A3E;
        --brick: #96442F;
        --line: #D9D2BC;
        --f-serif: 'Fraunces', serif;
        --f-sans: 'IBM Plex Sans', sans-serif;
        --f-mono: 'IBM Plex Mono', monospace;
      }
      .f-serif { font-family: var(--f-serif); }
      .f-mono { font-family: var(--f-mono); }
      input, select, textarea {
        font-family: var(--f-sans);
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 3px;
        padding: 8px 10px;
        font-size: 14px;
        color: var(--ink);
        outline: none;
        width: 100%;
      }
      input:focus, select:focus, textarea:focus {
        border-color: var(--forest);
        box-shadow: 0 0 0 2px rgba(51,81,63,0.14);
      }
      .btn {
        font-family: var(--f-sans);
        font-size: 13.5px;
        font-weight: 500;
        border-radius: 3px;
        padding: 8px 14px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid transparent;
        transition: background .12s ease, border-color .12s ease;
      }
      .btn-primary { background: var(--forest); color: #F5F2E9; }
      .btn-primary:hover { background: var(--forest-dark); }
      .btn-ghost { background: transparent; border-color: var(--line); color: var(--ink); }
      .btn-ghost:hover { background: var(--paper-alt); }
      .btn-danger { background: transparent; border-color: var(--brick); color: var(--brick); }
      .btn-danger:hover { background: var(--brick); color: #fff; }
      ::selection { background: var(--gold); color: #fff; }
    `}</style>
  );
}

function Login({ accessCode, onLogin }) {
  const [mode, setMode] = useState(null);
  const [inputCode, setInputCode] = useState("");
  const [error, setError] = useState("");

  function submit(target) {
    if (inputCode.trim() === accessCode[target]) {
      onLogin(target);
    } else {
      setError("Kode akses salah. Tanyakan ke ketua RT.");
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4" style={{ background: "var(--paper)", fontFamily: "var(--f-sans)" }}>
      <RootStyles />
      <div style={{ maxWidth: 380 }} className="w-full">
        <div className="text-center mb-8">
          <p className="f-serif text-[27px] leading-tight" style={{ fontWeight: 600, color: "var(--forest-dark)" }}>Buku Online Warga</p>
          <p className="text-[13.5px] mt-2" style={{ color: "var(--forest)", fontWeight: 500 }}>RT. 02 / RW. 02</p>
          <p className="text-[12.5px] mt-0.5" style={{ color: "var(--ink-soft)" }}>Lingkungan Kwarasan Baleharjo</p>
        </div>
        {!mode ? (
          <div className="flex flex-col gap-3">
            <button className="btn btn-primary justify-center py-3" onClick={() => onLogin("warga")}>Masuk sebagai warga</button>
            <button className="btn btn-ghost justify-center py-3" onClick={() => { setMode("pengurus"); setInputCode(""); setError(""); }}>Masuk sebagai pengurus RT</button>
            <button className="btn btn-ghost justify-center py-3" onClick={() => { setMode("bendahara"); setInputCode(""); setError(""); }}>Masuk sebagai bendahara (input iuran)</button>
          </div>
        ) : (
          <div style={{ border: "1px solid var(--line)", background: "#fff" }} className="p-5">
            <Field label={mode === "pengurus" ? "Kode akses pengurus" : "Kode akses bendahara"}>
              <input type="password" value={inputCode} onChange={(e) => { setInputCode(e.target.value); setError(""); }} placeholder="Masukkan kode akses" />
            </Field>
            {error && <p className="text-[12.5px] mt-2" style={{ color: "var(--brick)" }}>{error}</p>}
            <div className="flex gap-2 mt-4">
              <button className="btn btn-primary" onClick={() => submit(mode)}>Masuk</button>
              <button className="btn btn-ghost" onClick={() => setMode(null)}>Kembali</button>
            </div>
          </div>
        )}
        <p className="text-[12px] text-center mt-6" style={{ color: "var(--ink-soft)" }}>
          Warga bisa melihat peta rumah, daftar keluarga tanpa NIK, iuran, dasawisma, dan pengumuman. Bendahara khusus mengelola input iuran warga.
        </p>
      </div>
    </div>
  );
}

function Sidebar({ view, setView, count, role, onLogout, onChangeCode }) {
  const items = navItemsFor(role);
  return (
    <aside className="w-[220px] shrink-0 hidden sm:flex flex-col justify-between py-7 px-5" style={{ background: "var(--forest)", color: "#EFE9D6" }}>
      <div>
        <div className="mb-8">
          <p className="f-serif text-[18px] leading-tight" style={{ fontWeight: 600 }}>Buku Online Warga</p>
          <p className="text-[12px] mt-1.5" style={{ color: "#C7CFB9" }}>RT. 02 / RW. 02</p>
          <p className="text-[11px] mt-0.5" style={{ color: "#9BA68D" }}>Kwarasan Baleharjo</p>
        </div>
        <nav className="flex flex-col gap-1">
          {items.map((it) => {
            const Icon = it.icon;
            const active = view === it.id;
            return (
              <button
                key={it.id}
                onClick={() => setView(it.id)}
                className="flex items-center gap-2.5 text-left px-3 py-2 rounded-sm text-[14px]"
                style={{
                  background: active ? "rgba(245,242,233,0.14)" : "transparent",
                  color: active ? "#F5F2E9" : "#CBD3BD",
                  fontWeight: active ? 500 : 400,
                }}
              >
                <Icon size={16} />
                {it.label}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-[12px]" style={{ color: "#9BA68D" }}>{count} kepala keluarga tercatat</p>
        <div className="flex items-center gap-1.5 text-[12.5px] mt-1" style={{ color: "#C7CFB9" }}>
          {role === "pengurus" ? <Shield size={13} /> : role === "bendahara" ? <Wallet size={13} /> : <User size={13} />}
          {role === "pengurus" ? "Pengurus RT" : role === "bendahara" ? "Bendahara" : "Warga RT"}
        </div>
        {role !== "warga" && (
          <button onClick={onChangeCode} className="text-[12px] text-left" style={{ color: "#9BA68D" }}>Ubah kode akses</button>
        )}
        <button onClick={onLogout} className="flex items-center gap-1.5 text-[12px] mt-1" style={{ color: "#9BA68D" }}>
          <LogOut size={13} /> Keluar
        </button>
      </div>
    </aside>
  );
}

function MobileNav({ view, setView, role, onLogout }) {
  const items = navItemsFor(role);
  return (
    <div className="sm:hidden sticky top-0" style={{ background: "var(--forest)", zIndex: 10 }}>
      <div className="flex items-center justify-between px-4 pt-3">
        <p className="f-serif text-[15px]" style={{ color: "#F5F2E9", fontWeight: 600 }}>Buku Online Warga</p>
        <button onClick={onLogout} style={{ color: "#CBD3BD" }} aria-label="Keluar"><LogOut size={15} /></button>
      </div>
      <div className="flex gap-1 px-3 py-3 overflow-x-auto">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => setView(it.id)}
            className="text-[12.5px] px-3 py-1.5 whitespace-nowrap"
            style={{
              borderRadius: 3,
              background: view === it.id ? "rgba(245,242,233,0.16)" : "transparent",
              color: view === it.id ? "#F5F2E9" : "#CBD3BD",
              fontWeight: view === it.id ? 500 : 400,
            }}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="px-5 py-4" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 4 }}>
      <p className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>{label}</p>
      <p className="f-serif text-[26px] leading-tight mt-1" style={{ fontWeight: 550, color: "var(--forest-dark)" }}>{value}</p>
      {sub && <p className="text-[12px] mt-0.5" style={{ color: "var(--ink-soft)" }}>{sub}</p>}
    </div>
  );
}

function Dashboard({ families, goTambah, goList }) {
  const jumlahKK = families.length;
  const kkLaki = families.filter((f) => f.jenisKelaminKK === "L").length;
  const kkPerempuan = families.filter((f) => f.jenisKelaminKK === "P").length;

  const totalJiwa = families.reduce((sum, f) => sum + 1 + f.anggota.length, 0);
  let jiwaLaki = families.filter((f) => f.jenisKelaminKK === "L").length;
  let jiwaPerempuan = families.filter((f) => f.jenisKelaminKK === "P").length;
  families.forEach((f) => {
    jiwaLaki += f.anggota.filter((a) => a.jenisKelamin === "L").length;
    jiwaPerempuan += f.anggota.filter((a) => a.jenisKelamin === "P").length;
  });

  const belumKoordinat = families.filter((f) => !f.lat || !f.lng).length;
  const belumGenderKK = families.filter((f) => f.jenisKelaminKK !== "L" && f.jenisKelaminKK !== "P").length;
  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div style={{ width: 4, background: "var(--gold)", borderRadius: 2, alignSelf: "stretch", minHeight: 68 }} />
          <div>
            <h1 className="f-serif text-[30px] sm:text-[34px] leading-tight" style={{ fontWeight: 650, color: "var(--forest-dark)" }}>Buku Online Warga</h1>
            <p className="text-[15px] mt-1" style={{ color: "var(--forest)", fontWeight: 500 }}>RT. 02 / RW. 02 &mdash; Lingkungan Kwarasan Baleharjo</p>
            <p className="text-[13px] mt-2.5" style={{ color: "var(--ink-soft)" }}>Ringkasan data warga per {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={goTambah}>
          <Plus size={15} /> Tambah keluarga
        </button>
      </div>

      <p className="text-[12.5px] mb-2.5" style={{ color: "var(--ink-soft)" }}>Kepala keluarga</p>
      <div className="grid grid-cols-3 gap-3 mb-2">
        <StatCard label="Jumlah kepala keluarga" value={jumlahKK} />
        <StatCard label="Laki-laki" value={kkLaki} />
        <StatCard label="Perempuan" value={kkPerempuan} />
      </div>
      {belumGenderKK > 0 && (
        <p className="text-[12px] mb-6" style={{ color: "var(--gold)" }}>
          {belumGenderKK} kepala keluarga belum mengisi jenis kelamin, jadi belum terhitung di rincian laki-laki/perempuan.
        </p>
      )}

      <p className="text-[12.5px] mb-2.5 mt-6" style={{ color: "var(--ink-soft)" }}>Total jiwa</p>
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard label="Total jiwa" value={totalJiwa} />
        <StatCard label="Laki-laki" value={jiwaLaki} />
        <StatCard label="Perempuan" value={jiwaPerempuan} />
      </div>

      {belumKoordinat > 0 && (
        <div className="flex items-start gap-2.5 px-4 py-3 mb-7" style={{ border: "1px solid var(--line)", borderLeft: "3px solid var(--gold)", background: "#fff" }}>
          <AlertCircle size={16} color="var(--gold)" style={{ marginTop: 2, flexShrink: 0 }} />
          <p className="text-[13.5px]">
            {belumKoordinat} keluarga belum punya koordinat rumah, jadi belum muncul di peta.
          </p>
        </div>
      )}

      {families.length === 0 ? (
        <EmptyState onTambah={goTambah} />
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px]" style={{ color: "var(--ink-soft)" }}>Ditambahkan terakhir</p>
            <button onClick={goList} className="text-[13px]" style={{ color: "var(--forest)", fontWeight: 500 }}>Lihat semua &rsaquo;</button>
          </div>
          <div style={{ border: "1px solid var(--line)", background: "#fff" }}>
            {families.slice(-5).reverse().map((f, i) => (
              <div key={f.id} className="flex items-center justify-between px-4 py-3" style={{ borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                <div>
                  <p className="text-[14px]" style={{ fontWeight: 500 }}>{f.namaKK || "(nama belum diisi)"}</p>
                  <p className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>{f.alamat || "Alamat belum diisi"}</p>
                </div>
                <p className="f-mono text-[12px]" style={{ color: "var(--ink-soft)" }}>{1 + f.anggota.length} jiwa</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onTambah }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6" style={{ border: "1px dashed var(--line)" }}>
      <Users size={26} color="var(--ink-soft)" />
      <p className="f-serif text-[18px] mt-3" style={{ fontWeight: 550 }}>Belum ada keluarga tercatat</p>
      <p className="text-[13.5px] mt-1 max-w-xs" style={{ color: "var(--ink-soft)" }}>
        Mulai dengan mendaftarkan kepala keluarga pertama beserta anggotanya.
      </p>
      <button className="btn btn-primary mt-4" onClick={onTambah}>
        <Plus size={15} /> Tambah kepala keluarga
      </button>
    </div>
  );
}

function ListView({ families, allCount, search, setSearch, expanded, setExpanded, onEdit, onDelete, onTambah, role }) {
  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="f-serif text-[26px]" style={{ fontWeight: 550 }}>Data warga</h1>
          <p className="text-[13.5px] mt-1" style={{ color: "var(--ink-soft)" }}>{allCount} kepala keluarga terdaftar</p>
        </div>
        {role === "pengurus" && (
          <button className="btn btn-primary" onClick={onTambah}><Plus size={15} /> Tambah keluarga</button>
        )}
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search size={15} style={{ position: "absolute", left: 10, top: 11, color: "var(--ink-soft)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, no. KK, atau alamat"
          style={{ paddingLeft: 32 }}
        />
      </div>

      {families.length === 0 ? (
        <p className="text-[13.5px] py-10 text-center" style={{ color: "var(--ink-soft)" }}>
          {allCount === 0 ? "Belum ada data. Tambahkan keluarga pertama." : "Tidak ada hasil yang cocok."}
        </p>
      ) : (
        <div style={{ border: "1px solid var(--line)", background: "#fff" }}>
          {families.map((f, i) => {
            const isOpen = !!expanded[f.id];
            return (
              <div key={f.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => setExpanded((e) => ({ ...e, [f.id]: !e[f.id] }))}
                    aria-label={isOpen ? "Sembunyikan anggota" : "Tampilkan anggota"}
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="text-[14.5px]" style={{ fontWeight: 500 }}>{f.namaKK || "(nama belum diisi)"}</p>
                      {role === "pengurus" && <p className="f-mono text-[11.5px]" style={{ color: "var(--ink-soft)" }}>No. KK {f.noKK || "-"}</p>}
                    </div>
                    <p className="text-[12.5px] truncate" style={{ color: "var(--ink-soft)" }}>{f.alamat || "Alamat belum diisi"}</p>
                    <p className="text-[11.5px]" style={{ color: "var(--ink-soft)" }}>{f.lingkungan ? `Lingkungan ${f.lingkungan} \u2014 ` : ""}RT {f.rt || "-"} / RW {f.rw || "-"}</p>
                  </div>
                  <p className="text-[12.5px] hidden md:block" style={{ color: "var(--ink-soft)" }}>{1 + f.anggota.length} jiwa</p>
                  {role === "pengurus" && (
                    <>
                      <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => onEdit(f)} aria-label="Ubah">
                        <Pencil size={13} />
                      </button>
                      <button className="btn btn-danger" style={{ padding: "6px 10px" }} onClick={() => onDelete(f.id)} aria-label="Hapus">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
                {isOpen && (
                  <div className="px-4 pb-4 pl-11">
                    {role === "pengurus" && (
                      <div className="text-[12.5px] mb-3 flex flex-col gap-1" style={{ color: "var(--ink-soft)" }}>
                        <div className="flex flex-wrap gap-x-5 gap-y-1">
                          {f.telepon && <span className="flex items-center gap-1"><Phone size={12} /> {f.telepon}</span>}
                          {f.lat && f.lng && <span className="flex items-center gap-1 f-mono"><MapPin size={12} /> {f.lat}, {f.lng}</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-1">
                          {f.nikKK && <span className="f-mono">NIK {f.nikKK}</span>}
                          {f.jenisKelaminKK && <span>{f.jenisKelaminKK === "L" ? "Laki-laki" : "Perempuan"}</span>}
                          {f.statusPerkawinanKK && <span>{f.statusPerkawinanKK}</span>}
                          {(f.tempatLahirKK || f.tanggalLahirKK) && (
                            <span>Lahir: {f.tempatLahirKK}{f.tempatLahirKK && f.tanggalLahirKK ? ", " : ""}{f.tanggalLahirKK}{hitungUsia(f.tanggalLahirKK) !== null ? ` (${hitungUsia(f.tanggalLahirKK)} th)` : ""}</span>
                          )}
                          {f.pekerjaanKK && <span>{f.pekerjaanKK}</span>}
                          {f.pendidikanKK && <span>{f.pendidikanKK}</span>}
                          {f.domisiliKK && <span>Domisili: {f.domisiliKK}</span>}
                        </div>
                        {f.keteranganKK && <span className="italic">Ket: {f.keteranganKK}</span>}
                      </div>
                    )}
                    {f.anggota.length === 0 ? (
                      <p className="text-[13px] italic" style={{ color: "var(--ink-soft)" }}>Belum ada anggota keluarga lain.</p>
                    ) : (
                      <div style={{ borderLeft: "2px solid var(--line)" }}>
                        {f.anggota.map((a) => {
                          const usia = hitungUsia(a.tanggalLahir);
                          return (
                            <div key={a.id} className="flex items-center gap-3 py-1.5 pl-3 flex-wrap">
                              <User size={13} style={{ color: "var(--ink-soft)", flexShrink: 0 }} />
                              <p className="text-[13.5px] min-w-[140px]">{a.nama || "(tanpa nama)"}</p>
                              <p className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>{a.relasi}</p>
                              <p className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>{a.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}</p>
                              {usia !== null && <p className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>{usia} th</p>}
                              {role === "pengurus" && a.tempatLahir && <p className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>Lahir di {a.tempatLahir}</p>}
                              {a.pekerjaan && <p className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>{a.pekerjaan}</p>}
                              {a.pendidikan && <p className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>{a.pendidikan}</p>}
                              {a.domisili && <p className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>{a.domisili}</p>}
                              {a.statusPerkawinan && <p className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>{a.statusPerkawinan}</p>}
                              {role === "pengurus" && a.nik && <p className="f-mono text-[12px]" style={{ color: "var(--ink-soft)" }}>NIK {a.nik}</p>}
                              {role === "pengurus" && a.keterangan && <p className="text-[12.5px] italic" style={{ color: "var(--ink-soft)" }}>Ket: {a.keterangan}</p>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MapView({ families, role, selectedId, setSelectedId }) {
  const withCoords = families.filter((f) => f.lat !== "" && f.lng !== "" && !isNaN(parseFloat(f.lat)) && !isNaN(parseFloat(f.lng)));
  const width = 720, height = 460, pad = 40;

  const points = useMemo(() => {
    if (withCoords.length === 0) return [];
    const lats = withCoords.map((f) => parseFloat(f.lat));
    const lngs = withCoords.map((f) => parseFloat(f.lng));
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const spanLat = maxLat - minLat || 0.0005;
    const spanLng = maxLng - minLng || 0.0005;
    return withCoords.map((f) => {
      const lat = parseFloat(f.lat), lng = parseFloat(f.lng);
      const x = pad + ((lng - minLng) / spanLng) * (width - pad * 2);
      const y = pad + (1 - (lat - minLat) / spanLat) * (height - pad * 2);
      return { ...f, x, y };
    });
  }, [withCoords]);

  const selected = points.find((p) => p.id === selectedId);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="f-serif text-[26px]" style={{ fontWeight: 550 }}>Peta rumah warga</h1>
        <p className="text-[13.5px] mt-1" style={{ color: "var(--ink-soft)" }}>
          Peta skematik berdasarkan koordinat yang dimasukkan &mdash; bukan citra satelit. {withCoords.length} dari {families.length} keluarga punya koordinat.
        </p>
      </div>

      {withCoords.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16 px-6" style={{ border: "1px dashed var(--line)" }}>
          <MapPin size={26} color="var(--ink-soft)" />
          <p className="f-serif text-[18px] mt-3" style={{ fontWeight: 550 }}>Belum ada koordinat</p>
          <p className="text-[13.5px] mt-1 max-w-sm" style={{ color: "var(--ink-soft)" }}>
            Tambahkan koordinat lintang dan bujur saat mengisi data keluarga agar rumahnya muncul di sini.
          </p>
        </div>
      ) : (
        <div className="flex gap-5 flex-col lg:flex-row">
          <div style={{ border: "1px solid var(--line)", background: "#fff", flex: 1 }}>
            <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: "block" }}>
              <rect x="0" y="0" width={width} height={height} fill="var(--paper-alt)" />
              {Array.from({ length: 7 }).map((_, i) => (
                <line key={"v" + i} x1={pad + (i * (width - pad * 2)) / 6} y1={pad} x2={pad + (i * (width - pad * 2)) / 6} y2={height - pad} stroke="var(--line)" strokeWidth="1" />
              ))}
              {Array.from({ length: 5 }).map((_, i) => (
                <line key={"h" + i} x1={pad} y1={pad + (i * (height - pad * 2)) / 4} x2={width - pad} y2={pad + (i * (height - pad * 2)) / 4} stroke="var(--line)" strokeWidth="1" />
              ))}
              {points.map((p) => (
                <g key={p.id} onClick={() => setSelectedId(p.id)} style={{ cursor: "pointer" }}>
                  <circle cx={p.x} cy={p.y} r={selectedId === p.id ? 8 : 6} fill={selectedId === p.id ? "var(--brick)" : "var(--forest)"} stroke="#fff" strokeWidth="1.5" />
                </g>
              ))}
            </svg>
          </div>
          <div className="w-full lg:w-[260px] shrink-0">
            {selected ? (
              <div style={{ border: "1px solid var(--line)", background: "#fff" }} className="p-4">
                <div className="flex items-start justify-between">
                  <p className="text-[14.5px]" style={{ fontWeight: 500 }}>{selected.namaKK}</p>
                  <button onClick={() => setSelectedId(null)} aria-label="Tutup"><X size={14} color="var(--ink-soft)" /></button>
                </div>
                <p className="text-[12.5px] mt-1" style={{ color: "var(--ink-soft)" }}>{selected.alamat}</p>
                <div className="text-[12.5px] mt-3 flex flex-col gap-1">
                  <span>{1 + selected.anggota.length} jiwa</span>
                  <span className="f-mono">{selected.lat}, {selected.lng}</span>
                  {selected.telepon && role === "pengurus" && <span>{selected.telepon}</span>}
                </div>
              </div>
            ) : (
              <p className="text-[13px] py-2" style={{ color: "var(--ink-soft)" }}>Klik titik di peta untuk melihat detail rumah.</p>
            )}
            <div className="mt-4 flex flex-col gap-1.5 max-h-[300px] overflow-auto">
              {points.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className="text-left px-3 py-2 text-[12.5px]"
                  style={{ background: selectedId === p.id ? "var(--paper-alt)" : "transparent", border: "1px solid var(--line)" }}
                >
                  {p.namaKK || "(tanpa nama)"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px]" style={{ color: "var(--ink-soft)" }}>
      {label}
      {children}
    </label>
  );
}

function FormView({ initial, onCancel, onSave }) {
  const [fam, setFam] = useState(initial);
  const [error, setError] = useState("");
  const isNew = !initial.namaKK && initial.anggota.length === 0;

  function update(field, value) {
    setFam((f) => ({ ...f, [field]: value }));
  }

  function updateAnggota(id, field, value) {
    setFam((f) => ({ ...f, anggota: f.anggota.map((a) => (a.id === id ? { ...a, [field]: value } : a)) }));
  }

  function addAnggota() {
    setFam((f) => ({ ...f, anggota: [...f.anggota, emptyAnggota()] }));
  }

  function removeAnggota(id) {
    setFam((f) => ({ ...f, anggota: f.anggota.filter((a) => a.id !== id) }));
  }

  function handleSubmit() {
    if (!fam.namaKK.trim()) {
      setError("Nama kepala keluarga wajib diisi.");
      return;
    }
    if ((fam.lat && !fam.lng) || (!fam.lat && fam.lng)) {
      setError("Isi lintang dan bujur, atau kosongkan keduanya.");
      return;
    }
    setError("");
    onSave(fam);
  }

  return (
    <div className="max-w-2xl">
      <button onClick={onCancel} className="flex items-center gap-1.5 text-[13px] mb-5" style={{ color: "var(--ink-soft)" }}>
        <ArrowLeft size={14} /> Kembali ke daftar
      </button>
      <h1 className="f-serif text-[24px] mb-6" style={{ fontWeight: 550 }}>
        {isNew ? "Tambah kepala keluarga" : `Ubah data — ${initial.namaKK}`}
      </h1>

      <div style={{ border: "1px solid var(--line)", background: "#fff" }} className="p-5 mb-6">
        <p className="text-[13px] mb-4" style={{ fontWeight: 500, color: "var(--forest-dark)" }}>Kepala keluarga</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nama lengkap">
            <input value={fam.namaKK} onChange={(e) => update("namaKK", e.target.value)} placeholder="Nama kepala keluarga" />
          </Field>
          <Field label="Nomor KK">
            <input value={fam.noKK} onChange={(e) => update("noKK", e.target.value)} placeholder="16 digit nomor KK" className="f-mono" />
          </Field>
          <Field label="NIK kepala keluarga">
            <input value={fam.nikKK} onChange={(e) => update("nikKK", e.target.value)} placeholder="16 digit NIK" className="f-mono" />
          </Field>
          <Field label="Jenis kelamin">
            <select value={fam.jenisKelaminKK} onChange={(e) => update("jenisKelaminKK", e.target.value)}>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </Field>
          <Field label="Status perkawinan">
            <select value={fam.statusPerkawinanKK} onChange={(e) => update("statusPerkawinanKK", e.target.value)}>
              <option value="">Pilih status</option>
              {STATUS_PERKAWINAN.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Tempat lahir">
            <input value={fam.tempatLahirKK} onChange={(e) => update("tempatLahirKK", e.target.value)} placeholder="Kota/kabupaten lahir" />
          </Field>
          <Field label="Tanggal lahir">
            <input type="date" value={fam.tanggalLahirKK} onChange={(e) => update("tanggalLahirKK", e.target.value)} />
          </Field>
          <Field label="Nomor telepon">
            <input value={fam.telepon} onChange={(e) => update("telepon", e.target.value)} placeholder="08xx-xxxx-xxxx" />
          </Field>
          <Field label="Pekerjaan">
            <input value={fam.pekerjaanKK} onChange={(e) => update("pekerjaanKK", e.target.value)} placeholder="Pekerjaan kepala keluarga" />
          </Field>
          <Field label="Pendidikan terakhir">
            <select value={fam.pendidikanKK} onChange={(e) => update("pendidikanKK", e.target.value)}>
              <option value="">Pilih pendidikan</option>
              {PENDIDIKAN.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Status domisili">
              <select value={fam.domisiliKK} onChange={(e) => update("domisiliKK", e.target.value)} style={{ maxWidth: 240 }}>
                <option value="">Pilih status</option>
                {STATUS_DOMISILI.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <div className="sm:col-span-2 grid grid-cols-3 gap-3">
            <Field label="Lingkungan">
              <input value={fam.lingkungan} onChange={(e) => update("lingkungan", e.target.value)} placeholder="Kwarasan" />
            </Field>
            <Field label="RT">
              <input value={fam.rt} onChange={(e) => update("rt", e.target.value)} />
            </Field>
            <Field label="RW">
              <input value={fam.rw} onChange={(e) => update("rw", e.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Alamat lengkap">
              <textarea rows={2} value={fam.alamat} onChange={(e) => update("alamat", e.target.value)} placeholder="Nama jalan, nomor rumah, blok/gang" />
            </Field>
          </div>
          <Field label="Lintang (latitude)">
            <input value={fam.lat} onChange={(e) => update("lat", e.target.value)} placeholder="-6.9876" className="f-mono" />
          </Field>
          <Field label="Bujur (longitude)">
            <input value={fam.lng} onChange={(e) => update("lng", e.target.value)} placeholder="112.1234" className="f-mono" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Keterangan">
              <textarea rows={2} value={fam.keteranganKK} onChange={(e) => update("keteranganKK", e.target.value)} placeholder="Catatan tambahan tentang keluarga ini" />
            </Field>
          </div>
        </div>
        <p className="text-[11.5px] mt-2" style={{ color: "var(--ink-soft)" }}>
          Koordinat bisa diambil dari Google Maps: tekan lama titik lokasi rumah, lalu salin angka yang muncul.
        </p>
      </div>

      <div style={{ border: "1px solid var(--line)", background: "#fff" }} className="p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px]" style={{ fontWeight: 500, color: "var(--forest-dark)" }}>Anggota keluarga</p>
          <button className="btn btn-ghost" onClick={addAnggota}><Plus size={13} /> Tambah anggota</button>
        </div>
        {fam.anggota.length === 0 ? (
          <p className="text-[13px] italic" style={{ color: "var(--ink-soft)" }}>Belum ada anggota selain kepala keluarga.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {fam.anggota.map((a, idx) => (
              <div key={a.id} style={{ borderTop: idx === 0 ? "none" : "1px solid var(--line)", paddingTop: idx === 0 ? 0 : 16 }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px]" style={{ color: "var(--ink-soft)" }}>Anggota {idx + 1}</p>
                  <button onClick={() => removeAnggota(a.id)} aria-label="Hapus anggota" style={{ color: "var(--brick)" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Field label="Nama">
                    <input value={a.nama} onChange={(e) => updateAnggota(a.id, "nama", e.target.value)} />
                  </Field>
                  <Field label="NIK">
                    <input value={a.nik} onChange={(e) => updateAnggota(a.id, "nik", e.target.value)} className="f-mono" />
                  </Field>
                  <Field label="Hubungan">
                    <select value={a.relasi} onChange={(e) => updateAnggota(a.id, "relasi", e.target.value)}>
                      {RELASI.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Field>
                  <Field label="Jenis kelamin">
                    <select value={a.jenisKelamin} onChange={(e) => updateAnggota(a.id, "jenisKelamin", e.target.value)}>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </Field>
                  <Field label="Tempat lahir">
                    <input value={a.tempatLahir} onChange={(e) => updateAnggota(a.id, "tempatLahir", e.target.value)} placeholder="Kota/kabupaten lahir" />
                  </Field>
                  <Field label="Tanggal lahir">
                    <input type="date" value={a.tanggalLahir} onChange={(e) => updateAnggota(a.id, "tanggalLahir", e.target.value)} />
                  </Field>
                  <Field label="Pekerjaan">
                    <input value={a.pekerjaan} onChange={(e) => updateAnggota(a.id, "pekerjaan", e.target.value)} />
                  </Field>
                  <Field label="Pendidikan terakhir">
                    <select value={a.pendidikan} onChange={(e) => updateAnggota(a.id, "pendidikan", e.target.value)}>
                      <option value="">Pilih pendidikan</option>
                      {PENDIDIKAN.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>
                  <Field label="Status domisili">
                    <select value={a.domisili} onChange={(e) => updateAnggota(a.id, "domisili", e.target.value)}>
                      <option value="">Pilih status</option>
                      {STATUS_DOMISILI.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Status perkawinan">
                    <select value={a.statusPerkawinan} onChange={(e) => updateAnggota(a.id, "statusPerkawinan", e.target.value)}>
                      <option value="">Pilih status</option>
                      {STATUS_PERKAWINAN.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <div className="col-span-2 sm:col-span-3">
                    <Field label="Keterangan">
                      <input value={a.keterangan} onChange={(e) => updateAnggota(a.id, "keterangan", e.target.value)} placeholder="Catatan tambahan" />
                    </Field>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 text-[13px]" style={{ color: "var(--brick)" }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={handleSubmit}><Save size={14} /> Simpan data</button>
        <button className="btn btn-ghost" onClick={onCancel}>Batal</button>
      </div>
    </div>
  );
}

function ConfirmDialog({ nama, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center px-4" style={{ background: "rgba(30,42,34,0.35)", zIndex: 50 }}>
      <div style={{ background: "#fff", border: "1px solid var(--line)", maxWidth: 360 }} className="w-full p-5">
        <p className="text-[15px]" style={{ fontWeight: 500 }}>Hapus data keluarga?</p>
        <p className="text-[13.5px] mt-1.5" style={{ color: "var(--ink-soft)" }}>
          Data {nama || "keluarga ini"} beserta seluruh anggotanya akan dihapus permanen.
        </p>
        <div className="flex gap-2 mt-4">
          <button className="btn btn-danger" onClick={onConfirm}>Ya, hapus</button>
          <button className="btn btn-ghost" onClick={onCancel}>Batal</button>
        </div>
      </div>
    </div>
  );
}

function ChangeCodeDialog({ role, codes, onCancel, onSave }) {
  const [oldCode, setOldCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newBendahara, setNewBendahara] = useState("");
  const [error, setError] = useState("");

  function submit() {
    const ownKey = role === "pengurus" ? "pengurus" : "bendahara";
    if (oldCode !== codes[ownKey]) { setError("Kode saat ini salah."); return; }
    if (!newCode.trim()) { setError("Kode baru tidak boleh kosong."); return; }
    const next = { ...codes, [ownKey]: newCode.trim() };
    if (role === "pengurus" && newBendahara.trim()) {
      next.bendahara = newBendahara.trim();
    }
    onSave(next);
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4" style={{ background: "rgba(30,42,34,0.35)", zIndex: 50 }}>
      <div style={{ background: "#fff", border: "1px solid var(--line)", maxWidth: 360 }} className="w-full p-5">
        <p className="text-[15px]" style={{ fontWeight: 500 }}>{role === "pengurus" ? "Kode akses pengurus" : "Kode akses bendahara"}</p>
        <div className="flex flex-col gap-3 mt-3">
          <Field label="Kode saat ini">
            <input type="password" value={oldCode} onChange={(e) => setOldCode(e.target.value)} />
          </Field>
          <Field label="Kode baru">
            <input type="password" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
          </Field>
        </div>
        {role === "pengurus" && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
            <p className="text-[13px] mb-2" style={{ fontWeight: 500 }}>Atur ulang kode bendahara</p>
            <Field label="Kode bendahara baru (opsional)">
              <input type="password" value={newBendahara} onChange={(e) => setNewBendahara(e.target.value)} placeholder="Kosongkan jika tidak diubah" />
            </Field>
          </div>
        )}
        {error && <p className="text-[12.5px] mt-3" style={{ color: "var(--brick)" }}>{error}</p>}
        <div className="flex gap-2 mt-4">
          <button className="btn btn-primary" onClick={submit}>Simpan</button>
          <button className="btn btn-ghost" onClick={onCancel}>Batal</button>
        </div>
      </div>
    </div>
  );
}

function IuranView({ families, iuranRecords, tarif, persistIuran, persistTarif, role }) {
  const now = new Date();
  const [periode, setPeriode] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [tarifInput, setTarifInput] = useState(String(tarif));
  const canEdit = role === "pengurus" || role === "bendahara";

  useEffect(() => { setTarifInput(String(tarif)); }, [tarif]);

  const rows = families.map((f) => {
    const rec = iuranRecords.find((r) => r.familyId === f.id && r.periode === periode);
    return { family: f, rec, status: rec ? rec.status : "belum", nominal: rec ? rec.nominal : tarif, tanggalBayar: rec ? rec.tanggalBayar : null };
  });

  const totalLunas = rows.filter((r) => r.status === "lunas").length;
  const totalTerkumpul = rows.filter((r) => r.status === "lunas").reduce((s, r) => s + Number(r.nominal || 0), 0);

  function toggleStatus(row) {
    const { family, rec } = row;
    const next = iuranRecords.filter((r) => !(r.familyId === family.id && r.periode === periode));
    const isLunas = rec && rec.status === "lunas";
    next.push({
      id: rec ? rec.id : newId(),
      familyId: family.id,
      periode,
      nominal: rec ? rec.nominal : tarif,
      status: isLunas ? "belum" : "lunas",
      tanggalBayar: isLunas ? null : new Date().toISOString().slice(0, 10),
    });
    persistIuran(next);
  }

  function updateNominal(row, value) {
    const nominal = parseInt(value || 0, 10);
    const next = iuranRecords.filter((r) => !(r.familyId === row.family.id && r.periode === periode));
    next.push({ id: row.rec ? row.rec.id : newId(), familyId: row.family.id, periode, nominal, status: row.status, tanggalBayar: row.tanggalBayar });
    persistIuran(next);
  }

  function saveTarif() {
    const val = parseInt(tarifInput || 0, 10);
    if (!isNaN(val) && val >= 0) persistTarif(val);
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="f-serif text-[26px]" style={{ fontWeight: 550 }}>Iuran warga</h1>
        <p className="text-[13.5px] mt-1" style={{ color: "var(--ink-soft)" }}>Rekap iuran bulanan tiap keluarga.</p>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-2">
        <Field label="Periode">
          <input type="month" value={periode} onChange={(e) => setPeriode(e.target.value)} style={{ width: 170 }} />
        </Field>
        {canEdit && (
          <Field label="Tarif per bulan (Rp)">
            <div className="flex gap-2">
              <input type="number" value={tarifInput} onChange={(e) => setTarifInput(e.target.value)} style={{ width: 130 }} />
              <button className="btn btn-ghost" onClick={saveTarif}>Simpan</button>
            </div>
          </Field>
        )}
      </div>
      <p className="text-[12px] mb-5" style={{ color: "var(--ink-soft)" }}>{formatPeriode(periode)}</p>

      <div className="grid grid-cols-2 gap-3 mb-6 max-w-sm">
        <StatCard label="Sudah bayar" value={totalLunas} sub={`dari ${families.length} keluarga`} />
        <StatCard label="Terkumpul" value={formatRupiah(totalTerkumpul)} />
      </div>

      {families.length === 0 ? (
        <p className="text-[13.5px]" style={{ color: "var(--ink-soft)" }}>Belum ada data keluarga.</p>
      ) : (
        <div style={{ border: "1px solid var(--line)", background: "#fff" }}>
          {rows.map((row, i) => (
            <div key={row.family.id} className="flex items-center gap-3 px-4 py-3 flex-wrap" style={{ borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
              <div className="flex-1 min-w-[160px]">
                <p className="text-[14px]" style={{ fontWeight: 500 }}>{row.family.namaKK || "(nama belum diisi)"}</p>
                <p className="text-[12px]" style={{ color: "var(--ink-soft)" }}>{row.family.alamat}</p>
              </div>
              <span
                className="text-[11.5px] px-2 py-1"
                style={{
                  borderRadius: 3,
                  background: row.status === "lunas" ? "#E7EEE3" : "#F4E4DD",
                  color: row.status === "lunas" ? "var(--forest-dark)" : "var(--brick)",
                  fontWeight: 500,
                }}
              >
                {row.status === "lunas" ? "Lunas" : "Belum bayar"}
              </span>
              {canEdit ? (
                <input type="number" value={row.nominal} onChange={(e) => updateNominal(row, e.target.value)} style={{ width: 100 }} className="f-mono" />
              ) : (
                <p className="f-mono text-[12.5px]" style={{ width: 100 }}>{formatRupiah(row.nominal)}</p>
              )}
              {row.tanggalBayar && <p className="text-[12px]" style={{ color: "var(--ink-soft)" }}>Dibayar {row.tanggalBayar}</p>}
              {canEdit && (
                <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => toggleStatus(row)}>
                  {row.status === "lunas" ? "Tandai belum" : "Tandai lunas"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DasawismaView({ families, dasawisma, persistDasawisma, role }) {
  const [namaBaru, setNamaBaru] = useState("");
  const [ketuaBaru, setKetuaBaru] = useState("");
  const assignedIds = new Set(dasawisma.flatMap((g) => g.familyIds));

  function addGroup() {
    if (!namaBaru.trim()) return;
    persistDasawisma([...dasawisma, { id: newId(), nama: namaBaru.trim(), ketua: ketuaBaru.trim(), familyIds: [] }]);
    setNamaBaru("");
    setKetuaBaru("");
  }

  function deleteGroup(id) {
    persistDasawisma(dasawisma.filter((g) => g.id !== id));
  }

  function addFamily(groupId, familyId) {
    if (!familyId) return;
    persistDasawisma(dasawisma.map((g) => (g.id === groupId ? { ...g, familyIds: [...g.familyIds, familyId] } : g)));
  }

  function removeFamily(groupId, familyId) {
    persistDasawisma(dasawisma.map((g) => (g.id === groupId ? { ...g, familyIds: g.familyIds.filter((id) => id !== familyId) } : g)));
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="f-serif text-[26px]" style={{ fontWeight: 550 }}>Kelompok dasawisma</h1>
        <p className="text-[13.5px] mt-1" style={{ color: "var(--ink-soft)" }}>Pembagian rumah tangga ke dalam kelompok dasawisma.</p>
      </div>

      {role === "pengurus" && (
        <div style={{ border: "1px solid var(--line)", background: "#fff" }} className="p-4 mb-6 flex flex-wrap items-end gap-3">
          <Field label="Nama kelompok">
            <input value={namaBaru} onChange={(e) => setNamaBaru(e.target.value)} placeholder="Dasawisma I" style={{ width: 180 }} />
          </Field>
          <Field label="Ketua kelompok">
            <input value={ketuaBaru} onChange={(e) => setKetuaBaru(e.target.value)} placeholder="Nama ketua" style={{ width: 180 }} />
          </Field>
          <button className="btn btn-primary" onClick={addGroup}><Plus size={14} /> Tambah kelompok</button>
        </div>
      )}

      {dasawisma.length === 0 ? (
        <p className="text-[13.5px]" style={{ color: "var(--ink-soft)" }}>Belum ada kelompok dasawisma.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {dasawisma.map((g) => {
            const anggota = families.filter((f) => g.familyIds.includes(f.id));
            const available = families.filter((f) => !assignedIds.has(f.id));
            return (
              <div key={g.id} style={{ border: "1px solid var(--line)", background: "#fff" }} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[15px]" style={{ fontWeight: 500 }}>{g.nama}</p>
                    {g.ketua && <p className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>Ketua: {g.ketua}</p>}
                  </div>
                  {role === "pengurus" && (
                    <button onClick={() => deleteGroup(g.id)} aria-label="Hapus kelompok" style={{ color: "var(--brick)" }}><Trash2 size={14} /></button>
                  )}
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  {anggota.length === 0 ? (
                    <p className="text-[13px] italic" style={{ color: "var(--ink-soft)" }}>Belum ada anggota.</p>
                  ) : (
                    anggota.map((f) => (
                      <div key={f.id} className="flex items-center justify-between text-[13.5px] py-1">
                        <span>{f.namaKK}</span>
                        {role === "pengurus" && (
                          <button onClick={() => removeFamily(g.id, f.id)} aria-label="Keluarkan" style={{ color: "var(--ink-soft)" }}><X size={13} /></button>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {role === "pengurus" && available.length > 0 && (
                  <select value="" onChange={(e) => addFamily(g.id, e.target.value)} className="mt-3" style={{ maxWidth: 240 }}>
                    <option value="">Tambah keluarga ke kelompok...</option>
                    {available.map((f) => <option key={f.id} value={f.id}>{f.namaKK}</option>)}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PengumumanView({ pengumuman, persistPengumuman, role }) {
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [kategori, setKategori] = useState("Pengumuman");
  const [tanggalKegiatan, setTanggalKegiatan] = useState("");

  function submit() {
    if (!judul.trim()) return;
    const item = {
      id: newId(),
      judul: judul.trim(),
      isi: isi.trim(),
      kategori,
      tanggalKegiatan: kategori === "Agenda" ? tanggalKegiatan : "",
      tanggalPosting: new Date().toISOString().slice(0, 10),
    };
    persistPengumuman([item, ...pengumuman]);
    setJudul(""); setIsi(""); setKategori("Pengumuman"); setTanggalKegiatan("");
  }

  function remove(id) {
    persistPengumuman(pengumuman.filter((p) => p.id !== id));
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="f-serif text-[26px]" style={{ fontWeight: 550 }}>Pengumuman &amp; agenda</h1>
        <p className="text-[13.5px] mt-1" style={{ color: "var(--ink-soft)" }}>Info terbaru dan kegiatan RT.</p>
      </div>

      {role === "pengurus" && (
        <div style={{ border: "1px solid var(--line)", background: "#fff" }} className="p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Field label="Judul">
              <input value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Judul pengumuman" />
            </Field>
            <Field label="Jenis">
              <select value={kategori} onChange={(e) => setKategori(e.target.value)}>
                <option value="Pengumuman">Pengumuman</option>
                <option value="Agenda">Agenda kegiatan</option>
              </select>
            </Field>
          </div>
          {kategori === "Agenda" && (
            <div className="mb-3 max-w-[200px]">
              <Field label="Tanggal kegiatan">
                <input type="date" value={tanggalKegiatan} onChange={(e) => setTanggalKegiatan(e.target.value)} />
              </Field>
            </div>
          )}
          <Field label="Isi">
            <textarea rows={3} value={isi} onChange={(e) => setIsi(e.target.value)} placeholder="Detail pengumuman atau kegiatan" />
          </Field>
          <button className="btn btn-primary mt-3" onClick={submit}><Plus size={14} /> Terbitkan</button>
        </div>
      )}

      {pengumuman.length === 0 ? (
        <p className="text-[13.5px]" style={{ color: "var(--ink-soft)" }}>Belum ada pengumuman.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {pengumuman.map((p) => (
            <div key={p.id} style={{ border: "1px solid var(--line)", borderLeft: `3px solid ${p.kategori === "Agenda" ? "var(--gold)" : "var(--forest)"}`, background: "#fff" }} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span
                    className="text-[11px] px-2 py-0.5"
                    style={{ borderRadius: 3, background: p.kategori === "Agenda" ? "#F1E6CF" : "#E7EEE3", color: p.kategori === "Agenda" ? "#7A5A20" : "var(--forest-dark)", fontWeight: 500 }}
                  >
                    {p.kategori}
                  </span>
                  <p className="f-serif text-[17px] mt-2" style={{ fontWeight: 550 }}>{p.judul}</p>
                </div>
                {role === "pengurus" && (
                  <button onClick={() => remove(p.id)} aria-label="Hapus" style={{ color: "var(--brick)", flexShrink: 0 }}><Trash2 size={14} /></button>
                )}
              </div>
              {p.isi && <p className="text-[13.5px] mt-2" style={{ color: "var(--ink)" }}>{p.isi}</p>}
              <div className="flex gap-4 mt-3 text-[12px] flex-wrap" style={{ color: "var(--ink-soft)" }}>
                <span>Diposting {p.tanggalPosting}</span>
                {p.tanggalKegiatan && <span className="flex items-center gap-1"><CalendarDays size={12} /> Kegiatan {p.tanggalKegiatan}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
