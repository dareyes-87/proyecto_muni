import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, CheckCircle2, AlertTriangle, Upload, RotateCcw, Loader2 } from 'lucide-react';
import {
  obtenerInfoCaptura,
  subirFotoCaptura,
  type CapturaInfo,
  type TipoFoto,
} from '../api/captura';
import { formatFechaHora } from '../utils/formatDate';

// ============================================
// PANTALLA DE CAPTURA MÓVIL — STANDALONE
// ============================================
// Se abre escaneando el QR que muestra la computadora de escritorio tras
// registrar una dispensación. No requiere login (la credencial es el token de
// la URL) y no monta el Layout del sistema: es una página suelta, mobile-first.
//
// Nota: <input type="file" capture="environment"> abre la app de cámara nativa;
// no usa getUserMedia, así que funciona sobre HTTP en la red local sin
// necesidad de certificado HTTPS.
// ============================================

const ETIQUETAS: Record<TipoFoto, string> = {
  RECETA: 'RECETA',
  EVIDENCIA_ENTREGA: 'ENTREGA',
};

const TIPOS: TipoFoto[] = ['RECETA', 'EVIDENCIA_ENTREGA'];

export default function Captura() {
  const { token } = useParams<{ token: string }>();

  const [info, setInfo] = useState<CapturaInfo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [invalido, setInvalido] = useState(false);
  const [subidas, setSubidas] = useState<TipoFoto[]>([]);

  useEffect(() => {
    if (!token) {
      setInvalido(true);
      setCargando(false);
      return;
    }
    obtenerInfoCaptura(token)
      .then((data) => {
        setInfo(data);
        setSubidas(data.fotosSubidas);
      })
      .catch(() => setInvalido(true))
      .finally(() => setCargando(false));
  }, [token]);

  // El token se marca como usado al completar las 2 fotos, así que el estado de
  // "subidas" se mantiene localmente con la respuesta de cada subida en vez de
  // volver a consultar /info (que ya devolvería 404).
  const marcarSubida = useCallback((fotosSubidas: TipoFoto[]) => {
    setSubidas(fotosSubidas);
  }, []);

  const completo = TIPOS.every((t) => subidas.includes(t));

  if (cargando) {
    return (
      <Contenedor>
        <div className="flex flex-col items-center gap-3 py-16 text-gray-500">
          <Loader2 className="animate-spin" size={32} />
          <p className="text-sm">Cargando...</p>
        </div>
      </Contenedor>
    );
  }

  if (invalido || !info || !token) {
    return (
      <Contenedor>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-12 text-center">
          <AlertTriangle className="text-red-500" size={40} />
          <h2 className="text-lg font-bold text-red-800">Enlace inválido o expirado</h2>
          <p className="text-sm text-red-700">
            Pida a la encargada que genere un código QR nuevo desde la computadora.
          </p>
        </div>
      </Contenedor>
    );
  }

  return (
    <Contenedor>
      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Beneficiario</p>
        <p className="text-lg font-semibold text-gray-900">{info.beneficiario}</p>
        <p className="mt-0.5 text-sm text-gray-500">{formatFechaHora(info.fecha)}</p>
      </div>

      <div className="space-y-4">
        {TIPOS.map((tipo) => (
          <TarjetaFoto
            key={tipo}
            tipo={tipo}
            token={token}
            yaSubida={subidas.includes(tipo)}
            onSubida={marcarSubida}
          />
        ))}
      </div>

      {completo && (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center">
          <CheckCircle2 className="text-emerald-600" size={40} />
          <p className="text-base font-semibold text-emerald-800">Todo listo</p>
          <p className="text-sm text-emerald-700">Puede cerrar esta página.</p>
        </div>
      )}
    </Contenedor>
  );
}

// ============================================
// LAYOUT MÍNIMO (sin sidebar ni header del sistema)
// ============================================

function Contenedor({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-900 px-4 py-4 text-center">
        <p className="text-lg font-bold text-dorado-400">FarmaG</p>
        <p className="text-sm text-primary-100">Captura de evidencia</p>
      </header>
      <main className="mx-auto w-full max-w-[420px] px-4 py-5">{children}</main>
    </div>
  );
}

// ============================================
// TARJETA DE UNA FOTO (seleccionar → previsualizar → subir)
// ============================================

function TarjetaFoto({
  tipo,
  token,
  yaSubida,
  onSubida,
}: {
  tipo: TipoFoto;
  token: string;
  yaSubida: boolean;
  onSubida: (fotosSubidas: TipoFoto[]) => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Liberar el object URL del preview al reemplazarlo o desmontar.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const seleccionar = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setArchivo(file);
    setPreview((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return URL.createObjectURL(file);
    });
  };

  const limpiar = () => {
    setArchivo(null);
    setPreview((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return null;
    });
    if (inputRef.current) inputRef.current.value = '';
  };

  const subir = async () => {
    if (!archivo) return;
    setSubiendo(true);
    setError(null);
    try {
      const resultado = await subirFotoCaptura(token, tipo, archivo);
      onSubida(resultado.fotosSubidas);
      limpiar();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo subir la foto. Intente de nuevo.');
    } finally {
      setSubiendo(false);
    }
  };

  if (yaSubida) {
    return (
      <div className="flex min-h-[60px] items-center justify-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-4 text-base font-semibold text-emerald-800">
        <CheckCircle2 size={22} />
        {ETIQUETAS[tipo] === 'RECETA' ? 'Receta subida' : 'Entrega subida'}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => seleccionar(e.target.files?.[0])}
      />

      {!preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-[60px] w-full items-center justify-center gap-3 rounded-xl bg-primary-600 px-4 py-4 text-base font-semibold text-white active:bg-primary-700"
        >
          <Camera size={24} />
          Tomar foto de {ETIQUETAS[tipo]}
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Foto de {ETIQUETAS[tipo]}</p>
          <img
            src={preview}
            alt={`Vista previa de ${ETIQUETAS[tipo]}`}
            className="max-h-64 w-full rounded-lg border border-gray-200 object-contain"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
              className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 text-sm font-medium text-gray-700 disabled:opacity-50"
            >
              <RotateCcw size={18} />
              Repetir
            </button>
            <button
              type="button"
              onClick={subir}
              disabled={subiendo}
              className="flex min-h-[52px] flex-[2] items-center justify-center gap-2 rounded-xl bg-primary-600 px-3 text-base font-semibold text-white active:bg-primary-700 disabled:opacity-60"
            >
              {subiendo ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
              {subiendo ? 'Subiendo...' : 'Subir'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
