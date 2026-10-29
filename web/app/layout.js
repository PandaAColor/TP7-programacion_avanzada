import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: 'RutaSur',
  description: 'Seguimiento de envíos en tiempo real',
};

const NAVEGACION = [
  { href: '/', etiqueta: 'Torre de control' },
  { href: '/analitica', etiqueta: 'Analítica' },
  { href: '/demo', etiqueta: 'Panel de demo' },
];

/**
 * Layout raíz con navegación compartida.
 * @param {{children: React.ReactNode}} props
 */
export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <header className="border-b border-neutral-800">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              RutaSur
            </Link>
            <nav className="flex gap-1 text-sm">
              {NAVEGACION.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded px-3 py-1.5 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
                >
                  {item.etiqueta}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </body>
    </html>
  );
}
