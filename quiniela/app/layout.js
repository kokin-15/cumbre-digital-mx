import "./globals.css";

export const metadata = {
  title: "Quiniela — Pronósticos",
  description: "Captura tus pronósticos de cada partido y compite por los puntos.",
};

export default function LayoutRaiz({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
