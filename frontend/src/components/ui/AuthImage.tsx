import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import api from '../../api/client';

interface Props {
  /** Ruta del endpoint protegido relativa a /api (ej. "/dispensacion/<id>/foto/RECETA"). */
  src: string;
  alt: string;
  className?: string;
}

/**
 * Muestra una imagen servida por un endpoint que exige JWT. Como una etiqueta
 * <img> no puede enviar la cabecera Authorization, la descargamos con el cliente
 * axios (que sí inyecta el token) como blob y la renderizamos vía object URL.
 * Se usa para las fotos de recetas/evidencia, que dejaron de ser públicas (H-11).
 */
export default function AuthImage({ src, alt, className }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;
    let objectUrl: string | null = null;
    setUrl(null);
    setError(false);

    api
      .get(src, { responseType: 'blob' })
      .then((res) => {
        if (cancelado) return;
        objectUrl = URL.createObjectURL(res.data);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelado) setError(true);
      });

    return () => {
      cancelado = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className ?? ''}`}>
        <ImageOff size={20} />
      </div>
    );
  }

  if (!url) {
    return <div className={`animate-pulse bg-gray-200 ${className ?? ''}`} />;
  }

  return <img src={url} alt={alt} className={className} />;
}
