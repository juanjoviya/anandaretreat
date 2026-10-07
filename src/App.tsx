import React, { useState } from "react";
import { complete } from "./openai";

interface FormData {
  nombre: string; edad: string; email: string; telefono: string;
  dolencias: string; sintomas: string; objetivos: string;
  duracion: string; experienciaPrevia: string;
}

interface BudgetResult {
  nombre: string; fecha: string; email: string; telefono: string; duracion: string;
  resumen: string;
  terapias: { nombre: string; descripcion: string; sesiones: number; precio: number }[];
  alojamiento: { tipo: string; noches: number; precio: number };
  alimentacion: { tipo: string; dias: number; precio: number };
  total: number; recomendaciones: string[]; nota: string;
}

const presupuestosRegistro: BudgetResult[] = [];

const DURACIONES: Record<string, number> = {
  "1 día": 1, "2 días": 2, "3 días": 3, "4 días": 4, "5 días": 5,
};

export default function App() {
  const [step, setStep] = useState<"form" | "loading" | "result" | "admin">("form");
  const [loadingStep, setLoadingStep] = useState(0);
  const [adminPin, setAdminPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [registro, setRegistro] = useState<BudgetResult[]>(presupuestosRegistro);
  const [selectedPresupuesto, setSelectedPresupuesto] = useState<BudgetResult | null>(null);
  const [form, setForm] = useState<FormData>({
    nombre: "", edad: "", email: "", telefono: "",
    dolencias: "", sintomas: "", objetivos: "",
    duracion: "3 días", experienciaPrevia: "No",
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<BudgetResult | null>(null);
  const [error, setError] = useState("");

  const getShareText = (r: BudgetResult) =>
    `🌿 PRESUPUESTO ANANDA RETREAT\n\n👤 ${r.nombre}\n📅 ${r.fecha}\n⏱ Retiro de ${r.duracion}\n\n${r.resumen}\n\n🧘 TERAPIAS:\n${r.terapias.map(t => `• ${t.nombre} (${t.sesiones} ses.) — ${(t.sesiones * t.precio).toLocaleString("es-PY")} Gs`).join("\n")}\n\n🏡 Alojamiento (${r.alojamiento.noches} noches): ${r.alojamiento.precio.toLocaleString("es-PY")} Gs\n🥗 Alimentación (${r.alimentacion.dias} días): ${r.alimentacion.precio.toLocaleString("es-PY")} Gs\n\n💰 TOTAL: ${r.total.toLocaleString("es-PY")} Gs\n\n📞 Consultas y reservas: +595 982 818 069`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.nombre.trim()) return "Por favor ingresa tu nombre completo.";
    if (!form.edad.trim()) return "Por favor ingresa tu edad.";
    if (!form.email.trim()) return "Por favor ingresa tu correo electrónico.";
    if (!form.dolencias.trim()) return "Por favor describe tus dolencias o condiciones.";
    if (!form.objetivos.trim()) return "Por favor describe qué deseas lograr.";
    return "";
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setStep("loading");
    setLoadingStep(0);
    const steps = [0, 1, 2, 3];
    steps.forEach((s, i) => setTimeout(() => setLoadingStep(s), i * 2200));

    const prompt = `Eres el director médico de "Ananda Retreat", un centro de retiro terapéutico de medicina integrativa de alto nivel en Paraguay.
Un paciente ha completado su formulario de admisión. Genera un presupuesto de retiro personalizado en formato JSON estricto.

DATOS DEL PACIENTE:
- Nombre: ${form.nombre}
- Edad: ${form.edad} años
- Email: ${form.email}
- Teléfono: ${form.telefono || "No proporcionado"}
- Dolencias/Condiciones: ${form.dolencias}
- Síntomas actuales: ${form.sintomas || "No especificados"}
- Objetivos terapéuticos: ${form.objetivos}
- Duración deseada: ${form.duracion}
- Experiencia previa con terapias alternativas: ${form.experienciaPrevia}

TERAPIAS DISPONIBLES EN EL CENTRO (usa SOLO estas):
1. Consulta médica integrativa / funcional (incluye auriculoterapia) — Gs. 300.000 por sesión
2. Consulta de nutrición funcional — Gs. 280.000 por sesión
3. Masaje Ayurvédico — Gs. 250.000 por sesión
4. Terapia Marma — Gs. 170.000 por sesión
5. Meru Chikitsa — Gs. 170.000 por sesión
6. Yoga Terapéutico — Gs. 100.000 por sesión
7. Yin Yoga Restaurativo — Gs. 100.000 por sesión
8. Respiración y Meditación Guiada — Gs. 100.000 por sesión
9. Tai Chi — Gs. 150.000 por sesión
10. Aerial Yoga — Gs. 50.000 por sesión
11. Reiki — Gs. 200.000 por sesión

REGLAS IMPORTANTES:
1. FRECUENCIA: Cada terapia solo puede realizarse UNA VEZ POR SEMANA. El retiro dura ${DURACIONES[form.duracion] ?? 3} días (${Math.ceil((DURACIONES[form.duracion] ?? 3) / 7)} semana/s). Número máximo de sesiones por terapia: ${Math.ceil((DURACIONES[form.duracion] ?? 3) / 7)}. Nunca asignes más sesiones que ese número.
2. LÍMITE DIARIO: Máximo 2 terapias por día. Con ${DURACIONES[form.duracion] ?? 3} días de retiro, el total máximo de sesiones entre todas las terapias es ${(DURACIONES[form.duracion] ?? 3) * 2}. La suma de todas las sesiones asignadas NO debe superar ese número.
3. CANTIDAD: Seleccioná entre 4 y 6 terapias de la lista, las más adecuadas para los síntomas del paciente.

CRITERIO DE SELECCIÓN: Analizá cuidadosamente los síntomas y dolencias del paciente. Seleccioná las terapias más adecuadas y beneficiosas para SUS condiciones específicas.

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta (sin texto adicional, sin markdown):
{
  "resumen": "párrafo de 2-3 oraciones personalizadas",
  "terapias": [
    {"nombre": "nombre exacto", "descripcion": "descripción breve 1 oración", "sesiones": número, "precio": número exacto en Guaraníes}
  ],
  "alojamiento": {"tipo": "tipo de habitación", "noches": número, "precio": número total},
  "alimentacion": {"tipo": "descripción del plan", "dias": número, "precio": número total},
  "recomendaciones": ["rec 1", "rec 2", "rec 3", "rec 4"],
  "nota": "nota médica 1-2 oraciones"
}

Para alojamiento: 400.000 Gs por noche (fijo). Para alimentación: 180.000 Gs por día (3 comidas × 60.000 Gs).`;

    try {
      const { response } = await complete([{ role: "user", content: prompt }]);
      let jsonStr = response.trim();
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) jsonStr = match[0];
      const data = JSON.parse(jsonStr);
      const totalTerapias = data.terapias.reduce((s: number, t: any) => s + t.precio * t.sesiones, 0);
      const total = totalTerapias + data.alojamiento.precio + data.alimentacion.precio;
      const newResult: BudgetResult = {
        nombre: form.nombre,
        fecha: new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" }),
        email: form.email, telefono: form.telefono || "No proporcionado",
        duracion: form.duracion, resumen: data.resumen, terapias: data.terapias,
        alojamiento: data.alojamiento, alimentacion: data.alimentacion,
        total, recomendaciones: data.recomendaciones, nota: data.nota,
      };
      presupuestosRegistro.push(newResult);
      setRegistro([...presupuestosRegistro]);
      setResult(newResult);
      setStep("result");

      fetch("https://hook.us2.make.com/faouykqs46cmdollfhiqu1k4k25dfmgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: newResult.fecha,
          nombre: newResult.nombre,
          email: newResult.email,
          telefono: newResult.telefono,
          duracion: newResult.duracion,
          total: newResult.total.toLocaleString("es-PY") + " Gs",
          terapias: newResult.terapias.map(t => `${t.nombre} ×${t.sesiones}`).join(", "),
        }),
      }).catch(() => {});

    } catch (e) {
      setError("Ocurrió un error al generar el presupuesto. Por favor intenta de nuevo.");
      setStep("form");
    }
  };

  const handleReset = () => {
    setStep("form"); setResult(null); setLoadingStep(0);
    setForm({ nombre: "", edad: "", email: "", telefono: "", dolencias: "", sintomas: "", objetivos: "", duracion: "3 días", experienciaPrevia: "No" });
  };

  const handleAdminAccess = () => {
    if (adminPin === "1804") {
      setPinError(false); setShowPinModal(false); setAdminPin(""); setStep("admin");
    } else { setPinError(true); }
  };

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      {showPinModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs">
            <h3 className="text-base font-semibold text-stone-800 mb-1">Acceso Administrador</h3>
            <p className="text-sm text-stone-500 mb-4">Ingresá el PIN para ver el registro de presupuestos.</p>
            <input type="password" value={adminPin}
              onChange={e => { setAdminPin(e.target.value); setPinError(false); }}
              onKeyDown={e => e.key === "Enter" && handleAdminAccess()}
              className="w-full px-3 py-2.5 border-2 border-stone-200 rounded-lg text-base focus:border-teal-500 focus:outline-none mb-2"
              placeholder="••••" maxLength={6} />
            {pinError && <p className="text-red-500 text-sm mb-2">PIN incorrecto.</p>}
            <div className="flex gap-2 mt-2">
              <button onClick={handleAdminAccess} className="flex-1 py-2 bg-teal-700 text-white font-semibold rounded-lg text-sm">Ingresar</button>
              <button onClick={() => { setShowPinModal(false); setAdminPin(""); setPinError(false); }} className="flex-1 py-2 bg-stone-100 text-stone-700 font-semibold rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <header className="text-center mb-8">
        <div className="flex items-center justify-center mb-3">
          <img src="https://i.postimg.cc/vcVmrf4v/ananda-logo.jpg" alt="Ananda Retreat logo"
            className="w-24 h-24 rounded-full object-cover border-2 border-teal-200 shadow-sm"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">Ananda Retreat</h1>
        <p className="text-stone-500 text-sm mt-1">Centro de Retiro Terapéutico · Medicina Integrativa</p>
        <a href="tel:+595982818069" className="inline-flex items-center gap-1 mt-2 text-teal-700 text-sm font-medium">📞 +595 982 818 069</a>
        <div className="mt-3 h-px bg-stone-200 max-w-md mx-auto" />
        <button onClick={() => setShowPinModal(true)} className="mt-3 text-xs text-stone-300 hover:text-stone-400">⚙ Admin</button>
      </header>

      <div className="max-w-2xl mx-auto">
        {step === "admin" && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-semibold text-stone-800">Registro de Presupuestos</h2>
                <p className="text-stone-500 text-sm">{registro.length} presupuesto{registro.length !== 1 ? "s" : ""} en esta sesión</p>
              </div>
              <button onClick={() => { setStep("form"); setSelectedPresupuesto(null); }} className="py-2 px-4 bg-stone-100 text-stone-700 font-semibold rounded-xl text-sm">← Volver</button>
            </div>
            {registro.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-stone-500 text-sm">Aún no se generaron presupuestos en esta sesión.</p>
                <p className="text-stone-400 text-xs mt-2">Los presupuestos de todos los usuarios se guardan en tu Google Sheets.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {registro.map((p, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-stone-200 p-5 cursor-pointer hover:border-teal-300 transition-all"
                    onClick={() => setSelectedPresupuesto(selectedPresupuesto === p ? null : p)}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-stone-800">{p.nombre}</p>
                        <p className="text-stone-500 text-sm mt-0.5">📧 {p.email} · 📞 {p.telefono}</p>
                        <p className="text-stone-400 text-xs mt-1">📅 {p.fecha} · ⏱ {p.duracion}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-teal-700 text-lg">{p.total.toLocaleString("es-PY")} Gs</p>
                        <p className="text-xs text-stone-400">{p.terapias.length} terapias</p>
                      </div>
                    </div>
                    {selectedPresupuesto === p && (
                      <div className="mt-4 pt-4 border-t border-stone-100">
                        <p className="text-sm text-stone-600 mb-3">{p.resumen}</p>
                        <div className="space-y-1 mb-3">
                          {p.terapias.map((t, j) => (
                            <div key={j} className="flex justify-between text-sm">
                              <span className="text-stone-700">{t.nombre} <span className="text-stone-400">×{t.sesiones}</span></span>
                              <span className="font-medium">{(t.sesiones * t.precio).toLocaleString("es-PY")} Gs</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm pt-1 border-t border-stone-100">
                            <span className="text-stone-500">Alojamiento ({p.alojamiento.noches} noches)</span>
                            <span>{p.alojamiento.precio.toLocaleString("es-PY")} Gs</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-stone-500">Alimentación ({p.alimentacion.dias} días)</span>
                            <span>{p.alimentacion.precio.toLocaleString("es-PY")} Gs</span>
                          </div>
                        </div>
                        <div className="flex justify-between font-bold text-teal-800 pt-2 border-t border-teal-100">
                          <span>Total</span><span>{p.total.toLocaleString("es-PY")} Gs</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-teal-800 font-semibold text-sm">Total acumulado (sesión)</p>
                    <p className="text-teal-600 text-xs">{registro.length} presupuesto{registro.length !== 1 ? "s" : ""}</p>
                  </div>
                  <p className="text-2xl font-bold text-teal-800">{registro.reduce((s, p) => s + p.total, 0).toLocaleString("es-PY")} <span className="text-sm font-normal">Gs</span></p>
                </div>
              </div>
            )}
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <p className="text-blue-800 font-semibold text-sm">Registro completo en Google Sheets</p>
                <p className="text-blue-600 text-xs mt-0.5">Todos los presupuestos se guardan automáticamente en tu hoja de cálculo.</p>
              </div>
            </div>
          </div>
        )}

        {step === "form" && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-stone-800 mb-1">Solicitud de Presupuesto Personalizado</h2>
            <p className="text-stone-500 text-sm mb-6">Completa el formulario y nuestra IA diseñará un programa terapéutico a tu medida.</p>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
            <fieldset className="mb-6">
              <legend className="text-xs font-semibold uppercase tracking-widest text-teal-700 mb-3">Datos Personales</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: "nombre", label: "Nombre completo *", placeholder: "Ej. María González", type: "text" },
                  { name: "edad", label: "Edad *", placeholder: "Ej. 42", type: "number" },
                  { name: "email", label: "Correo electrónico *", placeholder: "correo@ejemplo.com", type: "email" },
                  { name: "telefono", label: "Teléfono", placeholder: "+595 982 818 069", type: "text" },
                ].map(f => (
                  <div key={f.name}>
                    <label className="block text-base font-medium text-stone-700 mb-1">{f.label}</label>
                    <input name={f.name} value={(form as any)[f.name]} onChange={handleChange} type={f.type}
                      className="w-full px-3 py-2.5 border-2 border-stone-200 rounded-lg text-base focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all"
                      placeholder={f.placeholder} />
                  </div>
                ))}
              </div>
            </fieldset>
            <fieldset className="mb-6">
              <legend className="text-xs font-semibold uppercase tracking-widest text-teal-700 mb-3">Información de Salud</legend>
              <div className="space-y-4">
                <div>
                  <label className="block text-base font-medium text-stone-700 mb-1">¿Qué problema de salud te trae aquí? *</label>
                  <p className="text-sm text-stone-400 mb-1.5">Contanos qué condición, enfermedad o malestar querés tratar. No hace falta usar términos médicos.</p>
                  <textarea name="dolencias" value={form.dolencias} onChange={handleChange} rows={3}
                    className="w-full px-3 py-2.5 border-2 border-stone-200 rounded-lg text-base focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none resize-none transition-all"
                    placeholder="Ej. Tengo mucho estrés en el trabajo, me duele la espalda hace meses..." />
                </div>
                <div>
                  <label className="block text-base font-medium text-stone-700 mb-1">¿Cómo te sentís día a día?</label>
                  <p className="text-sm text-stone-400 mb-1.5">Describí cómo ese problema afecta tu vida cotidiana: tu energía, tu humor, tu cuerpo.</p>
                  <textarea name="sintomas" value={form.sintomas} onChange={handleChange} rows={2}
                    className="w-full px-3 py-2.5 border-2 border-stone-200 rounded-lg text-base focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none resize-none transition-all"
                    placeholder="Ej. Me despierto cansado, me cuesta concentrarme..." />
                </div>
                <div>
                  <label className="block text-base font-medium text-stone-700 mb-1">¿Qué deseas lograr con el retiro? *</label>
                  <p className="text-sm text-stone-400 mb-1.5">Contanos qué cambio o mejora esperás sentir al terminar el programa.</p>
                  <textarea name="objetivos" value={form.objetivos} onChange={handleChange} rows={3}
                    className="w-full px-3 py-2.5 border-2 border-stone-200 rounded-lg text-base focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none resize-none transition-all"
                    placeholder="Ej. Quiero descansar de verdad, salir con más energía..." />
                </div>
              </div>
            </fieldset>
            <fieldset className="mb-8">
              <legend className="text-xs font-semibold uppercase tracking-widest text-teal-700 mb-3">Preferencias del Retiro</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-medium text-stone-700 mb-1">Duración del retiro</label>
                  <select name="duracion" value={form.duracion} onChange={handleChange}
                    className="w-full px-3 py-2.5 border-2 border-stone-200 rounded-lg text-base focus:border-teal-500 focus:outline-none bg-white transition-all">
                    {Object.keys(DURACIONES).map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-base font-medium text-stone-700 mb-1">Experiencia previa con terapias alternativas</label>
                  <select name="experienciaPrevia" value={form.experienciaPrevia} onChange={handleChange}
                    className="w-full px-3 py-2.5 border-2 border-stone-200 rounded-lg text-base focus:border-teal-500 focus:outline-none bg-white transition-all">
                    <option>No</option>
                    <option>Poca (1-2 experiencias)</option>
                    <option>Moderada (varias sesiones)</option>
                    <option>Amplia (practicante regular)</option>
                  </select>
                </div>
              </div>
            </fieldset>
            <button onClick={handleSubmit} className="w-full py-3 bg-teal-700 text-white font-semibold rounded-xl hover:bg-teal-800 transition text-base">
              ✨ Generar mi Presupuesto Personalizado
            </button>
            <p className="text-center text-xs text-stone-400 mt-3">Tu información es confidencial y solo se usa para personalizar tu programa.</p>
          </div>
        )}

        {step === "loading" && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-10 text-center">
            <div className="text-5xl mb-5 animate-pulse">🌿</div>
            <h2 className="text-xl font-semibold text-stone-800 mb-2">Diseñando tu programa terapéutico…</h2>
            <p className="text-stone-500 text-sm mb-8">Esto toma entre 15 y 30 segundos. Por favor no cierres esta pantalla.</p>
            {[
              { label: "Analizando tu perfil de salud", icon: "🔍" },
              { label: "Seleccionando terapias personalizadas", icon: "🧘" },
              { label: "Calculando costos del retiro", icon: "📋" },
              { label: "Preparando recomendaciones", icon: "💡" },
            ].map((s, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-2 transition-all duration-500 ${i < loadingStep ? "bg-teal-50 text-teal-700" : i === loadingStep ? "bg-teal-100 text-teal-800 font-medium" : "bg-stone-50 text-stone-400"}`}>
                <span className="text-lg">{i < loadingStep ? "✅" : i === loadingStep ? s.icon : "⏳"}</span>
                <span className="text-sm">{s.label}</span>
                {i === loadingStep && (
                  <span className="ml-auto flex gap-0.5">
                    {[0,1,2].map(d => <span key={d} className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce inline-block" style={{ animationDelay: `${d * 0.15}s` }} />)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {step === "result" && result && (
          <div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-emerald-800 font-semibold text-sm">Presupuesto registrado</p>
                <p className="text-emerald-700 text-xs mt-0.5">Tu solicitud fue recibida por nuestro equipo. Nos pondremos en contacto a la brevedad.</p>
              </div>
            </div>
            <div className="bg-teal-800 text-white rounded-2xl p-6 sm:p-8 mb-4">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <p className="text-teal-300 text-xs uppercase tracking-widest mb-1">Presupuesto de Retiro Terapéutico</p>
                  <h2 className="text-2xl sm:text-3xl font-bold">{result.nombre}</h2>
                  <p className="text-teal-200 text-sm mt-1">{result.fecha}</p>
                </div>
                <span className="text-4xl">🌿</span>
              </div>
              <p className="mt-4 text-teal-100 text-sm leading-relaxed">{result.resumen}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8 mb-4">
              <h3 className="text-base font-semibold text-stone-800 mb-1 flex items-center gap-2"><span>🧘</span> Programa Terapéutico Recomendado</h3>
              <p className="text-sm text-stone-400 mb-4">Cada terapia fue seleccionada específicamente para tu perfil de salud.</p>
              <div className="space-y-3">
                {result.terapias.map((t, i) => (
                  <div key={i} className="py-3 border-b border-stone-100 last:border-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-stone-800 text-base">{t.nombre}</p>
                        <p className="text-stone-500 text-sm mt-1 leading-relaxed">{t.descripcion}</p>
                        <p className="text-teal-700 text-sm mt-1.5">{t.sesiones} sesión{t.sesiones > 1 ? "es" : ""} × {t.precio.toLocaleString("es-PY")} Gs</p>
                      </div>
                      <p className="font-bold text-stone-800 text-base whitespace-nowrap">{(t.sesiones * t.precio).toLocaleString("es-PY")} Gs</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5">
                <h3 className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-2"><span>🏡</span> Alojamiento</h3>
                <p className="text-stone-700 text-sm font-medium">{result.alojamiento.tipo}</p>
                <p className="text-stone-500 text-xs mt-1">{result.alojamiento.noches} noches</p>
                <p className="text-teal-700 font-bold text-lg mt-2">{result.alojamiento.precio.toLocaleString("es-PY")} Gs</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5">
                <h3 className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-2"><span>🥗</span> Alimentación</h3>
                <p className="text-stone-700 text-sm font-medium">{result.alimentacion.tipo}</p>
                <p className="text-stone-500 text-xs mt-1">{result.alimentacion.dias} días</p>
                <p className="text-teal-700 font-bold text-lg mt-2">{result.alimentacion.precio.toLocaleString("es-PY")} Gs</p>
              </div>
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 mb-4 flex items-center justify-between">
              <div>
                <p className="text-teal-800 font-semibold text-sm">Inversión Total del Retiro</p>
                <p className="text-teal-600 text-xs mt-0.5">Incluye terapias, alojamiento y alimentación en Guaraníes (Gs)</p>
              </div>
              <p className="text-3xl font-bold text-teal-800">{result.total.toLocaleString("es-PY")} <span className="text-base font-normal">Gs</span></p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8 mb-4">
              <h3 className="text-base font-semibold text-stone-800 mb-4 flex items-center gap-2"><span>💡</span> Recomendaciones Personalizadas</h3>
              <ul className="space-y-2">
                {result.recomendaciones.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                    <span className="text-teal-600 mt-0.5">✓</span><span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-widest mb-1">Nota del Equipo Médico</p>
              <p className="text-amber-900 text-sm leading-relaxed">{result.nota}</p>
            </div>
            <p className="text-center text-xs text-stone-400 mb-3 px-4">Este presupuesto es orientativo y puede ajustarse tras una consulta inicial. Los precios están en Guaraníes (Gs).</p>
            <p className="text-center text-sm text-teal-700 font-medium mb-6">📞 Consultas y reservas: <a href="tel:+595982818069" className="underline">+595 982 818 069</a></p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setShowShareModal(true)}
                className="flex-1 py-3 bg-teal-700 text-white font-semibold rounded-xl hover:bg-teal-800 transition text-sm flex items-center justify-center gap-2">
                📋 Ver resumen para compartir
              </button>
              <button onClick={() => window.print()}
                className="flex-1 py-3 bg-stone-700 text-white font-semibold rounded-xl hover:bg-stone-800 transition text-sm flex items-center justify-center gap-2">
                🖨️ Guardar como PDF
              </button>
              <button onClick={handleReset} className="flex-1 py-3 bg-stone-100 text-stone-700 font-semibold rounded-xl hover:bg-stone-200 transition text-sm">
                ← Nueva Solicitud
              </button>
            </div>
            {showShareModal && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
                <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-stone-800">Resumen del Presupuesto</h3>
                    <button onClick={() => { setShowShareModal(false); setCopied(false); }} className="text-stone-400 hover:text-stone-600 text-xl">✕</button>
                  </div>
                  <p className="text-xs text-stone-500 mb-3">Copiá este texto y pegalo en WhatsApp, email o donde prefieras.</p>
                  <textarea readOnly value={getShareText(result)}
                    className="flex-1 w-full px-3 py-2.5 border-2 border-stone-200 rounded-lg text-sm font-mono resize-none focus:outline-none bg-stone-50 min-h-[220px]"
                    onFocus={e => e.target.select()} />
                  <button onClick={() => { navigator.clipboard.writeText(getShareText(result)); setCopied(true); setTimeout(() => setCopied(false), 2500); }}
                    className={`mt-3 w-full py-3 font-semibold rounded-xl transition text-sm ${copied ? "bg-emerald-600 text-white" : "bg-teal-700 text-white hover:bg-teal-800"}`}>
                    {copied ? "✅ ¡Copiado!" : "📋 Copiar al portapapeles"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
