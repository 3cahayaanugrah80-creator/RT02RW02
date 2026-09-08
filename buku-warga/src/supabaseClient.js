// ============================================================
// Penghubung ke database Supabase.
// Isi dua nilai di bawah ini dengan Project URL dan
// Publishable/anon key dari Project Settings > API di Supabase.
// ============================================================
const SUPABASE_URL = "https://ISI-PROJECT-URL-KAMU.supabase.co";
const SUPABASE_KEY = "ISI-PUBLISHABLE-ATAU-ANON-KEY-KAMU";

async function sb(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase ${method} ${path} gagal (${res.status}): ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ---------- mapping baris database <-> objek aplikasi ----------

function familyFromRow(row) {
  return {
    id: row.id,
    noKK: row.no_kk || "",
    namaKK: row.nama_kk || "",
    jenisKelaminKK: row.jenis_kelamin_kk || "L",
    nikKK: row.nik_kk || "",
    tempatLahirKK: row.tempat_lahir_kk || "",
    tanggalLahirKK: row.tanggal_lahir_kk || "",
    pekerjaanKK: row.pekerjaan_kk || "",
    pendidikanKK: row.pendidikan_kk || "",
    domisiliKK: row.domisili_kk || "",
    statusPerkawinanKK: row.status_perkawinan_kk || "",
    keteranganKK: row.keterangan_kk || "",
    alamat: row.alamat || "",
    lingkungan: row.lingkungan || "",
    rt: row.rt || "",
    rw: row.rw || "",
    telepon: row.telepon || "",
    lat: row.lat === null || row.lat === undefined ? "" : String(row.lat),
    lng: row.lng === null || row.lng === undefined ? "" : String(row.lng),
    anggota: (row.anggota || []).map(anggotaFromRow),
  };
}

function anggotaFromRow(row) {
  return {
    id: row.id,
    nama: row.nama || "",
    nik: row.nik || "",
    relasi: row.relasi || "Anak",
    jenisKelamin: row.jenis_kelamin || "L",
    tempatLahir: row.tempat_lahir || "",
    tanggalLahir: row.tanggal_lahir || "",
    pekerjaan: row.pekerjaan || "",
    pendidikan: row.pendidikan || "",
    domisili: row.domisili || "",
    statusPerkawinan: row.status_perkawinan || "",
    keterangan: row.keterangan || "",
  };
}

function familyToRow(f) {
  return {
    id: f.id,
    no_kk: f.noKK || null,
    nama_kk: f.namaKK || "",
    jenis_kelamin_kk: f.jenisKelaminKK || null,
    nik_kk: f.nikKK || null,
    tempat_lahir_kk: f.tempatLahirKK || null,
    tanggal_lahir_kk: f.tanggalLahirKK || null,
    pekerjaan_kk: f.pekerjaanKK || null,
    pendidikan_kk: f.pendidikanKK || null,
    domisili_kk: f.domisiliKK || null,
    status_perkawinan_kk: f.statusPerkawinanKK || null,
    keterangan_kk: f.keteranganKK || null,
    alamat: f.alamat || null,
    lingkungan: f.lingkungan || null,
    rt: f.rt || null,
    rw: f.rw || null,
    telepon: f.telepon || null,
    lat: f.lat === "" || f.lat === undefined ? null : parseFloat(f.lat),
    lng: f.lng === "" || f.lng === undefined ? null : parseFloat(f.lng),
  };
}

function anggotaToRow(a, familyId) {
  return {
    id: a.id,
    family_id: familyId,
    nama: a.nama || "",
    nik: a.nik || null,
    relasi: a.relasi || null,
    jenis_kelamin: a.jenisKelamin || null,
    tempat_lahir: a.tempatLahir || null,
    tanggal_lahir: a.tanggalLahir || null,
    pekerjaan: a.pekerjaan || null,
    pendidikan: a.pendidikan || null,
    domisili: a.domisili || null,
    status_perkawinan: a.statusPerkawinan || null,
    keterangan: a.keterangan || null,
  };
}

function iuranFromRow(row) {
  return {
    id: row.id,
    familyId: row.family_id,
    periode: row.periode,
    nominal: row.nominal,
    status: row.status,
    tanggalBayar: row.tanggal_bayar,
  };
}

function iuranToRow(r) {
  return {
    id: r.id,
    family_id: r.familyId,
    periode: r.periode,
    nominal: r.nominal,
    status: r.status,
    tanggal_bayar: r.tanggalBayar || null,
  };
}

function pengumumanFromRow(row) {
  return {
    id: row.id,
    judul: row.judul,
    isi: row.isi || "",
    kategori: row.kategori,
    tanggalPosting: row.tanggal_posting,
    tanggalKegiatan: row.tanggal_kegiatan || "",
  };
}

function pengumumanToRow(p) {
  return {
    id: p.id,
    judul: p.judul,
    isi: p.isi || null,
    kategori: p.kategori,
    tanggal_posting: p.tanggalPosting,
    tanggal_kegiatan: p.tanggalKegiatan || null,
  };
}

// ---------- fungsi tingkat tinggi dipakai oleh App.jsx ----------

export async function loadAll() {
  const [familyRows, dasawismaRows, iuranRows, pengumumanRows, pengaturanRows] = await Promise.all([
    sb("families?select=*,anggota(*)&order=created_at.asc"),
    sb("dasawisma?select=*,dasawisma_anggota(family_id)"),
    sb("iuran?select=*"),
    sb("pengumuman?select=*&order=tanggal_posting.desc"),
    sb("pengaturan?select=*"),
  ]);

  const families = (familyRows || []).map(familyFromRow);
  const iuranRecords = (iuranRows || []).map(iuranFromRow);
  const pengumuman = (pengumumanRows || []).map(pengumumanFromRow);
  const dasawisma = (dasawismaRows || []).map((g) => ({
    id: g.id,
    nama: g.nama,
    ketua: g.ketua || "",
    familyIds: (g.dasawisma_anggota || []).map((r) => r.family_id),
  }));

  const settings = {};
  (pengaturanRows || []).forEach((r) => { settings[r.key] = r.value; });
  const tarif = parseInt(settings.tarif_iuran || "20000", 10);
  const accessCode = {
    pengurus: settings.kode_pengurus || "RT2026",
    bendahara: settings.kode_bendahara || "IURAN2026",
  };

  return { families, iuranRecords, tarif, dasawisma, pengumuman, accessCode };
}

// ---- keluarga ----
export async function saveFamily(fam) {
  await sb("families", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: [familyToRow(fam)] });
  const existing = await sb(`anggota?family_id=eq.${fam.id}&select=id`);
  const existingIds = new Set((existing || []).map((r) => r.id));
  const currentIds = new Set(fam.anggota.map((a) => a.id));
  const toDelete = [...existingIds].filter((id) => !currentIds.has(id));
  if (toDelete.length) {
    await sb(`anggota?id=in.(${toDelete.join(",")})`, { method: "DELETE" });
  }
  if (fam.anggota.length) {
    await sb("anggota", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: fam.anggota.map((a) => anggotaToRow(a, fam.id)),
    });
  }
}

