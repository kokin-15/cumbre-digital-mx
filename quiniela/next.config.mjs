// Permite compilar en otra carpeta (NEXT_DIST_DIR) para revisar errores
// sin molestar al servidor de desarrollo que está encendido
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