export async function deleteFamily(id) {
  await sb(`families?id=eq.${id}`, { method: "DELETE" });
}

// ---- iuran ----
export async function upsertIuran(record) {
  await sb("iuran", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: [iuranToRow(record)] });
}

export async function deleteIuranRecord(id) {
  await sb(`iuran?id=eq.${id}`, { method: "DELETE" });
}

// ---- dasawisma ----
export async function upsertDasawismaGroup(group) {
  await sb("dasawisma", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: [{ id: group.id, nama: group.nama, ketua: group.ketua || null }],
  });
  const existing = await sb(`dasawisma_anggota?dasawisma_id=eq.${group.id}&select=family_id`);
  const existingIds = new Set((existing || []).map((r) => r.family_id));
  const currentIds = new Set(group.familyIds);
  const toAdd = group.familyIds.filter((id) => !existingIds.has(id));
  const toRemove = [...existingIds].filter((id) => !currentIds.has(id));
  if (toAdd.length) {
    await sb("dasawisma_anggota", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: toAdd.map((familyId) => ({ dasawisma_id: group.id, family_id: familyId })),
    });
  }
  for (const familyId of toRemove) {
    await sb(`dasawisma_anggota?dasawisma_id=eq.${group.id}&family_id=eq.${familyId}`, { method: "DELETE" });
  }
}

export async function deleteDasawismaGroup(id) {
  await sb(`dasawisma?id=eq.${id}`, { method: "DELETE" });
}

// ---- pengumuman ----
export async function upsertPengumuman(item) {
  await sb("pengumuman", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: [pengumumanToRow(item)] });
}

export async function deletePengumumanItem(id) {
  await sb(`pengumuman?id=eq.${id}`, { method: "DELETE" });
}

// ---- pengaturan ----
export async function setPengaturan(key, value) {
  await sb("pengaturan", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: [{ key, value: String(value) }] });
}
